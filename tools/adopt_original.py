#!/usr/bin/env python3
# X122 颗粒 4:把 owner 原版页面(gugushizi.com)整页搬成本站正文。
#
# 铁律:**原版 HTML 一字节不改**,只施加 PREREG-X122-G4.md §2 登记过的三处改动:
#   A1 删页脚版权行(owner 规则 2:去掉「回到主页」类导航与底栏)
#   A2 <script src="https://cdn.tailwindcss.com"> ⇒ 换成**该 CDN 在这一页上实际生成的那份 CSS**
#      (tools/dumpcss 从真实 WebKit 抓的,不是手写近似),内联成第二个 <style>。
#      位置刻意放在原版自己那个 <style> **之后** —— 因为浏览器里 Play CDN 就是把样式追加到
#      head 末尾的,先后顺序决定同优先级规则谁赢(preflight 会盖掉原版的 p/ul/h1 元素级样式)。
#      放错位置 = 长相就变了。阴性对照见回执 G4-PIXEL。
#   A3 @import 的 Google Fonts URL ⇒ 改写成同源 assets/noto-sans-sc.css(零外域),
#      **只换 URL**,@import 这个写法是原版自己的,不新增标签。
# 每一处改动都在这里显式断言"确实改到了",改不到就报错退出,防止静默漏改。
# 用法:adopt_original.py <原版html> <抓下来的styles.css> <输出正文.html>
# 2026.09.08 Naron
import pathlib, sys

SCRIPT_LINE = '    <script src="https://cdn.tailwindcss.com"></script>\n'
GFONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap');"
LOCAL_IMPORT = "@import url('assets/noto-sans-sc.css');"


def adopt(raw: str, styles_dump: str) -> tuple[str, list[str]]:
    log = []
    html = raw

    # ── A3:字体外链本地化(只换 URL)────────────────────────────────────────
    assert html.count(GFONT_IMPORT) == 1, 'A3:没找到唯一的 Google Fonts @import'
    html = html.replace(GFONT_IMPORT, LOCAL_IMPORT)
    log.append('A3 字体 @import → 同源 assets/noto-sans-sc.css')

    # ── A2:Tailwind CDN 脚本 → 内联它自己生成的 CSS,放在原版 <style> 之后 ──
    assert html.count(SCRIPT_LINE) == 1, 'A2:没找到唯一的 Tailwind CDN script 行'
    html = html.replace(SCRIPT_LINE, '')
    # styles_dump 是 dumpcss 的产物:style[0]=原版自己的,style[1]=Tailwind 注入的
    parts = styles_dump.split('/*== style[1]')
    assert len(parts) == 2, 'A2:抓到的样式表不是恰好两个 <style>'
    tw = parts[1].split('==*/', 1)[1].strip('\n')
    assert 'tailwindcss v3' in tw, 'A2:style[1] 不是 Tailwind 生成的'
    assert '<' not in tw, 'A2:Tailwind CSS 里出现了 "<",会被正文白名单转义'
    assert 'url(http' not in tw and '@import' not in tw, 'A2:Tailwind CSS 里有外域引用'
    anchor = '    </style>\n'
    assert html.count(anchor) == 1, 'A2:原版 <style> 结束标记不唯一'
    inline = (anchor
              + '    <!-- 下面这段 = cdn.tailwindcss.com(v3.4.17)在本页上实际生成的 CSS,\n'
              + '         由 tools/dumpcss 从真实浏览器抓出后原样内联。位置必须在上面那个 <style>\n'
              + '         之后:Play CDN 就是追加到 head 末尾的,顺序变了长相就变了。 2026.09.08 Naron -->\n'
              + '    <style>\n' + tw + '\n    </style>\n')
    html = html.replace(anchor, inline)
    log.append(f'A2 Tailwind CDN script → 内联 CSS {len(tw.encode())} B(放在原版 style 之后)')

    # ── A1:删底栏(owner 规则 2)──────────────────────────────────────────
    start = html.find('    <footer')
    assert start != -1, 'A1:没找到 <footer>'
    end = html.find('</footer>', start)
    assert end != -1, 'A1:<footer> 没闭合'
    end += len('</footer>\n')
    # 连同它前面那个空行一起删,免得正文尾部多一行空白
    lead = start - 1 if start > 0 and html[start - 1] == '\n' else start
    removed = html[start:end]
    html = html[:lead] + html[end:]
    log.append(f'A1 删底栏 {len(removed.encode())} B:{" ".join(removed.split())[:60]}…')

    assert 'gugushizi.com/ropecounter' in html or 'www.gugushizi.com' in html, '站内互链被误删'
    return html, log


if __name__ == '__main__':
    raw = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
    dump = pathlib.Path(sys.argv[2]).read_text(encoding='utf-8')
    out, log = adopt(raw, dump)
    pathlib.Path(sys.argv[3]).write_text(out, encoding='utf-8')
    for l in log:
        print('  ·', l)
    print(f'{sys.argv[3]}  {len(raw.encode())} B → {len(out.encode())} B')
