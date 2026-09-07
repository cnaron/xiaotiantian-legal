#!/usr/bin/env python3
# 构建 docs/ 对外页面:壳模板 template/shell.html + 正文片段 content/<page>.html
#   + 样式 template/style.css(内联进每页,零外链 ⇒ 国内少一次 TLS 往返)
#
# X122 颗粒 3 起还额外产出「站内编辑器」需要的三样东西(都是产物,不要手改):
#   functions/_lib/render.js  ← template/render.js 的副本(Worker 侧用)
#   docs/edit-render.js       ← 同一份的副本(浏览器预览侧用),两份 sha256 必须相同(G-RENDER)
#   functions/_lib/assets.js  ← 外壳/样式/页面元信息/静态回退正文,打进 Function bundle
# 并在最后自检:JS 侧组装出来的页面与本脚本写出的 docs/*.html 逐字节相同(G-EQ 的离线一半)。
# 2026.09.07 Naron
import hashlib, json, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent
shell = (ROOT / "template" / "shell.html").read_text(encoding="utf-8")
css = (ROOT / "template" / "style.css").read_text(encoding="utf-8")
pages = json.loads((ROOT / "content" / "pages.json").read_text(encoding="utf-8"))

# 内联 CSS 前做一次保守压缩:去注释、去行首缩进、合并空行(不改选择器与取值)
css_min = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
css_min = "\n".join(l.strip() for l in css_min.splitlines() if l.strip())

out_dir = ROOT / "docs"
bodies = {}
for name, meta in pages.items():
    body = (ROOT / "content" / f"{name}.html").read_text(encoding="utf-8").rstrip("\n")
    bodies[name] = body
    meta_html = "\n".join(f"            <p>{line}</p>" for line in meta["meta"])
    html = (shell
            .replace("{{TITLE}}", meta["title"])
            .replace("{{DESC}}", meta["desc"])
            .replace("{{H1}}", meta["h1"])
            .replace("{{META}}", meta_html)
            .replace("{{CSS}}", css_min)
            .replace("{{BODY}}", body))
    target = out_dir / meta["out"]
    target.write_text(html, encoding="utf-8")
    print(f"{target.relative_to(ROOT)}  {len(html.encode('utf-8')):>6} B")

# ── 渲染器双端副本(G-RENDER)────────────────────────────────────────────────
src_render = ROOT / "template" / "render.js"
copies = [ROOT / "functions" / "_lib" / "render.js", ROOT / "docs" / "edit-render.js"]
for c in copies:
    c.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src_render, c)
shas = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in [src_render] + copies}
if len(set(shas.values())) != 1:
    print("构建失败:渲染器两份副本 sha256 不一致", shas, file=sys.stderr); sys.exit(1)
print("render.js sha256 =", next(iter(shas.values())), "(3 份一致)")

# ── class 白名单自检:正文里用到的 class 必须全在 render.js 的白名单里 ─────────
wl = set(re.findall(r"'([a-z0-9-]+)'", re.search(
    r"ALLOWED_CLASSES = new Set\(\[(.*?)\]\)", src_render.read_text(encoding="utf-8"), re.S).group(1)))
used = set()
for b in bodies.values():
    for cs in re.findall(r'class="([^"]*)"', b):
        used.update(cs.split())
missing = used - wl
if missing:
    print("构建失败:正文用到但不在 render.js 白名单里的 class:", sorted(missing), file=sys.stderr); sys.exit(1)
print(f"class 白名单自检通过(正文用 {len(used)} 个,白名单 {len(wl)} 个)")

# ── 打包给 Function 的资产 ──────────────────────────────────────────────────
assets = ROOT / "functions" / "_lib" / "assets.js"
assets.write_text(
    "// 本文件由 build.py 生成,请勿手改(改 template/ 与 content/ 后重跑 python3 build.py)。\n"
    f"export const SHELL = {json.dumps(shell, ensure_ascii=False)};\n"
    f"export const CSS_MIN = {json.dumps(css_min, ensure_ascii=False)};\n"
    f"export const PAGES = {json.dumps(pages, ensure_ascii=False)};\n"
    f"export const FALLBACK = {json.dumps(bodies, ensure_ascii=False)};\n"
    f"export const BUILD_STAMP = {json.dumps(hashlib.sha256((shell + css_min).encode()).hexdigest()[:12])};\n",
    encoding="utf-8")
print(f"functions/_lib/assets.js  {assets.stat().st_size:>6} B")

# ── 自检:JS 侧组装 == docs/*.html 逐字节 ───────────────────────────────────
check = subprocess.run(["node", str(ROOT / "tools" / "check_parity.mjs")], cwd=ROOT)
if check.returncode != 0:
    print("构建失败:JS 侧组装与 docs/*.html 不逐字节相同", file=sys.stderr); sys.exit(1)
