---
name: leetcode-video
description: Make an animated, narrated explainer video for a LeetCode problem - HyperFrames (HTML + GSAP) frames, Three.js 3D, Kokoro or ElevenLabs voice-over (English and/or Hinglish), Freesound sound effects, rendered to 1080p MP4 plus an FFmpeg Instagram Reel (9:16). Use when the user gives a LeetCode problem (name, number or link) and asks for a solution video / animation / explainer / reel, or invokes /leetcode-video. Args - the problem, optionally "hinglish", "both", "elevenlabs", "no-reel".
---

# LeetCode explainer video

`/leetcode-video 199 Binary Tree Right Side View [hinglish|both] [elevenlabs] [no-reel]`

Output in `leetcode-videos/<number>-<slug>/out/`: `<slug>.mp4` (1920×1080), `<slug>_reel.mp4` +
`_reel_cover.jpg` (1080×1920 Instagram Reel), and `<slug>_hinglish.mp4` when asked. Send them to the
user, commit the project, push.

Defaults, no questions unless the problem is ambiguous: English narration with **Kokoro** (local,
free); `elevenlabs` in the args → ElevenLabs. Hinglish → ElevenLabs (Kokoro's Hindi voices `hf_alpha` /
`hm_omega` are a free fallback, quality unverified). Reel for the English track unless `no-reel`.

**Reference project** – read it before writing scenes: `leetcode-videos/200-number-of-islands/`
(`video.json`, `narration.json`, `compositions/*.html`, `assets/islands3d.js`).

## Stack

| Job | Tool | Where |
|---|---|---|
| Frames | HyperFrames (HTML + GSAP, seek-driven, rendered by headless Chrome) | `compositions/*.html`, `index.html` (generated) |
| 3D | Three.js r159 (classic build, bundled) driven from the scene timeline | `assets/lib/three.min.js`, `LC.three`, `LC.drive` |
| Voice | Kokoro-82M via `hyperframes tts` (`tools/voice.py`) or ElevenLabs MCP | `assets/audio/<track>/s<i>.mp3` |
| Sound | Freesound API (CC0 / CC BY) → bundled Pixabay fallback (`tools/sfx.py`) | `assets/sfx/` + `CREDITS.md` |
| Timing | `tools/build.py`: scene i lasts clip i + pad; SFX peak-aligned | `index.html`, `timing_<track>.json` |
| Reel | FFmpeg (`tools/insta.py`): 9:16, burned captions, −14 LUFS, cover | `out/<slug>_reel.mp4` |

`T=.claude/skills/leetcode-video/tools`. HyperFrames CLI (`$HF` below): if the `hyperframes` skill is
installed, load it (`/hyperframes`) and run `node ~/.claude/skills/hyperframes/scripts/plugin-cli.mjs`;
otherwise `npx --yes hyperframes@0.9.67`. Needs Node ≥ 22, FFmpeg, Chrome (`$HF doctor`), and for Kokoro
`pip install kokoro-onnx soundfile`.

## 1. Plan (one worked example, 6–8 scenes, ≤ 2:30 so the Reel fits under 3:00)

Pick ONE small input that hits the interesting cases; solve it by hand and get the exact trace the
code produces (visiting order, stack/queue contents). The animation must match the code.

| Scene | Content |
|---|---|
| `s1-intro` | title card (~4 s) → header + the example built in 3D/DOM + rules + "Goal: …" caption |
| `s2-idea` | 3–4 numbered `.lc-step` cards, one per narrated step |
| `s3…s5` | walkthrough: the structure animating step by step; right panels `Answer/counter` (`.lc-value` spans) + `.lc-list` (stack / queue / calls); bottom `.lc-caption`s |
| `s6-code` | `.lc-code` with `tools/codehl.py` output, `LC.codeHighlight` over line ranges as they are narrated |
| `s7-complexity` | `.lc-cards` Time / Space + outro |

Use 3D where it explains: grids as tiles (Number of Islands), trees as spheres + edges, arrays as a row
of blocks, graphs as nodes in space, DP tables as rising bars. Keep text, panels, code in DOM.

## 2. Scaffold + narration

```
python3 $T/new_project.py leetcode-videos/<n>-<slug> --number <n> --title "<Title>" --difficulty Medium --scenes 7
```
Fill `narration.json` `{"en": [scene texts], "hinglish": [...]}` – about 35–55 words per scene, spoken
style, sentences in the order the visuals appear. Say "LeetCode one ninety nine", "O of n", "D F S".
Hinglish: Hindi in Devanagari, technical words in English, same sentence order as English
("चलो solve करते हैं LeetCode two hundred, Number of Islands…").

## 3. Voice

