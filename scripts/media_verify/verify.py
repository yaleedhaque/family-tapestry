#!/usr/bin/env python3
"""verify.py — headless DOM/geometry verification for family-tapestry.

Speeds up the edit→verify loop: open a URL, wait for React Flow nodes,
dump node/edge/handle geometry + a screenshot, and run sanity checks
(no diagonal edges, no overlaps, expected node counts).

Usage:
  ~/tools/Ai-Browser-Toolkit/.venv/bin/python3 scripts/media_verify/verify.py [URL] [--save SCREENSHOT.png] [--expect NODES]
Examples:
  .../verify.py https://family-tapestry-nine.vercel.app --expect 16
  .../verify.py http://localhost:3000 --expect 16 --save /tmp/opencode/shot.png
"""
import sys, json, argparse, os

URL = "https://family-tapestry-nine.vercel.app"

def main():
    p = argparse.ArgumentParser()
    p.add_argument("url", nargs="?", default=URL)
    p.add_argument("--expect", type=int, default=None, help="expected node count")
    p.add_argument("--save", default=None, help="save screenshot PNG path")
    p.add_argument("--timeout", type=int, default=60000)
    a = p.parse_args()

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path="/usr/bin/google-chrome-stable", headless=True)
        ctx = browser.new_context(viewport={"width":1600,"height":1000})
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        try:
            page.goto(a.url, wait_until="domcontentloaded", timeout=30000)
        except Exception as e:
            print("GOTO_ERR", e)
            browser.close(); sys.exit(2)

        # poll for React Flow nodes (do NOT rely on networkidle)
        import time
        ok = False
        for _ in range(int(a.timeout/1000 * 2)):
            try:
                n = page.evaluate("document.querySelectorAll('.react-flow__node').length")
                if n > 0:
                    ok = True; break
            except Exception:
                pass
            time.sleep(0.5)
        if not ok:
            print("NO_NODES_AFTER_TIMEOUT")
            page.screenshot(path=a.save or "/tmp/opencode/verify-fail.png", full_page=True)
            browser.close(); sys.exit(3)

        info = page.evaluate("""() => {
          const nodes = [...document.querySelectorAll('.react-flow__node')];
          const out = nodes.map(n => {
            const r = n.getBoundingClientRect();
            return {id: n.getAttribute('data-id'), x: Math.round(r.x), y: Math.round(r.y),
                    w: Math.round(r.width), h: Math.round(r.height)};
          });
          const edges = [...document.querySelectorAll('.react-flow__edge-path')].map(e => {
            const d = e.getAttribute('d'); return d;
          });
          const handles = document.querySelectorAll('.react-flow__handle').length;
          return {nodes: out, edges, handles};
        }""")
        print("NODES", len(info["nodes"]))
        if a.expect is not None:
            print(("PASS" if len(info["nodes"]) == a.expect else "FAIL") + f" expected={a.expect}")
        print("EDGES", len(info["edges"]))
        print("HANDLES", info["handles"])
        # sanity: detect any non-horizontal/vertical-only edge segments
        import re
        diag = 0
        for d in info["edges"]:
            # smoothstep paths: M x0 y0 L ... Q cx,cy ex,ey L ... Q ... etc.
            # Track the true pen position through EVERY command (M/L ends a
            # drawn straight segment; Q's endpoint is a curve target, skip).
            pts = re.finditer(r'([MQL])\s*(-?[\d.]+)[,\s]+(-?[\d.]+)', d)
            cur = None
            for m in pts:
                cmd, x, y = m.group(1), float(m.group(2)), float(m.group(3))
                if cmd == 'M':
                    cur = (x, y); continue
                if cmd == 'L':
                    if cur and abs(x - cur[0]) > 2 and abs(y - cur[1]) > 2:
                        diag += 1
                    cur = (x, y)
                elif cmd == 'Q':
                    # second coordinate pair is the endpoint
                    ep = m.group(0)
                    # Q has 2 pairs: cx,cy ex,ey — regex matches only first (control). 
                    # pull the endpoint from the remainder
                    rest = d[m.end():]
                    mm2 = re.match(r'\s*(-?[\d.]+)[,\s]+(-?[\d.]+)', rest)
                    if mm2:
                        cur = (float(mm2.group(1)), float(mm2.group(2)))
        print("DIAGONAL_SEGMENTS", diag, "(0 = clean)" if diag == 0 else "(!!)")
        # overlap check among nodes
        ov = 0
        for i in range(len(info["nodes"])):
            for j in range(i+1, len(info["nodes"])):
                A,B = info["nodes"][i], info["nodes"][j]
                if not (A["x"]+A["w"] <= B["x"] or B["x"]+B["w"] <= A["x"] or A["y"]+A["h"] <= B["y"] or B["y"]+B["h"] <= A["y"]):
                    ov += 1
        print("NODE_OVERLAPS", ov, "(0 = clean)" if ov == 0 else "(!!)")
        print("PAGE_ERRORS", len(errors))

        if a.save:
            page.screenshot(path=a.save, full_page=True)
            print("SHOT", a.save)
        browser.close()

if __name__ == "__main__":
    main()