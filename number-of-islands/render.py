"""Render the LeetCode 200 (Number of Islands) explainer video.

Frames are drawn with Pillow and piped to ffmpeg; each scene lasts as long as
its ElevenLabs narration clip (audio/s1.mp3 ... audio/s7.mp3) plus padding.

    python3 render.py                                   # English  -> number_of_islands.mp4
    python3 render.py audio_hinglish number_of_islands_hinglish.mp4   # Hinglish
    python3 render.py --preview                         # one PNG per scene in preview/
"""
import math
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS = 1920, 1080, 30
PAD = 0.7  # seconds of silence after each narration clip

# ---------- palette ----------
BG = (13, 17, 33)
PANEL = (24, 30, 52)
PANEL_EDGE = (44, 54, 88)
TEXT = (235, 240, 255)
MUTED = (140, 152, 190)
WATER = (30, 58, 120)
WATER_TXT = (110, 150, 220)
LAND = (34, 197, 94)
SCAN = (250, 204, 21)
ISLAND_COLORS = [(251, 146, 60), (236, 72, 153), (167, 139, 250)]
ACCENT = (56, 189, 248)

FONT_DIR = "/usr/share/fonts/opentype/inter/"
MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf"
MONO_B = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf"
_fonts = {}


def font(size, weight="SemiBold"):
    key = (size, weight)
    if key not in _fonts:
        path = {"mono": MONO, "monob": MONO_B}.get(weight, FONT_DIR + f"Inter-{weight}.otf")
        _fonts[key] = ImageFont.truetype(path, size)
    return _fonts[key]


# ---------- helpers ----------
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def prog(t, start, dur):
    return ease((t - start) / dur) if dur > 0 else float(t >= start)


def lerp(a, b, k):
    return tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(len(a)))


def fade(c, k, bg=BG):
    return lerp(bg, c, k)


def text_c(d, xy, s, f, fill):
    d.text(xy, s, font=f, fill=fill, anchor="mm")


def panel(d, box, r=24, fill=PANEL, edge=PANEL_EDGE):
    d.rounded_rectangle(box, r, fill=fill, outline=edge, width=2)


# ---------- grid model ----------
GRID = [
    [1, 1, 0, 0, 0],
    [1, 1, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 1, 1],
]
ROWS, COLS = len(GRID), len(GRID[0])
# DFS order with neighbours visited right, down, left, up (matches the code).
ISLANDS = [
    [(0, 0), (0, 1), (1, 1), (1, 0)],
    [(2, 2)],
    [(3, 3), (3, 4)],
]


class GridState:
    """What the grid looks like at one moment."""

    def __init__(self):
        self.sunk = {}      # (r,c) -> (island index, progress 0..1)
        self.scan = None    # (r,c) of the scan pointer, or None
        self.scan_alpha = 1.0
        self.dfs = None     # (r,c) currently being sunk
        self.appear = 1.0   # pop-in progress of the whole grid
        self.show_vals = True


def draw_grid(img, d, st, x0, y0, cell, gap=10):
    for r in range(ROWS):
        for c in range(COLS):
            k = ease(st.appear * 1.6 - (r * COLS + c) * 0.03)
            if k <= 0:
                continue
            cx = x0 + c * (cell + gap) + cell / 2
            cy = y0 + r * (cell + gap) + cell / 2
            land = GRID[r][c] == 1
            col = LAND if land else WATER
            label_col = (10, 40, 20) if land else WATER_TXT
            label = "1" if land else "0"
            s = cell * (0.6 + 0.4 * k)
            if (r, c) in st.sunk:
                idx, p = st.sunk[(r, c)]
                col = lerp(LAND, ISLAND_COLORS[idx], p)
                label_col = lerp(label_col, (40, 20, 10), p)
                if p >= 1:
                    label = "0"
                s *= 1 + 0.12 * math.sin(math.pi * p)
            col = fade(col, k)
            d.rounded_rectangle((cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2), 16, fill=col)
            if st.show_vals:
                text_c(d, (cx, cy), label, font(int(cell * 0.38), "Bold"), fade(label_col, k, col))
    if st.scan is not None and st.scan_alpha > 0:
        r, c = st.scan
        cx = x0 + c * (cell + gap) + cell / 2
        cy = y0 + r * (cell + gap) + cell / 2
        s = cell / 2 + 8
        d.rounded_rectangle((cx - s, cy - s, cx + s, cy + s), 20,
                            outline=fade(SCAN, st.scan_alpha), width=6)
    if st.dfs is not None:
        r, c = st.dfs
        cx = x0 + c * (cell + gap) + cell / 2
        cy = y0 + r * (cell + gap) + cell / 2
        s = cell / 2 + 8
        d.rounded_rectangle((cx - s, cy - s, cx + s, cy + s), 20, outline=TEXT, width=4)


