# -*- coding: utf-8 -*-
"""X122 颗粒 5:把四页正文逐句改到 App 现状。

每一条改动都是「精确字符串替换 + 断言恰好命中一次」——
改不到就报错退出,绝不静默漏改(沿用颗粒 4 tools/adopt_original.py 的纪律)。
每条改动带 F 编号,对应 PREREG-X122-G5.md §1 事实清单里的代码出处。
2026.09.08 Naron
"""
import io, sys

def apply(path, edits):
    src = io.open(path, encoding='utf-8').read()
    for tag, old, new in edits:
        n = src.count(old)
        if n != 1:
            sys.exit("FAIL %s [%s] 命中 %d 次(应为 1)\n---\n%s" % (path, tag, n, old[:200]))
        src = src.replace(old, new)
    io.open(path, 'w', encoding='utf-8').write(src)
    print("OK %s  (%d 处)" % (path, len(edits)))

# ══════════════════════════════════════════════════════════════════════════
# privacy.html
# ══════════════════════════════════════════════════════════════════════════
PRIVACY = [

("P1 生效日期",
"""            <p>版本更新日期：2026年5月12日</p>
            <p>版本生效日期：2026年5月12日</p>""",
"""            <p>版本更新日期：2026年9月8日</p>
            <p>版本生效日期：2026年9月8日</p>"""),

# F8:原版「识别后立即丢弃,绝不保存」= 假
("P2 核心承诺·视频留存 F8",
"""                    <li>摄像头视频帧仅用于本地跳绳动作识别，识别后立即丢弃，绝不保存或上传</li>""",
"""                    <li>摄像头画面仅用于本机跳绳动作识别；每局会在您的手机本地生成一条跳绳视频，<strong>只保留最新的一局</strong>，可回看与导出，不会上传</li>"""),

# F11:原版「零数据上传」= 已不成立
("P3 核心承诺·唯一网络请求 F11",
"""                    <li>未接入任何第三方分析、广告、登录、推送 SDK</li>""",
"""                    <li>未接入任何第三方分析、广告、登录、推送 SDK</li>
                    <li>全程不联网，唯一的例外是您<strong>主动提交</strong>「联系我们」时（见下方第一节）</li>"""),

# F11:个人信息一节补「联系我们」
("P4 §一.1 个人信息 F9/F11",
"""            <p>我们 <strong>不收集</strong> 用户的任何个人身份信息，包括但不限于：姓名、手机号、邮箱、身份证号、生日、学校、班级、家庭住址、精确或粗略地理位置、设备唯一标识符（IDFA / IDFV）、IP 地址等。您无需注册或登录即可使用本应用的全部功能。</p>""",
"""            <p>我们 <strong>不收集</strong> 用户的任何个人身份信息，包括但不限于：姓名、手机号、身份证号、生日、学校、班级、家庭住址、精确或粗略地理位置、设备唯一标识符（IDFA / IDFV）等。本应用<strong>没有账号体系，无需注册也无法登录</strong>，全部功能均可直接使用。</p>
            <p><strong>唯一的例外是「联系我们」。</strong>当您在 App 内「设置 → 联系我们」填写内容并 <strong>主动点击提交</strong> 时，我们会把您填写的问题描述与联系方式，连同 App 版本号、设备型号（形如 <code>iPhone15,2</code>，同一型号的所有手机完全相同，不是您这一台的编号）、系统版本、语言设置，经由我们的服务器转成一封电子邮件发送到本政策末尾的开发者邮箱。这是本应用 <strong>唯一一处网络请求</strong>：不携带广告标识符、设备唯一标识或任何账号信息，不写入数据库，不设置 Cookie，失败也不重试；您不提交，它就永远不会发生。与访问任何网站一样，发送时服务器会看到您当次的 IP 地址，我们不留存、不作任何其他用途。</p>"""),

# F8:本地数据一节补视频
("P5 §一.2 本地数据补视频 F8",
"""                <li><strong>引导状态：</strong>是否已完成首次引导</li>""",
"""                <li><strong>引导状态：</strong>是否已完成首次引导</li>
                <li><strong>回看视频：</strong>每局跳绳生成的一条带画面与声音的视频，<strong>固定只保留最新的一局</strong>，下一局自动覆盖；您可以回看，也可以主动保存到相册或分享出去</li>"""),

("P6 §一.2 收尾句",
"""            <p>这些数据在你卸载本应用时会随沙盒一同清除，我们没有任何途径访问。</p>""",
"""            <p>这些数据在您卸载本应用时会随沙盒一同清除，我们没有任何途径访问。</p>"""),

# F1-F6:权限 2 条 → 6 条
("P7 §一.3 权限 6 条 F1-F7",
"""                <li>
                    <strong>摄像头权限</strong>
                    <p class="mt-2 ml-4"><strong>用途：</strong>用于本地识别跳绳动作（计数）。</p>
                    <p class="mt-2 ml-4"><strong>说明：</strong>视频帧由设备端模型实时处理，<strong>处理完成后立即从内存中释放</strong>。我们不保存任何视频、图片或截图，也不会上传到任何服务器或第三方机构。</p>
                    <p class="mt-2 ml-4">如果您拒绝授予摄像头权限，您将无法使用自动计数功能，但仍可手动记录跳绳次数。</p>
                </li>
                <li>
                    <strong>Apple 健康（HealthKit）权限</strong> <span class="text-sm text-gray-500">— Pro 会员功能</span>
                    <p class="mt-2 ml-4"><strong>用途：</strong>将完成的跳绳训练以 <code>Workout（跳绳）</code> + 估算卡路里写入系统「健康」app，便于你在「健康」app 内整合查看运动数据。</p>
                    <p class="mt-2 ml-4"><strong>说明：</strong>我们仅请求 <strong>写入</strong> 权限，<strong>从不读取你的任何健康数据</strong>（如步数、心率、体重等）。HealthKit 的读取权限声明仅为满足 Apple 平台技术要求而存在，代码中未调用任何读取接口。</p>
                    <p class="mt-2 ml-4">如果您拒绝授予 HealthKit 权限，您将无法将训练记录同步到「健康」app，但这不影响本应用其他功能。</p>
                </li>""",
"""                <li>
                    <strong>相机权限</strong>
                    <p class="mt-2 ml-4"><strong>用途：</strong>用于在本机识别跳绳动作（计数），以及生成本局的回看视频。</p>
                    <p class="mt-2 ml-4"><strong>说明：</strong>画面由设备端模型实时处理，<strong>识别过程不产生任何上传</strong>。本局结束后会在您的手机本地生成一条视频，只保留最新一局。</p>
                    <p class="mt-2 ml-4">如果您拒绝授予相机权限，您将无法使用自动计数功能，但仍可手动记录跳绳次数。</p>
                </li>
                <li>
                    <strong>麦克风权限</strong>
                    <p class="mt-2 ml-4"><strong>用途：</strong>把跳绳现场的声音录进您的视频。</p>
                    <p class="mt-2 ml-4"><strong>说明：</strong>绳子的声音、您的加油声，<strong>以及旁边的人说话</strong>，都会被录进这条视频。声音只存在本机，不会上传。不想录可以在 iOS「设置 → 隐私与安全性 → 麦克风」里关掉本应用的麦克风权限，视频照常生成，只是没有声音。</p>
                </li>
                <li>
                    <strong>相册读取权限</strong>
                    <p class="mt-2 ml-4"><strong>用途：</strong>让您直接从相册里挑一条已有的视频，按与实时相机完全相同的流程重新数一遍。</p>
                    <p class="mt-2 ml-4"><strong>说明：</strong>只有您在 App 内主动去挑视频时才会用到；被选中的视频只在本机处理，<strong>不会上传</strong>。我们不会浏览、索引或读取您相册里的其它内容。</p>
                </li>
                <li>
                    <strong>相册写入权限</strong>
                    <p class="mt-2 ml-4"><strong>用途：</strong>把本次跳绳视频保存到您的相册。</p>
                    <p class="mt-2 ml-4"><strong>说明：</strong>仅在您点击「保存到相册」时发生，是否保存完全由您决定。</p>
                </li>
                <li>
                    <strong>Apple 健康（HealthKit）写入权限</strong> <span class="text-sm text-gray-500">— Pro 功能</span>
                    <p class="mt-2 ml-4"><strong>用途：</strong>将完成的跳绳训练以 <code>Workout（跳绳）</code> + 估算卡路里写入系统「健康」app，便于您在「健康」app 内整合查看运动数据。</p>
                    <p class="mt-2 ml-4">如果您拒绝授予该权限，您将无法把训练记录同步到「健康」app，但这不影响本应用其他功能。</p>
                </li>
                <li>
                    <strong>Apple 健康（HealthKit）读取声明</strong>
                    <p class="mt-2 ml-4"><strong>用途：</strong>无。<strong>本应用从不读取您的任何健康数据</strong>（如步数、心率、体重等）。</p>
                    <p class="mt-2 ml-4"><strong>说明：</strong>该项声明仅为满足 Apple 平台的技术要求而存在，代码中未调用任何读取接口（请求授权时传入的读取类型是一个空集合）。</p>
                </li>"""),

# F10/F11:第三方 SDK 一节
("P8 §二 系统框架清单 F10/F11",
"""                <li><strong>StoreKit 2：</strong>用于处理订阅购买（Pro 会员）。支付由 Apple ID 系统全程处理，我们不接触任何支付凭证、银行卡或个人付款信息。</li>
                <li><strong>HealthKit：</strong>用于（在用户授权后）将跳绳训练写入「健康」app。</li>
                <li><strong>AVFoundation / Vision：</strong>用于设备端摄像头处理与动作识别，纯本地运算。</li>""",
"""                <li><strong>StoreKit 2：</strong>用于处理 App 内购买。支付由 Apple ID 系统全程处理，我们不接触任何支付凭证、银行卡或个人付款信息。</li>
                <li><strong>HealthKit：</strong>用于（在用户授权后）将跳绳训练写入「健康」app。</li>
                <li><strong>AVFoundation / Vision：</strong>用于设备端相机画面处理与动作识别，<strong>纯本地运算</strong>，识别模型随 App 一起装在您的手机里，不需要联网。</li>
                <li><strong>Photos：</strong>用于（在您主动操作时）从相册选取视频、或把本次视频保存到相册。</li>"""),

("P9 §三 存储期限 F21/F22",
"""                <li><strong>存储期限：</strong>由您本人控制。您可在设置中清空记录，或卸载本应用以彻底删除全部数据。</li>""",
"""                <li><strong>存储期限：</strong>由您本人控制。您可在记录列表中逐条删除，或卸载本应用以彻底删除全部数据（含回看视频）。</li>"""),

# F14/F15/F16:订阅 → 买断
("P10 §四 标题",
"""            <h2>四、 订阅与支付</h2>
            <p>本应用提供 Pro 会员订阅服务（月订阅 / 年订阅），用于解锁中考评分、趋势图、Apple 健康同步等高级功能。</p>""",
"""            <h2>四、 购买与支付</h2>
            <p>本应用提供一次性购买的 Pro 功能，用于解锁中考评分、训练趋势、Apple 健康同步等。<strong>不是自动续费订阅</strong>：1 年 ¥28、3 年 ¥48 为<strong>非续期</strong>购买，期限走完自动回到免费档、不会自动扣款；永久 ¥128 为一次性买断。详细档位与升级规则见用户协议。</p>"""),

("P11 §四 列表 F14/F15",
"""                <li>订阅状态由 <strong>StoreKit 2</strong> 实时校验，仅在本设备本地缓存订阅有效期标识，不上传到任何服务器。</li>
                <li>订阅自动续费由 Apple ID 系统处理，您可随时在 <strong>设置 → Apple ID → 订阅</strong> 中取消。</li>
                <li>详细订阅条款见 <a href="https://gugushizi.com/ropecounterterms.html" class="text-blue-600 hover:underline">用户协议</a>。</li>""",
"""                <li>购买状态由 <strong>StoreKit 2</strong> 校验，仅在本设备本地缓存有效期标识，不上传到任何服务器。</li>
                <li><strong>不存在自动续费，因此也没有「取消订阅」这一步</strong>，您无需做任何操作。到期日按 Apple 签名的购买凭证在本机计算。</li>
                <li>换手机或重装后，用同一个 Apple ID 在 App 内点「恢复购买」即可找回，有效期按原始购买日重新计算。</li>
                <li>详细购买条款见 <a href="./terms.html" class="text-blue-600 hover:underline">用户协议</a>。</li>"""),

("P12 §五 未成年人 F23",
"""                <li>付费页明确建议"由家长或监护人指导后开通订阅"</li>""",
"""                <li>付费页明确写有"一次付费，到期不自动续费 · 建议在家长指导下开通"</li>"""),

# F21/F22:清除数据的真实路径
("P13 §六 您的权利 F21/F22/F15",
"""                <li><strong>清除本地数据：</strong>在「设置 → 开发选项 → 清空所有记录」即可清空本地跳绳记录（仅 Debug 版本可见；正式版需卸载应用）。</li>
                <li><strong>撤回权限：</strong>在 iOS「设置 → 隐私 → 摄像头 / 健康 → 小天天练跳绳」可随时关闭权限授予。</li>
                <li><strong>取消订阅：</strong>在「设置 → Apple ID → 订阅」可随时取消自动续费。</li>""",
"""                <li><strong>删除记录：</strong>在记录列表里左滑，或进入某条记录详情点「删除这条记录」，可<strong>逐条删除</strong>。</li>
                <li><strong>撤回权限：</strong>在 iOS「设置 → 隐私与安全性 → 相机 / 麦克风 / 照片 / 健康 → 小天天练跳绳」可随时关闭已授予的权限。</li>
                <li><strong>无需取消订阅：</strong>本应用不存在自动续费，期限到了自动回到免费档，Apple 不会再扣款。</li>"""),

# F12:联系方式 + 去官网
("P14 §八 联系我们 F11/F12",
"""            <p>如果您对本隐私政策有任何疑问、意见或建议，可以通过以下方式与我们联系：</p>
            <div class="contact-info">
                <p><strong>联系邮箱：</strong><span class="text-blue-600">shengtang009@126.com</span></p>
                <p><strong>官方网站：</strong><a href="https://www.gugushizi.com" class="text-blue-600 hover:underline">www.gugushizi.com</a></p>
            </div>
            <p class="mt-4 text-sm text-gray-500">我们将尽快审核所涉问题，并在验证您的用户身份后十五个工作日内予以回复。</p>""",
"""            <p>如果您对本隐私政策有任何疑问、意见或建议，可以通过以下方式与我们联系：</p>
            <div class="contact-info">
                <p><strong>联系邮箱：</strong><span class="text-blue-600">shengtang009@126.com</span></p>
                <p><strong>App 内入口：</strong>设置 → 联系我们</p>
                <p><strong>用户协议：</strong><a href="./terms.html" class="text-blue-600 hover:underline">查看完整用户协议</a></p>
            </div>
            <p class="mt-4 text-sm text-gray-500">由于本应用没有账号体系，我们无法也无需核验您的身份。我们将尽快审核所涉问题并予以回复，通常在十五个工作日内。</p>"""),
]

if __name__ == '__main__':
    apply('content/privacy.html', PRIVACY)
