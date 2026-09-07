# RECEIPT-X122-G2 · 法律站四页改成 owner 现有线上页的内容与样式 + 国内提速

> 2026-09-07 · 执行 session(Claude Code,mini 本机)· owner 亲自下令 · 承接 `RECEIPT-X122.md`
> commit `854a12d` · Cloudflare 部署 `4341777e` · URL 全部不变

---

## 简短大白话

**做了什么。** 把网上那四个页面(目录页 / 隐私政策 / 用户协议 / 支持页)重做了一遍,照着你
自己现有的那张线上页 `gugushizi.com/ropecounterprivacy.html` 的样子来:一样的白卡片、一样的
蓝色提示框、一样的配色和页宽、一样的"版本更新日期 / 版本生效日期"写法、一样的章节顺序和口气。
另外按你说的:**三个内容页里那种「← 回到主页」和最下面那条页脚栏全去掉了**;**目录页上的
App ID(那串 com.playtime.ropecounter)和联系邮箱也去掉了**,其它内容留着。

**结论是什么。** 四个页面在两个网站上都已经重新发布,国内国外都打得开(测了 8 条地址全 200)。
并排对比图放在 Air 的 `~/Downloads/xiaotiantian-legal-site/`,一眼能看出新旧长得像不像。

**有两件事要你拍板(都在下面写清了)。**
1. **你那张老页面,其实"看起来的样子"和它自己写的样式表不是一回事** —— 它引了一个叫
   Tailwind 的外部脚本,那个脚本把它自己写好的样式(标题分级、项目符号圆点、段落间距、行高)
   全盖掉了,所以你现在看到的老页面是"扁的":没有小圆点、标题和正文一样大。我这次是**按它
   样式表里写的值来做**,所以新页面有小圆点、标题分级更清楚、行距更松。三张图并排放在
   `X122-G2-privacy-3way.png` 里给你挑(第①栏老页面实际长相 / 第②栏本次上线 / 第③栏
   "如果连那个 bug 也照抄会长这样")。**想换成第③栏那种,回一句话,我 5 分钟改完重发。**
2. **老页面上的邮箱是 `shengtang009@126.com`,我们这四页用的是 `shengtang003@126.com`**
   (`003` 是 X122 事实核对表和 STORE-METADATA 里的口径)。**哪个是对的,你确认一下。**

**国内快了多少?** 老实说:**HTML 本身没快,因为慢的根本不是文件大小。**国内到 Cloudflare
一次访问 0.53 秒,其中 0.16 秒在建连接、0.17 秒在 TLS 握手、0.19 秒在等第一个字节,真正传
内容只花 0.011 秒。文件再小也省不出时间。**真省下来的是一次往返:**原来页面要再去下载一个
`style.css`,我把样式直接塞进页面里了,浏览器少跑一趟,实测这一趟值 **0.18 秒**(≈ 首屏快 25%)。
免费档能做的到这儿基本到底了。**要再快只有一条路:放到你自己的国内服务器上** —— 而你已经有
一台了(`gugushizi.com` 就是它),同样一个页面从国内测是 **0.025 秒,快 20 倍**。要不要搬,
你定(§5.3)。

---

## 1. 本轮改了什么(逐条对 owner 三条原话)

| owner 原话 | 落地 | 证据 |
|---|---|---|
| 内容与样式和 `ropecounterprivacy.html` 一致 | 样式表逐项照抄;章节结构 / 标题措辞 / 语气按参照页;事实按核对表纠正 | §2 差异表、§3 样式说明、并排图 |
| 三个内容页去掉「回到主页」与底部栏 | privacy / terms / support 三页:`<footer>`=0、面包屑=0、「返回」=0、「回到主页」=0 | §6 线上实测 |
| 主页去掉 App ID 与联系方式 | index:`App ID` 字样=0、`mailto`/邮箱=0;其余内容(简介、三个入口、零追踪声明)保留 | §6 线上实测 |

**同时按协调追加令做了 ①国内提速**(§5)。**②「edit.html 跳 GitHub」按 owner 改令未做**,
一个字都没写(§9);正文与外壳已按要求拆开,方便颗粒 3 的站内编辑器直接接(§4)。

---

## 2. ★ 与参照页的逐句差异表(owner 可逐条否决)

