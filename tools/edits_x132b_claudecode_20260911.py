#!/usr/bin/env python3
# X132 颗粒 B:法律站三页(support/privacy/terms)「回复」措辞统一为「只接收不回复」。
#
# owner 裁决(2026-09-11):新契约(X129-C1 起)是单向的 —— 「联系我们」只接收反馈,
#   不逐一回复。法律站三页里还写着「我们会在 App 内回复」「通常 14 个工作日内回复」,
#   与契约不符,owner 令三页统一改成主控定稿的措辞(见下 NEW_PARA),
#   原「回复时效」小字(RECEIPT-X129-C1 §6 表 2/7/9 号)整句删除,不保留任何时效承诺;
#   其余提到「回复」「工作日」的句子(3/4/5 号)按同一精神改写或删除。
#
# 改法与 X123-G8 同构:每条 = (文件, 唯一行锚点, 新整行);LINE_DELETES 删掉锚点整行。
# 用法:python3 tools/edits_x132b_claudecode_20260911.py [--dry] [--src <目录>]
# 2026.09.11 Naron
import pathlib, re, sys, hashlib

IND = ' ' * 12
IND8 = ' ' * 8
IND16 = ' ' * 16

NEW_PARA = ('如有问题或建议，请在 App 内「小天天 → 联系我们」提交。该入口仅用于接收问题反馈，'
            '我们会查看每一条反馈并用于改进产品，但不会逐一回复。请勿在反馈中填写手机号、'
            '身份证号等个人敏感信息。')

EDITS = [
    # ── privacy ──────────────────────────────────────────────────────────────
    # 5 号:§一.1「唯一的例外是联系我们」—— 去掉「为回复」「只用于回复您」,保留「排查问题」
    #   与「接进同一条对话」的说法(owner:这半句可以留,GitHub 那边确实接在同一条工单上)
    ('privacy.html', '<p><strong>唯一的例外是「联系我们」。</strong>',
     IND + '<p><strong>唯一的例外是「联系我们」。</strong>当您在 App 内「小天天 → 联系我们」填写内容并'
     '<strong>主动点击提交</strong>时，我们会收到您填写的问题描述、您选填的联系方式，'
     '以及为排查问题所必需的基本信息（App 版本、设备型号、系统版本、会员状态、'
     '最近一局的跳绳记录和用于排查的运行记录），和一个仅用于把同一台设备的多次反馈'
     '接进同一条对话的编号。这些信息<strong>只用于排查问题与改进产品，'
     '不用于任何其他目的，不用于营销，也不会提供给第三方</strong>。相关网络请求'
     '<strong>全部由您的操作触发</strong>，您不提交就不会发生。</p>'),
    # 6 号:§八「如何联系我们」开头 —— 换成统一措辞(主控定稿,逐字)
    ('privacy.html', '<p>如果您对本隐私政策有任何疑问、意见或建议，',
     IND + f'<p>{NEW_PARA}</p>'),
    # 7 号:联系方式末尾小字 —— 只保留「无需核验身份」,14 个工作日承诺整句删除;
    #   「不逐一回复」已经在上面 6 号的新段落里说过,这里不重复
    ('privacy.html', '<p class="mt-4 text-sm text-gray-500">由于本应用没有账号体系，',
     IND + '<p class="mt-4 text-sm text-gray-500">由于本应用没有账号体系，我们无法也无需核验您的身份。</p>'),

    # ── terms ────────────────────────────────────────────────────────────────
    # 8 号:§十「如何联系我们」开头 —— 同 6 号,逐字相同
    ('terms.html', '<p>如果您对本协议有任何疑问、意见或建议，',
     IND + f'<p>{NEW_PARA}</p>'),

    # ── support ──────────────────────────────────────────────────────────────
    # 4 号:第 10 问「需要注册账号吗」—— 同 5 号的改法
    ('support.html', '<p><strong>不需要注册，本 App 没有账号体系</strong>',
     IND + '<p><strong>不需要注册，本 App 没有账号体系</strong>，也没有接入任何第三方统计 / 广告 SDK。'
     '姓名、学校、位置一概不收集。<strong>唯一会联网的地方是「联系我们」</strong>：您填好点提交时，'
     '才会把您写的问题描述、您选填的联系方式，连同为排查问题所必需的基本信息'
     '（App 版本、机型、系统版本、会员状态、最近一局的跳绳记录和用于排查的运行记录）发给我们，'
     '<strong>仅用于排查与改进产品</strong>；同时会带一个只用于把您的几次反馈'
     '接进同一条对话的编号。完整说明详见 <a href="./privacy.html" class="text-blue-600">隐私政策</a>。</p>'),
    # 1 号:「联系方式」字段 —— 换成统一措辞(逐字,套在原有 label + span 结构里)
    ('support.html', '<p><strong>联系方式：</strong><span class="text-blue-600">请在 App 内',
     IND16 + f'<p><strong>联系方式：</strong><span class="text-blue-600">{NEW_PARA}</span></p>'),
]

