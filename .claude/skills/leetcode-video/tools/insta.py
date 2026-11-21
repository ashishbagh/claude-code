#!/usr/bin/env python3
"""Instagram Reel export (FFmpeg): 1080x1920 9:16, -14 LUFS, cover image; captions only with --captions.

    python3 insta.py <project> en            # out/<slug>.mp4 -> out/<slug>_reel.mp4 + _reel_cover.jpg

Layout: blurred, darkened fill of the video as background; the 16:9 video full-width in the
middle; problem title on top; narration captions (sentence by sentence, timed by character
share within each scene's speech) underneath. Reels allow up to 3 min – longer input is
rejected unless --trim is given.
"""
import argparse
import json
import os
import re
import subprocess

from common import duration, load_project, narration, need

W, H = 1080, 1920
VID_H = 608                      # 1080 * 9/16
VID_Y_CAPS = (H - VID_H) // 2 - 80   # with captions: a little above centre, captions below
VID_Y_PLAIN = (H - VID_H) // 2 + 60  # no captions (default): centred, title above
FONT_DIRS = ["/usr/share/fonts/opentype/inter", "/usr/share/fonts/truetype/dejavu"]


def ass_time(t):
    h, rem = divmod(max(t, 0), 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def wrap(text, width=30):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > width and cur:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    lines.append(cur)
    return "\\N".join(lines)


def captions(texts, timing, path, font, light=False, VID_Y=VID_Y_CAPS):
    """Sentence-level ASS captions; each sentence gets time proportional to its length."""
    ev = []
    for text, sc in zip(texts, timing["scenes"]):
        parts = [p.strip() for p in re.split(r"(?<=[.!?।])\s+", text) if p.strip()]
        total_chars = sum(len(p) for p in parts) or 1
        t = sc["start"]
        for p in parts:
            d = sc["speech"] * len(p) / total_chars
            ev.append((t, t + d - 0.05, wrap(p)))
            t += d
    cap_fg, cap_ol, cap_sh = ("&H004B1B1E", "&H00FFFFFF", 0) if light else ("&H00FFFFFF", "&H00000000", 2)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},58,{cap_fg},&H00FFFFFF,{cap_ol},&H96000000,-1,0,0,0,100,100,0,0,1,4,{cap_sh},8,70,70,{VID_Y + VID_H + 90},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(head)
        for a, b, s in ev:
            f.write(f"Dialogue: 0,{ass_time(a)},{ass_time(b)},Cap,,0,0,0,,{s}\n")


def fit_title(title, max_w=1000, size=74, min_size=54):
    """Title lines + font size that fit the Reel width (Inter ExtraBold ≈ 0.58 em per char)."""
    fits = lambda text, sz: len(text) * 0.58 * sz <= max_w
    if fits(title, size):
        return [title], size
    words = title.split()
    best = min(range(1, len(words)), key=lambda i: abs(len(" ".join(words[:i])) - len(" ".join(words[i:]))))
    lines = [" ".join(words[:best]), " ".join(words[best:])]
    sz = size
    while sz > min_size and not all(fits(l, sz) for l in lines):
        sz -= 2
    return lines, sz


def esc(s):
    return s.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("track", nargs="?", default="en")
    ap.add_argument("--trim", type=float, help="cut to this many seconds (Reels max 180)")
    ap.add_argument("--captions", action="store_true", help="burn in narration captions (off by default)")
    a = ap.parse_args()
    need("ffmpeg")
    project, cfg = load_project(a.project)
    src = os.path.join(project, cfg["tracks"][a.track]["out"])
    timing = json.load(open(os.path.join(project, f"timing_{a.track}.json")))
    texts = narration(project)[a.track]
    dur = duration(src)
    limit = a.trim or dur
    if limit > 180:
        raise SystemExit(f"{dur:.0f}s is over the 3-minute Reel limit; pass --trim 180 or shorten the script")

    base = os.path.splitext(src)[0]
    out, cover, ass = base + "_reel.mp4", base + "_reel_cover.jpg", base + "_reel.ass"
    font_dir = next((d for d in FONT_DIRS if os.path.isdir(d)), "/usr/share/fonts")
    font = "Inter" if "inter" in font_dir else "DejaVu Sans"
    bold = next((os.path.join(font_dir, f) for f in ("Inter-ExtraBold.otf", "DejaVuSans-Bold.ttf")
                 if os.path.exists(os.path.join(font_dir, f))), None)
    light = cfg.get("reel_theme") == "light"      # bright videos: pastel wash + dark ink text
    with_caps = a.captions or cfg.get("reel_captions", False)
    VID_Y = VID_Y_CAPS if with_caps else VID_Y_PLAIN
    if with_caps:
        captions(texts, timing, ass, font, light, VID_Y)

    badge = esc(cfg.get("reel_badge") or f"LeetCode {cfg['number']} · {cfg['difficulty']}")
    tlines, tsize = fit_title(cfg["title"])
    title = esc(cfg["title"])
    ff = f":fontfile={bold}" if bold else ""
    vf = (
        f"[0:v]split[a][b];"
        f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=40:2,"
        + ("drawbox=x=0:y=0:w=iw:h=ih:color=white@0.55:t=fill[bg];" if light else "eq=brightness=-0.22[bg];") +
        f"[b]scale={W}:{VID_H}[fg];"
        f"[bg][fg]overlay=0:{VID_Y},"
        f"drawtext=text='{badge}'{ff}:fontsize=40:fontcolor={'0xdb2777' if light else '0xfacc15'}:x=(w-tw)/2:y={VID_Y - 250 - (60 if len(tlines) > 1 else 0)},"
        + "".join(f"drawtext=text='{esc(line)}'{ff}:fontsize={tsize}:fontcolor={'0x1e1b4b' if light else 'white'}:x=(w-tw)/2:"
                  f"y={VID_Y - 180 - (len(tlines) - 1 - k) * int(tsize * 1.15)}:shadowcolor={'white@0.0' if light else 'black@0.6'}:shadowx=3:shadowy=3,"
                  for k, line in enumerate(tlines))
        + (f"subtitles={ass}:fontsdir={font_dir}," if with_caps else "") + "format=yuv420p[v]"
    )
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-t", f"{limit:.3f}",
                    "-filter_complex", vf, "-map", "[v]", "-map", "0:a",
                    "-r", "30", "-c:v", "libx264", "-profile:v", "high", "-level", "4.1", "-preset", "medium",
                    "-crf", "19", "-maxrate", "10M", "-bufsize", "20M", "-g", "60",
                    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                    "-movflags", "+faststart", out], check=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", "2.5", "-i", out, "-frames:v", "1", "-q:v", "2", cover],
                   check=True)
    if with_caps:
        os.remove(ass)
    print("reel:", out, f"({min(dur, limit):.1f}s)\ncover:", cover)


if __name__ == "__main__":
    main()