def grid_size(cell, gap=10):
    return COLS * cell + (COLS - 1) * gap, ROWS * cell + (ROWS - 1) * gap


def header(d, k=1.0):
    d.rounded_rectangle((60, 40, 260, 92), 26, fill=fade((40, 30, 10), k), outline=fade(SCAN, k), width=2)
    text_c(d, (160, 66), "LeetCode 200", font(26, "Bold"), fade(SCAN, k))
    d.text((290, 66), "Number of Islands", font=font(40, "Bold"), fill=fade(TEXT, k), anchor="lm")
    d.rounded_rectangle((W - 220, 44, W - 60, 88), 22, fill=fade((60, 45, 10), k))
    text_c(d, (W - 140, 66), "Medium", font(24, "SemiBold"), fade((251, 191, 36), k))


def count_box(d, x, y, value, pop=0.0, label="Islands"):
    panel(d, (x, y, x + 360, y + 170))
    text_c(d, (x + 180, y + 40), label, font(30, "Medium"), MUTED)
    size = int(84 * (1 + 0.35 * math.sin(math.pi * clamp(pop))))
    text_c(d, (x + 180, y + 108), str(value), font(size, "ExtraBold"), SCAN)


def caption(d, s, k=1.0, y=H - 80):
    if k <= 0:
        return
    f = font(34, "Medium")
    w = d.textlength(s, font=f)
    d.rounded_rectangle((W / 2 - w / 2 - 30, y - 34, W / 2 + w / 2 + 30, y + 34), 34,
                        fill=fade(PANEL, k))
    text_c(d, (W / 2, y), s, f, fade(TEXT, k))


def stack_panel(d, x, y, frames):
    panel(d, (x, y, x + 360, y + 400))
    text_c(d, (x + 180, y + 40), "DFS calls", font(28, "Medium"), MUTED)
    for i, (label, k) in enumerate(frames[-5:]):
        by = y + 340 - i * 62
        d.rounded_rectangle((x + 30, by - 26, x + 330, by + 26), 14,
                            fill=fade((40, 52, 90), k), outline=fade(ACCENT, k), width=2)
        text_c(d, (x + 180, by), label, font(28, "mono"), fade(TEXT, k))


# ---------- scenes ----------
GX, GY, CELL = 200, 210, 140  # grid placement for walkthrough scenes


def sink_timeline(st, t, island, start, step, frames=None):
    """Sink the cells of one island one after another starting at time `start`."""
    for j, (r, c) in enumerate(ISLANDS[island]):
        p = prog(t, start + j * step, step * 0.8)
        if t >= start + j * step:
            st.sunk[(r, c)] = (island, p)
            if p < 1:
                st.dfs = (r, c)
            if frames is not None:
                frames.append((f"dfs({r}, {c})", ease((t - start - j * step) / 0.3)))


def scan_path(t, start, end, cells):
    """Move the scan pointer through `cells` evenly between start and end."""
    if t < start:
        return cells[0]
    i = int((t - start) / (end - start) * len(cells))
    return cells[min(i, len(cells) - 1)]


ORDER = [(r, c) for r in range(ROWS) for c in range(COLS)]


