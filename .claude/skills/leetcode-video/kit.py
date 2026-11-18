"""Shared toolkit for LeetCode explainer videos (Pillow frames -> ffmpeg).

A problem script defines its scenes as functions `scene(img, d, t, T)` (t = seconds into
the scene, T = scene length) and calls `kit.main(SCENES, here=__file__)`.
Scene i is timed to narration clip `<audio_dir>/s{i}.mp3` plus PAD seconds.

    python3 render.py                                 # audio/        -> video.mp4
    python3 render.py audio_hinglish video_hinglish.mp4
    python3 render.py --preview                       # stills in preview/
"""
import math
import os
import re
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1920, 1080, 30
PAD = 0.7

# ---------- palette ----------
BG = (13, 17, 33)
PANEL = (24, 30, 52)
PANEL_EDGE = (44, 54, 88)
TEXT = (235, 240, 255)
MUTED = (140, 152, 190)
YELLOW = (250, 204, 21)
GREEN = (34, 197, 94)
BLUE = (30, 58, 120)
BLUE_TXT = (110, 150, 220)
ACCENT = (56, 189, 248)
RED = (239, 68, 68)
ORANGE = (251, 146, 60)
PINK = (236, 72, 153)
VIOLET = (167, 139, 250)
HIGHLIGHTS = [ORANGE, PINK, VIOLET, ACCENT, GREEN]
DIFF_COLORS = {"Easy": ((10, 50, 30), (74, 222, 128)),
               "Medium": ((60, 45, 10), (251, 191, 36)),
               "Hard": ((60, 15, 15), (248, 113, 113))}

FONT_DIR = "/usr/share/fonts/opentype/inter/"
MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf"
MONO_B = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf"
_fonts = {}


def font(size, weight="SemiBold"):
    """weight: Regular/Medium/SemiBold/Bold/ExtraBold (Inter) or mono/monob (JetBrains Mono).
    Inter lacks some symbols (e.g. ✕ ✓) - draw those with lines instead."""
    key = (size, weight)
    if key not in _fonts:
        path = {"mono": MONO, "monob": MONO_B}.get(weight, FONT_DIR + f"Inter-{weight}.otf")
        _fonts[key] = ImageFont.truetype(path, size)
    return _fonts[key]


# ---------- timing helpers ----------
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def prog(t, start, dur):
    """0 -> 1 eased progress of an animation that starts at `start` and lasts `dur` seconds."""
    return ease((t - start) / dur) if dur > 0 else float(t >= start)


def pulse(p):
    """0 -> 1 -> 0 bump, for pop effects."""
    return math.sin(math.pi * clamp(p))


def lerp(a, b, k):
    return tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(len(a)))


def fade(c, k, bg=BG):
    return lerp(bg, c, k)


def step_at(t, start, end, n):
    """Index 0..n-1 of a pointer moving evenly through n items between start and end."""
    if t < start:
        return 0
    return min(n - 1, int((t - start) / max(end - start, 1e-6) * n))


# ---------- primitives ----------
def text_c(d, xy, s, f, fill):
    d.text(xy, s, font=f, fill=fill, anchor="mm")


def panel(d, box, r=24, fill=PANEL, edge=PANEL_EDGE):
    d.rounded_rectangle(box, r, fill=fill, outline=edge, width=2)


def cross(d, x, y, k=1.0, e=16, color=RED):
    d.line((x - e, y - e, x + e, y + e), fill=fade(color, k), width=6)
    d.line((x - e, y + e, x + e, y - e), fill=fade(color, k), width=6)


def header(d, number, title, difficulty="Medium", k=1.0):
    d.rounded_rectangle((60, 40, 260, 92), 26, fill=fade((40, 30, 10), k), outline=fade(YELLOW, k), width=2)
    text_c(d, (160, 66), f"LeetCode {number}", font(26, "Bold"), fade(YELLOW, k))
    d.text((290, 66), title, font=font(40, "Bold"), fill=fade(TEXT, k), anchor="lm")
    bg, fg = DIFF_COLORS.get(difficulty, DIFF_COLORS["Medium"])
    d.rounded_rectangle((W - 220, 44, W - 60, 88), 22, fill=fade(bg, k))
    text_c(d, (W - 140, 66), difficulty, font(24, "SemiBold"), fade(fg, k))


