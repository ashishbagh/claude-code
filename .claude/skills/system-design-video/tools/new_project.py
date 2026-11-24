#!/usr/bin/env python3
"""Scaffold a system-design video project.

    python3 new_project.py system-design-videos/tiny-url --title "Design TinyURL" --level Beginner --scenes 8
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
    <div class="lc-header"><span class="lc-badge">{badge}</span><span class="lc-title">{title}</span><span class="lc-diff lc-{dl}">{level}</span></div>
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


INTRO_STUB = """<template>
  <style>
    #root {{ position: absolute; inset: 0; }}
  </style>
  <div id="root" data-composition-id="{id}" data-width="1920" data-height="1080"
       data-composition-variables='[{{"id":"T","type":"number","label":"Scene length (s)","default":20}},{{"id":"S","type":"number","label":"Narration length (s)","default":19}}]'>
    <div class="lc-titlecard"><h1 id="{p}-t-title">{title}</h1><p id="{p}-t-sub">System Design · subtitle</p>
      <div class="sd-asked" id="{p}-asked" style="margin-top:34px"><em>Asked at</em>{chips}</div></div>
    <div id="{p}-header" style="opacity:0"><div class="lc-header"><span class="lc-badge">{badge}</span><span class="lc-title">{title}</span><span class="lc-diff lc-{dl}">{level}</span></div></div>
    <!-- requirements panels (.sd-req) go here, below the header -->
    <div class="sd-asked sm" id="{p}-asked2" style="position:absolute;left:0;right:0;top:800px"><em>Asked at</em>{chips}</div>
    <div class="lc-caption" id="{id}-cap1"><span>Caption</span></div>
  </div>
  <script>
    (function () {{
      const {{ T, S = T }} = window.__hyperframes.getVariables();
      const tl = gsap.timeline({{ paused: true }});
      // title card is on screen from frame 0 (thumbnail + Reel cover), companies pop in, then the header takes over
      tl.fromTo("#{p}-t-title", {{ opacity: 1, scale: 0.94 }}, {{ opacity: 1, scale: 1, duration: 2.4, ease: "power1.out" }}, 0);
      tl.fromTo("#{p}-t-sub", {{ opacity: 1 }}, {{ opacity: 1, duration: 0.1 }}, 0);
      LC.askedAt(tl, "#{p}-asked", 0.5);
      tl.to(["#{p}-t-title", "#{p}-t-sub", "#{p}-asked"], {{ opacity: 0, y: -30, duration: 0.4, ease: "power2.in" }}, 3.4);
      tl.fromTo("#{p}-header", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.5 }}, 3.7);
      LC.askedAt(tl, "#{p}-asked2", 0.48 * S, 0.06);   // compact strip stays for the rest of the intro
      LC.captions(tl, T, [["#{id}-cap1", Math.max(0.16 * S, 3.9) / T]]);
      window.__timelines["{id}"] = tl;
    }})();
  </script>
</template>
"""


LAST_STUB = """<template>
  <style>
    #root {{ position: absolute; inset: 0; }}
  </style>
  <div id="root" data-composition-id="{id}" data-width="1920" data-height="1080"
       data-composition-variables='[{{"id":"T","type":"number","label":"Scene length (s)","default":14}},{{"id":"S","type":"number","label":"Narration length (s)","default":11}}]'>
    <div class="lc-header"><span class="lc-badge">{badge}</span><span class="lc-title">{title}</span><span class="lc-diff lc-{dl}">{level}</span></div>
    <div class="lc-cards" data-hold>
      <div class="lc-card" id="{p}-time"><h3>Key idea 1</h3><strong>…</strong><p>why</p></div>
      <div class="lc-card" id="{p}-space"><h3>Key idea 2</h3><strong>…</strong><p>why</p></div>
    </div>
    <div class="lc-outro">
      <div class="lc-thanks" id="{p}-thanks">Thanks for watching!</div>
      <div class="lc-sub" id="{p}-sub">Subscribe to <b>@dsalgo_ai</b> for more such videos</div>
      <div class="lc-social" id="{p}-social"><span class="lc-yt"><i></i>YouTube</span><span class="lc-ig"><i></i>Instagram</span></div>
    </div>
  </div>
  <script>
    (function () {{
      const {{ T, S = T }} = window.__hyperframes.getVariables();
      const tl = gsap.timeline({{ paused: true }});
      tl.fromTo("#{p}-time", {{ opacity: 0, y: 50 }}, {{ opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }}, 0.05 * T);
      tl.fromTo("#{p}-space", {{ opacity: 0, y: 50 }}, {{ opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }}, 0.33 * T);
      LC.outro(tl, "{p}", 0.85 * S);   // channel outro – required on every video
      window.__timelines["{id}"] = tl;
    }})();
  </script>
</template>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--title", required=True, help='e.g. "Design TinyURL"')
    ap.add_argument("--badge", default="System Design")
    ap.add_argument("--level", default="Intermediate", choices=["Beginner", "Intermediate", "Advanced"])
    ap.add_argument("--scenes", type=int, default=8)
    ap.add_argument("--asked-at", default="", help='companies reported to ask it, e.g. "Google,Amazon,Meta"')
    a = ap.parse_args()

    d = os.path.abspath(a.dir)
    os.makedirs(os.path.join(d, "compositions"), exist_ok=True)
    shutil.copytree(os.path.join(SKILL, "template", "assets"), os.path.join(d, "assets"), dirs_exist_ok=True)
    asked = [c.strip() for c in a.asked_at.split(",") if c.strip()]
    chips = "".join(f'<span class="sd-co">{c}</span>' for c in asked)
    slug = re.sub(r"[^a-z0-9]+", "_", a.title.lower()).strip("_")
    core = ["requirements", "estimates", "api", "architecture"]
    tail = ["scale", "recap"]
    flows = [f"flow{i}" for i in range(1, max(1, a.scenes - len(core) - len(tail)) + 1)]   # >= 7 scenes
    names = core + flows + tail
    scenes = [f"s{i + 1}-{n}" for i, n in enumerate(names[:a.scenes])]

    cfg = {
        "badge": a.badge, "title": a.title, "level": a.level, "slug": slug,
        "asked_at": asked, "asked_at_sources": [],
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
        "outro_hold": 3.0,
        "scripts": [],
    }
    with open(os.path.join(d, "video.json"), "w") as f:
        json.dump(cfg, f, indent=2)
    with open(os.path.join(d, "narration.json"), "w") as f:
        json.dump({"en": [""] * len(scenes), "hinglish": [""] * len(scenes)}, f, indent=2, ensure_ascii=False)
    for sid in scenes:
        p = os.path.join(d, "compositions", f"{sid}.html")
        if not os.path.exists(p):
            stub = LAST_STUB if sid == scenes[-1] else INTRO_STUB if sid == scenes[0] else SCENE_STUB
            with open(p, "w") as f:
                f.write(stub.format(id=sid, p=sid.split("-")[0], badge=a.badge, title=a.title,
                                    level=a.level, chips=chips, dl={"Beginner": "easy", "Intermediate": "medium", "Advanced": "hard"}[a.level]))
    with open(os.path.join(d, ".gitignore"), "w") as f:
        f.write(".hyperframes/\nnode_modules/\nsnapshots/\nout/work-*/\nout/.*hf-transaction*/\n")
    print("scaffolded", d, "scenes:", ", ".join(scenes))


if __name__ == "__main__":
    main()
