# 预注册 · X122 颗粒 5 —— 四页内容逐句核实到 App 现状

登记时间:2026-09-08(北京时间)。执行代理:Claude Code。执行机:mini。
起因(owner 原话):「把内容都核实一遍,不要展示官网,价格和当前保持一致,同时也要加入可编辑的页面」
+ 协调追加两条:①**四页**都要核(不只 privacy/terms);②**主页底部的「静态页面/托管/构建」这类
技术性说明整块删掉**,全站不许出现「本站为静态页面」「由 … 托管」「GitHub」「Cloudflare」「编辑入口」等字样。

---

# 简短大白话

上一轮(颗粒 4)按 owner 的要求,把他 5 月写的隐私政策和用户协议**整篇原样搬**上了新站。
搬完发现:那两页里有 10 处跟 App 现在的实际情况对不上 —— 最要紧的是「**绝不保存视频**」
(现在每局会在手机本地留一条)和「**月订阅 ¥6 / 年订阅 ¥58,自动续费**」(现在是买断制
¥28 / ¥48 / ¥128,到期不自动扣钱)。这一轮就是**把这些话改成真的**。

做法:先把每一条事实**在 App 的源代码里查到出处**(下面 §1 一条一行,谁在哪个文件第几行),
再照着这张表逐句改四个页面的文字。**页面的样子不动** —— 不碰样式、不碰版式、不换字体、不加图,
只换句子里的字。另外按 owner 令,**页面上所有指向老网站 gugushizi.com 的字和链接全部删掉**,
主页最下面那段讲「本站是静态页面」的技术说明也整段删掉。

改完之后四个页面都能在网页编辑器 `/edit` 里打开改字保存。改完会做 5 条机器验证(下面 §4),
每条都先拿改之前的旧文件喂一遍确认它**会红**,再拿新文件跑确认它变绿 —— 免得写出个永远绿的假闸。

**这一轮不动 App 代码。**

---

# 1. 事实清单(逐条给代码出处;凡查不到出处的一律不写进页面)

工程根:`/Users/cc/Public/x84sb/wt-v3design/ios/`