def caption(d, s, k=1.0, y=H - 80):
    """Pill-shaped subtitle at the bottom of the frame."""
    if k <= 0:
        return
    f = font(34, "Medium")
    w = d.textlength(s, font=f)
    d.rounded_rectangle((W / 2 - w / 2 - 30, y - 34, W / 2 + w / 2 + 30, y + 34), 34, fill=fade(PANEL, k))
    text_c(d, (W / 2, y), s, f, fade(TEXT, k))


def value_box(d, x, y, label, value, pop=0.0, w=360):
    """Labelled big number/string (e.g. 'Islands 3', 'Result [1,3,4]'); pop = 0..1 bump."""
    panel(d, (x, y, x + w, y + 170))
    text_c(d, (x + w / 2, y + 40), label, font(30, "Medium"), MUTED)
    s = str(value)
    base = 84 if len(s) <= 4 else max(40, int(84 * 5 / len(s)))
    text_c(d, (x + w / 2, y + 108), s, font(int(base * (1 + 0.35 * pulse(pop))), "ExtraBold"), YELLOW)


def list_panel(d, x, y, title, items, w=360, h=400, max_items=5):
    """Stack/queue/call-log panel. items: [(label, appear_k)], newest drawn on top."""
    panel(d, (x, y, x + w, y + h))
    text_c(d, (x + w / 2, y + 40), title, font(28, "Medium"), MUTED)
    for i, (label, k) in enumerate(items[-max_items:]):
        by = y + h - 60 - i * 62
        d.rounded_rectangle((x + 30, by - 26, x + w - 30, by + 26), 14,
                            fill=fade((40, 52, 90), k), outline=fade(ACCENT, k), width=2)
        text_c(d, (x + w / 2, by), label, font(28, "mono"), fade(TEXT, k))


# ---------- data-structure drawers ----------
def draw_array(d, x0, y0, values, cell=110, gap=12, colors=None, pointers=None, show_index=True, k=1.0):
    """Row of boxes. colors: {i: rgb}. pointers: {i: (label, rgb)} drawn as arrows below."""
    colors = colors or {}
    for i, v in enumerate(values):
        x = x0 + i * (cell + gap)
        col = fade(colors.get(i, PANEL), k)
        d.rounded_rectangle((x, y0, x + cell, y0 + cell), 16, fill=col, outline=fade(PANEL_EDGE, k), width=2)
        text_c(d, (x + cell / 2, y0 + cell / 2), str(v), font(int(cell * 0.38), "Bold"), fade(TEXT, k))
        if show_index:
            text_c(d, (x + cell / 2, y0 - 26), str(i), font(24, "Medium"), fade(MUTED, k))
    for i, (label, col) in (pointers or {}).items():
        x = x0 + i * (cell + gap) + cell / 2
        y = y0 + cell + 20
        d.polygon([(x, y), (x - 16, y + 26), (x + 16, y + 26)], fill=fade(col, k))
        text_c(d, (x, y + 52), label, font(28, "Bold"), fade(col, k))


def draw_grid(d, x0, y0, grid, cell=140, gap=10, colors=None, labels=None, outline=None, appear=1.0):
    """2-D grid. colors/labels: {(r,c): ...} overrides; outline: {(r,c): rgb} ring (e.g. scan pointer).
    appear 0..1 pops cells in one by one."""
    colors, labels, outline = colors or {}, labels or {}, outline or {}
    cols = len(grid[0])
    for r, row in enumerate(grid):
        for c, v in enumerate(row):
            k = ease(appear * 1.6 - (r * cols + c) * 0.03)
            if k <= 0:
                continue
            cx = x0 + c * (cell + gap) + cell / 2
            cy = y0 + r * (cell + gap) + cell / 2
            col = colors.get((r, c), PANEL)
            s = cell * (0.6 + 0.4 * k)
            d.rounded_rectangle((cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2), 16, fill=fade(col, k))
            lab = labels.get((r, c), str(v))
            text_c(d, (cx, cy), lab, font(int(cell * 0.38), "Bold"), fade(TEXT, k, col))
    for (r, c), col in outline.items():
        cx = x0 + c * (cell + gap) + cell / 2
        cy = y0 + r * (cell + gap) + cell / 2
        s = cell / 2 + 8
        d.rounded_rectangle((cx - s, cy - s, cx + s, cy + s), 20, outline=col, width=6)


