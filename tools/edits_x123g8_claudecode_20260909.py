#!/usr/bin/env python3
# X123 颗粒 8:法律站去 IP + 去相册权限(5 → 3)+ 「联系我们」那段收敛措辞。
#
# owner 令(2026-09-09 14:37):「隐私协议里提到联系我们会上传 IP 地址,这个点不用提了,
#   或者去掉这样的敏感信息提交。同时我们现在也不用上传图片或视频,也无需用户下载保存,
#   所以这些都不需要申请权限,也不需要提及。」
# owner 追加(14:50,看了隐私页截图之后):「联系我们」那一段不要罗列这么多细节,尤其
#   「应用运行日志(其中的电子邮件地址与手机号已在发送前抹去)」这种括号说明 ——
#   反而像有很多敏感信息。新措辞由 owner 给定,本脚本逐字照抄,不自己发挥。
#
# ⚠️ 与颗粒 10 的顺序相反,这次是「政策先改、App 后改」:App build 118 现在**仍**申请
#   相册读/写权限(ios/Resources/Info.plist 里两条 NSPhotoLibrary*UsageDescription 还在,
#   结果页上「保存到相册」按钮也还在)。⇒ 提审前必须先由 X121 侧删掉那两条权限,
#   否则是「App 申请、政策不提」——审核上更不利的方向。见 RECEIPT-X123-G8.md §5。
#
# 改法与颗粒 9/10 同构:每条 = (文件, 唯一行锚点, 新整行);锚点**必须恰好命中一行**。
#   BLOCK_DELETES = (文件, 锚点) ⇒ 删掉锚点所在的整个 <li> … </li>(上下界自动求 + 断言配对)。
# 用法:python3 tools/edits_x123g8_claudecode_20260909.py [--dry] [--src <目录>]
# 2026.09.09 Naron
import pathlib, sys, re, hashlib

IND = ' ' * 12          # 正文段落缩进(privacy/support 的 <p> 都在这一级)
IND_LI = ' ' * 16       # <ul> 里的 <li>

EDITS = [
    # ── privacy ──────────────────────────────────────────────────────────────
    # P1 §一 「唯一的例外是联系我们」整段:删 IP 句 + 收敛罗列(owner 14:50 给的措辞,逐字照抄;
    #    只把原来就有的四处 <strong> 按同样位置放回去 —— 强调是排版,不是文字)
    ('privacy.html', '<p><strong>唯一的例外是「联系我们」。</strong>',
     IND + '<p><strong>唯一的例外是「联系我们」。</strong>当您在 App 内「小天天 → 联系我们」填写内容并'
     '<strong>主动点击提交</strong>时，我们会收到您填写的问题描述、您选填的联系方式，'
     '以及为回复与排查所必需的基本信息（App 版本、设备型号、系统版本、会员状态、'
     '最近一局的跳绳记录和用于排查的运行记录），和一个仅用于把同一台设备的多次反馈'
     '接进同一条对话的编号。这些信息<strong>只用于回复您和排查问题，不用于任何其他目的，'
     '不用于营销，也不会提供给第三方</strong>。相关网络请求<strong>全部由您的操作触发</strong>，'
     '您不提交就不会发生。</p>'),
    # P2 §一.2「回看视频」:去掉「保存到相册」这条路(相册写入权限本轮撤掉);
    #    「可回看」「分享出去」保留 —— 分享走系统分享面板,不需要相册权限,App 侧仍有
    ('privacy.html', '<li><strong>回看视频：</strong>',
     IND_LI + '<li><strong>回看视频：</strong>每局跳绳生成的一条视频（<strong>只有画面，不含声音</strong>），'
     '<strong>固定只保留最新的一局</strong>，下一局自动覆盖；您可以回看，也可以主动分享出去</li>'),
    # P6 §六 撤回权限:iOS 设置路径去掉「照片」(权限没了,留着会让人白找)
    ('privacy.html', '<li><strong>撤回权限：</strong>',
     IND_LI + '<li><strong>撤回权限：</strong>在 iOS「设置 → 隐私与安全性 → 相机 / 健康 → '
     '小天天练跳绳」可随时关闭已授予的权限。</li>'),

    # ── index ────────────────────────────────────────────────────────────────
    # I1 目录页隐私政策条目:「5 项系统权限」⇒「3 项」;生效日期已是 9 月 9 日,不动
    ('index.html', '<a class="entry" href="./privacy.html">',
     IND + '    <a class="entry" href="./privacy.html"><strong>隐私政策</strong><span>收集什么、不收集什么、'
     '3 项系统权限各自用途、跳绳视频存在哪里、「联系我们」会发送什么 · 2026年9月9日生效</span></a>'),

    # ── support ──────────────────────────────────────────────────────────────
    # S1 第 3 问「视频存在哪里」:去掉「保存到相册」
    ('support.html', '<p>只存在您自己的手机里，',
     IND + '<p>只存在您自己的手机里，而且 <strong>只保留最新一局</strong>，下一局会自动覆盖。'
     '<strong>不会上传到任何服务器</strong> —— 本 App 没有上传视频的功能。卸载 App 即彻底删除。'
     '您也可以主动分享出去，是否分享完全由您决定。</p>'),
    # S2 第 10 问「会收集我的信息吗」:与 privacy 同步收敛(同一份罗列的第二份副本)
    ('support.html', '<p><strong>不需要注册，本 App 没有账号体系</strong>',
     IND + '<p><strong>不需要注册，本 App 没有账号体系</strong>，也没有接入任何第三方统计 / 广告 SDK。'
     '姓名、学校、位置一概不收集。<strong>唯一会联网的地方是「联系我们」</strong>：您填好点提交时，'
     '才会把您写的问题描述、您选填的联系方式，连同为回复与排查所必需的基本信息'
     '（App 版本、机型、系统版本、会员状态、最近一局的跳绳记录和用于排查的运行记录）发给我们，'
     '<strong>只用来回复您和排查问题</strong>；同时会带一个只用于把您的几次反馈接进同一条对话的编号。'
     '完整说明详见 <a href="./privacy.html" class="text-blue-600">隐私政策</a>。</p>'),
]

