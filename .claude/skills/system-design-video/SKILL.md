---
name: system-design-video
description: Make an animated, narrated system-design explainer video (e.g. "Design TinyURL", "Design WhatsApp", rate limiter, news feed) - requirements, back-of-envelope estimates, API + data model, a 3D architecture diagram with request packets flowing between services (Three.js), scale-out; HyperFrames (HTML + GSAP) frames, Kokoro or ElevenLabs voice-over (English and/or Hinglish), SFX, rendered to 1080p MP4 plus an FFmpeg Instagram Reel (9:16). Use when the user asks for a system design video / animation / explainer / reel, or invokes /system-design-video. Args - the system, optionally "hinglish", "both", "elevenlabs", "no-reel", "beginner|intermediate|advanced".
---

# System-design explainer video

`/system-design-video Design TinyURL [hinglish|both] [elevenlabs] [no-reel] [beginner|intermediate|advanced]`

Sister skill of `leetcode-video` (same engine, look and channel outro). Output in
`system-design-videos/<slug>/out/`: `<slug>.mp4` (1920×1080), `<slug>_reel.mp4` + `_reel_cover.jpg`
(1080×1920 Reel), `<slug>_hinglish.mp4` when asked. Send them to the user, commit the project, push.

Defaults, no questions unless the system is ambiguous: English narration with **Kokoro** (local, free,
`am_michael`, speed 1.12); `elevenlabs` → ElevenLabs. Hinglish → ElevenLabs (Kokoro `hm_omega` fallback).
Reel for the English track unless `no-reel`. Level default Intermediate.

**Reference project** – read it before writing scenes: `system-design-videos/tiny-url/`
(`video.json`, `narration.json`, `compositions/*.html`, `assets/tinyurl3d.js`).

## Stack

| Job | Tool | Where |
|---|---|---|
| Frames | HyperFrames (HTML + GSAP, seek-driven, headless Chrome) | `compositions/*.html`, `index.html` (generated) |
| 3D architecture | Three.js r159 + `SD.Arch` (nodes, edges, packets) driven from the timeline | `assets/lib/sd3d.js`, `assets/<system>3d.js` |
| Voice | Kokoro-82M via `hyperframes tts` (`tools/voice.py`) or ElevenLabs MCP | `assets/audio/<track>/s<i>.mp3` |
| Cues | `tools/cues.py`: each clause's start as a fraction of the narration, snapped to pauses | stdout |
| Sound | Freesound (CC0/CC BY) → bundled library (`tools/sfx.py`) | `assets/sfx/` + `CREDITS.md` |
| Timing | `tools/build.py`: scene i lasts clip i + pad; SFX peak-aligned | `index.html`, `timing_<track>.json` |
| Reel | FFmpeg (`tools/insta.py`): 9:16, burned captions, −14 LUFS, cover | `out/<slug>_reel.mp4` |

