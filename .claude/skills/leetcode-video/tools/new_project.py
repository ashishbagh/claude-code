#!/usr/bin/env python3
"""Scaffold a LeetCode video project.

    python3 new_project.py leetcode-videos/199-binary-tree-right-side-view \
        --number 199 --title "Binary Tree Right Side View" --difficulty Medium --scenes 7
"""
import argparse
import json
import os
import re
import shutil

from common import SKILL

SCENE_STUB = """<template>
  <style>
    #root {{ position: absolute; inset: 0; background: var(--bg); }}
  </style>
  <div id="root" data-composition-id="{id}" data-width="1920" data-height="1080"
       data-composition-variables='[{{"id":"T","type":"number","label":"Scene length (s)","default":15}}]'>
    <div class="lc-header"><span class="lc-badge">LeetCode {number}</span><span class="lc-title">{title}</span><span class="lc-diff lc-{dl}">{difficulty}</span></div>
    <div class="lc-caption" id="{id}-cap1"><span>Caption</span></div>
  </div>
  <script>
    const {{ T }} = window.__hyperframes.getVariables();
    const tl = gsap.timeline({{ paused: true }});
    LC.captions(tl, T, [["#{id}-cap1", 0.05]]);
    window.__timelines["{id}"] = tl;
  </script>
</template>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--number", type=int, required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--difficulty", default="Medium", choices=["Easy", "Medium", "Hard"])
    ap.add_argument("--scenes", type=int, default=7)
    a = ap.parse_args()

    d = os.path.abspath(a.dir)
    os.makedirs(os.path.join(d, "compositions"), exist_ok=True)
    shutil.copytree(os.path.join(SKILL, "template", "assets"), os.path.join(d, "assets"), dirs_exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "_", a.title.lower()).strip("_")
    names = ["intro", "idea"] + [f"walk{i}" for i in range(1, a.scenes - 3)] + ["code", "complexity"]
    scenes = [f"s{i + 1}-{n}" for i, n in enumerate(names[:a.scenes])]

    cfg = {
        "number": a.number, "title": a.title, "difficulty": a.difficulty, "slug": slug,
        "scenes": scenes, "pad": 0.6,
        "tracks": {
            "en": {"audio": "assets/audio/en", "out": f"out/{slug}.mp4"},
            "hinglish": {"audio": "assets/audio/hinglish", "out": f"out/{slug}_hinglish.mp4"},
        },
        "voice": {"en": {"engine": "kokoro", "voice": "am_michael"},
                  "hinglish": {"engine": "elevenlabs", "voice": "j7yQHuKNC1hdt1LBPAks"}},
        "sfx_queries": {"whoosh": "whoosh transition", "pop": "pop ui", "click-soft": "soft click ui",
                        "ping": "bright ping notification", "impact-bass-1": "cinematic impact"},
        "sfx": [{"scene": scenes[0], "at": 0.0, "sound": "whoosh"}],
        "music": None,
        "scripts": [],
    }
    with open(os.path.join(d, "video.json"), "w") as f:
        json.dump(cfg, f, indent=2)
    with open(os.path.join(d, "narration.json"), "w") as f:
        json.dump({"en": [""] * len(scenes), "hinglish": [""] * len(scenes)}, f, indent=2, ensure_ascii=False)
    for sid in scenes:
        p = os.path.join(d, "compositions", f"{sid}.html")
        if not os.path.exists(p):
            with open(p, "w") as f:
                f.write(SCENE_STUB.format(id=sid, number=a.number, title=a.title,
                                          difficulty=a.difficulty, dl=a.difficulty.lower()))
    with open(os.path.join(d, ".gitignore"), "w") as f:
        f.write(".hyperframes/\nnode_modules/\nsnapshots/\nout/work-*/\nout/.*hf-transaction*/\n")
    print("scaffolded", d, "scenes:", ", ".join(scenes))


if __name__ == "__main__":
    main()
