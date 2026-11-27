---
name: system-design-video
description: Make a narrated system-design explainer Reel (rate limiter, load balancer, cache, URL shortener, CI/CD, Kafka…) in the "blueprint glow" style - near-black stage with an amber glow, a 3D wireframe pipeline strip that lights up stage by stage, a clean bold intro title, STEP chips, terminal panels and glowing 3D cubes - rendered natively at 1080x1920 with HyperFrames + Three.js, ElevenLabs voice (Hinglish by default) and bundled SFX. Use when the user asks for a system design video / reel / explainer or invokes /system-design-video. Args - the topic, optionally "english", "both".
---

# System-design reel ("blueprint glow")

Style merges two references the user liked: a CI/CD reel (3D wireframe pipeline strip, terminals, STEP chips,
glowing cubes) and a backendlore reel (part tracker, quote box, ticking counters, glowing
dot-crowd with rays, dot-grid black background). LeetCode videos keep their own style – never change `leetcode-video` for this.

`/system-design-video rate limiter [english|both]`

Output: `system-design-videos/<slug>/out/<slug>_hinglish_reel.mp4` + `_reel_cover.jpg` (1080×1920, ≤ 2:30).
Send them, commit the project, push. **Reference project – read it first:** `system-design-videos/rate-limiter/`
(`compositions/*.html`, `assets/rl3d.js`, `video.json`, `narration.json`).

Defaults (no questions unless the topic is ambiguous): Hinglish, ElevenLabs Prashant, native 9:16 only,
**no captions**, channel outro at the end. This skill reuses the `leetcode-video` machinery (build, SFX,
loudness, HyperFrames rules) – its SKILL.md sections 3, 5, 6 apply unchanged.

## The look (keep it consistent)

| Element | Where | How |
|---|---|---|
| Stage | whole frame | near-black `#050506` + amber radial glow (`sd.css`, already applied) |
| Top bar | y 150–220 | `.sd-top` (`@DSALGO_AI`) + `.sd-part` part tracker on the right (`1/3 · THE PROBLEM` → `2/3 · THE IDEA` → `3/3 · AT SCALE`, pills fill) + `.sd-rail` 7 segments, scene i fills segment i (`SD.rail`) |
| Strip tag | y 262 | `.sd-tag` amber bracket label, e.g. `TOKEN BUCKET · RATE LIMITING` |
| Pipeline strip | y 290–630 | `SD.strip([{name,color}…])` – 4–6 wireframe stages on a rail; status per stage: 0 idle (dot), 1 active (spinner + glowing core), 2 done (check + lit rail), 3 error (red pulse). It is the map of the system: light the stage the narration is talking about |
| Work frame | y 650–1250 | `.sd-frame` viewfinder corners; `.sd-chip` (`STEP 0N · …`, colours: default green, `amber`, `red`, `pink`) + `.sd-meta` on the right (live counters via `SD.vals`) |
| Main 3D | inside the frame | second viewport of the same canvas (`view: [top, height]`): wire boxes (`SD.wireBox`), glowing cubes (`SD.glowCube`), floor grid (`SD.grid`), labels (`SD.label`) |
| Terminal | inside the frame | `.sd-term` with `h5` header, `.sd-cmd` typed with `SD.type`, `.sd-out` (`ok`/`err`/`warn`) |
| Heading | inside the frame | `.sd-head` amber mono `h4` + muted `p` lines with `<b>` values |
| Recap list | inside the frame | `.sd-rows` / `.sd-row` (`.hot` for the recommended one) |
| Quote box | inside the frame | `.sd-quote` (`<label>INTERVIEWER:</label>` or `TUMNE BOLA:` + amber-bordered `<div>` with the line in Roman Hinglish; `.red` = the naive answer that fails) |
| Counter | inside the frame | `.sd-count` mono label + big amber number ticking with `SD.count` (Indian grouping 2,33,600); turn border/number red when the limit breaks |
| Crowd + rays | main 3D | `SD.dotField` – glowing dot cloud (users, restaurants, servers) + `SD.rays` – lines shooting from the dots to one target, amber → red under load |
| Hook | s1 | quote box with the interview question + a **clean title** `.sd-title` (normal text, `<small>` tagline) – no particle lettering for titles (the user found it odd); then the strip appears |

Palette per stage: green `#34d399`, amber `#ff9f2e`, cyan `#22d3ee`, pink `#f472b6`, violet `#a78bfa`, yellow `#facc15`; red `#f87171` for errors.
Background: black with a faint dot grid and the amber glow (sd.css). No headlines and no captions – narration carries the words.
All text ≥ 28 px, mono for labels. Everything readable inside y 270–1248, x 65–1015.

## 1. Plan (7 scenes, ~2:00)

| Scene | Content |
|---|---|
| `s1-hook` | "अगर interviewer पूछे … कैसे design करोगे?" + one-line definition; clean `.sd-title`; strip fades in at the end |
| `s2-problem` | what breaks without it (red chip, error stage on the strip, a terminal with the failure) |
| `s3-idea` | the core mechanism as a 3D object + `.sd-head` parameters |
| `s4…s5` | walk one concrete example step by step (counters in `.sd-meta`, terminal log lines) |
| `s6-scale` | how it works in production / distributed (Redis, replicas, queues…), strip moves right |
| `s7-recap` | alternatives / trade-offs as `.sd-row`s, then the **channel outro** (same markup as leetcode-video, class `lc-outro sd-outro`, `data-hold`) |

Write a topic stage module `assets/<slug>3d.js` like `rl3d.js`: one `draw(state)` that renders the strip
(`R.view(strip.scene, strip.camera, 290, 340)`) and the main props from time-derived state (no timers, no Math.random –
use `SD.rand(seed)`). Keep props within x ±4.5, camera ≈ (0, 2.6, 7.4), view band ~300–420 px tall.

## 2. Scaffold + narration

```
python3 .claude/skills/system-design-video/tools/new_sd_project.py system-design-videos/<slug> --title "<Topic>" \
  --scenes s1-hook s2-problem s3-idea s4-walk s5-walk s6-scale s7-recap
```
`narration.json` `{"hinglish": [7 texts]}` – 35–50 words each, Hindi in Devanagari, technical words in English,
numbers spoken ("four twenty nine", "O of one"). Last scene ends with the call-out:
"देखने के लिए धन्यवाद! ऐसी और videos के लिए, YouTube और Instagram पर D S Algo A I को subscribe करो."
Time every event as a fraction of S at the phrase where it is said (compute phrase positions from the text).

## 3. Voice, sound, build, render

Exactly as in `leetcode-video` (§3, §5, §6): ElevenLabs Prashant `j7yQHuKNC1hdt1LBPAks`, `eleven_v4`,
`generations_count 1`, one scene at a time → `assets/audio/hinglish/s<i>.mp3`. Cues in `video.json` `sfx`
(riser on the hook, typing under terminal commands, impact on failures, chime on success, sparkle on the outro).
```
T=.claude/skills/leetcode-video/tools
python3 $T/sfx.py <proj>
python3 $T/build.py <proj> hinglish --vertical
cd <proj> && $HF check --json && $HF snapshot --at …     # read the contact sheet before rendering
$HF render -o out/<slug>_hinglish_reel.mp4
ffmpeg -i … loudnorm=I=-14 … ; cover frame from a busy moment of s4
```

## 4. Deliver

SendUserFile the reel + cover, commit `system-design-videos/<slug>/`, push. Report length, voice, SFX source,
anything skipped, and that audio was measured, not heard. Offer an Instagram caption (hook + 3 key points + CTA).
