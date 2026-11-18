# LeetCode 200 – Number of Islands (animated explainer)

`number_of_islands.mp4` is a 1080p, 30 fps, ~2 min explainer video with an ElevenLabs narration
(voice: "Daniel – Steady Broadcaster", model `eleven_v4`).

- `audio/s1.mp3 … s7.mp3` – narration clip per scene (intro, idea, island 1, island 2, island 3, code, complexity)
- `render.py` – draws every frame with Pillow, times each scene to its clip, muxes with ffmpeg

Re-render: `python3 render.py` (needs Pillow + ffmpeg). `python3 render.py --preview` writes still frames to `preview/`.
