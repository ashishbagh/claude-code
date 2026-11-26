#!/usr/bin/env python3
"""Scaffold a system-design reel project in the "blueprint glow" theme.

    python3 .claude/skills/system-design-video/tools/new_sd_project.py system-design-videos/rate-limiter \
        --title "Rate Limiter" --scenes s1-hook s2-problem s3-bucket s4-burst s5-refill s6-redis s7-recap

Reuses the leetcode-video scaffold (assets, build/voice/sfx tools), then adds the theme
(assets/lib/sd.js, assets/sd.css), a Hinglish-only track and empty scene files to fill.
"""
import argparse, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)
LC_TOOLS = os.path.join(SKILL, "..", "leetcode-video", "tools")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--title", required=True)
    ap.add_argument("--scenes", nargs="+", default=["s1-hook", "s2-problem", "s3-idea", "s4-walk", "s5-walk", "s6-scale", "s7-recap"])
    ap.add_argument("--track", default="hinglish", choices=["hinglish", "en"])
    a = ap.parse_args()

    subprocess.run([sys.executable, os.path.join(LC_TOOLS, "new_project.py"), a.dir, "--number", "0",
                    "--title", a.title, "--scenes", str(len(a.scenes))], check=True, stdout=subprocess.DEVNULL)
    d = os.path.abspath(a.dir)
    for f in os.listdir(os.path.join(d, "compositions")):
        os.remove(os.path.join(d, "compositions", f))
    shutil.copy(os.path.join(SKILL, "theme", "sd.js"), os.path.join(d, "assets", "lib", "sd.js"))
    shutil.copy(os.path.join(SKILL, "theme", "sd.css"), os.path.join(d, "assets", "sd.css"))
    slug = re.sub(r"[^a-z0-9]+", "_", a.title.lower()).strip("_")
    cfg = json.load(open(os.path.join(d, "video.json")))
    voice = {"hinglish": {"engine": "elevenlabs", "voice": "j7yQHuKNC1hdt1LBPAks", "name": "Prashant"},
             "en": {"engine": "elevenlabs", "voice": "onwK4e9ZLuTAKqWW03F9", "name": "Daniel"}}
    cfg.update(slug=slug, scenes=a.scenes, outro_hold=3.0, styles=["assets/sd.css"],
               scripts=["assets/lib/sd.js", f"assets/{slug}3d.js"],
               tracks={a.track: {"audio": f"assets/audio/{a.track}", "out": f"out/{slug}_{a.track}.mp4"}},
               voice={a.track: voice[a.track]})
    cfg["sfx_queries"].update({"riser": "cinematic riser", "typing": "keyboard typing", "chime": "success chime"})
    cfg["sfx"] = []
    json.dump(cfg, open(os.path.join(d, "video.json"), "w"), indent=2, ensure_ascii=False)
    json.dump({a.track: [""] * len(a.scenes)}, open(os.path.join(d, "narration.json"), "w"), indent=2, ensure_ascii=False)
    os.makedirs(os.path.join(d, "assets", "audio", a.track), exist_ok=True)
    print("scaffolded", d, "->", ", ".join(a.scenes), f"(write assets/{slug}3d.js + compositions/*.html)")


if __name__ == "__main__":
    main()
