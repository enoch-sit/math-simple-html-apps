"""
Extract inline <style> and <script> blocks from the Fraction HTML apps into
separate css/ and js/ files, and rewrite the HTML to reference them.

Usage:
    python extract_assets.py          # process all *.html in this folder
    python extract_assets.py --dry    # show what would change, write nothing

Behaviour per file:
  * The single <style>...</style> block  -> css/<base>.css   (replaced by <link>)
  * All inline <script>...</script>      -> js/<base>.js     (combined in order,
                                                              one <script src> added
                                                              just before </body>)
  * <script src="..."> tags are left untouched.
  * A .bak copy of each HTML file is created before it is modified.
  * Files that already have no inline style/script are skipped.

<base> is the filename up to the first "(", e.g. FractionApp45(Multiplication).html
-> base "FractionApp45".
"""

import os
import re
import sys
import glob

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DRY_RUN = "--dry" in sys.argv

STYLE_RE = re.compile(r"[ \t]*<style[^>]*>(.*?)</style>\s*", re.DOTALL | re.IGNORECASE)
# Only inline scripts (no src attribute). Capture the whole tag block.
SCRIPT_RE = re.compile(r"[ \t]*<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>\s*",
                       re.DOTALL | re.IGNORECASE)


def base_name(filename):
    stem = os.path.splitext(os.path.basename(filename))[0]
    return stem.split("(")[0].strip()


def dedent_block(text):
    """Strip a common leading indentation from a block of code/CSS."""
    lines = text.splitlines()
    # drop leading/trailing blank lines
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    indents = [len(l) - len(l.lstrip()) for l in lines if l.strip()]
    common = min(indents) if indents else 0
    return "\n".join(l[common:] if len(l) >= common else l for l in lines) + "\n"


def process(path):
    name = os.path.basename(path)
    base = base_name(path)
    with open(path, encoding="utf-8") as f:
        html = f.read()

    style_matches = STYLE_RE.findall(html)
    script_matches = SCRIPT_RE.findall(html)

    if not style_matches and not script_matches:
        print(f"SKIP  {name}  (no inline style/script - already extracted?)")
        return

    css_dir = os.path.join(BASE_DIR, "css")
    js_dir = os.path.join(BASE_DIR, "js")
    os.makedirs(css_dir, exist_ok=True)
    os.makedirs(js_dir, exist_ok=True)

    new_html = html
    actions = []

    # ---- CSS ----
    if style_matches:
        css_content = dedent_block(style_matches[0])
        css_rel = f"css/{base}.css"
        link_tag = f'    <link rel="stylesheet" href="{css_rel}">\n'
        # Replace the first (and only) style block with the link tag.
        new_html = STYLE_RE.sub(lambda m: link_tag, new_html, count=1)
        if not DRY_RUN:
            with open(os.path.join(BASE_DIR, css_rel), "w", encoding="utf-8") as f:
                f.write(css_content)
        actions.append(f"css/{base}.css ({len(css_content)} chars)")

    # ---- JS ----
    if script_matches:
        parts = [dedent_block(s) for s in script_matches]
        if len(parts) > 1:
            js_content = "\n\n/* ===== next inline <script> block ===== */\n\n".join(parts)
        else:
            js_content = parts[0]
        js_rel = f"js/{base}.js"
        # Remove every inline script block from the HTML.
        new_html = SCRIPT_RE.sub("", new_html)
        # Insert one external script reference right before </body>.
        script_tag = f'<script src="{js_rel}"></script>\n'
        if re.search(r"</body>", new_html, re.IGNORECASE):
            new_html = re.sub(r"(</body>)", script_tag + r"\1", new_html,
                              count=1, flags=re.IGNORECASE)
        else:
            new_html += "\n" + script_tag
        if not DRY_RUN:
            with open(os.path.join(BASE_DIR, js_rel), "w", encoding="utf-8") as f:
                f.write(js_content)
        actions.append(f"js/{base}.js ({len(script_matches)} block(s), {len(js_content)} chars)")

    if not DRY_RUN:
        with open(path + ".bak", "w", encoding="utf-8") as f:
            f.write(html)
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_html)

    tag = "DRY  " if DRY_RUN else "DONE "
    print(f"{tag} {name}  ->  {', '.join(actions)}")


def main():
    files = sorted(glob.glob(os.path.join(BASE_DIR, "*.html")))
    if not files:
        print("No HTML files found.")
        return
    print(f"{'DRY RUN - ' if DRY_RUN else ''}Processing {len(files)} file(s) in {BASE_DIR}\n")
    for path in files:
        process(path)
    print("\nDone." + ("  (no files were written)" if DRY_RUN else ""))


if __name__ == "__main__":
    main()