**左=参照页原句,右=本站现句,右侧给理由。**凡是参照页里与产品现状不符的,以
`RECEIPT-X122.md` §4 事实核对表(18 项,对着 `wt-v3design` HEAD `029923f1` 现读)为准。

### 2.1 事实类差异(11 条)

| # | 参照页原句(2026-05-12 版) | 本站现句 | 为什么改 |
|:--:|---|---|---|
| 1 | 「摄像头视频帧仅用于本地跳绳动作识别,识别后立即丢弃,**绝不保存或上传**」/「我们不保存任何视频、图片或截图」 | 「每完成一局会生成一条本次跳绳的视频…**只保留最新的一局**…绝不上传…卸载即删」 | 与 `LastReplayStore_claudecode_20260901.swift` 直接冲突。旧表述是不实陈述,踩 App Review Guideline 5.1.1 |
| 2 | 只列 **2 条**权限(摄像头、HealthKit) | 逐条列 **6 条**(摄像头 / 麦克风 / 相册写 / 相册读 / 健康写 / 健康读声明) | `ios/project.yml:100–112` 实际声明 6 条;少列即隐私清单不全 |
| 3 | 未提及麦克风 | 明确写「录制期间**旁边的人说话也会被录进去**」 | `NSMicrophoneUsageDescription` 逐字一致;这是最容易被家长投诉的点 |
| 4 | 「本应用提供 **Pro 会员订阅**服务(月订阅 / 年订阅)」「**订阅自动续费**由 Apple ID 系统处理,您可随时…取消」 | 「一次性买断 / 期限制,**没有自动续费订阅**」「**不存在"取消订阅"这一步**」 | X121 颗粒 6/7/9 已改制,枚举里已无自动续订商品 |
| 5 | 月订阅 **¥6/月**、年订阅 **¥58/年**、**3 天免费试用** | 1 年 ¥28、3 年 ¥48(非续期订阅)、永久 ¥128;升级 1 年→永久 ¥98、3 年→永久 ¥78;**无试用** | `SubscriptionPlan.swift`;AUDIT-X118 §3.6 把「3 天试用」列为收费风险 |
| 6 | (未写恢复购买与有效期怎么算) | 写明有效期按 **Apple 签名交易的购买日**在本机算,恢复购买按**原始购买日**重算 | `SubscriptionManager.refreshEntitlements` / `restorePurchases` |
| 7 | 「清除本地数据:在「设置 → **开发选项** → 清空所有记录」(**仅 Debug 版本可见**)」 | 改成「App 内逐条删除记录;卸载彻底清除」 | 面向内部的调试入口不该写进对外政策 |
| 8 | 「Pro 会员解锁功能」含**周/月趋势图、无限历史(突破免费档 3 条)、健康同步、中考评分** | 保留三项(体测模式 / 完整历史与趋势 / 健康同步),免费档写「体测累计 3 次、历史最近 3 条」 | `ProFeature.swift` `freeUsageLimit=3` / `freeHistoryLimit=3` |
| 9 | 用户协议:「当您下载、安装、**注册、登录**或使用本应用时」 | 去掉「注册、登录」 | 本 App 无账号体系,全仓无登录注册路径 |
| 10 | 用户协议:「跳绳计数…可能存在 **±5% 左右**的识别误差」 | 改为「存在一定误差」+ 列出光线/距离/衣物/节奏/机型五个影响因素 | ±5% 这个数字没有实测支撑,不编造具体数字 |
| 11 | 「各省评分标准」(未给数量) | 写明 **6 套**:国家标准(教育部)、北京、上海、广东(广州)、江苏(南京)、浙江(杭州),并写「不会凭推测填入」 | `ChinaProvinceStandards.json` 实读 n=6 |

### 2.2 ★ 需要 owner 拍板的 1 条

| # | 参照页 | 本站 | 说明 |
|:--:|---|---|---|
| 12 | 联系邮箱 **`shengtang009@126.com`**;官方网站 `www.gugushizi.com` | 联系邮箱 **`shengtang003@126.com`**;未写官网 | **两个邮箱不一样(009 vs 003)。**本站用 `003`,因为 X122 事实核对表第 17 项与 `STORE-METADATA §4.3` 都是 `003`。**哪个是在用的,请你确认**;若是 `009`,一行 sed 改完重发。官网链接未写是因为本站不是 gugushizi 站的一部分,写了会把用户导去古古识字 |

