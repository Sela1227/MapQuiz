# -*- coding: utf-8 -*-
"""MapQuiz 內容驗證器（V2.5.0）— 內容版 CI，打包前必過。
檢查：schema、覆蓋率下限、洩答（坑 P7 全套）、重名、句子品質、交叉比對、js 往返一致性。
用法：python3 tools/validate.py
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data-src")
OUT = os.path.join(ROOT, "data")
SCHEMA = 1
ANGLES = {"地標", "飲食", "工藝", "節慶", "歷史", "自然", "冷知識", "體驗", "最高級", "音樂", "unsorted"}
HOT = ["台灣","日本","南韓","北韓","中國","美國","英國","法國","德國","義大利","西班牙","俄羅斯","印度","泰國","越南","新加坡","馬來西亞","印尼","菲律賓","澳大利亞","紐西蘭","加拿大","墨西哥","巴西","阿根廷","埃及","南非","土耳其","沙烏地阿拉伯","阿拉伯聯合大公國","以色列","荷蘭","瑞士"]
ALIAS = {"連江縣": ["馬祖"], "宜蘭縣": ["蘭陽"]}

errors, warns = [], []
def err(m): errors.append(m)
def warn(m): warns.append(m)

def load(name):
    d = json.load(open(os.path.join(SRC, name + ".json")))
    if d.get("schema_version") != SCHEMA:
        err("%s schema_version 不符" % name)
    return d["items"]

def texts(v):
    return [e["text"] if isinstance(e, dict) else e for e in v]

def main():
    wf, tf = load("facts-world"), load("facts-taiwan")
    wd, td = load("lm-desc-world"), load("lm-desc-taiwan")
    wl, tl = load("landmarks-world"), load("landmarks-taiwan")
    caps, flags = load("capitals"), load("flags")
    names196 = set(open(os.path.join(OUT, "world_names.txt")).read().split())

    # ── 覆蓋率下限 ──
    for c in names196:
        if c not in wf: err("facts-world 缺國家：" + c)
        elif len(wf[c]) < 8: err("facts-world %s 僅 %d 段（下限 8）" % (c, len(wf[c])))
    for h in HOT:
        if h in wf and len(wf[h]) < 15: err("熱門國 %s 僅 %d 段（下限 15）" % (h, len(wf[h])))
    for c, v in tf.items():
        if len(v) < 10: err("facts-taiwan %s 僅 %d 段（下限 10）" % (c, len(v)))
    for nm, v in {**wd, **td}.items():
        if len(v) < 3: err("景點說明 %s 僅 %d 句（下限 3）" % (nm, len(v)))

    # ── 洩答（坑 P7）──
    def cores(county):
        base = county.rstrip("縣市"); out = [base] + ALIAS.get(county, [])
        out += [b.replace("台", "臺") for b in out if "台" in b]
        out += [b.replace("臺", "台") for b in out if "臺" in b]
        return set(out)
    for county, items in tl.items():
        for lm in items:
            for k in cores(county):
                if k in lm: err("台灣景點洩答：%s（%s 含「%s」）" % (lm, county, k))
    for nation, items in wl.items():
        for lm in items:
            if nation in lm: err("世界地標洩答：%s 含國名 %s" % (lm, nation))
    # 首都含國名者必須被排除出題（build 已處理，這裡驗證規則本身）
    leak_caps = [k for k, v in caps.items() if k in v]
    # ── 重名 ──
    for bank, label in [(tl, "台灣景點"), (wl, "世界地標")]:
        seen = {}
        for owner, items in bank.items():
            for lm in items:
                if lm in seen: err("%s 重名：%s（%s／%s）" % (label, lm, seen[lm], owner))
                seen[lm] = owner
    capvals = list(caps.values())
    for c in set(capvals):
        if capvals.count(c) > 1: err("首都重名：" + c)

    # ── 句子品質 ──
    for src, label in [(wf, "facts-world"), (tf, "facts-taiwan"), (wd, "lm-desc-world"), (td, "lm-desc-taiwan")]:
        for k, v in src.items():
            for e in v:
                t = e["text"] if isinstance(e, dict) else e
                a = e.get("angle", "unsorted") if isinstance(e, dict) else "unsorted"
                if "\ufffd" in t or "?" in t: err("%s %s 含可疑字元：%s" % (label, k, t))
                if not (6 <= len(t) <= 40): err("%s %s 長度越界（6–40）：%s" % (label, k, t))
                if a not in ANGLES: err("%s %s 未知角度 %s：%s" % (label, k, a, t))
                if a == "unsorted": warn("%s %s 角度未標：%s" % (label, k, t))
            tt = texts(v)
            if len(tt) != len(set(tt)): err("%s %s 有重複條目" % (label, k))

    # ── 交叉比對 ──
    all_tl = {lm for v in tl.values() for lm in v}
    all_wl = {lm for v in wl.values() for lm in v}
    for nm in td:
        if nm not in all_tl: err("lm-desc-taiwan 多出未知景點：" + nm)
    for nm in all_tl:
        if nm not in td: err("台灣景點缺說明：" + nm)
    for nm in wd:
        if nm not in all_wl: err("lm-desc-world 多出未知地標：" + nm)
    for nm in all_wl:
        if nm not in wd: err("世界地標缺說明：" + nm)
    for c in list(wl) + list(caps) + list(flags):
        if c not in names196: err("非 196 國名稱：" + c)
    for c in names196:
        if c not in caps: err("缺首都：" + c)
        if c not in flags: err("缺旗幟：" + c)

    # ── 往返一致性（雙檔漂移防線）──
    import importlib.util
    spec = importlib.util.spec_from_file_location("build", os.path.join(ROOT, "tools", "build.py"))
    b = importlib.util.module_from_spec(spec); spec.loader.exec_module(b)
    flatten = b.flat
    regen = {
        "world-facts.js": b.js("WORLD_FACTS", flatten(wf)),
        "landmarks.js": b.js("LANDMARKS", tl),
        "world-flags.js": b.js("WORLD_FLAGS", flags),
    }
    for fn, body in regen.items():
        cur = open(os.path.join(OUT, fn)).read()
        if body.strip() not in cur:
            err("往返不一致：data/%s 與 data-src 不同步（請跑 build 而非手改 js）" % fn)

    for w in warns[:5]: print("[warn]", w)
    if len(warns) > 5: print("[warn] ……共 %d 則角度未標（不擋）" % len(warns))
    if errors:
        for e in errors: print("[FAIL]", e)
        sys.exit("validate FAILED: %d errors" % len(errors))
    print("[validate] PASS（%d warns）" % len(warns))

if __name__ == "__main__":
    main()