def scene_intro(img, d, t, T):
    k = prog(t, 0, 1.0)
    title_out = prog(t, 3.5, 0.8)
    if title_out < 1:
        a = k * (1 - title_out)
        text_c(d, (W / 2, H / 2 - 60), "Number of Islands", font(110, "ExtraBold"), fade(TEXT, a))
        text_c(d, (W / 2, H / 2 + 50), "LeetCode 200  ·  Graph  ·  DFS", font(44, "Medium"), fade(MUTED, a))
        return
    header(d, prog(t, 3.8, 0.6))
    st = GridState()
    st.appear = prog(t, 4.0, 1.6)
    draw_grid(img, d, st, GX, GY, CELL)
    gw, gh = grid_size(CELL)
    # legend
    lk = prog(t, 5.5, 0.6)
    lx = GX + gw + 140
    panel(d, (lx, GY, lx + 620, GY + 220), fill=fade(PANEL, lk), edge=fade(PANEL_EDGE, lk))
    d.rounded_rectangle((lx + 40, GY + 40, lx + 100, GY + 100), 12, fill=fade(LAND, lk))
    d.text((lx + 130, GY + 70), "1  =  land", font=font(40, "SemiBold"), fill=fade(TEXT, lk), anchor="lm")
    d.rounded_rectangle((lx + 40, GY + 120, lx + 100, GY + 180), 12, fill=fade(WATER, lk))
    d.text((lx + 130, GY + 150), "0  =  water", font=font(40, "SemiBold"), fill=fade(TEXT, lk), anchor="lm")
    # 4-direction connectivity diagram
    ck = prog(t, 0.52 * T, 0.6)
    if ck > 0:
        cx, cy = lx + 420, GY + 430
        panel(d, (lx, GY + 260, lx + 620, GY + 600), fill=fade(PANEL, ck), edge=fade(PANEL_EDGE, ck))
        s = 70
        d.rounded_rectangle((cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2), 12, fill=fade(LAND, ck))
        for dx, dy in [(0, -1), (1, 0), (0, 1), (-1, 0)]:
            nx, ny = cx + dx * 110, cy + dy * 110
            d.rounded_rectangle((nx - s / 2, ny - s / 2, nx + s / 2, ny + s / 2), 12,
                                fill=fade(LAND, ck * 0.7))
            d.line((cx + dx * 40, cy + dy * 40, nx - dx * 40, ny - dy * 40), fill=fade(SCAN, ck), width=6)
        for dx, dy in [(1, 1), (-1, -1), (1, -1), (-1, 1)]:
            nx, ny = cx + dx * 110, cy + dy * 110
            e = 16
            d.line((nx - e, ny - e, nx + e, ny + e), fill=fade((239, 68, 68), ck), width=6)
            d.line((nx - e, ny + e, nx + e, ny - e), fill=fade((239, 68, 68), ck), width=6)
        d.text((lx + 30, GY + 290), "connected", font=font(28, "Medium"), fill=fade(MUTED, ck), anchor="lm")
        d.text((lx + 30, GY + 325), "4 directions", font=font(28, "Medium"), fill=fade(MUTED, ck), anchor="lm")
    # outline islands and ask the question
    qk = prog(t, 0.82 * T, 0.6)
    if qk > 0:
        caption(d, "Goal: count the islands  →  ?", qk)


def scene_idea(img, d, t, T):
    header(d)
    steps = [
        ("1", "Scan every cell, row by row", 0.10),
        ("2", "Unvisited land?  →  new island, count += 1", 0.33),
        ("3", "DFS from it: sink every connected land cell", 0.58),
        ("4", "Sunk cells are never counted again", 0.82),
    ]
    for i, (n, s, at) in enumerate(steps):
        k = prog(t, at * T, 0.6)
        if k <= 0:
            continue
        y = 220 + i * 170
        x = 160 + (1 - k) * 60
        panel(d, (x, y, x + 1600, y + 130), fill=fade(PANEL, k), edge=fade(PANEL_EDGE, k))
        d.ellipse((x + 30, y + 25, x + 110, y + 105), fill=fade(SCAN, k))
        text_c(d, (x + 70, y + 65), n, font(44, "ExtraBold"), fade(BG, k, SCAN))
        d.text((x + 150, y + 65), s, font=font(46, "SemiBold"), fill=fade(TEXT, k), anchor="lm")


def scene_island1(img, d, t, T):
    header(d)
    st = GridState()
    st.scan = (0, 0)
    found = 0.27 * T
    if t >= found:
        st.sunk[(0, 0)] = (0, 0.0)
    frames = []
    sink_timeline(st, t, 0, 0.47 * T, 0.09 * T, frames)
    draw_grid(img, d, st, GX, GY, CELL)
    gw, _ = grid_size(CELL)
    count_box(d, GX + gw + 140, GY, 1 if t >= found + 0.5 else 0, prog(t, found + 0.5, 0.5))
    stack_panel(d, GX + gw + 140, GY + 210, frames)
    if t < 0.47 * T:
        caption(d, "Start scanning at (0, 0)  —  it's land!", prog(t, 0.1 * T, 0.5))
    else:
        caption(d, "DFS sinks the whole island: right, down, left, up", 1)