# 整行删除:回复时效承诺(2/9 号)+ 已不存在的「App 内查看回复」功能描述(3 号)
LINE_DELETES = [
    ('support.html', '<p><strong>回复时效：</strong>'),                 # 2 号
    ('support.html', '开发者的回复会直接回到那一页的对话里'),            # 3 号
    ('terms.html', '<p class="mt-4 text-sm text-gray-500">提交后，'),   # 9 号
]

ASSERT_CLEAN = ['index.html']

PAGES = ('index.html', 'privacy.html', 'terms.html', 'support.html')

# 改后三页都不许再出现的词(邮箱裸词尺子沿用历次做法)
BANNED = ['回复', '工作日']
EMAIL_LITERAL = ['@126.com', '@qq.com', '邮箱']


def strip_comments(html: str) -> str:
    return re.sub(r'<!--.*?-->', '', html, flags=re.S)


def apply(src: pathlib.Path, dry: bool):
    buf, table = {}, []

    def load(fn):
        if fn not in buf:
            buf[fn] = (src / fn).read_text(encoding='utf-8').split('\n')
        return buf[fn]

    def find(fn, anchor):
        lines = load(fn)
        hit = [i for i, ln in enumerate(lines) if anchor in ln]
        if len(hit) != 1:
            sys.exit(f'❌ {fn}: 锚点命中 {len(hit)} 行(必须恰好 1):{anchor[:40]}')
        return hit[0]

    for fn, anchor, new in EDITS:
        i = find(fn, anchor)
        old = buf[fn][i]
        if old == new:
            table.append((fn, i + 1, '已是目标值,跳过'))
            continue
        buf[fn][i] = new
        table.append((fn, i + 1, f'改行 {len(old)} B → {len(new)} B'))

    for fn, anchor in LINE_DELETES:
        i = find(fn, anchor)
        table.append((fn, i + 1, f'删整行({len(buf[fn][i])} B)'))
        del buf[fn][i]

    print(f'{"文件":<14}{"行":>5}  动作')
    for fn, ln, act in table:
        print(f'{fn:<14}{ln:>5}  {act}')

    # ── 自检 ────────────────────────────────────────────────────────────────
    for fn in ('privacy.html', 'terms.html', 'support.html'):
        full = '\n'.join(load(fn))
        text = strip_comments(full)  # 尺子扫渲染文案,不扫开发注释(沿用 X123-G8 做法)
        n_new = text.count(NEW_PARA)
        if n_new != 1:
            sys.exit(f'❌ {fn}: 新措辞出现 {n_new} 次(应为 1)')
        # NEW_PARA 本身就含「不会逐一回复」四个字里的「回复」二字(owner 定稿原文如此),
        # 尺子要扫的是「新措辞之外还有没有回复/工作日残留」,不是逐字节撞见就报警。
        rest = text.replace(NEW_PARA, '', 1)
        for word in BANNED:
            n = rest.count(word)
            if n:
                sys.exit(f'❌ {fn}: 新措辞之外仍有 {n} 处「{word}」(不含注释)')
        for word in EMAIL_LITERAL:
            n = full.count(word)
            if n:
                sys.exit(f'❌ {fn}: 出现 {n} 处「{word}」')
    for fn in ASSERT_CLEAN:
        if '\n'.join(load(fn)) != (src / fn).read_text(encoding='utf-8'):
            sys.exit(f'❌ {fn}: 声明了不改,却被改了')
    print('\n✅ 自检过:三页新措辞之外「回复/工作日」= 0(不含注释);邮箱裸词 = 0;新措辞各恰好 1 处、逐字相同')

    if dry:
        print('\n(dry run,未写盘)')
        return
    for fn, lines in buf.items():
        (src / fn).write_text('\n'.join(lines), encoding='utf-8')
        h = hashlib.sha256((src / fn).read_bytes()).hexdigest()[:16]
        print(f'写入 {fn}  sha256 {h}')


if __name__ == '__main__':
    root = pathlib.Path(__file__).resolve().parent.parent
    src = root / 'content'
    if '--src' in sys.argv:
        src = pathlib.Path(sys.argv[sys.argv.index('--src') + 1])
    apply(src, '--dry' in sys.argv)
