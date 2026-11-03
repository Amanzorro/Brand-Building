#!/usr/bin/env python3
"""Assemble a copy of the site for publishing as a claude.ai artifact preview.

The artifact viewer wraps the main page in its own <html>/<head>/<body>, so the
root index.html is "unwrapped" (head tags + body content only). All other pages
are copied as they are.

Usage: python3 scripts/build_artifact.py [output_dir]   (default: dist/artifact)
Then publish output_dir/index.html with the other files listed by the script.
Not needed for Vercel, which serves the repository as-is.
"""
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist" / "artifact"

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
for item in ["assets", "ar", "insights", "try"]:
    shutil.copytree(ROOT / item, OUT / item)
for page in ROOT.glob("*.html"):
    shutil.copy(page, OUT / page.name)

index = OUT / "index.html"
s = index.read_text(encoding="utf-8")
head = re.search(r"<head>(.*?)</head>", s, re.S).group(1)
body = re.search(r"<body[^>]*>(.*)</body>", s, re.S).group(1)
head = re.sub(r'\s*<meta charset="utf-8">', "", head)
head = re.sub(r'\s*<meta name="viewport"[^>]*>', "", head)
head = re.sub(r"<title>.*?</title>",
              '<title>Nokhada</title>\n  <meta name="claude:viewport-fit-sides" content="cover">', head)
index.write_text(head.strip() + "\n" + body, encoding="utf-8")

files = sorted(str(p.relative_to(OUT)) for p in OUT.rglob("*") if p.is_file() and p != index)
print(f"Artifact bundle written to {OUT}")
print("Main page: index.html")
print("Supporting files:")
for f in files:
    print("  " + f)