# 整行删除(不是整块):§二 系统框架清单里的 Photos 那条
LINE_DELETES = [
    ('privacy.html', '<li><strong>Photos：</strong>'),
]

# 整块删除:§三 设备权限调用里的两条相册权限 <li>(标题 + 用途 + 说明)
BLOCK_DELETES = [
    ('privacy.html', '<strong>相册读取权限</strong>'),
    ('privacy.html', '<strong>相册写入权限</strong>'),
]

# terms 本轮 0 处:改前尺子已经是 0(不是没查)——下面 ASSERT_CLEAN 会验它
ASSERT_CLEAN = ['terms.html']

PAGES = ('index.html', 'privacy.html', 'terms.html', 'support.html')

# 改后四页都不许再出现的词
BANNED = ['IP 地址', '相册', 'Photos', '照片', '电子邮件', '邮箱', '抹去', '权限的开启状态', '运行日志']
# 唯一白名单:privacy §一「我们**不收集**……手机号……」那句 —— 那是"我们不收集手机号"的承诺,
# 删掉是自伤。owner 追加令里的「手机号词 = 0」按"描述**收集内容**的段落里 = 0"执行,
# 这一处是反方向的陈述。判断与理由写在 RECEIPT-X123-G8.md §2.3,请 owner 过目。
PHONE_ALLOW = ['包括但不限于：姓名、手机号、身份证号']
EMAIL_RE = r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
# 改后权限条目应恰好这 3 条
PERM_TITLES = ['<strong>相机权限</strong>',
               '<strong>Apple 健康（HealthKit）写入权限</strong>',
               '<strong>Apple 健康（HealthKit）读取声明</strong>']


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

    for fn, anchor in BLOCK_DELETES:
        i = find(fn, anchor)
        lines = buf[fn]
        a = i
        while a >= 0 and lines[a].strip() != '<li>':
            a -= 1
        b = i
        while b < len(lines) and lines[b].strip() != '</li>':
            b += 1
        if a < 0 or b >= len(lines):
            sys.exit(f'❌ {fn}: 找不到包住 {anchor[:20]} 的 <li>…</li>')
        # 断言配对:区间里不许再有第二个 <li>(不然就是把别的条目一起吃掉了)
        inner = [ln.strip() for ln in lines[a + 1:b]]
        if '<li>' in inner or '</li>' in inner:
            sys.exit(f'❌ {fn}: <li> 区间里还有别的 <li>,拒绝删')
        table.append((fn, a + 1, f'删整块 {b - a + 1} 行(<li>…</li>)'))
        del lines[a:b + 1]

    print(f'{"文件":<14}{"行":>5}  动作')
    for fn, ln, act in table:
        print(f'{fn:<14}{ln:>5}  {act}')

    # ── 自检 ────────────────────────────────────────────────────────────────
    for fn in PAGES:
        full = '\n'.join(load(fn))
        # ★ 禁用词扫的是**剥掉 HTML 注释之后**的正文:注释里那两句 owner 令
        #   (「外部页面一律不写任何电子邮件地址」)本身带着禁用词,它是规矩不是内容。
        #   注释仍然要单独过一把尺子 —— 里面不许出现真的邮箱地址(下面 EMAIL_RE)。
        text = re.sub(r'<!--.*?-->', '', full, flags=re.S)
        if re.search(EMAIL_RE, full):
            sys.exit(f'❌ {fn}: 出现了邮箱地址形状的串(含注释)')
        for word in BANNED:
            n = text.count(word)
            if n:
                sys.exit(f'❌ {fn}: 改后仍有 {n} 处「{word}」')
        # 手机号:只允许落在白名单那句里
        left = text
        for allow in PHONE_ALLOW:
            left = left.replace(allow, '')
        if left.count('手机号'):
            sys.exit(f'❌ {fn}: 白名单之外还有 {left.count("手机号")} 处「手机号」')
    for fn in ASSERT_CLEAN:
        # 「声明不改」要用内容比,不能用「有没有被读进 buf」——上面的禁用词扫描把每页都读了
        if '\n'.join(load(fn)) != (src / fn).read_text(encoding='utf-8'):
            sys.exit(f'❌ {fn}: 声明了不改,却被改了')
    priv = '\n'.join(load('privacy.html'))
    perm_block = priv.split('<h3>3. 设备权限调用</h3>')[1].split('</section>')[0]
    got = re.findall(r'<li>\s*\n\s*(<strong>[^<]*</strong>)', perm_block)
    if got != PERM_TITLES:
        sys.exit(f'❌ 权限条目不是预期的 3 条:{got}')
    print(f'\n✅ 自检过:四页禁用词 0 处;权限条目 {len(got)} 条 = {[g[8:-9] for g in got]}')

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
