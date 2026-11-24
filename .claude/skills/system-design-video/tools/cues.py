#!/usr/bin/env python3
"""Where each sentence / clause starts in a scene's narration, as a fraction of S (narration length).

    python3 cues.py <project> en            # all scenes
    python3 cues.py <project> en --scene 5  # one scene

Splits narration.json text at . ! ? : ; and commas, estimates each piece's start by character share,
then snaps it to the nearest pause found by ffmpeg silencedetect (pauses are where the voice breathes
between clauses). Use the printed fractions for tween times: `0.42 * S`.
"""
import argparse
import os
import re
import subprocess

from common import clip_path, duration, load_project, narration


def pauses(path, noise="-35dB", d=0.12):
    err = subprocess.run(["ffmpeg", "-v", "info", "-i", path, "-af", f"silencedetect=noise={noise}:d={d}",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    return ends


def clause_times(clip, text):
    """[(start_sec, clause_text), ...] for one scene: char-share estimate snapped to nearby pauses."""
    S = duration(clip)
    ends = pauses(clip)
    parts = [p for p in re.split(r"(?<=[.!?:;,।])\s+", text) if p.strip()]
    total = sum(len(p) for p in parts) or 1
    out, acc, last = [], 0, 0.0
    for p in parts:
        est = acc / total * S
        snap = min(ends, key=lambda e: abs(e - est)) if ends and acc else 0.0
        t = snap if abs(snap - est) < 1.2 and snap >= last else est
        t = max(t, last)
        out.append((round(t, 3), p))
        last = t
        acc += len(p)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("track", nargs="?", default="en")
    ap.add_argument("--scene", type=int)
    a = ap.parse_args()
    project, cfg = load_project(a.project)
    texts = narration(project)[a.track]
    for i, text in enumerate(texts, 1):
        if a.scene and i != a.scene:
            continue
        clip = clip_path(project, cfg["tracks"][a.track]["audio"], i)
        if not clip:
            continue
        S = duration(clip)
        print(f"\n== s{i} {cfg['scenes'][i - 1]}  S={S:.2f}s")
        for t, p in clause_times(clip, text):
            print(f"  {t / S:5.2f}  {t:6.2f}s  {p[:70]}")


if __name__ == "__main__":
    main()
