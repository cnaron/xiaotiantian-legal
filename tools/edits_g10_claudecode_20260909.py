#!/usr/bin/env python3
# X122 颗粒 10:法律站跟着 App 走 —— 麦克风权限整条下线,权限表 6 → 5。
#
# 背景:X121 颗粒 18(build 117,已 OTA)把 App 里的麦克风**彻底删掉**(不是关掉):
#   不申请权限、录制不写音轨、导出产物读回 0 音轨、包内权限串恰好 5 条
#   (相机 / 相册读 / 相册写 / 健康写 / 健康读声明)。
#   ⇒ 线上隐私政策里「麦克风权限」那一条、以及所有「声音会被录进视频」的说法**已经是假话**,
#     必须删。顺序上是安全方向:App 先没了,政策后改;反过来才会出现「政策说不采集、App 却在申请」。
#
# 改法与颗粒 9 同构:每条 = (文件, 唯一行锚点, 新整行);锚点必须**恰好命中一行**,否则报错退出。
#   BLOCK_DELETES = (文件, 锚点) ⇒ 删掉锚点所在的整个 <li> … </li>(上下界自动求,并断言配对)。
# 用法:python3 tools/edits_g10_claudecode_20260909.py [--dry] [--src <目录>]
#       默认对仓库 content/ 就地改;--src 指向 KV 基线导出目录时用于「从基线重放」。
# 2026.09.09 Naron
import pathlib, sys, re, hashlib

EDITS = [
    # ── privacy ────────────────────────────────────────────────────────────────
    # P1 页顶版本号/生效日期(README 约定:改权限必须同步更新)
    ('privacy.html', '<p>版本更新日期：2026年9月8日</p>', '<p>版本更新日期：2026年9月9日</p>'),
    ('privacy.html', '<p>版本生效日期：2026年9月8日</p>', '<p>版本生效日期：2026年9月9日</p>'),
    # P2 §一.2 本地数据「回看视频」:原文写「带画面与声音的视频」⇒ 现在没有声音了
    ('privacy.html', '<li><strong>回看视频：</strong>',
     '<li><strong>回看视频：</strong>每局跳绳生成的一条视频（<strong>只有画面，不含声音</strong>），'
     '<strong>固定只保留最新的一局</strong>，下一局自动覆盖；您可以回看，也可以主动保存到相册或分享出去</li>'),
    # P3 §六 撤回权限:iOS 设置路径列表去掉「麦克风」
    ('privacy.html', '<li><strong>撤回权限：</strong>',
     '<li><strong>撤回权限：</strong>在 iOS「设置 → 隐私与安全性 → 相机 / 照片 / 健康 → '
     '小天天练跳绳」可随时关闭已授予的权限。</li>'),

    # ── support ────────────────────────────────────────────────────────────────
    # S1 常见问题 4「录像会录到声音吗?」答案整个反过来(问题本身保留 —— 用户仍然会问)
    ('support.html', '<p>会。授权麦克风后，绳子的声音、加油声',
     '<p><strong>不会。</strong>视频里<strong>只有画面，不含声音</strong> —— '
     '本 App 不会录制任何声音。</p>'),

    # ── index ──────────────────────────────────────────────────────────────────
    # I1 目录页隐私政策条目:「6 项系统权限」⇒「5 项」;生效日期跟 privacy 走
    ('index.html', '<a class="entry" href="./privacy.html">',
     '<a class="entry" href="./privacy.html"><strong>隐私政策</strong><span>收集什么、不收集什么、'
     '5 项系统权限各自用途、跳绳视频存在哪里、「联系我们」会发送什么 · 2026年9月9日生效</span></a>'),
]

# 整块删除:§三 设备权限调用里「麦克风权限」那个 <li>(标题 + 用途 + 说明,共 5 行)
BLOCK_DELETES = [
    ('privacy.html', '<strong>麦克风权限</strong>'),
]

# terms.html 本轮 **0 处改动**:全文不含麦克风/录音/声音,权限只在「授权后可用」这类泛指处提及。
# 不是「没查」,是查过为空 —— 下面 ASSERT_CLEAN 会验它。
ASSERT_CLEAN = ['terms.html']

PAGES = ('index.html', 'privacy.html', 'terms.html', 'support.html')
BANNED = ['麦克风', '录音']
# 改后仍允许出现「声音」的句子(只能是「没有声音」这个方向)——每处都必须落在这张白名单里
SOUND_OK = ['只有画面，不含声音', '录像会录到声音吗']
# 权限条目标题(改后应恰好这 5 条,与 build 117 包内权限串一一对应)
PERM_TITLES = ['<strong>相机权限</strong>', '<strong>相册读取权限</strong>', '<strong>相册写入权限</strong>',
               '<strong>Apple 健康（HealthKit）写入权限</strong>', '<strong>Apple 健康（HealthKit）读取声明</strong>']


