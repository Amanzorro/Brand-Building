#!/usr/bin/env python3
"""Check that every local link, script, stylesheet and image in the site exists.

Usage: python3 scripts/check_links.py
Exits 1 and lists the broken references if any are found. Standard library only.
"""
import html.parser
import pathlib
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "src", "node_modules", ".vercel", "dist"}


class Refs(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ("href", "src") and value:
                self.refs.append(value)


def local(ref):
    if ref.startswith(("#", "mailto:", "tel:", "data:", "javascript:")):
        return None
    parsed = urllib.parse.urlparse(ref)
    if parsed.scheme or parsed.netloc:
        return None
    return parsed.path or None


def main():
    broken = []
    pages = [p for p in ROOT.rglob("*.html") if not (set(p.relative_to(ROOT).parts) & SKIP_DIRS)]
    for page in pages:
        parser = Refs()
        parser.feed(page.read_text(encoding="utf-8"))
        for ref in parser.refs:
            path = local(ref)
            if not path:
                continue
            target = (page.parent / urllib.parse.unquote(path)).resolve()
            if target.is_dir():
                target = target / "index.html"
            if not target.exists():
                broken.append(f"{page.relative_to(ROOT)} → {ref}")
    if broken:
        print("Broken local references:")
        print("\n".join("  " + b for b in broken))
        sys.exit(1)
    print(f"Checked {len(pages)} pages: no broken local references.")


if __name__ == "__main__":
    main()