def tree_layout(values, x0, y0, width, level_h=150):
    """LeetCode level-order list (None = missing) -> {index: (x, y)} and parent edges."""
    pos, edges = {}, []
    idx_iter = 1
    queue = []
    if not values or values[0] is None:
        return pos, edges
    pos[0] = ((x0 + x0 + width) / 2, y0)
    queue.append((0, 0, x0, x0 + width))
    while queue and idx_iter < len(values):
        i, depth, l, r = queue.pop(0)
        mid = (l + r) / 2
        for side in (0, 1):
            if idx_iter >= len(values):
                break
            j = idx_iter
            idx_iter += 1
            if values[j] is None:
                continue
            nl, nr = (l, mid) if side == 0 else (mid, r)
            pos[j] = ((nl + nr) / 2, y0 + (depth + 1) * level_h)
            edges.append((i, j))
            queue.append((j, depth + 1, nl, nr))
    return pos, edges


def draw_tree(d, values, x0, y0, width, colors=None, rings=None, level_h=150, r=46, k=1.0):
    """Binary tree from a level-order list. colors/rings: {list index: rgb}. Returns positions."""
    colors, rings = colors or {}, rings or {}
    pos, edges = tree_layout(values, x0, y0, width, level_h)
    for a, b in edges:
        d.line((*pos[a], *pos[b]), fill=fade(PANEL_EDGE, k), width=5)
    for i, (x, y) in pos.items():
        col = colors.get(i, PANEL)
        d.ellipse((x - r, y - r, x + r, y + r), fill=fade(col, k), outline=fade(ACCENT, k), width=3)
        text_c(d, (x, y), str(values[i]), font(34, "Bold"), fade(TEXT, k, col))
        if i in rings:
            d.ellipse((x - r - 10, y - r - 10, x + r + 10, y + r + 10), outline=rings[i], width=6)
    return pos


# ---------- reusable scenes ----------
def make_title_scene(number, title, tags, difficulty="Medium"):
    """Big title card; use as the first 3-4 s of scene 1 or on its own."""
    def scene(img, d, t, T):
        k = prog(t, 0, 1.0)
        text_c(d, (W / 2, H / 2 - 60), title, font(110, "ExtraBold"), fade(TEXT, k))
        text_c(d, (W / 2, H / 2 + 50), f"LeetCode {number}  ·  " + "  ·  ".join(tags), font(44, "Medium"), fade(MUTED, k))
    return scene


def make_steps_scene(hdr, steps):
    """Numbered idea cards appearing in turn. steps: [(text, appear_fraction_of_T)]; hdr: header args tuple."""
    def scene(img, d, t, T):
        header(d, *hdr)
        n = len(steps)
        hgt = min(130, int(700 / n) - 40)
        for i, (s, at) in enumerate(steps):
            k = prog(t, at * T, 0.6)
            if k <= 0:
                continue
            y = 200 + i * (hgt + 40)
            x = 160 + (1 - k) * 60
            panel(d, (x, y, x + 1600, y + hgt), fill=fade(PANEL, k), edge=fade(PANEL_EDGE, k))
            cy = y + hgt / 2
            d.ellipse((x + 30, cy - 40, x + 110, cy + 40), fill=fade(YELLOW, k))
            text_c(d, (x + 70, cy), str(i + 1), font(44, "ExtraBold"), fade(BG, k, YELLOW))
            d.text((x + 150, cy), s, font=font(44, "SemiBold"), fill=fade(TEXT, k), anchor="lm")
    return scene


KEYWORDS = {"def", "if", "elif", "else", "or", "and", "not", "return", "for", "while", "in",
            "class", "None", "True", "False", "import", "from", "lambda", "yield", "break", "continue"}
BUILTINS = {"len", "range", "min", "max", "sum", "sorted", "enumerate", "zip", "append", "pop",
            "popleft", "deque", "set", "dict", "list", "heapq", "heappush", "heappop"}


def _code_line(d, x, y, line, f, fb, funcs):
    for tok in re.findall(r"#.*|\"[^\"]*\"|'[^']*'|\w+|\s+|[^\w\s]", line):
        if tok.startswith("#"):
            col = (110, 120, 150)
        elif tok[0] in "\"'":
            col = (134, 239, 172)
        elif tok in KEYWORDS:
            col = (244, 114, 182)
        elif tok in BUILTINS or tok in funcs:
            col = ACCENT
        elif tok.isdigit():
            col = (251, 191, 36)
        else:
            col = TEXT
        d.text((x, y), tok, font=fb if tok in KEYWORDS else f, fill=col, anchor="lm")
        x += d.textlength(tok, font=f)


