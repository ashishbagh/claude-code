"""Shared helpers for the leetcode-video tools."""
import json
import os
import shutil
import subprocess
import sys

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HF_VERSION = "0.9.67"
LAUNCHER = os.path.expanduser("~/.claude/skills/hyperframes/scripts/plugin-cli.mjs")


def hyperframes_cmd():
    """The HyperFrames CLI: the installed skill's launcher when present, else a pinned npx."""
    if os.path.exists(LAUNCHER):
        return ["node", LAUNCHER]
    return ["npx", "--yes", f"hyperframes@{HF_VERSION}"]


def load_project(project):
    project = os.path.abspath(project)
    with open(os.path.join(project, "video.json")) as f:
        cfg = json.load(f)
    return project, cfg


def narration(project):
    with open(os.path.join(project, "narration.json")) as f:
        return json.load(f)


def duration(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", path])
    return float(out)


def clip_path(project, audio_dir, i):
    """Narration clip for scene i (1-based): s<i>.mp3 / .wav in the track's audio dir."""
    for ext in ("mp3", "wav", "m4a"):
        p = os.path.join(project, audio_dir, f"s{i}.{ext}")
        if os.path.exists(p):
            return p
    return None


def need(binary):
    if not shutil.which(binary):
        sys.exit(f"{binary} not found on PATH")
