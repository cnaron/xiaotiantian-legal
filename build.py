#!/usr/bin/env python3
# 构建 docs/ 对外页面:壳模板 template/shell.html + 正文片段 content/<page>.html
#   + 样式 template/style.css(内联进每页,零外链 ⇒ 国内少一次 TLS 往返)
# 正文与外壳分离是刻意的:后续「站内编辑器(Pages Functions + KV)」颗粒可以直接
# 把 content/<page>.html 的内容搬进 KV,壳模板不变。 2026.09.07 Naron
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent
shell = (ROOT / "template" / "shell.html").read_text(encoding="utf-8")
css = (ROOT / "template" / "style.css").read_text(encoding="utf-8")
pages = json.loads((ROOT / "content" / "pages.json").read_text(encoding="utf-8"))

# 内联 CSS 前做一次保守压缩:去注释、去行首缩进、合并空行(不改选择器与取值)
css_min = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
css_min = "\n".join(l.strip() for l in css_min.splitlines() if l.strip())

out_dir = ROOT / "docs"
for name, meta in pages.items():
    body = (ROOT / "content" / f"{name}.html").read_text(encoding="utf-8").rstrip("\n")
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