- **Kokoro** (default English): `python3 $T/voice.py <proj> en` (voice from `video.json`, default
  `am_michael`; also `af_heart`, `bm_george`… `--voice`, `--speed 1.05`). First run downloads the model
  from github.com.
- **ElevenLabs** (MCP tools `creative_create_flow`, `creative_generate_speech`, `creative_get_flow_run_status`):
  English Daniel `onwK4e9ZLuTAKqWW03F9`, Hinglish Prashant `j7yQHuKNC1hdt1LBPAks`, `model_id eleven_v4`,
  `generations_count 1`. **One scene at a time** (generate → poll → `curl -sSfo <proj>/assets/audio/<track>/s<i>.mp3 "<content_url>"`
  → next); bursts tripped the account's "unusual activity" block before. Never re-send a completed scene;
  retry a failed one once, then stop and tell the user. Needs `elevenlabsusercontent.com` allowed.

## 4. Scenes

Each `compositions/<id>.html` is a HyperFrames scene: everything inside `<template>`, root
`<div id="root" data-composition-id="<id>">` styled as `#root`, one paused GSAP timeline registered as
`window.__timelines["<id>"]`, prefixed element ids (`#s3-…`). The scene reads its length with
`const { T } = window.__hyperframes.getVariables()` and times every event as a **fraction of T** (so
English and Hinglish share the code). Shared pieces (loaded by `index.html`):

- `assets/lc.css`: `.lc-header/.lc-badge/.lc-title/.lc-diff`, `.lc-caption`, `.lc-panel/.lc-label/.lc-value/.lc-list/.lc-item`,
  `.lc-steps/.lc-step`, `.lc-code/.lc-hl` + token classes, `.lc-cards/.lc-card/.lc-outro`, `.lc-titlecard`, `.lc-fill`.
- `assets/lib/lc.js` (`window.LC`): `captions(tl,T,[[sel,frac]])`, `values(tl,[[sel,sec]])`, `listItems`,
  `codeHighlight(tl,T,sel,[[a,b,s,e]],42)`, `drive(tl,T,draw)` (calls `draw(t)` every frame – put all
  Three.js/canvas drawing here), `prog/smooth/stepAt/clamp`, `three(canvas,{shiftX})` (renderer, camera,
  lights; `shiftX` 330 moves the subject left of the right-hand panels), `textTexture` (white bg – a
  map multiplies the colour; transparent bg renders black), `color/mix`.
- Problem-specific 3D goes in `assets/<name>.js` and is listed in `video.json` `"scripts"`.

HyperFrames rules that bite: no `Math.random`/`Date.now`/timers (everything from `t`); `fromTo` not
`from`; don't animate an element that has a CSS `transform`; text ≥ 28 px; nothing in the caption band
except captions; holds over 3 s get `data-hold`.

## 5. Sound

Add cues to `video.json` `"sfx"`: `{"scene", "at": frac | "sec": s, "sound", "volume"}` – few and exact:
whoosh on a big entrance/cut, pop/click-soft on cards and list items, ping on a counter change, one
impact on the answer, sparkle on the outro; rotate takes. `sfx_queries` maps a sound name to a
Freesound search. `python3 $T/sfx.py <proj>` fetches CC0/CC BY previews from Freesound (key saved on the
cloud environment as "Freesound API key" for freesound.org, or `FREESOUND_API_KEY`), else copies the
bundled library (`sfx-library/`: whoosh, whoosh-short, whoosh-cinematic, pop, click-soft, ping, riser,
impact-bass-1, key-press, sparkle, chime, typing). Keep `assets/sfx/CREDITS.md`; tell the user to credit
CC BY sounds. Optional music bed: `"music": {"file": "assets/music/x.mp3", "volume": 0.14}`.

## 6. Build, check, look, render

```
python3 $T/build.py <proj> en          # index.html for one track (HyperFrames allows one root)
cd <proj> && $HF check --json          # fix every error; weigh warnings
$HF snapshot --at <t1,t2,…>            # 2–3 moments per scene (times from timing_en.json); read the contact sheet
$HF render -o out/<slug>.mp4           # ~4 min for 2 min of video; run in background
python3 $T/insta.py <proj> en          # Reel + cover
python3 $T/build.py <proj> hinglish && $HF render -o out/<slug>_hinglish.mp4   # if asked
python3 $T/build.py <proj> en          # leave index.html on English
```
Check the render with `ffprobe` (1920×1080 h264 + aac, duration ≈ timing total) and `$HF audio out/<slug>.mp4 --json`.

## 7. Deliver

SendUserFile the MP4s (+ cover), commit `leetcode-videos/<n>-<slug>/` (not `.hyperframes/`), push.
Report: length, voice + engine, SFX source (Freesound or bundled – and why), anything skipped or failed,
and that audio was measured, not heard.
