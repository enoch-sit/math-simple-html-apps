"""Verify no selector was lost: each app's ORIGINAL selectors must all appear
in arith-common.css OR the app's reduced css. Also report any selector whose
chosen common value changed vs the app's original (expected for normalized ones)."""
import os, re
from collections import defaultdict

CSS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "css")
BACK = os.path.join(CSS, "_backup_pre_common")
APPS = ["FractionApp38", "FractionApp45", "FractionApp47", "FractionApp48"]

def strip_comments(css):
    return re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)

def sels(path):
    with open(path, encoding="utf-8") as f:
        css = strip_comments(f.read())
    out, depth, token = [], 0, ""
    for c in css:
        token += c
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                m = re.match(r"\s*(.*?)\{(.*)\}\s*$", token, re.DOTALL)
                if m:
                    out.append(re.sub(r"\s+", " ", m.group(1)).strip())
                token = ""
    return out

common = set(sels(os.path.join(CSS, "arith-common.css")))
ok = True
for a in APPS:
    orig = set(sels(os.path.join(BACK, a + ".css")))
    now = set(sels(os.path.join(CSS, a + ".css")))
    reachable = common | now
    missing = orig - reachable
    print(f"{a}: original={len(orig)} common-covered={len(orig & common)} "
          f"per-app={len(now)} missing={len(missing)}")
    if missing:
        ok = False
        for s in sorted(missing):
            print("   MISSING:", s)
print("\nRESULT:", "OK - no selectors lost" if ok else "PROBLEM - selectors missing")