def scene_island2(img, d, t, T):
    header(d)
    st = GridState()
    for cell in ISLANDS[0]:
        st.sunk[cell] = (0, 1.0)
    path = ORDER[1:13]  # (0,1) .. (2,2)
    st.scan = scan_path(t, 0.08 * T, 0.48 * T, path)
    found = 0.5 * T
    frames = []
    sink_timeline(st, t, 1, 0.66 * T, 0.12 * T, frames)
    draw_grid(img, d, st, GX, GY, CELL)
    gw, _ = grid_size(CELL)
    count_box(d, GX + gw + 140, GY, 2 if t >= found + 0.5 else 1, prog(t, found + 0.5, 0.5))
    stack_panel(d, GX + gw + 140, GY + 210, frames)
    if t < found:
        caption(d, "Water and sunk cells are skipped", 1)
    elif t < 0.66 * T:
        caption(d, "Fresh land at (2, 2)  →  count = 2", 1)
    else:
        caption(d, "No land neighbours  →  DFS stops", 1)


def scene_island3(img, d, t, T):
    header(d)
    st = GridState()
    for i in (0, 1):
        for cell in ISLANDS[i]:
            st.sunk[cell] = (i, 1.0)
    path = ORDER[13:19]  # (2,3) .. (3,3)
    st.scan = scan_path(t, 0.04 * T, 0.2 * T, path)
    found = 0.22 * T
    frames = []
    sink_timeline(st, t, 2, 0.42 * T, 0.13 * T, frames)
    if t > 0.68 * T:
        st.scan = scan_path(t, 0.68 * T, 0.8 * T, ORDER[19:])
    st.scan_alpha = 1 - prog(t, 0.82 * T, 0.4)
    draw_grid(img, d, st, GX, GY, CELL)
    gw, _ = grid_size(CELL)
    count_box(d, GX + gw + 140, GY, 3 if t >= found + 0.5 else 2, prog(t, found + 0.5, 0.5))
    stack_panel(d, GX + gw + 140, GY + 210, frames)
    ak = prog(t, 0.84 * T, 0.6)
    if ak > 0:
        caption(d, "Answer: 3 islands", ak)
    elif t < 0.42 * T:
        caption(d, "Land at (3, 3)  →  count = 3", prog(t, 0.15 * T, 0.4))
    else:
        caption(d, "DFS spreads right and sinks (3, 4)", 1)


CODE = [
    "def numIslands(grid):",
    "    m, n = len(grid), len(grid[0])",
    "    count = 0",
    "",
    "    def dfs(r, c):",
    "        if r < 0 or r >= m or c < 0 or c >= n \\",
    "           or grid[r][c] == \"0\":",
    "            return",
    "        grid[r][c] = \"0\"            # sink it",
    "        dfs(r, c + 1); dfs(r + 1, c)",
    "        dfs(r, c - 1); dfs(r - 1, c)",
    "",
    "    for r in range(m):",
    "        for c in range(n):",
    "            if grid[r][c] == \"1\":",
    "                count += 1",
    "                dfs(r, c)",
    "    return count",
]
KEYWORDS = {"def", "if", "or", "return", "for", "in"}


def draw_code_line(d, x, y, line, f, fb):
    import re
    for tok in re.findall(r"#.*|\"[^\"]*\"|\w+|\s+|[^\w\s]", line):
        if tok.startswith("#"):
            col = (110, 120, 150)
        elif tok.startswith('"'):
            col = (134, 239, 172)
        elif tok in KEYWORDS:
            col = (244, 114, 182)
        elif tok in ("dfs", "numIslands", "len", "range"):
            col = ACCENT
        elif tok.isdigit():
            col = (251, 191, 36)
        else:
            col = TEXT
        d.text((x, y), tok, font=fb if tok in KEYWORDS else f, fill=col, anchor="lm")
        x += d.textlength(tok, font=f)


