# -*- coding: utf-8 -*-
"""一鍵升版：python3 tools/bump.py 2.5.0 —— 同步 app.js / sw.js / README ×2 / CLAUDE.md"""
import re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
v = sys.argv[1]
def patch(path, pat, rep):
    p = os.path.join(ROOT, path); s = open(p).read()
    s2, n = re.subn(pat, rep, s)
    assert n >= 1, "bump 找不到目標：%s in %s" % (pat, path)
    open(p, "w").write(s2); print("[bump] %s ×%d" % (path, n))
patch("js/app.js", r'var VERSION = "[\d.]+";', 'var VERSION = "%s";' % v)
patch("sw.js", r'var CACHE = "mapquiz-v[\d.]+";', 'var CACHE = "mapquiz-v%s";' % v)
patch("README.md", r"## 版本\n\nV[\d.]+", "## 版本\n\nV%s" % v)
patch("README.md", r"SELA</strong> · V[\d.]+", "SELA</strong> · V%s" % v)
patch("CLAUDE.md", r"\*\*版本：\*\* V[\d.]+", "**版本：** V%s" % v)
print("[bump] -> V%s（四處同步完成；CLAUDE.md 版本歷程請另補一列）" % v)