| # | 事实 | 代码出处 | 核实结果 |
|---|---|---|---|
| F1 | 系统权限 **6 条**:相机 / 麦克风 / 相册读 / 相册写 / 健康写 / 健康读声明 | `project.yml:100,103,104,105,108,112` | ✅ 6 条,用途文案逐条抄自该处 |
| F2 | 相机用途 = 本地识别跳绳动作 | `project.yml:103` | ✅ |
| F3 | 麦克风用途 = 把现场声音录进视频,**会录到旁边的人说话**;关掉后视频照常无声 | `project.yml:112` | ✅ |
| F4 | 相册**读**用途 = 从相册选一条视频按同一流程重新计数(本机处理不上传) | `project.yml:100` | ✅(X77 起确实会读) |
| F5 | 相册**写**用途 = 把本次跳绳视频存进相册 | `project.yml:108` | ✅ |
| F6 | 健康**写**用途 = 写入跳绳记录;**只写不读** | `project.yml:104` | ✅ |
| F7 | 健康**读**权限只是声明,代码从不读 | `App/HealthKitBridge.swift:59` → `requestAuthorization(toShare: writeTypes, read: [])` | ✅ `read:` 是空数组,全工程无读取调用 ⇒ 原版这句是**真话,保留** |
| F8 | 每局在本机生成一条跳绳视频,**单槽只留最新一局**,不上传;可回看、可导出/分享 | `Sources/RopeCounterEngine/LastReplayStore_claudecode_20260901.swift` 头部三条冻结策略;`Features/Records/RecordsListView.swift:13` 回看入口 | ✅ ⇒ 原版「绝不保存」**是假的,必改** |
| F9 | 无账户、无登录 | `Sources/RopeCounterEngine/SubscriptionPlan.swift` 全枚举无账号态;App 无登录界面 | ✅ |
| F10 | 识别全部在本机完成 | `App/PoseDetector.swift` / `AVFoundation + Vision` 端上推理 | ✅ |
| F11 | **唯一一处网络请求 = 「联系我们」提交**;发出去的是:用户填的描述 + 联系方式 + App 版本 + build + 机型 + 系统版本 + 语言,共 8 个键;机型是 `iPhone15,2` 这种**同型号共用**的串,**不含 IDFA/IDFV/账号**;不落盘、不重试、不带 Cookie | `Shared/RCContactRelayClient_claudecode_20260907.swift:4`(「本 App 有史以来唯一一处网络请求」)、`:56-65`(8 个键)、`:94-103`(ephemeral/无 Cookie/无缓存) | ✅ ⇒ 原版「零数据上传」**已不成立,必改** |
| F12 | 开发者邮箱 = `shengtang009@126.com`(**009**,不是 003) | `Shared/Components/RCContactSheetV3_claudecode_20260907.swift:36` | ✅ ⇒ **support 页现写的 003 是错的,必改** |
| F13 | App 内入口名 = 「设置 → **联系我们**」 | `Features/Settings/SettingsView.swift:494` | ✅ ⇒ support 页写的「联系开发者」是错的,必改 |
| F14 | 价格五档:1 年 ¥28 / 3 年 ¥48 / 永久 ¥128;1 年→永久 ¥98、3 年→永久 ¥78 | `SubscriptionPlan.swift` `fallbackDisplayPrice` + `upgradePriceFrom1y_20260907`/`From3y` | ✅ |
| F15 | 1 年 / 3 年 = **非续期订阅**(Non-Renewing),**到期不自动续费**;永久 = 非消耗型买断 | `SubscriptionPlan.swift` 类型对应表 + `SubscriptionStatus.isPro(at:)`「过期即失效」 | ✅ ⇒ 原版整节自动续费规则**必删改** |
| F16 | **没有免费试用**;试用期/宽限期两态已从代码删除 | `SubscriptionPlan.swift` `SubscriptionStatus` 注释「没有试用,也没有续费 ⇒ 从枚举里删掉」 | ✅ ⇒ 原版「3 天免费试用」**必删** |
| F17 | 恢复购买按同一 Apple ID 找回,按原始购买日重算有效期 | `App/SubscriptionManager.swift` restore 路径 | ✅ |
| F18 | 免费档:中考/体测模式**累计 3 次**;历史记录**最近 3 条** | `Sources/RopeCounterEngine/ProFeature.swift` `freeUsageLimit = 3`、`freeHistoryLimit = 3`(注释「2026-05-12 收紧 7 → 3」) | ✅ ⇒ 原版「免费档 3 条」对;「7 条」那处注释已过期不引用 |
| F19 | 趋势:免费近 **3 天**,Pro 近 **7 天**;「月」区间入口已按设计稿删除,用户到不了 | `Features/Trends/TrendsView.swift:14-18,92,291` | ✅ ⇒ 原版「完整 7 天 + 30 天」**必改**(30 天没有入口) |
| F20 | 内置评分标准 **6 套**:国家标准(教育部)/ 北京 / 上海 / 广东(广州)/ 江苏(南京)/ 浙江(杭州) | `Sources/Resources/ChinaProvinceStandards.json` `provinces` 数组实测 6 项 | ✅ |
| F21 | 记录可**逐条**删除;卸载即清除全部本地数据 | `Features/Records/RecordsListView.swift:83` `.onDelete`;`Features/Records/RecordDetailView.swift:64-72` 删除确认 | ✅ |
| F22 | 「设置 → 开发选项 → 清空所有记录」**整段包在 `#if DEBUG` 里,上架包不编译** | `Features/Settings/SettingsView.swift:686`(`#if DEBUG`)…`:756` 开发选项 …`:783`(`#endif`) | ✅ 原版这句技术上不算错(它自己也标了"仅 Debug 可见"),但**对正式版用户是废话** ⇒ 改写成正式版真能做到的两条路 |
| F23 | 付费页确有「建议在家长指导下开通」 | `Features/Paywall/PaywallView.swift:389` | ✅ 原版这句**保留**(只把"开通订阅"改成"开通") |
| F24 | 间歇训练(HIIT)**在 UI 上没有入口**(只在记录详情里作为历史模式名出现) | `ProFeature.hiitMode` 存在但 `Features/` 下无启动入口;仅 `RecordDetailView.swift:127` 显示名 | ⚠️ ⇒ **四页一律不提 HIIT**(提了就是画一个用户到不了的功能) |

## 1.1 查不到出处、因此**从页面上删掉**的断言(不是改小,是不写)

| 断言 | 原在哪 | 处置 |
|---|---|---|
| 「跳绳计数 … 可能存在 **±5% 左右**的识别误差」 | terms §七 | 全工程 grep `5%` / `±5` **无任何出处**(见 §1 核实脚本输出)⇒ **删掉这个数字**,改成不带数字的定性说明。对外承诺一个查无实据的精度是法律风险 |
| 「月订阅 → 年订阅 Apple 按剩余天数比例补差价(proration)」 | terms §三.4 | 买断制下不存在 proration ⇒ 换成真实的两档补差价商品 |
| 「本 App **不联网**」 | index 引言 / support 引言 | F11 起已不成立 ⇒ 改成「除您主动提交『联系我们』外不联网」 |

---

# 2. 逐句改动表(改前 → 改后;**这是本轮唯一允许改的范围**)

完整逐句表在回执 §2 落档(改完后按实际 diff 生成,不预先编造)。这里登记**改动类别与边界**:

| 类别 | 允许 | 不允许 |
|---|---|---|
| 文字 | 改段落/列表项/表格单元格/标题的**文字内容** | — |
| 链接 | `href` 从站外(gugushizi.com)改为**站内相对路径**(`./privacy.html` / `./terms.html`) | 新增任何指向外域的链接 |
| 元素 | **同型元素的条数增减**(`<li>`↔`<li>`、`<tr>`↔`<tr>`),且只用页面里**已经出现过**的标签与 class | 新标签类型、新 class、新属性、改 `<style>`、改 CSS、改字体、加图片/脚本 |
| 整段删除 | index 页「关于本站」整个 `<section>`(owner 追加令②:技术/托管性说明) | 其它页的 section 结构 |

