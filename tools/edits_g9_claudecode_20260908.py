#!/usr/bin/env python3
# X122 颗粒 9:隐私政策 / 用户协议 / 支持页 / 目录页里,把「联系我们」的**实现细节**删掉,
# 只留用户真正需要知道的:①入口 ②会收到什么、用来干什么 ③回复时效(颗粒 8 措辞,本轮不动)。
#
# owner 原话:「不需要写明是怎么联系我们的细节,很多用户不需要知道的内容无需告知。」
#
# 删除对象(任务书点名):Cloudflare / GitHub / 工单 / issue / 「联网几处」/ 发送记录 30 天 /
#   设备编号生成方式(随机生成·钥匙串) / 购买快照逐项(商品编号·原始交易号) / 日志脱敏细节 /
#   IP 抹末段与 10 分钟防刷计数 / 渠道快照与 UDID 列表 / 机型举例 <code>iPhone15,2</code>。
# 保留(合规底线,App Store 隐私要求):会收到什么(按类别一句)、用于什么、不用于什么。
#
# 改法:每条 = (文件, 唯一行锚点, 新整行)。锚点必须**恰好命中一行**,否则报错退出;
#       新行自动沿用旧行的缩进。删除条目 = (文件, 锚点) 整行删掉。
# 用法:python3 tools/edits_g9_claudecode_20260908.py [--dry] [--src <目录>]
#       默认对仓库 content/ 就地改;--src 指向 KV 基线导出目录时用于「从基线重放」。
# 2026.09.08 Naron
import pathlib, sys, re, hashlib

# ── privacy ────────────────────────────────────────────────────────────────────
P_EXCEPT = (
    '<p><strong>唯一的例外是「联系我们」。</strong>当您在 App 内「小天天 → 联系我们」填写内容并 '
    '<strong>主动点击提交</strong> 时，我们会收到您填写的问题描述与联系方式，以及为回复与排查所必需的'
    '技术信息：App 版本、设备型号、系统版本、语言设置、当前会员档位、最近一局的跳绳记录、相关权限的'
    '开启状态、应用运行日志（其中的电子邮件地址与手机号已在发送前抹去）与购买状态，以及一个仅用于把'
    '同一台设备的多次反馈接进同一条对话的编号（它不是广告标识符，也不是 Apple 提供的设备标识）；'
    '与访问任何网站一样，发送时也会带上您当次的 IP 地址。这些信息<strong>只用于回复您和排查问题，'
    '不用于任何其他目的，不用于营销，也不会提供给第三方</strong>。相关网络请求<strong>全部由您的操作'
    '触发</strong>，您不提交就不会发生。</p>'
)

EDITS = [
    # ── privacy ────────────────────────────────────────────────────────────────
    # P1 核心承诺:去掉「共三处」这种联网次数细节
    ('privacy.html', '<li>全程不联网，唯一的例外是「联系我们」：',
     '<li>全程不联网，唯一的例外是您主动使用「联系我们」时（见下方第一节）</li>'),
    # P2 §一.1 个人信息:设备编号的**生成方式**删掉,只留「是什么/不是什么」
    ('privacy.html', '我们 <strong>不收集</strong> 用户的任何个人身份信息',
     '<p>我们 <strong>不收集</strong> 用户的任何个人身份信息，包括但不限于：姓名、手机号、身份证号、'
     '生日、学校、班级、家庭住址、精确或粗略地理位置、广告标识符（IDFA）、Apple 提供的设备标识'
     '（IDFV / UDID）等。本应用<strong>没有账号体系，无需注册也无法登录</strong>，全部功能均可直接使用。'
     '（您主动提交「联系我们」时会附带一个反馈对话编号，它不是上述任何一种标识，详见下一段。）</p>'),
    # P3 §一.1 例外段:原四段(逐项字段表 / 设备编号机制 / Cloudflare→GitHub 工单+三处 /
    #     30 天发送记录+IP 抹末段+10 分钟防刷)压成**一段**
    ('privacy.html', '<p><strong>唯一的例外是「联系我们」。</strong>', P_EXCEPT),
    # P6 购买信息:删掉商品编号与 Apple 原始交易号
    ('privacy.html', '购买状态由 <strong>StoreKit 2</strong> 校验',
     '<li>购买状态由 <strong>StoreKit 2</strong> 校验，仅在本设备本地缓存有效期标识，日常使用不上传到'
     '任何服务器；只有在您主动提交「联系我们」时，才会把购买状态随反馈一并发出，用于核对购买与退款问题。</li>'),
    # P9 删除权:删掉「工单」与「Cloudflare 侧发送记录 30 天」
    ('privacy.html', '<li><strong>删除已提交的反馈：</strong>',
     '<li><strong>删除已提交的反馈：</strong>如需删除您提交过的反馈及随附的技术信息，通过本政策下方的'
     '联系方式告知我们即可。</li>'),

    # ── support ────────────────────────────────────────────────────────────────
    ('support.html', '所有识别都在手机本机完成',
     '<p>“小天天练跳绳”用 iPhone 相机帮孩子数跳绳次数，并对照公开的体测评分标准给出对应分数。'
     '所有识别都在手机本机完成，<strong>不上传</strong>；除了您主动使用「联系我们」时，本 App 不联网。</p>'),
    ('support.html', '<p><strong>不需要注册，本 App 没有账号体系</strong>',
     '<p><strong>不需要注册，本 App 没有账号体系</strong>，也没有接入任何第三方统计 / 广告 SDK。'
     '姓名、学校、位置一概不收集。<strong>唯一会联网的地方是「联系我们」</strong>：您填好点提交时，'
     '才会把您写的问题描述与联系方式，连同排查所需的技术信息（App 版本、机型、系统版本、语言设置、'
     '会员档位、最近一局的跳绳记录、相关权限的开启状态、已抹去联系方式的运行日志与购买状态）发给我们，'
     '<strong>只用来回复您和排查问题</strong>；同时会带一个只用于把您的几次反馈接进同一条对话的编号'
     '（不是广告标识符，也不是 Apple 的设备 ID）。完整说明详见 '
     '<a href="./privacy.html" class="text-blue-600">隐私政策</a>。</p>'),
    # 注释也会原样进渲染后 HTML(颗粒 7 踩过)⇒ 裸词「工单」在这里也得清
    ('support.html', '<!-- ── 联系方式(★ owner 令',
     '<!-- ── 联系方式(★ owner 令:外部页面不写任何电子邮件地址,也不写联系链路的实现细节) ── -->'),

    # ── index ──────────────────────────────────────────────────────────────────
    ('index.html', '用 iPhone 相机识别跳绳动作、自动计数',
     '<p>用 iPhone 相机识别跳绳动作、自动计数，并对照公开的体测评分标准给出对应分数。'
     '<strong>识别全程在手机本机完成，不上传、无账号、无广告、无第三方 SDK。</strong>'
     '除您在 App 内使用「联系我们」之外，本 App 不进行任何网络请求。</p>'),
]