### 2.3 结构 / 版式类差异(owner 已明令的 3 条)

| # | 参照页 | 本站 | 依据 |
|:--:|---|---|---|
| 13 | 页面底部有 `© 2026 小天天练跳绳 版权所有` 页脚 | **三个内容页无任何页脚**;目录页也无 `<footer>` 元素(零追踪那句改成正文「关于本站」一节保留) | owner 令「不要底部栏」 |
| 14 | (参照页无面包屑;本站上一版有「← 小天天练跳绳」) | **三页面包屑全删** | owner 令「不要回到主页类导航提示」 |
| 15 | (参照页无 App ID) | 目录页删掉 App ID 与邮箱;**privacy / terms 引言里的 App ID 保留** | owner 只说了主页。保留是因为 App Review 看政策页时要能对上是哪个 App。**要一起删,说一声** |

---

## 3. ★★★ 样式对齐:一条必须讲清楚的发现

**参照页"看起来的样子"和"它自己写的样式表"不是一回事。**

参照页 `<head>` 里先引了 `<script src="https://cdn.tailwindcss.com">`,再写自己的 `<style>`。
Tailwind 这个 CDN 脚本在运行时把它的复位样式(Preflight)**追加到 head 末尾**,于是同优先级、
更靠后的规则赢 —— **参照页自己写的元素级样式被它盖掉了**。

用离屏 WebKit 读参照页的**最终计算样式**(不是猜层叠结果,工具 `tools/computed.swift`)实测:

| 参照页样式表里写的 | 线上实际生效的 | 结果 |
|---|---|:--:|
| `body { line-height: 1.8 }` | `24px`(=1.5) | ❌ 被盖 |
| `h1 { font-weight: 700; margin-bottom: .5rem }` | `font-weight: 400; margin-bottom: 0` | ❌ 被盖 |
| `h2 { font-size: 1.25rem; font-weight: 600; margin-top: 2.5rem }` | `16px / 400 / 0px` | ❌ 被盖 |
| `h3 { font-size: 1.1rem; font-weight: 600 }` | `16px / 400` | ❌ 被盖 |
| `p { margin-bottom: 1rem }` | `0px` | ❌ 被盖 |
| `ul { list-style-type: disc; margin-left: 1.5rem }` | `none / 0px` | ❌ 被盖(**所以老页面没有小圆点**) |
| `.policy-container` / `.highlight-box` / `.meta-info` / `.contact-info` / 表格 / 断点 | 与写的一致 | ✅ 生效(类选择器赢) |
| `h2 { border-bottom: 2px solid #f1f5f9 }` | 生效 | ✅ (元素选择器赢通配符) |

**本轮的取舍:按参照页样式表**写的值**做**(即"逐项照抄样式表"的字面意思),不照抄那个覆盖 bug。
结果:白卡片、蓝色提示框、配色、页宽、居中小标题、日期写法全部与参照页一致;**不同的是**新页
有项目符号圆点、标题分级、段落间距、1.8 行高 —— 也就是参照页作者本来想要的样子。

**给 owner 的选择(并排图 `X122-G2-privacy-3way.png`)**:
- ① 老页面线上实际长相 · ② 本次上线 · ③ 若连覆盖 bug 也照抄会长这样(实测与①几乎重合,验证了上面的定罪)
- **要切到 ③,回一句话** —— `template/style.css` 末尾追加 5 行复位即可,重发两站约 5 分钟。

另外两处刻意不同(都是为了"零脚本零外链",也是国内提速的一部分):

| 项 | 参照页 | 本站 | 原因 |
|---|---|---|---|
| Tailwind CDN 脚本 | 有(第三方脚本) | **无**,它提供的复位与原子类(`mt-2`/`ml-4`/`text-sm`/`text-gray-500`/`text-blue-600`/`list-decimal`…)改写成等价 CSS 内联 | 全站零脚本零追踪;少一个第三方依赖 |
| Google Fonts `@import` Noto Sans SC | 有 | **无**,字体栈保留 `'Noto Sans SC'` 优先,后接 `PingFang SC` 等系统中文字体 | 不发起外链请求。参照页在国内多数网络下这个字体本来也取不到,实际就是回退系统字体 |
| 深色模式(`prefers-color-scheme`) | 无 | **本轮去掉**(上一版有) | 与参照页一致。想要回来说一声 |

