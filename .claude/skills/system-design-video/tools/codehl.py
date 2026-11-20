#!/usr/bin/env python3
"""Python source -> highlighted HTML for a code scene (classes from lc.css: k f s n c).

    python3 codehl.py solution.py [--funcs dfs,numIslands]   # prints the <pre> inner HTML
Keep the code <= 18 lines and <= 68 columns so it fits the .lc-code panel (31px font, 42px lines).
"""
import argparse
import html
import re

KEYWORDS = {"def", "if", "elif", "else", "or", "and", "not", "return", "for", "while", "in", "is",
            "class", "None", "True", "False", "import", "from", "lambda", "yield", "break", "continue",
            "nonlocal", "global", "with", "as", "try", "except", "pass"}
BUILTINS = {"len", "range", "min", "max", "sum", "sorted", "enumerate", "zip", "append", "pop",
            "popleft", "deque", "set", "dict", "list", "heapq", "heappush", "heappop", "abs", "print"}
TOKEN = re.compile(r"#.*|\"[^\"]*\"|'[^']*'|\d+|\w+|\s+|[^\w\s]")


def highlight(src, funcs=()):
    out = []
    for tok in TOKEN.findall(src):
        e = html.escape(tok, quote=False)
        if tok.startswith("#"):
            out.append(f'<span class="c">{e}</span>')
        elif tok[0] in "\"'":
            out.append(f'<span class="s">{e}</span>')
        elif tok in KEYWORDS:
            out.append(f'<span class="k">{e}</span>')
        elif tok in BUILTINS or tok in funcs:
            out.append(f'<span class="f">{e}</span>')
        elif tok.isdigit():
            out.append(f'<span class="n">{e}</span>')
        else:
            out.append(e)
    return "".join(out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--funcs", default="")
    a = ap.parse_args()
    src = open(a.file).read().strip("\n")
    print(highlight(src, set(filter(None, a.funcs.split(",")))))
