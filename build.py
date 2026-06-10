"""
build.py — Compile the multi-file fraction apps into self-contained HTML files.

Similar to Next.js static export: reads each HTML file, inlines all external
<link rel="stylesheet"> and <script src=""> references, and writes a single
standalone HTML to the dist/ folder.

Usage:
    python build.py           # build all apps to dist/
    python build.py --clean   # delete dist/ first, then build

The output files have no external dependencies — they can be opened directly
from the filesystem or deployed to any static host.
"""

import os
import re
import sys
import glob
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")

LINK_RE = re.compile(
    r'<link\s+rel=["\']stylesheet["\']\s+href=["\']([^"\']+)["\']\s*/?>',
    re.IGNORECASE
)
SCRIPT_RE = re.compile(
    r'<script\s+src=["\']([^"\']+)["\']\s*>\s*</script>',
    re.IGNORECASE
)


def read_file(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def resolve_path(html_path, href):
    """Resolve a relative href against the HTML file's directory."""
    html_dir = os.path.dirname(html_path)
    return os.path.normpath(os.path.join(html_dir, href))


def inline_css(match, html_path):
    """Replace a <link stylesheet> tag with an inline <style> block."""
    href = match.group(1)
    css_path = resolve_path(html_path, href)
    if not os.path.exists(css_path):
        print(f"  WARNING: CSS not found: {css_path}")
        return match.group(0)  # leave unchanged
    css = read_file(css_path)
    return f"<style>\n/* {os.path.basename(css_path)} */\n{css}\n</style>"


def inline_js(match, html_path):
    """Replace a <script src> tag with an inline <script> block."""
    src = match.group(1)
    js_path = resolve_path(html_path, src)
    if not os.path.exists(js_path):
        print(f"  WARNING: JS not found: {js_path}")
        return match.group(0)  # leave unchanged
    js = read_file(js_path)
    return f"<script>\n// {os.path.basename(js_path)}\n{js}\n</script>"


def build_one(html_path, out_path):
    """Read one HTML file, inline all CSS/JS, write to out_path."""
    html = read_file(html_path)

    # Inline CSS
    html = LINK_RE.sub(lambda m: inline_css(m, html_path), html)

    # Inline JS
    html = SCRIPT_RE.sub(lambda m: inline_js(m, html_path), html)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)


def main():
    if "--clean" in sys.argv and os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
        print(f"Cleaned {DIST_DIR}")

    os.makedirs(DIST_DIR, exist_ok=True)

    html_files = sorted(glob.glob(os.path.join(BASE_DIR, "*.html")))
    if not html_files:
        print("No HTML files found.")
        return

    print(f"Building {len(html_files)} file(s) → dist/\n")

    for html_path in html_files:
        name = os.path.basename(html_path)
        out_path = os.path.join(DIST_DIR, name)
        build_one(html_path, out_path)

        # Report sizes
        orig_size = os.path.getsize(html_path)
        out_size = os.path.getsize(out_path)
        print(f"  {name}")
        print(f"    source: {orig_size:,} bytes → compiled: {out_size:,} bytes")

    print(f"\nDone. Output in: {DIST_DIR}")


if __name__ == "__main__":
    main()