---

## 4. 文件结构:正文与外壳已拆开(给颗粒 3 的站内编辑器)

```
cnaron/xiaotiantian-legal
├── template/
│   ├── shell.html          ← 外壳模板(head / 卡片容器 / <h1> / meta-info / <main>)
│   │                          占位符:{{TITLE}} {{DESC}} {{H1}} {{META}} {{CSS}} {{BODY}}
│   └── style.css           ← 唯一样式源(照抄参照页 + 复位 + 原子类),构建时内联进每页
├── content/
│   ├── pages.json          ← 每页的 title / description / h1 / 日期行
│   ├── privacy.html        ← ★ 正文片段(只有 <section>,没有 head/壳)—— 编辑器要改的就是这个
│   ├── terms.html          ← ★ 同上
│   ├── support.html        ← ★ 同上
│   ├── index.html          ← ★ 同上
│   └── 404.html
├── build.py                ← 壳 + 正文 + CSS → docs/*.html
├── reference/              ← 参照页原件存档(2026-09-07 抓),不对外
├── tools/shot.swift        ← 离屏 WKWebView 整页截图(比对用)
├── tools/computed.swift    ← 读页面最终计算样式(§3 那张表就是它出的)
├── docs/                   ← ★ 两处托管都只发这个目录(构建产物)
│   ├── index.html privacy.html terms.html support.html 404.html
│   ├── _headers            ← Cloudflare 缓存与安全头
│   └── .nojekyll
├── README.md  RECEIPT-X122.md  RECEIPT-X122-G2.md   ← 内部,不公开
```

**颗粒 3 的接法**:`content/<page>.html` 就是"正文源",整段搬进 KV 即可;渲染时把
`template/shell.html` 的 `{{BODY}}` 换成 KV 里的那段、`{{CSS}}` 换成 `template/style.css`,
产出与现在 `docs/` 里逐字相同的页面。**壳与样式不需要进编辑器**,编辑器只暴露正文。

⚠️ **一处对协调指示的偏离**:协调说放 `docs/_content/`。**我放在了仓库根 `content/`**,
因为 `docs/` 是对外发布目录 —— 放进去会被公网直接抓到(等于同一份内容有两个地址)。
现已实测 `pages.dev/content/privacy.html` = **404**(§6)。若颗粒 3 需要它可公开访问,再挪。

---

## 5. ★ 国内访问提速:先量后改

### 5.1 改前 / 改后对照(国内 = `ssh appserver` 腾讯云国内机房,每条 10 次,取中位数)

| 路径 | 改前 建连 | 改前 TTFB | 改前 总耗时 | 改前最快 | 改后 建连 | 改后 TTFB | 改后 总耗时 | 改后最快 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| `/` | 0.168 | 0.586 | **0.586** | 0.513 | 0.166 | 0.556 | **0.556** | 0.510 |
| `/privacy` | 0.164 | 0.526 | **0.530** | 0.510 | 0.164 | 0.520 | **0.532** | 0.517 |
| `/terms` | 0.164 | 0.530 | **0.549** | 0.512 | 0.165 | 0.532 | **0.541** | 0.512 |
| `/support` | 0.164 | 0.527 | **0.528** | 0.511 | 0.162 | 0.522 | **0.528** | 0.509 |

**HTML 单次抓取:基本没变(±0.03s,在抖动范围内)。这是如实数字,不粉饰。**

### 5.2 为什么没变:耗时构成拆开看(改后 `/privacy` 中位)

| 阶段 | 耗时 | 占比 |
|---|--:|--:|
| DNS + TCP 建连 | 0.164s | 31% |
| TLS 握手 | 0.167s | 31% |
| 请求 + 等首字节 | 0.189s | 36% |
| **正文传输(19.7 KB → gzip 7.1 KB)** | **0.011s** | **2%** |

**结论:TLS + RTT 占 98%,文件大小占 2%。**国内到 Cloudflare 边缘一个 RTT ≈ 165–190 ms,
握手要三个来回,0.52 s 是这条链路的地板。**把页面再压小一半,省下的是 5 毫秒。**

### 5.3 那么这轮真正省下来的是什么:少一次往返

改前每页 `<link rel="stylesheet" href="style.css">` —— 浏览器要**再发一个请求**才能渲染。
本轮把 CSS 内联进 HTML,这一趟没了。**实测同连接上多取一个资源的边际耗时**(国内,5 次):