def scene_code(img, d, t, T):
    header(d)
    panel(d, (140, 140, 1780, 1000))
    f, fb = font(34, "mono"), font(34, "monob")
    hl = [((12, 13), 0.0, 0.22), ((14, 16), 0.22, 0.47), ((5, 7), 0.47, 0.70), ((8, 10), 0.70, 1.01)]
    lh = 46
    for lines, a, b in hl:
        if a * T <= t < b * T:
            k = prog(t, a * T, 0.4)
            y0 = 190 + lines[0] * lh - lh / 2 + 4
            y1 = 190 + lines[1] * lh + lh / 2 + 4
            d.rounded_rectangle((170, y0, 1750, y1), 12, fill=fade((50, 46, 20), k, PANEL),
                                outline=fade(SCAN, k, PANEL), width=2)
    for i, line in enumerate(CODE):
        draw_code_line(d, 210, 190 + i * lh + 4, line, f, fb)


def scene_complexity(img, d, t, T):
    header(d)
    cards = [("Time", "O(m · n)", "each cell visited a constant number of times", 0.05),
             ("Space", "O(m · n)", "recursion stack in the worst case", 0.42)]
    for i, (name, big, sub, at) in enumerate(cards):
        k = prog(t, at * T, 0.6)
        if k <= 0:
            continue
        x = 160 + i * 820
        y = 230 + (1 - k) * 40
        panel(d, (x, y, x + 780, y + 420), fill=fade(PANEL, k), edge=fade(PANEL_EDGE, k))
        text_c(d, (x + 390, y + 80), name, font(44, "SemiBold"), fade(MUTED, k))
        text_c(d, (x + 390, y + 210), big, font(110, "ExtraBold"), fade(SCAN, k))
        text_c(d, (x + 390, y + 330), sub, font(30, "Medium"), fade(TEXT, k))
    ek = prog(t, 0.8 * T, 0.6)
    if ek > 0:
        text_c(d, (W / 2, 820), "Thanks for watching!", font(64, "Bold"), fade(TEXT, ek))


SCENES = [scene_intro, scene_idea, scene_island1, scene_island2, scene_island3, scene_code, scene_complexity]


def duration(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", path])
    return float(out)


def render_frame(scene, t, T):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    scene(img, d, t, T)
    # fade in/out at scene boundaries
    k = min(clamp(t / 0.35), clamp((T - t) / 0.35))
    if k < 1:
        img = Image.blend(Image.new("RGB", (W, H), BG), img, k)
    return img


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    audio_dir = args[0] if args else "audio"
    out_name = args[1] if len(args) > 1 else "number_of_islands.mp4"
    audio = [os.path.join(HERE, audio_dir, f"s{i}.mp3") for i in range(1, 8)]
    durs = [duration(a) + PAD for a in audio]
    if "--preview" in sys.argv:
        os.makedirs(os.path.join(HERE, "preview"), exist_ok=True)
        for i, (sc, T) in enumerate(zip(SCENES, durs)):
            for frac in (0.3, 0.6, 0.9):
                render_frame(sc, frac * T, T).save(os.path.join(HERE, "preview", f"s{i + 1}_{int(frac * 100)}.png"))
        return
    # concatenated narration with PAD seconds of silence after each clip
    filt = "".join(f"[{i}:a]apad=pad_dur={PAD},aresample=44100[a{i}];" for i in range(7))
    filt += "".join(f"[a{i}]" for i in range(7)) + "concat=n=7:v=0:a=1[out]"
    narration = os.path.join(HERE, "narration.m4a")
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for a in audio:
        cmd += ["-i", a]
    subprocess.check_call(cmd + ["-filter_complex", filt, "-map", "[out]", "-c:a", "aac", "-b:a", "192k", narration])

    out = os.path.join(HERE, out_name)
    ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", narration,
                           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
                           "-c:a", "copy", "-shortest", "-movflags", "+faststart", out],
                          stdin=subprocess.PIPE)
    for sc, T in zip(SCENES, durs):
        for f in range(int(round(T * FPS))):
            ff.stdin.write(render_frame(sc, f / FPS, T).tobytes())
    ff.stdin.close()
    ff.wait()
    os.remove(narration)
    print("wrote", out)


if __name__ == "__main__":
    main()
