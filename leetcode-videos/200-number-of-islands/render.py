"""LeetCode 200 - Number of Islands. Reference example for the leetcode-video skill.

    python3 render.py                                             # -> number_of_islands.mp4
    python3 render.py audio_hinglish number_of_islands_hinglish.mp4
    python3 render.py --preview
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.claude/skills/leetcode-video"))
import kit  # noqa: E402
from kit import (W, BG, PANEL, PANEL_EDGE, TEXT, MUTED, YELLOW, GREEN, BLUE, BLUE_TXT, HIGHLIGHTS,  # noqa: E402
                 prog, ease, lerp, fade, pulse, step_at, text_c, panel, cross, font, caption, value_box,
                 list_panel)

HDR = (200, "Number of Islands", "Medium")

GRID = [
    [1, 1, 0, 0, 0],
    [1, 1, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 1, 1],
]
ROWS, COLS = len(GRID), len(GRID[0])
# DFS visits neighbours right, down, left, up (matches the code scene).
ISLANDS = [[(0, 0), (0, 1), (1, 1), (1, 0)], [(2, 2)], [(3, 3), (3, 4)]]
ORDER = [(r, c) for r in range(ROWS) for c in range(COLS)]
GX, GY, CELL, GAP = 200, 210, 140, 10
SIDE_X = GX + COLS * (CELL + GAP) + 130


def island_grid(d, t, sunk, scan=None, scan_alpha=1.0, appear=1.0):
    """sunk: {(r,c): (island idx, progress)}"""
    colors, labels = {}, {}
    for r in range(ROWS):
        for c in range(COLS):
            colors[(r, c)] = GREEN if GRID[r][c] else BLUE
    for cell, (idx, p) in sunk.items():
        colors[cell] = lerp(GREEN, HIGHLIGHTS[idx], p)
        if p >= 1:
            labels[cell] = "0"
    outline = {scan: fade(YELLOW, scan_alpha)} if scan and scan_alpha > 0 else {}
    kit.draw_grid(d, GX, GY, GRID, CELL, GAP, colors, labels, outline, appear)


def sink(t, sunk, calls, island, start, step):
    for j, (r, c) in enumerate(ISLANDS[island]):
        if t >= start + j * step:
            sunk[(r, c)] = (island, prog(t, start + j * step, step * 0.8))
            calls.append((f"dfs({r}, {c})", ease((t - start - j * step) / 0.3)))


def scene_intro(img, d, t, T):
    if t < 4.3:
        kit.make_title_scene(200, "Number of Islands", ["Graph", "DFS"])(img, d, t, T)
        return
    kit.header(d, *HDR, k=prog(t, 4.3, 0.6))
    island_grid(d, t, {}, appear=prog(t, 4.4, 1.6))
    lk = prog(t, 5.5, 0.6)
    lx = SIDE_X
    panel(d, (lx, GY, lx + 620, GY + 220), fill=fade(PANEL, lk), edge=fade(PANEL_EDGE, lk))
    for i, (col, s) in enumerate([(GREEN, "1  =  land"), (BLUE, "0  =  water")]):
        y = GY + 40 + i * 80
        d.rounded_rectangle((lx + 40, y, lx + 100, y + 60), 12, fill=fade(col, lk))
        d.text((lx + 130, y + 30), s, font=font(40, "SemiBold"), fill=fade(TEXT, lk), anchor="lm")
    ck = prog(t, 0.52 * T, 0.6)
    if ck > 0:
        cx, cy = lx + 420, GY + 430
        panel(d, (lx, GY + 260, lx + 620, GY + 600), fill=fade(PANEL, ck), edge=fade(PANEL_EDGE, ck))
        s = 70
        d.rounded_rectangle((cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2), 12, fill=fade(GREEN, ck))
        for dx, dy in [(0, -1), (1, 0), (0, 1), (-1, 0)]:
            nx, ny = cx + dx * 110, cy + dy * 110
            d.rounded_rectangle((nx - s / 2, ny - s / 2, nx + s / 2, ny + s / 2), 12, fill=fade(GREEN, ck * 0.7))
            d.line((cx + dx * 40, cy + dy * 40, nx - dx * 40, ny - dy * 40), fill=fade(YELLOW, ck), width=6)
        for dx, dy in [(1, 1), (-1, -1), (1, -1), (-1, 1)]:
            cross(d, cx + dx * 110, cy + dy * 110, ck)
        d.text((lx + 30, GY + 290), "connected", font=font(28, "Medium"), fill=fade(MUTED, ck), anchor="lm")
        d.text((lx + 30, GY + 325), "4 directions", font=font(28, "Medium"), fill=fade(MUTED, ck), anchor="lm")
    caption(d, "Goal: count the islands  →  ?", prog(t, 0.82 * T, 0.6))


scene_idea = kit.make_steps_scene(HDR, [
    ("Scan every cell, row by row", 0.10),
    ("Unvisited land?  →  new island, count += 1", 0.33),
    ("DFS from it: sink every connected land cell", 0.58),
    ("Sunk cells are never counted again", 0.82),
])


def walk_scene(island, done, scan_cells, scan_window, found_frac, sink_start, sink_step, count_before, captions,
               scan_after=None, answer_at=None):
    def scene(img, d, t, T):
        kit.header(d, *HDR)
        sunk = {cell: (i, 1.0) for i in range(done) for cell in ISLANDS[i]}
        calls = []
        sink(t, sunk, calls, island, sink_start * T, sink_step * T)
        a, b = scan_window
        scan = scan_cells[step_at(t, a * T, b * T, len(scan_cells))]
        alpha = 1.0
        if scan_after and t > scan_after[1] * T:
            cells, s, e = scan_after
            scan = cells[step_at(t, s * T, e * T, len(cells))]
        if answer_at:
            alpha = 1 - prog(t, answer_at * T, 0.4)
        island_grid(d, t, sunk, scan, alpha)
        found = found_frac * T + 0.5
        value_box(d, SIDE_X, GY, "Islands", count_before + (t >= found), prog(t, found, 0.5))
        list_panel(d, SIDE_X, GY + 210, "DFS calls", calls)
        if answer_at and t >= answer_at * T:
            caption(d, "Answer: 3 islands", prog(t, answer_at * T, 0.6))
        else:
            txt = [c for at, c in captions if t >= at * T]
            caption(d, txt[-1] if txt else captions[0][1], 1)
    return scene


scene_island1 = walk_scene(0, 0, [(0, 0)], (0, 0.1), 0.27, 0.47, 0.09, 0, [
    (0.0, "Start scanning at (0, 0)  —  it's land!"),
    (0.47, "DFS sinks the whole island: right, down, left, up")])
scene_island2 = walk_scene(1, 1, ORDER[1:13], (0.08, 0.48), 0.5, 0.66, 0.12, 1, [
    (0.0, "Water and sunk cells are skipped"),
    (0.5, "Fresh land at (2, 2)  →  count = 2"),
    (0.66, "No land neighbours  →  DFS stops")])
scene_island3 = walk_scene(2, 2, ORDER[13:19], (0.04, 0.2), 0.22, 0.42, 0.13, 2, [
    (0.0, "Land at (3, 3)  →  count = 3"),
    (0.42, "DFS spreads right and sinks (3, 4)")],
    scan_after=(ORDER[19:], 0.68, 0.8), answer_at=0.84)

CODE = '''
def numIslands(grid):
    m, n = len(grid), len(grid[0])
    count = 0

    def dfs(r, c):
        if r < 0 or r >= m or c < 0 or c >= n \\
           or grid[r][c] == "0":
            return
        grid[r][c] = "0"            # sink it
        dfs(r, c + 1); dfs(r + 1, c)
        dfs(r, c - 1); dfs(r - 1, c)

    for r in range(m):
        for c in range(n):
            if grid[r][c] == "1":
                count += 1
                dfs(r, c)
    return count
'''
scene_code = kit.make_code_scene(HDR, CODE, [((12, 13), 0.0, 0.22), ((14, 16), 0.22, 0.47),
                                             ((5, 7), 0.47, 0.70), ((8, 10), 0.70, 1.01)],
                                 funcs=("dfs", "numIslands"))
scene_complexity = kit.make_complexity_scene(HDR, "O(m · n)", "each cell visited a constant number of times",
                                             "O(m · n)", "recursion stack in the worst case")

SCENES = [scene_intro, scene_idea, scene_island1, scene_island2, scene_island3, scene_code, scene_complexity]

if __name__ == "__main__":
    kit.main(SCENES, __file__, "number_of_islands.mp4")