## 2.1 ★ 一处需要向 owner 点名的偏离:同型元素条数会变

任务书写的是「不改 HTML 结构」。**有两处做不到「一个元素都不增减」还把话说全**:

1. **privacy §一.3 权限清单**:原版只有 **2 个 `<li>`**(摄像头、HealthKit),而事实是 **6 条权限**(F1)。
   2 个 li 装不下 6 条权限;硬塞进 2 条里就等于继续瞒着 4 条权限 —— 而**权限清单正是 App Store
   审核逐条对的东西**。⇒ **补 4 个 `<li>`**,内部结构与原有那两个**逐字同型**
   (`<strong>名称</strong>` + `<p class="mt-2 ml-4">` 用途/说明),不引入任何新标签或新 class。
2. **terms §三.1 价格表**:原版 `<tbody>` 有 **2 个 `<tr>`**(月订/年订),事实是 **5 档**(F14)。
   ⇒ 扩到 5 个 `<tr>`,三列表头不动。

除这两处外,**元素增减只发生在删除方向**(index「关于本站」整节)。
所有增减都用已有标签/class,**样式表一个字节不改** ⇒ 视觉上仍然是同一套版式,只是列表更长。
回执会贴并排图并把"哪几行是新增的列表项"标出来,不含糊过去。

---

# 3. 「可编辑」这一条:现状核查结论 = **不需要动 Functions 路由**

任务书说「主页/支持页若还是模板渲染而非 KV 正文,补成同一套机制」。查了:

- `functions/index.js` / `functions/support.js` 都是 `renderPageResponse(env, name)` ⇒ **正文已经从 KV 取**,
  `functions/_lib/page.js:PAGE_NAMES = ['index','privacy','terms','support']` 四页齐全。
- 编辑器入口:`functions/edit.js` = 主页编辑器;`functions/[page]/edit.js` = 其余三页
  (它对 `index` 返回 404 是**故意的** —— 主页走 `/edit`,不是没入口)。
- `functions/api/save.js` 的白名单同样是 `PAGE_NAMES` 四页。

⇒ **四页本来就都能编辑,机制已统一,本轮不动 Functions 一行代码**(任务书里"先报再动"的那种改造不需要发生)。
判定式 G5-EDIT 仍照跑,用来**证明**这个结论而不是假定它。

---

# 4. 判定式(五条 + 追加两条;**每条都先喂改前文件确认会红**)

| 闸 | 判据 | 阴性对照(必须红) | 通过线 |
|---|---|---|---|
| **G5-NOSITE** | `grep -rio "gugushizi" content/*.html docs/*.html` 命中数 | 改前 = **6**(privacy 3 + terms 3) | 改后 = **0** |
| **G5-PRICE** | 四页正文里出现的价格/续费词 | 改前:terms 命中 `¥6`/`¥58`/`自动续费`/`免费试用` | 改后:价格数字 ∈ {28,48,128,98,78};**零命中** `¥6`、`¥58`、`自动续费`、`免费试用`、`3 天免费` |
| **G5-TECH** | 全站不出现技术/托管性字样 | 改前:index 命中「静态页面」 | 改后:`静态页面\|托管\|GitHub\|Cloudflare\|编辑入口\|构建` 在 `docs/*.html` **零命中** |
| **G5-LIVE** | 四页在**两地**都 200 且正文=新版 | — | Pages 四页 200 + GitHub Pages 四页 200,且各自 body 含新版特征串 |
| **G5-EDIT** | 四页在 `/edit` 能打开、预览、保存;**各保存一次「无改动」后 sha256 不变** | 无 | 4/4 打开 200、4/4 保存 ok、4/4 sha 前后相同 |
| **G5-SAME** | KV / `content/` / `docs/` / github.io 四处**逐字节**同 | — | 4 页 × 4 处 sha256 全等 |
| **G5-PIXEL** | 并排整页截图,差异区域**只落在文字/列表行** | — | 贴图 + 逐条说明;主页另贴改前/改后两张(owner 追加令②) |

判定式在改动**之前**登记完毕。任何一条改后才发现不合适 ⇒ 在回执里写明"闸改了、为什么改",不静默调整。

---

# 5. 不做的

- 不动 App 代码(iOS 工程一个字节不改)。
- 不动 `template/style.css`、不动字体、不动 `template/render.js` 的白名单(本轮改动不需要新 class)。
- 不发飞书通知。
- 不动重复站 `xiaotiantian-legal.pages.dev`(仍等 owner 裁)。
- 不改 git config / origin;GitHub 推送仍走颗粒 4 那条 VPS 中转路径。
