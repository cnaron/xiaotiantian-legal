#!/usr/bin/env python3
# 把 content/<page>.html 的正文原样导入 KV(键 page:<name>),作为编辑器的首版内容。
#   用法:  source tools/cfenv.sh && python3 tools/kv_import.py [--dry]
# 值与 build.py 用的正文**逐字节相同**(同样 rstrip 掉尾部换行),这是 G-EQ 成立的前提。
# 注意:这会覆盖 KV 里现有正文 —— owner 在网页上改过之后再跑就会把他的改动盖掉。
# 2026.09.07 Naron
import json, os, pathlib, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
NS_ID = "c1f1ad2b441b4d2ba0fb896e375c2621"          # LEGAL_CONTENT
PAGES = ["index", "privacy", "terms", "support"]

items = []
for name in PAGES:
    body = (ROOT / "content" / f"{name}.html").read_text(encoding="utf-8").rstrip("\n")
    items.append({"key": f"page:{name}", "value": body})
    print(f"page:{name}  {len(body.encode()):>6} B")

if "--dry" in sys.argv:
    print("dry run,未写入"); sys.exit(0)

with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False)
    tmp = f.name
try:
    r = subprocess.run(["npx", "wrangler", "kv", "bulk", "put", tmp,
                        "--namespace-id", NS_ID, "--remote"], cwd=ROOT)
    sys.exit(r.returncode)
finally:
    os.unlink(tmp)