# 整行删除:P3 压缩后被吸收掉的三段
DELETES = [
    ('privacy.html', '<p>此外还会附带一个<strong>由本应用在您首次使用时随机生成'),
    ('privacy.html', '<p>这些内容发送到我们部署在 <strong>Cloudflare</strong> 上的接口'),
    ('privacy.html', '<p>提交的内容与上述排查信息会保存在那条工单里'),
]

# terms.html 本轮 **0 处改动**:它的第十节「如何联系我们」只有入口 + 颗粒 8 的时效句,
# 通篇不含任何联系链路实现细节。不是「没查」,是查过为空 —— 下面 ASSERT_CLEAN 会验它。
ASSERT_CLEAN = ['terms.html']
BANNED = ['Cloudflare', 'GitHub', '工单', 'issue', '发送记录', '钥匙串', '原始交易号', '商品编号',
          '共三处', '追加回复三处', '这三处', 'iPhone15,2', '防刷']

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

    for fn, anchor, new in EDITS:
        i = find(fn, anchor)
        old = buf[fn][i]
        indent = re.match(r'^[ \t]*', old).group(0)
        buf[fn][i] = indent + new
        table.append((fn, 'EDIT', old.strip(), new))
        print(f'  · {fn}:{i+1} EDIT  -{len(old.encode())}B +{len(buf[fn][i].encode())}B')

    for fn, anchor in DELETES:
        i = find(fn, anchor)
        old = buf[fn][i]
        table.append((fn, 'DELETE', old.strip(), ''))
        buf[fn][i] = None
        print(f'  · {fn}:{i+1} DELETE -{len(old.encode())}B')
    for fn in buf:
        buf[fn] = [l for l in buf[fn] if l is not None]

    # ── 自证 ①:四页(含未改的 terms)一个违禁词都不剩 ──────────────────────────
    total = 0
    for fn in ('index.html', 'privacy.html', 'terms.html', 'support.html'):
        s = '\n'.join(buf[fn]) if fn in buf else (src / fn).read_text(encoding='utf-8')
        hits = {w: s.count(w) for w in BANNED if s.count(w)}
        total += sum(hits.values())
        print(f'  {fn}: 违禁词 {hits or 0}')
    assert total == 0, f'改后仍有 {total} 处实现细节裸词'
    # ── 自证 ②:owner 的邮箱尺子仍然 0 ────────────────────────────────────────
    for fn in ('index.html', 'privacy.html', 'terms.html', 'support.html'):
        s = '\n'.join(buf[fn]) if fn in buf else (src / fn).read_text(encoding='utf-8')
        for w in ('@126.com', '@qq.com', '邮箱'):
            assert w not in s, f'{fn}: 冒出了「{w}」'
    # ── 自证 ③:颗粒 8 的时效话术三处一字未动 ─────────────────────────────────
    SLA = ('提交后，我们通常会在 <strong>14 个工作日内</strong>通过 App 内「联系我们」回复。'
           '对于重复提交、信息不足无法核实、或与本 App 无关的问题，我们保留不逐一回复的权利。')
    n = sum(('\n'.join(buf[fn]) if fn in buf else (src / fn).read_text(encoding='utf-8')).count(SLA)
            for fn in ('index.html', 'privacy.html', 'terms.html', 'support.html'))
    assert n == 3, f'颗粒 8 的时效话术应仍为 3 处,实得 {n}'
    # ── 自证 ④:入口话术仍在(①入口这条不许被删掉)──────────────────────────
    for fn, need in (('privacy.html', 2), ('terms.html', 2), ('support.html', 2)):
        s = '\n'.join(buf[fn]) if fn in buf else (src / fn).read_text(encoding='utf-8')
        c = s.count('小天天 → 联系我们')
        assert c >= need, f'{fn}: 入口话术只剩 {c} 处(至少 {need})'
    # ── 自证 ⑤:terms 真的一个字节没动 ────────────────────────────────────────
    for fn in ASSERT_CLEAN:
        assert fn not in buf, f'{fn} 被改了,与「0 处改动」的登记冲突'
    print('G9 自证 ①②③④⑤ 全通过')

    if dry:
        print('dry run,未写入'); return table
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