`T=.claude/skills/system-design-video/tools`. HyperFrames CLI (`$HF`): `npx --yes hyperframes@0.9.67`
(or the `hyperframes` skill's launcher if installed). Needs Node ≥ 22, FFmpeg, Chrome (`$HF doctor`), and
for Kokoro `pip install kokoro-onnx soundfile` (model downloads from github.com on first run).

## 1. Plan (8 scenes, ≤ 2:50 total so the Reel fits under 3:00)

Interview order – the way a strong candidate answers. Pick ONE concrete running example (one URL, one
user, one message) and carry it through every scene; numbers on screen must add up.

| Scene | Content |
|---|---|
| `s1-requirements` | title card visible from frame 0 (thumbnail) with the **"Asked at" companies** → the product in one picture (e.g. long URL → short URL) → `.sd-req` Functional / Non-functional columns, compact "Asked at" strip underneath |
| `s2-estimates` | `.sd-stats` 4 cards with count-up numbers (QPS writes/reads, storage, key space…) + one visual (read:write bar, alphabet math) |
| `s3-api` | `.sd-api` endpoint cards (lines revealed as narrated) + `.sd-table` schema + why that DB type |
| `s4-architecture` | the 3D diagram builds node by node as each component is named; a few requests flow at the end |
| `s5…` flows | one scene per core flow (write path, read path): packets hop node to node, nodes glow on arrival; right `.sd-steps` list + a detail panel (encoding, response…) |
| `s7-scale` | scale-out in 3D (shards, replicas, queue + workers, CDN…) + `.sd-chip` row under the header |
| `s8-recap` | 4 recap `.sd-stat` cards + the **channel outro** (required) |

Say the trade-offs out loud (hash vs counter, 301 vs 302, SQL vs KV, push vs pull) – that is what the
viewer is here for. Double-check every estimate with Python before it goes on screen.

## 2. "Asked at" companies (required in the intro)

Every video shows which companies are reported to ask the question. Before scaffolding, WebSearch
(`"design <system>" system design interview asked at companies`) and keep 3–6 companies that a
question bank or interview report names for *this* question – e.g. Hello Interview, EnjoyAlgorithms,
Exponent, LeetCode Discuss, Glassdoor, Blind. Order by how many sources agree. Never invent or pad the
list; if nothing credible names a company, drop the row (pass no `--asked-at`) and tell the user.
Plain-text wordmark chips only, no company logos. Save the URLs in `video.json` `"asked_at_sources"`
and list them for the user at delivery – these are community reports, not official statements.

Where it shows: the scaffolded `s1` stub puts an `.sd-asked` row on the title card (chips pop in from
0.5 s, card holds to 3.4 s, so it is also on the Reel cover at 2.5 s) and a compact `.sd-asked.sm`
strip above the caption band once the requirements are up (`LC.askedAt(tl, sel, atSec)`). Optionally
say it in the first narration sentence ("…a favourite at Google and Amazon.").

## 3. Scaffold + narration

```
python3 $T/new_project.py system-design-videos/<slug> --title "Design TinyURL" --level Beginner --scenes 8 \
    --asked-at "Google,Amazon,Meta,Netflix,Adobe"
```
Rename `s5-flow1`/`s6-flow2` to what they show (`s5-shorten`, `s6-redirect`) in `compositions/` and
`video.json`. Fill `narration.json` `{"en": [...], "hinglish": [...]}` – 40–60 words per scene, spoken
style, sentences in the order the visuals appear. Spell for TTS: "tiny U R L dot com", "base sixty-two",
"three-oh-two", "Q P S", "D S Algo A I". Hinglish: Hindi in Devanagari, technical words in English.
**The last scene's narration ends with the channel call-out:**
English "Thanks for watching! Subscribe to D S Algo A I on YouTube and Instagram for more such videos."
Hinglish "देखने के लिए धन्यवाद! ऐसी और videos के लिए, YouTube और Instagram पर D S Algo A I को subscribe करो."

## 4. Voice, then cues

- **Kokoro** (default English): `python3 $T/voice.py <proj> en` (voice + `speed` from `video.json`).
  Sum the clip lengths; if clips + 0.6 s/scene + 3 s outro > 175 s, raise `speed` (≤ 1.15) or cut words.
- **ElevenLabs**: English Daniel `onwK4e9ZLuTAKqWW03F9`, Hinglish Prashant `j7yQHuKNC1hdt1LBPAks`,
  `eleven_v4`, one scene at a time (generate → poll → `curl -sSfo .../s<i>.mp3 "<content_url>"`),
  never re-send a completed scene. Needs `elevenlabsusercontent.com` allowed.
- `python3 $T/cues.py <proj> en` prints every clause's start as a fraction of S. Time each visual to the
  clause that names it (`0.41 * S` when "key generation service" is said).

## 5. Scenes

HyperFrames scene rules are the same as `leetcode-video`: everything in `<template>`, root
`<div id="root" data-composition-id="<id>">`, one paused GSAP timeline in `window.__timelines["<id>"]`,
prefixed ids, `const { T, S = T } = window.__hyperframes.getVariables()` with both declared in
`data-composition-variables`, times as fractions of **S**. No `Math.random`/`Date.now`/timers; `fromTo`
not `from`; text ≥ 28 px; captions only in the caption band; `data-hold` on deliberate stills.

Shared CSS: `lc.css` (header `.lc-header/.lc-badge/.lc-title/.lc-diff lc-easy|medium|hard`, `.lc-caption`,
`.lc-panel`, `.lc-outro`, `.lc-titlecard`, `.lc-fill`) + `sd.css` (`.sd-req/.sd-li`, `.sd-stats/.sd-stat`
(`.green/.blue/.pink`), `.sd-api/.sd-method sd-post|sd-get/.sd-path`, `.sd-table/.sd-th/.sd-row`,
`.sd-steps/.sd-step` (`.hit/.miss`), `.sd-token`, `.sd-chip`, `.sd-asked/.sd-co` (`.sm` compact)). Header in every scene:
`<span class="lc-badge">System Design</span><span class="lc-title">Design X</span><span class="lc-diff lc-easy">Beginner</span>`.
`window.LC` helpers: `captions`, `values`, `listItems`, `outro`, `askedAt`, `drive`, `prog/smooth/clamp`.

### 3D architecture (`assets/lib/sd3d.js`)

Put the layout in `assets/<system>3d.js` (listed in `video.json` `"scripts"`), shared by every 3D scene:

```js
window.TinyArch = (canvas, opts = {}) => {
  const A = SD.Arch(canvas, Object.assign({ nodes: NODES, edges: EDGES,
    cam: { dist: 18.5, elev: 0.86, target: [-1.4, 0, 0.9] } }, opts));
  A.base = (extra) => ({ ...everyCoreNodeAt1_scaleOutAt0, ...extra });
  return A;
};
```
- Node: `{ id, kind, x, z, label, color?, scale?, labelPos: "front"? }`; kinds `client lb server cache db
  kgs queue worker cdn` (each its own low-poly shape + colour). x runs left→right in request order
  (client −6.4 … storage +3), z back→front; keep ≥ 1.8 between nodes. A group of N servers: label only
  the front one with `labelPos: "front"`.
- `A.draw({ appear, fade, glow, packets, hot, orbit, dist, target })` inside `LC.drive(tl, T, t => …)`.
- Flows as hops `[from, to, startSec, durSec, label, color]`: `packets: SD.hop(t, hops)`,
  `hot: SD.lit(t, hops)`, `glow: SD.glowFrom(t, hops)`. Colours: request `#38bdf8`, data/OK `#22c55e`,
  miss/error `#ef4444`, response `#facc15`, async `#fb923c`. Short labels ("GET /g7Rk2Xp", "HIT", "302").
- Scenes with a right-hand panel: `TinyArch(canvas, { shiftX: 330 })`, panels at `left: 1340px; width: 500px`.
- Replacing a node (one DB → shards): animate its `appear` back to 0 while the new ones rise.

## 6. Sound

`video.json` `"sfx"`: `{"scene", "at": fraction of S | "sec", "sound", "volume"}` – whoosh on title and
3D entrances, pop / click-soft on cards and steps, ping when a key value lands (ID, cache hit), one
impact on the payoff, sparkle on the outro. `python3 $T/sfx.py <proj>` tries Freesound, else copies the
bundled library (`sfx-library/`). Keep `assets/sfx/CREDITS.md`.

## 7. Build, check, look, render

```
python3 $T/build.py <proj> en
cd <proj> && $HF check --json            # fix errors; fix text_below_floor, first_frame_empty, dead_stretch
$HF snapshot --at <t1,t2,…>              # 2 per scene (times from timing_en.json); read the contact sheet,
                                         # then one full frame of each 3D scene: labels overlapping? cut off?
$HF render -o out/<slug>.mp4             # ~5 min for 2:45 (software WebGL); run in background
python3 $T/insta.py <proj> en            # Reel + cover
python3 $T/build.py <proj> hinglish && $HF render -o out/<slug>_hinglish.mp4   # if asked
python3 $T/build.py <proj> en            # leave index.html on English
```
Verify with `ffprobe` (1920×1080 h264 + aac, duration ≈ timing total) and loudness
(`ffmpeg -i out/<slug>.mp4 -af ebur128=peak=true -f null - 2>&1 | tail`); outside −16…−14 LUFS →
`ffmpeg -i in.mp4 -c:v copy -af loudnorm=I=-15:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 48000 -movflags +faststart out.mp4`.

## 8. Deliver

SendUserFile the MP4s (+ cover), commit `system-design-videos/<slug>/` (not `.hyperframes/`), push.
Report: length, the "Asked at" companies with their source links, voice + engine, SFX source (Freesound or bundled – and why), anything skipped, and that
audio was measured, not heard.