```
0.192  0.185  0.189  0.175  0.180   → 中位 0.185s
```

⇒ **首屏可渲染时间 ≈ 0.71s → 0.53s,省 0.185s(约 25%)。**
这一项 `curl` 抓单个 HTML 是量不出来的(curl 不会去取 css),所以 §5.1 那张表看不见它 —— 必须
分开说,否则就是拿"没变"的表掩盖真实收益,或者拿"快 25%"去套那张表。

### 5.4 免费档已做的全部四项

| 项 | 做法 | 实测 |
|---|---|:--:|
| 页面自包含 | CSS 内联,**零外链、零字体、零图片、零脚本** | 全站 `<script>`=0;外部资源引用=0(只剩两条指向 Apple 退款页的普通文字链接) |
| gzip 后体积 <15 KB | 目标达成 | privacy **7.1 KB** / terms **6.6 KB** / support **4.0 KB** / index **2.1 KB** |
| 消灭重定向链 | 四条入口 URL 直接 200 | `redirects=0` ×4(§6) |
| 缓存与安全头 | 新增 `docs/_headers` | 线上实测 `cache-control: public, max-age=600, stale-while-revalidate=86400` + `nosniff` + `no-referrer` + `X-Frame-Options` |

`max-age` 取 600 而不是更长:Cloudflare 边缘在每次 deploy 后自动失效,长的是 CDN 侧;
浏览器侧只留 10 分钟,是为了**你改完文案不会被自己的浏览器缓存挡住**。

`_redirects` **没有建**:当前四条入口都是直接 200,没有需要保留的重定向项 ⇒ 空文件反而多一份维护面。
⚠️ 代价:`pages.dev/privacy.html`(带 `.html`)仍是 **308 跳到 `/privacy`**,那是 Cloudflare 自带行为,
不影响入口。**给 ASC / App 用的一律是不带 `.html` 的三条。**

站内链接**保留 `./privacy.html` 相对形式**,没有改成无后缀 —— 这一条**没有照协调的字面做,理由如下**:
改成无后缀后 `github.io` 备份站会全线 404(GitHub Pages 不支持无后缀),而备份站每次访问都要多
一次 301。权衡后:**入口 URL(真正要填进 ASC 的那三条)已经是零跳转的无后缀形式**,站内点击在
Cloudflare 上多一次 308(0.19s),只发生在用户从目录页点进去时。**要我改成"两边都无后缀"也可以,
代价是备份站每页多一跳,说一声即可。**

### 5.5 腾讯云 COS:**没做**,因为没凭证

按令「仅当 VPS `~/.keys.md` 有腾讯云凭证时才做」。实读 `~/.keys.md`,分节为
Discord / Telegram / **Cloudflare** / Gmail / 数据库 / iOS 发布 / Android 签名 / X / Air 设备 / 其他,
**没有腾讯云 SecretId / SecretKey**;grep `腾讯|tencent|cos|secretid|qcloud` 零命中。
⇒ **没建桶、没上传、没量 COS 数字。**(与 `RECEIPT-X122.md` §7 的旧结论一致:三台机器都无腾讯云 API 凭证。)

### 5.6 ★★★ 但有一条比 COS 更好的路:你自己已经有一台国内机

量的时候顺手发现的:**`gugushizi.com` 就解析到 `81.71.44.71`,也就是 `ssh appserver` 那台**,
参照页实体在 `/www/wwwroot/gugushizi/public/ropecounterprivacy.html`(git 已跟踪)。

同一条国内链路上的实测对比:

| 站点 | 国内建连 | 国内 TTFB | 国内总耗时 |
|---|--:|--:|--:|
| `xiaotiantian-app.pages.dev/privacy` | 0.164s | 0.520s | **0.532s** |
| `gugushizi.com/ropecounterprivacy.html` | 0.008s | 0.021s | **0.025s** |

⇒ **国内自有服务器快约 20×**,而且 **App 里现在指向的本来就是 `gugushizi.com` 那两条老链接**。