def make_code_scene(hdr, code, highlights, funcs=()):
    """Syntax-highlighted code with a moving highlight box.
    highlights: [((first_line, last_line), start_frac, end_frac)] (0-based lines, fractions of T).
    Keep code <= 18 lines and <= 70 chars wide."""
    lines = code.strip("\n").split("\n")
    size = 34 if len(lines) <= 18 else max(24, int(34 * 18 / len(lines)))
    lh = int(size * 1.35)

    def scene(img, d, t, T):
        header(d, *hdr)
        panel(d, (140, 140, 1780, 1000))
        f, fb = font(size, "mono"), font(size, "monob")
        top = 190
        for (a, b), s, e in highlights:
            if s * T <= t < e * T:
                k = prog(t, s * T, 0.4)
                d.rounded_rectangle((170, top + a * lh - lh / 2 + 4, 1750, top + b * lh + lh / 2 + 4), 12,
                                    fill=fade((50, 46, 20), k, PANEL), outline=fade(YELLOW, k, PANEL), width=2)
        for i, line in enumerate(lines):
            _code_line(d, 210, top + i * lh + 4, line, f, fb, set(funcs))
    return scene


def make_complexity_scene(hdr, time_c, time_note, space_c, space_note, outro="Thanks for watching!"):
    def scene(img, d, t, T):
        header(d, *hdr)
        cards = [("Time", time_c, time_note, 0.05), ("Space", space_c, space_note, 0.42)]
        for i, (name, big, sub, at) in enumerate(cards):
            k = prog(t, at * T, 0.6)
            if k <= 0:
                continue
            x = 160 + i * 820
            y = 230 + (1 - k) * 40
            panel(d, (x, y, x + 780, y + 420), fill=fade(PANEL, k), edge=fade(PANEL_EDGE, k))
            text_c(d, (x + 390, y + 80), name, font(44, "SemiBold"), fade(MUTED, k))
            bf = 110 if len(big) <= 9 else 80
            text_c(d, (x + 390, y + 210), big, font(bf, "ExtraBold"), fade(YELLOW, k))
            text_c(d, (x + 390, y + 330), sub, font(30, "Medium"), fade(TEXT, k))
        ek = prog(t, 0.8 * T, 0.6)
        if ek > 0:
            text_c(d, (W / 2, 820), outro, font(64, "Bold"), fade(TEXT, ek))
    return scene


# ---------- rendering ----------
def duration(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", path]))


def render_frame(scene, t, T):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    scene(img, d, t, T)
    k = min(clamp(t / 0.35), clamp((T - t) / 0.35))
    if k < 1:
        img = Image.blend(Image.new("RGB", (W, H), BG), img, k)
    return img


def main(scenes, here, default_out="video.mp4"):
    here = os.path.dirname(os.path.abspath(here))
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    audio_dir = args[0] if args else "audio"
    out_name = args[1] if len(args) > 1 else default_out
    n = len(scenes)
    audio = [os.path.join(here, audio_dir, f"s{i}.mp3") for i in range(1, n + 1)]
    missing = [a for a in audio if not os.path.exists(a)]
    if missing and "--preview" not in sys.argv:
        sys.exit(f"missing narration clips: {missing}")
    durs = [(duration(a) if os.path.exists(a) else 15.0) + PAD for a in audio]

    if "--preview" in sys.argv:
        out_dir = os.path.join(here, "preview")
        os.makedirs(out_dir, exist_ok=True)
        for i, (sc, T) in enumerate(zip(scenes, durs)):
            for frac in (0.3, 0.6, 0.9):
                render_frame(sc, frac * T, T).save(os.path.join(out_dir, f"s{i + 1}_{int(frac * 100)}.png"))
        print("previews in", out_dir)
        return

    filt = "".join(f"[{i}:a]apad=pad_dur={PAD},aresample=44100[a{i}];" for i in range(n))
    filt += "".join(f"[a{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1[out]"
    narration = os.path.join(here, ".narration.m4a")
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for a in audio:
        cmd += ["-i", a]
    subprocess.check_call(cmd + ["-filter_complex", filt, "-map", "[out]", "-c:a", "aac", "-b:a", "192k", narration])

    out = os.path.join(here, out_name)
    ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", narration,
                           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
                           "-c:a", "copy", "-shortest", "-movflags", "+faststart", out],
                          stdin=subprocess.PIPE)
    for sc, T in zip(scenes, durs):
        for f in range(int(round(T * FPS))):
            ff.stdin.write(render_frame(sc, f / FPS, T).tobytes())
    ff.stdin.close()
    ff.wait()
    os.remove(narration)
    print("wrote", out, f"({sum(durs):.1f}s)")
