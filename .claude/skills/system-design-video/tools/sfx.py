#!/usr/bin/env python3
"""Fetch the sound effects named in video.json "sfx" cues into <project>/assets/sfx/.

Order per sound: already in assets/sfx -> Freesound API (CC0 / CC BY only, HQ preview mp3)
-> bundled library (sfx-library/, Pixabay licence). Writes assets/sfx/CREDITS.md.

    python3 sfx.py <project> [--refresh]

Freesound auth: the cloud session's proxy injects the saved "Freesound API key" for freesound.org;
elsewhere set FREESOUND_API_KEY.
"""
import argparse
import json
import os
import shutil
import urllib.parse
import urllib.request

from common import SKILL, load_project

API = "https://freesound.org/apiv2/search/text/"
OK_LICENSES = {"Creative Commons 0": "CC0", "Attribution": "CC BY 4.0",
               "http://creativecommons.org/publicdomain/zero/1.0/": "CC0",
               "https://creativecommons.org/publicdomain/zero/1.0/": "CC0",
               "http://creativecommons.org/licenses/by/4.0/": "CC BY 4.0",
               "https://creativecommons.org/licenses/by/4.0/": "CC BY 4.0",
               "http://creativecommons.org/licenses/by/3.0/": "CC BY 3.0"}


def freesound(query):
    key = os.environ.get("FREESOUND_API_KEY", "proxy-injected")
    params = {
        "query": query,
        "filter": 'license:("Creative Commons 0" OR "Attribution") duration:[0.1 TO 4]',
        "fields": "id,name,username,license,duration,previews,url",
        "sort": "score", "page_size": "8",
    }
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params),
                                 headers={"Authorization": f"Token {key}", "User-Agent": "system-design-video"})
    with urllib.request.urlopen(req, timeout=20) as r:
        results = json.load(r).get("results", [])
    for res in results:
        lic = OK_LICENSES.get(res.get("license"))
        url = (res.get("previews") or {}).get("preview-hq-mp3")
        if lic and url:
            return res, lic, url
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--refresh", action="store_true", help="re-fetch sounds already present")
    ap.add_argument("--local-only", action="store_true")
    a = ap.parse_args()
    project, cfg = load_project(a.project)
    out = os.path.join(project, "assets", "sfx")
    os.makedirs(out, exist_ok=True)
    queries = cfg.get("sfx_queries", {})
    names = sorted({c["sound"] for c in cfg.get("sfx", [])})
    credits_path = os.path.join(out, "CREDITS.md")
    credits = {}
    if os.path.exists(credits_path):
        for line in open(credits_path):
            if line.startswith("- `"):
                credits[line.split("`")[1]] = line.rstrip("\n")
    fs_ok = not a.local_only

    for name in names:
        dest = os.path.join(out, f"{name}.mp3")
        if os.path.exists(dest) and not a.refresh:
            print(f"{name}: present")
            continue
        got = False
        if fs_ok:
            try:
                hit = freesound(queries.get(name, name.replace("-", " ")))
                if hit:
                    res, lic, url = hit
                    urllib.request.urlretrieve(url, dest)
                    credits[f"{name}.mp3"] = (f"- `{name}.mp3` – \"{res['name']}\" by {res['username']} "
                                              f"({lic}) {res['url']}")
                    print(f"{name}: freesound #{res['id']} ({lic})")
                    got = True
            except Exception as e:  # network / auth problems -> fall back for the rest of the run
                print(f"{name}: freesound unavailable ({e}); using bundled library")
                fs_ok = False
        if not got:
            lib = os.path.join(SKILL, "sfx-library", f"{name}.mp3")
            if not os.path.exists(lib):
                lib = os.path.join(SKILL, "sfx-library", "pop.mp3")
                print(f"{name}: no bundled match, using pop.mp3")
            shutil.copy(lib, dest)
            credits[f"{name}.mp3"] = f"- `{name}.mp3` – bundled library (Pixabay Content License)"
            print(f"{name}: bundled")

    with open(credits_path, "w") as f:
        f.write("# Sound effect credits\n\nCredit every CC BY sound wherever the video is published.\n\n")
        f.write("\n".join(credits[k] for k in sorted(credits)) + "\n")


if __name__ == "__main__":
    main()