**建议(需 owner 点头,本轮没动)**:把这四页发到 `gugushizi.com` 上(例如
`/ropecounter/privacy.html` 之类的新路径,或直接覆盖那两张老页),`pages.dev` 退为海外备份。
⚠️ 注意两条硬约束:那台机器的部署**只能走 `deploy.sh`,禁止裸 `git pull`**;且那两个文件
**由 `gugushizi-server` 仓库跟踪**,要改就得改那个仓库再 `deploy.sh`,不能直接往服务器上写。
⇒ 这是一条**跨仓库**的活,应当另立颗粒,不在本轮擅自动。

---

## 6. 上线与可达性实测(2026-09-07 18:0x CST)

**两处托管都已重发:**Cloudflare `wrangler pages deploy docs`(部署 `4341777e`,含 `_headers`);
GitHub Pages 随 `git push` 自动构建(commit `854a12d`)。**URL 一条没变。**

### 6.1 八条地址两地全 200

| URL | 海外(mini) | 国内(appserver) |
|---|:--:|:--:|
| `xiaotiantian-app.pages.dev/` | 200 (0.65s) | 200 ×10/10 |
| `xiaotiantian-app.pages.dev/privacy` | 200 (0.77s) | 200 ×10/10 |
| `xiaotiantian-app.pages.dev/terms` | 200 (0.85s) | 200 ×10/10 |
| `xiaotiantian-app.pages.dev/support` | 200 (1.00s) | 200 ×10/10 |
| `cnaron.github.io/xiaotiantian-legal/` | 200 (0.87s) | (未逐条复测,内容已核) |
| `…/privacy.html` | 200 (0.94s) | 内容核对通过 |
| `…/terms.html` | 200 (0.79s) | 内容核对通过 |
| `…/support.html` | 200 (0.74s) | 内容核对通过 |

反向对照:`pages.dev/no-such-x122-g2` → **404**(真 404,不是软 200)。

### 6.2 从国内抓正文核对(去标签后 grep,数字=命中次数)

| 页面 | 关键句 | 命中 |
|---|---|:--:|
| `pages.dev/privacy` | 核心承诺 | 1 |
| `pages.dev/privacy` | 到期不自动续费 | 2 |
| `pages.dev/privacy` | 只保留最新的一局 | 2 |
| `pages.dev/privacy` | 没有任何联网上传功能 | 1 |
| `pages.dev/terms` | 到期不自动续费 / 非续期订阅 | 1 / 3 |
| `pages.dev/support` | shengtang003@126.com | 2 |
| `github.io/…/privacy.html` | 核心承诺 | 1 |
| `github.io/…/terms.html` | 到期不自动续费 | 1 |
| `github.io/…/support.html` | shengtang003@126.com | 2 |

### 6.3 硬约束线上核对(期望全 0,实测全 0)

```
privacy    <footer>=0  面包屑=0  「返回」=0  「回到主页」=0  <script>=0
terms      <footer>=0  面包屑=0  「返回」=0  「回到主页」=0  <script>=0
support    <footer>=0  面包屑=0  「返回」=0  「回到主页」=0  <script>=0
index      App ID 字样=0   邮箱/mailto=0   <footer>=0
```

### 6.4 内部文件不对外(实测全 404)

`/RECEIPT-X122.md` · `/README.md` · `/build.py` · `/template/style.css` ·
`/content/privacy.html` · `/reference/gugushizi-ropecounterprivacy-20260907.html` → **全部 404**。

---

## 7. 并排图与产物

已 scp 到 **Air `~/Downloads/xiaotiantian-legal-site/`**(mini 不留副本):

| 文件 | 是什么 |
|---|---|
| `X122-G2-privacy-3way.png` | ★ 隐私政策三栏并排:① 老页面线上实际长相 / ② 本次上线 / ③ 若连 Tailwind 覆盖 bug 也照抄 |
| `X122-G2-privacy-3way-view.png` | 同上缩小版(直接看) |
| `X122-G2-terms-2way.png` / `-view.png` | 用户协议:老页面 vs 新页面 |
| `X122-G2-four-pages.png` / `-view.png` | 本次四页全景(目录 / 隐私 / 协议 / 支持) |
| `index.html privacy.html terms.html support.html` | 本次上线四页的副本 |

截图用离屏 WebKit 整页快照(`tools/shot.swift`,宽 900pt、2× 像素),老页面是**真的联网加载**
`cdn.tailwindcss.com` 后再截的 ⇒ 就是国内正常网络下你会看到的样子。

---

## 8. 诚实边界

