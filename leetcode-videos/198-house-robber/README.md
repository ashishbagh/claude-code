# LeetCode 198 – House Robber

Made with the `leetcode-video` skill (HyperFrames + Three.js, Kokoro voice `am_michael`, bundled SFX).

- `out/house_robber.mp4` – 1920×1080 explainer · `out/house_robber_reel.mp4` + `_reel_cover.jpg` – Instagram Reel
- Example: `nums = [2, 7, 9, 3, 1]` → 12 (rob 2 + 9 + 1); `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`
- `narration.json` script · `compositions/` scenes · `assets/houses3d.js` 3D street · `video.json` timing + SFX

Re-render: `python3 ../../.claude/skills/leetcode-video/tools/build.py . en && npx --yes hyperframes@0.9.67 render -o out/house_robber.mp4 && python3 ../../.claude/skills/leetcode-video/tools/insta.py . en`
