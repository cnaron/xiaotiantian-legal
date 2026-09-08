#!/usr/bin/env python3
# X122 颗粒 8:全站统一「回复时效 + 保留不逐一回复的权利」措辞(owner 令)。
#
# 统一话术(owner 原话,标点按各页既有风格用全角):
#   提交后，我们通常会在 **14 个工作日内**通过 App 内「联系我们」回复。对于重复提交、
#   信息不足无法核实、或与本 App 无关的问题，我们保留不逐一回复的权利。
#
# 改前站上有**两个互相打架**的时效承诺:support 写「2 个工作日」、privacy 写「十五个工作日」,
# terms 与 index 一句没写。改后四页口径唯一。
# 每处改动都写成 (文件, 旧串, 新串) 并断言旧串恰好出现一次,改不到就报错退出。
# 用法:python3 tools/edits_g8_claudecode_20260908.py [--dry]
# 2026.09.08 Naron
import pathlib, sys

SLA = ('提交后，我们通常会在 <strong>14 个工作日内</strong>通过 App 内「联系我们」回复。'
       '对于重复提交、信息不足无法核实、或与本 App 无关的问题，我们保留不逐一回复的权利。')

EDITS = [
    # ── support:放显眼处(联系方式框内,紧跟联系方式那一行)──────────────────
    ('support.html',
     '                <p><strong>联系方式：</strong><span class="text-blue-600">请在 App 内「小天天 → 联系我们」提交，我们会在 App 内回复</span></p>\n',
     '                <p><strong>联系方式：</strong><span class="text-blue-600">请在 App 内「小天天 → 联系我们」提交，我们会在 App 内回复</span></p>\n'
     '                <p><strong>回复时效：</strong>' + SLA + '</p>\n'),
    # ── support:删掉与上面打架的「2 个工作日」,保留后半句(回复回到同一条对话)──
    ('support.html',
     '<p class="mt-4 text-sm text-gray-500">我们通常在 2 个工作日内回复。在 App 内「小天天 → 联系我们」提交的反馈，',
     '<p class="mt-4 text-sm text-gray-500">在 App 内「小天天 → 联系我们」提交的反馈，'),
    # ── privacy:第八节「如何联系我们」——换掉「十五个工作日」──────────────
    ('privacy.html',
     '我们将尽快审核所涉问题并予以回复，通常在十五个工作日内。',
     SLA),
    # ── terms:第十节「如何联系我们」——原本一句时效都没有,补一句 ──────────
    ('terms.html',
     '                <p><strong>隐私政策：</strong><a href="./privacy.html" class="text-blue-600 hover:underline">查看完整隐私政策</a></p>\n'
     '            </div>\n',
     '                <p><strong>隐私政策：</strong><a href="./privacy.html" class="text-blue-600 hover:underline">查看完整隐私政策</a></p>\n'
     '            </div>\n'
     '            <p class="mt-4 text-sm text-gray-500">' + SLA + '</p>\n'),
]

# index.html 是目录页,通篇没有「联系段」(只有三个入口块的一行描述)⇒ 按任务书「若有…同改」
# 的条件不成立,本轮不动它。改前改后都不含任何时效承诺,与上面四句不冲突。
UNTOUCHED = ['index.html']

dry = '--dry' in sys.argv
root = pathlib.Path(__file__).resolve().parent.parent / 'content'
buf = {}
for fn, old, new in EDITS:
    s = buf.get(fn) or (root / fn).read_text(encoding='utf-8')
    n = s.count(old)
    assert n == 1, f'{fn}: 旧串出现 {n} 次(应为 1):{old[:50]!r}'
    buf[fn] = s.replace(old, new, 1)
    print(f'  · {fn}: -{len(old.encode())} B / +{len(new.encode())} B')

for fn in UNTOUCHED:
    s = (root / fn).read_text(encoding='utf-8')
    for w in ('工作日', '逐一回复'):
        assert w not in s, f'{fn}: 目录页出现了「{w}」,与「本轮不动 index」的登记冲突'
    print(f'  · {fn}: 未改(无联系段,且不含任何时效承诺)')

if dry:
    print('dry run,未写入'); sys.exit(0)
for fn, s in buf.items():
    (root / fn).write_text(s, encoding='utf-8')
    print(f'{fn} 已写入 {len(s.encode())} B')

# 落档后自证:四页里「工作日」只出现在这三处、且串完全一致
hits = 0
for fn in ('index.html', 'privacy.html', 'terms.html', 'support.html'):
    s = (root / fn).read_text(encoding='utf-8')
    c = s.count(SLA)
    hits += c
    other = s.count('工作日') - c
    print(f'  {fn}: 统一话术 {c} 处,其它「工作日」提法 {other} 处')
    assert other == 0, f'{fn}: 还剩 {other} 处不统一的「工作日」提法'
assert hits == 3, f'统一话术应恰好 3 处(support/privacy/terms),实得 {hits}'
print('G8-SLA 自证通过:四页时效口径唯一,共 3 处')