def apply(src: pathlib.Path, dry: bool):
    buf, table = {}, []

    def load(fn):
        if fn not in buf:
            buf[fn] = (src / fn).read_text(encoding='utf-8').split('\n')
        return buf[fn]

    def find(fn, anchor):
        lines = load(fn)
        idx = [i for i, l in enumerate(lines) if l is not None and anchor in l]
        assert len(idx) == 1, f'{fn}: 锚点命中 {len(idx)} 行(应为 1):{anchor[:40]!r}'
        return idx[0]

    def text(fn):
        return '\n'.join(l for l in buf[fn] if l is not None) if fn in buf \
            else (src / fn).read_text(encoding='utf-8')

    for fn, anchor, new in EDITS:
        i = find(fn, anchor)
        old = buf[fn][i]
        indent = re.match(r'^[ \t]*', old).group(0)
        buf[fn][i] = indent + new
        table.append((fn, 'EDIT', old.strip(), new))
        print(f'  · {fn}:{i+1} EDIT  -{len(old.encode())}B +{len(buf[fn][i].encode())}B')

    for fn, anchor in BLOCK_DELETES:
        i = find(fn, anchor)
        lines = buf[fn]
        a = i
        while a >= 0 and (lines[a] is None or lines[a].strip() != '<li>'):
            a -= 1
        b = i
        while b < len(lines) and (lines[b] is None or lines[b].strip() != '</li>'):
            b += 1
        assert a >= 0 and b < len(lines), f'{fn}: 找不到包住 {anchor!r} 的 <li>…</li>'
        assert b - a == 4, f'{fn}: <li> 块 {a+1}-{b+1} 共 {b-a+1} 行,与登记的 5 行不符'
        blk = [l for l in lines[a:b + 1]]
        for j in range(a, b + 1):
            lines[j] = None
        table.append((fn, 'BLOCK-DELETE', ' / '.join(x.strip() for x in blk), ''))
        print(f'  · {fn}:{a+1}-{b+1} BLOCK-DELETE -{sum(len(x.encode()) + 1 for x in blk)}B(5 行)')

    for fn in buf:
        buf[fn] = [l for l in buf[fn] if l is not None]

    # ── 自证 ①:四页一个「麦克风 / 录音」都不剩 ────────────────────────────────
    total = 0
    for fn in PAGES:
        s = text(fn)
        hits = {w: s.count(w) for w in BANNED if s.count(w)}
        total += sum(hits.values())
        print(f'  {fn}: 违禁词 {hits or 0}')
    assert total == 0, f'改后仍有 {total} 处麦克风/录音'
    # ── 自证 ②:剩下的「声音」全部是「没有声音」这个方向 ────────────────────────
    for fn in PAGES:
        for line in text(fn).split('\n'):
            if '声音' in line:
                assert any(w in line for w in SOUND_OK), f'{fn}: 未登记的「声音」句:{line.strip()[:60]}'
    # ── 自证 ③:权限恰好 5 条,且 App(build 117)那 5 条一条不少 ─────────────────
    p = text('privacy.html')
    n_perm = sum(p.count(t) for t in PERM_TITLES)
    assert n_perm == 5, f'权限标题应 5 条,实得 {n_perm}'
    assert p.count('权限</strong>') + p.count('读取声明</strong>') == 5, '权限条目数与 5 不符'
    # ── 自证 ④:目录页「N 项系统权限」= 5,且 6 已消失 ─────────────────────────
    ix = text('index.html')
    assert ix.count('5 项系统权限') == 1 and ix.count('6 项系统权限') == 0, '目录页权限计数没改对'
    # ── 自证 ⑤:owner 的邮箱尺子仍然 0(颗粒 7) ───────────────────────────────
    for fn in PAGES:
        for w in ('@126.com', '@qq.com', '邮箱'):
            assert w not in text(fn), f'{fn}: 冒出了「{w}」'
    # ── 自证 ⑥:颗粒 8 的时效话术三处一字未动 ─────────────────────────────────
    SLA = ('提交后，我们通常会在 <strong>14 个工作日内</strong>通过 App 内「联系我们」回复。'
           '对于重复提交、信息不足无法核实、或与本 App 无关的问题，我们保留不逐一回复的权利。')
    n = sum(text(fn).count(SLA) for fn in PAGES)
    assert n == 3, f'颗粒 8 的时效话术应仍为 3 处,实得 {n}'
    # ── 自证 ⑦:颗粒 9 的实现细节尺子仍然 0 ───────────────────────────────────
    for fn in PAGES:
        for w in ('Cloudflare', 'GitHub', '工单', '发送记录'):
            assert w not in text(fn), f'{fn}: 冒出了「{w}」'
    # ── 自证 ⑧:terms 真的一个字节没动 ────────────────────────────────────────
    for fn in ASSERT_CLEAN:
        assert fn not in buf, f'{fn} 被改了,与「0 处改动」的登记冲突'
    # ── 自证 ⑨:**本轮写下的**对外文案不许出现半角逗号/分号(owner 令:改到哪屏统一哪屏)
    #    只量本轮新写的行 —— 页面里既有的 CSS 与 HTML 注释本来就是半角,不在这条令的射程内。
    for fn, _a, newline in EDITS:
        body = re.sub(r'<!--.*?-->', '', newline)
        body = re.sub(r'<[^>]*>', '', body)
        for ch in (',', ';'):
            assert ch not in body, f'{fn}: 本轮新文案出现半角「{ch}」:{newline[:60]}'
    print('G10 自证 ①②③④⑤⑥⑦⑧⑨ 全通过')

    if dry:
        print('dry run,未写入')
        return table
    for fn, lines in buf.items():
        s = '\n'.join(lines)
        (src / fn).write_text(s, encoding='utf-8')
        print(f'{fn} 已写入 {len(s.encode())}B sha={hashlib.sha256(s.encode()).hexdigest()[:16]}')
    return table


if __name__ == '__main__':
    root = pathlib.Path(__file__).resolve().parent.parent
    i = sys.argv.index('--src') if '--src' in sys.argv else -1
    src = pathlib.Path(sys.argv[i + 1]) if i > 0 else root / 'content'
    apply(src, '--dry' in sys.argv)