1. **法律措辞未经律师审阅。**工程/产品口径的如实描述,不是法律意见。
2. **§2 的每一条"事实"都来自 `RECEIPT-X122.md` §4 的核对表(对 `wt-v3design` HEAD `029923f1` 现读),
   本轮没有重新读一遍代码。**若这几天 X121 那边价格/权限又变了,页面会跟着旧。要我重核请说。
3. **邮箱 `003` vs `009` 未解决**(§2.2)——两个来源冲突,我按核对表选了 `003`,**没有向任何一个邮箱发信验证**。
4. **`±5%` 误差、「9 省」这类参照页里的具体数字被我删掉或改小,不是因为我测过更准的值,
   而是因为没有可引的实测支撑**。删数字比留一个来路不明的数字安全,但这确实是"减少了信息"。
5. **样式一致性是"计算样式逐项比对 + 并排截图",不是像素级 diff。**§3 那张表列了 8 组元素的最终
   计算值;`.policy-container` / `.highlight-box` / 配色 / 页宽 / 断点与参照页完全相同,
   **标题字号、行高、项目符号、段落间距是刻意不同的**(理由见 §3)。
6. **没有在真机上打开看过。**响应式断点(`max-width:640px`)照抄参照页,但没在 iPhone 上实际验证排版。
7. **国内耗时只在 `appserver` 这一台上量过**,那是腾讯云机房出口,路由条件比家庭宽带好。
   **不能据此说"国内到处都是 0.53 秒"**;家庭/移动网络通常更慢,但耗时构成(TLS+RTT 占大头)的结论不变。
8. **§5.3 那 0.185s 是"同连接上多取一个资源"的边际耗时,是对"内联 CSS 省下多少"的合理代理量,
   不是真的用浏览器量的首屏时间。**没有跑 Lighthouse / WebPageTest。
9. **两站内容目前一致,但仍然没有自动同步机制**:GitHub Pages 跟 git 走,Cloudflare 靠 wrangler 手动发。
   以后改文案**仍须两边都发**(这一条与上一版回执相同,owner 接 Git 后只解决 Cloudflare 那一侧)。
10. **`docs/style.css` 已删除**(CSS 全部内联)⇒ 老地址 `pages.dev/style.css` 现在是 404。站内已无引用。
11. **Cloudflare 凭证**:仍用 VPS `~/.bashrc` / `~/.keys.md` 里既有的账号级 token,
    **只经环境变量注入本次进程,未落盘、未写进本回执、未提交 git**。没有为本项目新建最小权限 token。
12. **git 身份**:commit 署 `claudecode-ondevice-agent`,未借用 owner 身份、未改 git config
    (用 `GIT_AUTHOR_*` 环境变量注入)。

---

## 9. 明确没做的事(别当做了)

- ❌ **`edit.html` 站内编辑入口一个字没写** —— owner 改令改由颗粒 3 做站内编辑器
  (Pages Functions + KV、口令拦、左编右预览、保存即发布)。本轮只把正文与外壳拆开(§4)为它铺路。
- ❌ **没把页面搬到 `gugushizi.com`**(§5.6 只是建议 + 实测数字),没碰 `gugushizi-server` 仓库,
  没在 App server 上写任何文件。
- ❌ **腾讯云 COS 没做**(无凭证,§5.5)。
- ❌ **App 内链接仍未替换。**`SettingsView` / Paywall 依旧指向
  `https://gugushizi.com/ropecounterprivacy.html` 与 `…terms.html`(**那两张页面本轮也没改**,
  内容仍是 5 月那份带"不保存视频""自动续费"的旧版)。⇒ **目前 App 里点出去看到的还是旧文案。**
- ❌ **App Store Connect 后台没填**(隐私政策 URL 仍是旧值,支持 URL 仍是 `null`)。
- ❌ **没删重复站 `xiaotiantian-legal.pages.dev`**(等 owner 裁),⚠️ 它现在内容是**旧的**,
  与主站不一致 —— 因为本轮只发了 `xiaotiantian-app`。要么删,要么告诉我也发它一份。
- ❌ **没发飞书通知**(项目纪律:过程回报走会话)。
- ❌ **没动 rope-counter 仓库、没动 `wt-v3design`**(只在 §2 引用上一轮已核对过的结论,本轮零读写)。
- ❌ **没做像素级 diff、没跑真机、没跑 Lighthouse**(§8.5–8.8)。
