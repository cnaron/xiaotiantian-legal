#!/usr/bin/env python3
# X122 颗粒 8:把整页模式(privacy / terms)里两个 <style> 的**先后顺序**掉过来。
#
# 病理:颗粒 4 把 owner 原版页整页搬进来时,按「Play CDN 把样式追加到 head 末尾」的实际 DOM
# 顺序,把 Tailwind 生成的 CSS 放在了页面自己那个 <style> **之后**。那份 CSS 里含 Preflight:
#     body{line-height:inherit}                      ⇒ 盖掉 body{line-height:1.8}
#     blockquote,…,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0} ⇒ 盖掉 p{margin-bottom:1rem} / h2{margin-top:2.5rem} …
#     h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit} ⇒ 盖掉 h2{font-size:1.25rem;font-weight:600}
#     menu,ol,ul{list-style:none;margin:0;padding:0} ⇒ 盖掉 ul{list-style-type:disc;margin-left:1.5rem}
# 两边都是元素级选择器、优先级相同 ⇒ **谁在后面谁赢**。于是整页行高 1.8→1.5、段落间距 16px→0、
# 标题掉回 16px/400,看起来就是 owner 说的「行间距太小、挤成一坨」。
# 本站 support 页走 template/style.css,复位写在第 ① 段(在前)⇒ 一直是对的,所以两页长得不一样。
#
# 修法:把 Tailwind 那块整体挪到页面自己 <style> **之前**(= 该页作者本来的意图,也 = support 的顺序)。
# 不新增、不删除、不改写任何一条 CSS 声明,只换两个 <style> 元素的位置。
# 用法:fix_cascade_order_claudecode_20260908.py content/privacy.html [content/terms.html …]
# 2026.09.08 Naron
import pathlib, re, sys

NEW_COMMENT = """    <!-- 下面这段 = cdn.tailwindcss.com(v3.4.17)在本页上实际生成的 CSS,由 tools/dumpcss
         从真实浏览器抓出后原样内联。**必须放在下面那个页面自己的 <style> 之前**:它含 Tailwind
         Preflight(p/h1-h6 的 margin 清零、h1-h6 字号字重 inherit、ul list-style:none、
         body line-height:inherit),与页面样式同为元素级选择器、优先级相同 ⇒ 谁在后面谁赢。
         颗粒 4 照抄原版页的 DOM 顺序(Play CDN 追加到 head 末尾)把它放在了后面,于是 Preflight
         反过来盖掉页面自己的排版:行高 1.8→1.5、段距 16px→0、标题 20px/600→16px/400。
         X122 颗粒 8 按 owner 令(「参考 support 页面」)改回复位在前。 2026.09.08 Naron -->
"""

OLD_COMMENT_RE = re.compile(
    r'[ \t]*<!--\s*下面这段 = cdn\.tailwindcss\.com.*?-->\n', re.S)
STYLE_RE = re.compile(r'[ \t]*<style>.*?</style>\n', re.S)


def reorder(html: str) -> str:
    head_m = re.search(r'<head>.*?</head>', html, re.S)
    assert head_m, '没找到 <head>'
    head = head_m.group(0)

    # 先摘掉那条说明注释:它正文里带着字面量 "<style>",不先摘会把 <style> 的边界找歪
    comments = OLD_COMMENT_RE.findall(head)
    assert len(comments) == 1, f'Tailwind 说明注释应恰好一条,实得 {len(comments)}'
    bare = head.replace(comments[0], '', 1)

    styles = STYLE_RE.findall(bare)
    assert len(styles) == 2, f'<head> 里应恰好两个 <style>,实得 {len(styles)}'
    page_style, tw_style = styles[0], styles[1]
    assert '@import' in page_style and 'line-height: 1.8' in page_style, 'style[0] 不是页面自己的样式'
    assert 'tailwindcss v3' in tw_style, 'style[1] 不是 Tailwind 生成的'
    assert 'line-height:inherit' in tw_style, 'style[1] 里没有 Preflight 的 body line-height 复位'

    new_head = bare.replace(tw_style, '', 1)             # 摘掉 Tailwind 块
    assert new_head.count(page_style) == 1
    new_head = new_head.replace(page_style, NEW_COMMENT + tw_style + page_style, 1)

    # 自证:只换位置,没换内容 —— 两个 <style> 的字节前后完全一致,顺序调转
    after = STYLE_RE.findall(new_head.replace(NEW_COMMENT, '', 1))
    assert after == [tw_style, page_style], '重排后 <style> 内容或顺序不对'
    return html.replace(head, new_head, 1)


if __name__ == '__main__':
    for arg in sys.argv[1:]:
        p = pathlib.Path(arg)
        src = p.read_text(encoding='utf-8')
        out = reorder(src)
        p.write_text(out, encoding='utf-8')
        print(f'{arg}: {len(src.encode())} B → {len(out.encode())} B  (两个 <style> 已换序,CSS 声明零改动)')
