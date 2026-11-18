---
name: leetcode-video
description: Make an animated, narrated explainer video (1080p MP4) for a LeetCode problem, with ElevenLabs voice-over in English and/or Hinglish. Use when the user gives a LeetCode problem (name, number or link) and asks for a solution video / animation / explainer, or invokes /leetcode-video. Args - the problem, optionally "hinglish" or "both".
---

# LeetCode explainer video

Input: a LeetCode problem (e.g. `/leetcode-video 199 Binary Tree Right Side View`, optionally `hinglish` / `both`).
Output: `leetcode-videos/<number>-<slug>/<slug>.mp4` (+ `<slug>_hinglish.mp4`), sent to the user, committed and pushed.

Do not ask the user questions unless the problem is ambiguous. Defaults: English only, unless the args say
`hinglish` (Hinglish only) or `both`.

Reference implementation: `leetcode-videos/200-number-of-islands/render.py` – read it first and follow its shape.
Shared toolkit: `.claude/skills/leetcode-video/kit.py` (drawing helpers, reusable scenes, audio-synced renderer).
Example narration: `leetcode-videos/200-number-of-islands/SCRIPT.md`.

## 1. Plan the video (7 scenes, ~2 min)

Pick ONE small example input that exercises the interesting cases (like the 4×5 grid with 3 islands).
Solve it by hand and get the exact trace right – the animation must match the code's real visiting order.

| # | Scene | Visual |
|---|-------|--------|
| 1 | Problem | title card (~4 s) → header + example input drawn + rules/legend + "Goal: …" caption |
| 2 | Key idea | `kit.make_steps_scene` with 3–4 numbered cards |
| 3–5 | Walkthrough | the data structure animating step by step, side panels (`value_box` for the answer/counter, `list_panel` for stack / queue / calls), caption at bottom |
| 6 | Code | `kit.make_code_scene` (Python, ≤18 lines, ≤70 cols), highlight block per sentence of narration |
| 7 | Complexity | `kit.make_complexity_scene` + "Thanks for watching!" |

Walkthrough can be 2–4 scenes; keep each narration clip 12–22 s (≈35–55 words).

## 2. Write narration

Write `SCRIPT.md` in the problem folder: one paragraph per scene, plain sentences, spoken style.
- Say numbers in words where TTS might stumble ("LeetCode one ninety nine", "O of n").
- Spell "D F S", "B F S" with spaces.
- Order the sentences to match the order things appear on screen, and note in SCRIPT.md the rough
  fraction of the clip where each visual event happens – use those fractions in the scene code.
- **Hinglish**: Hindi in Devanagari, technical terms in English, e.g.
  "चलो solve करते हैं LeetCode two hundred, Number of Islands. हमें ones और zeros का एक grid दिया गया है."
  Keep the same sentence order as the English so the same animation timings work.

## 3. Generate voice with ElevenLabs (MCP tools)

Load tools via ToolSearch: `creative_create_flow`, `creative_generate_speech`, `creative_get_flow_run_status`.

- One flow per problem: `creative_create_flow(name="LeetCode <n> - <title> narration")`.
- Voices (verified):
  - English: **Daniel – Steady Broadcaster** `onwK4e9ZLuTAKqWW03F9`
  - Hinglish: **Prashant – Warm, Clear Hindi Explainer** `j7yQHuKNC1hdt1LBPAks`
  - If the user names another voice, find it with `creative_list_voices`.
- `model_id="eleven_v4"`, `generations_count=1`.
- **Send scenes ONE AT A TIME** (generate → poll until completed → download → next). Firing many
  requests in parallel tripped the account's "unusual activity / Free Tier disabled" error before.
- Never re-send a scene that completed. If a scene fails, retry that scene once on its own; if it
  fails again, stop and tell the user.
- Download each clip from the run status `content_url` right away (signed URLs expire):
  `curl -sSfo audio/s<i>.mp3 "<content_url>"` (Hinglish → `audio_hinglish/s<i>.mp3`).
- `elevenlabsusercontent.com` must be allowed by the network. If curl gets a proxy 403, call
  `get_environment`; the personal environment "claude-code (ElevenLabs audio)" allows it – switch to it,
  or propose adding the host.

## 4. Build the renderer

Create `leetcode-videos/<number>-<slug>/render.py` modelled on the example:

```python
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.claude/skills/leetcode-video"))
import kit
from kit import *   # palette + helpers
HDR = (199, "Binary Tree Right Side View", "Medium")
...
SCENES = [scene_intro, scene_idea, ..., scene_code, scene_complexity]
if __name__ == "__main__":
    kit.main(SCENES, __file__, "binary_tree_right_side_view.mp4")
```

Scene functions are `scene(img, d, t, T)`: `t` = seconds into the scene, `T` = scene length (clip + 0.7 s).
Time every event as a **fraction of T** (`prog(t, 0.45 * T, 0.6)`) so the same code works for both
languages. Toolkit pieces:

- timing: `prog`, `ease`, `pulse`, `step_at` (pointer moving through a list), `lerp`, `fade`
- chrome: `header(d, *HDR)`, `caption(d, text, k)`, `panel`, `value_box`, `list_panel`, `cross`
- structures: `draw_grid` (matrices), `draw_array` (arrays/strings with index labels + pointer arrows),
  `draw_tree` (binary tree from LeetCode level-order list incl. `None`), colour with `HIGHLIGHTS`
- scenes: `make_title_scene`, `make_steps_scene`, `make_code_scene`, `make_complexity_scene`
- Inter has no ✕/✓ glyphs – draw them (`cross`). Linked lists/graphs: draw circles + lines like `draw_tree`.

Layout: header on top, main structure on the left (x≈200, y≈210), side panels at x≈1080–1440, caption at the
bottom (y=1000). Nothing should overlap the caption strip.

## 5. Preview, fix, render

1. `python3 render.py --preview` → stills at 30/60/90 % of each scene in `preview/`. Look at them
   (combine into a 2×2 montage to save reads). Check: no overlaps, no missing glyph boxes, trace matches the code.
2. `python3 render.py` (English, `audio/`) and/or `python3 render.py audio_hinglish <slug>_hinglish.mp4`.
   ~1.5 min render per 2 min of video.
3. `ffprobe` the output (1920×1080 h264 + aac, duration ≈ sum of clips).
4. Delete `preview/`, add a short README.md, send the MP4(s) to the user with `SendUserFile` (display: render).
5. Commit `leetcode-videos/<number>-<slug>/` and push to the session's branch.

## Report back

Problem, length, voice(s) used, the ElevenLabs flow URL, anything that failed (e.g. skipped scene, push
refused), and that you could not listen to the audio yourself.
