# PREREG · X123 颗粒 8 —— 工单不再收 IP + 隐私政策去 IP / 去相册权限(5 → 3)

> 仓库 `cnaron/xiaotiantian-legal`(**公开**),分支 `main`,起点 `c0b418f`(X122 颗粒 10)。
> 预注册写在动手**之前**;下面每条闸的「改前」数字都是现在(2026-09-09 14:4x)实测的,不是回忆。

## 简短大白话

**owner 说:隐私协议里"联系我们会带上您的 IP 地址"这句不要了,干脆别收这个信息;
另外现在也不上传图片视频、也不用保存到相册,所以相册权限不该申请、也不该在政策里提。**

这轮做两件事:
1. **服务端真的不再读 IP**(不是只把文案删掉)。工单正文里的「来源 IP」那一行删掉;
   原来用 IP 当"谁发的"来限流,改成用**设备编号**(提交)和**工单号**(追加回复)来限流,
   限流的次数上限一个都不动。
2. **网页上的话跟着改**:隐私政策删掉那句 IP、删掉「相册读取」「相册写入」两条权限
   (5 条变 3 条)、删掉框架清单里的 Photos 那行、撤回权限的路径去掉「照片」;
   目录页「5 项系统权限」改「3 项」;支持页那句「保存到相册或分享出去」改成「分享出去」。

**要 owner 先知道的一件事**:手机 App(build 118)**现在还在申请相册权限**,
结果页上也还有「保存到相册」按钮。这轮只改服务端和网页;App 侧那两条权限得由 X121 那边删掉,
两边才对得上。详见本文件 §5。

---

# 1. 改前实测(阴性对照的分母,现在量的)

## 1.1 服务端

| 尺子 | 改前 |
|---|---|
| `grep -rn "CF-Connecting-IP\|X-Forwarded-For" functions` | **2**(`_lib/feedback.js:75`、`_lib/auth.js:70`)|
| `grep -rn "clientIp" functions` | **10 行**(2 处定义 + 8 处调用)|
| issue 正文里「来源 IP」行 | **有**(`contact.js:161`);现成阴性对照 = 已存在的 issue #8(G7 排版,与现役代码同一路径)|
| KV 里 IP 形状的键 | `fbrate:<bucket>:<ip>`(contact/thread/reply/sendlog 四个桶)、`login_fail:<ip>` |

## 1.2 法律站(三面同时量,数字一致 ⇒ KV = 线上 = 仓库)

尺子 = `IP 地址|相册|Photos|照片` 的**出现次数**(不是行数):

| 页 | KV | 线上渲染 | 仓库 `content/` |
|---|---|---|---|
| index | 0 | 0 | 0 |
| privacy | **12**(IP 地址 1 · Photos 1 · 照片 1 · 相册 9) | **12** | 12 |
| terms | 0 | 0 | 0 |
| support | **1**(相册) | **1** | 1 |

另:index 现有「**5 项**系统权限」1 处;privacy §三权限条目 **5 条**。
四页 KV 正文与 `content/*.html` 当前 sha256 **逐一相同**(已核,见 §6 附表)。

---

# 2. 要改什么

## 2.1 服务端(A 组)

| # | 文件 | 改动 |
|---|---|---|
| A1 | `functions/api/feedback/contact.js` | issue 正文删 `['来源 IP', maskIp(ip)]` 整行;限流主体改 **deviceId**;限流位置从"解析前"挪到"解析出 deviceId 之后" |
| A2 | `functions/api/feedback/reply.js` | 限流主体改 **工单 id** |
| A3 | `functions/api/feedback/thread.js` | 限流主体改 **工单 id** |
| A4 | `functions/api/feedback/sendlog.js` | 限流主体改常量 `owner`(这页只有 owner 用,原本就是单主体)|
| A5 | `functions/_lib/feedback.js` | **删掉** `clientIp_claudecode_20260908` / `maskIp_claudecode_20260908`;`rateAllow` 形参 `ip` 改名 `subject`,键 `fbrate:<bucket>:<subject>` |
| A6 | `functions/_lib/auth.js` + `functions/api/login.js` | **删掉** `clientIp`;`/edit` 登录的错误次数不再按 IP 记(设计与代价见 §3)|

**限流阈值一个不动**:`{contact:5, thread:30, reply:5, sendlog:60}` / 窗口 600s / 全局 300 条每天。

## 2.2 法律站(B 组)

| # | 页 | 位置 | 改动 |
|---|---|---|---|
| B1 | privacy | §一「唯一的例外是联系我们」段 | 删「;与访问任何网站一样,发送时也会带上您当次的 IP 地址」整个分句 |
| B2 | privacy | §一.2「回看视频」 | 「您可以回看,也可以主动保存到相册或分享出去」→「您可以回看,也可以主动分享出去」 |
| B3 | privacy | §三 设备权限调用 | **整块删**「相册读取权限」`<li>`(4 行) |
| B4 | privacy | §三 设备权限调用 | **整块删**「相册写入权限」`<li>`(4 行) |
| B5 | privacy | §二 系统框架清单 | 删「**Photos:**用于……」整行 `<li>` |
| B6 | privacy | §六 撤回权限 | 路径「相机 / 照片 / 健康」→「相机 / 健康」 |
| B7 | index | 隐私政策入口描述 | 「**5 项**系统权限」→「**3 项**」 |
| B8 | support | 常见问题 3 | 「您也可以主动把它保存到相册或分享出去」→「您也可以主动分享出去」 |
| — | terms | — | 预计 **0 处**(改前尺子已是 0);由 `ASSERT_CLEAN` 验,不是"没查" |

生效日期已是 **2026年9月9日**(颗粒 10 改过)⇒ **不动**。
「可回看」「分享出去」**保留**:分享走系统分享面板,不需要相册权限;App 侧仍有分享。

改法沿用颗粒 9/10 的 `tools/edits_*.py` 同构写法:每条 = (文件, 唯一行锚点, 新整行),
**锚点命中数必须恰好 1**;整块删除另断言 `<li>…</li>` 上下界配对且行数等于预期。

---

# 3. `/edit` 登录防爆破:没有 IP 之后怎么办(**本轮唯一一处"换了机制"**)

现状:同一 IP 连错 5 次 ⇒ 15 分钟内即使口令对也 429。这条**依赖 IP 做主体**。

三个候选:

| 方案 | 问题 |
|---|---|
| ① 全局计数 + 硬锁 | 任何人都能连按 5 次错口令,**把 owner 自己锁在门外** —— 端点是公开的,这是白送的 DoS |
| ② 按浏览器 cookie 计数 | 攻击者清 cookie 即绕过,等于没有 |
| ③ **全局计数 + 递增延时,不硬锁**(选它) | 口令**对**的请求 0 延时、永不被锁;口令**错**的请求按"最近 15 分钟全局错误次数"延时(250ms × n,封顶 4s)|

选 ③ 的理由:owner 永远进得去(这是硬需求),脚本式爆破被拖慢一个量级;
原来的按 IP 硬锁对僵尸网络本来就无效(换 IP 即重置),③ 对分布式反而更有针对性。
**代价要写清**:并发爆破可以绕过延时(每条请求各自延时,不串行)——
真正的防线仍然是口令强度 + 常数时间比较。**这条与颗粒 3 的 `G-SEC` 冲突,该闸本轮改判**,
改判理由与新尺子写在回执 §4。

---

# 4. 闸(先注册,后跑)

## 4.1 服务端

| 闸 | 判据 | 阴性对照 |
|---|---|---|
| **G8-SRV-GREP** | `grep -rn "CF-Connecting-IP\|X-Forwarded-For" functions` = **0** | 改前 = 2 |
| **G8-SRV-FN** | `grep -rn "clientIp\|maskIp" functions` = **0**(函数是删掉,不是留着不用)| 改前 = 10 行 |
| **G8-SRV-ISSUE** | 真路径新开 1 条 issue(随后 close + `test` 标签),正文 `grep -c "IP"` = **0** | 同一把尺子量 issue #8(改前代码开的)= **1** |
| **G8-SRV-RATE** | 同一 deviceId 用 `X-RC-Test: 1` 连发 6 条:前 5 条 200、**第 6 条 429** | 改前同一场景(同 IP 6 条)也 429 ⇒ 证明"限流没被我改没" |
| **G8-SRV-RATE-ISO** | 设备 A 打满 429 之后,设备 B 第 1 条仍 **200** | 若键其实是全局的,B 会跟着 429 ⇒ 这条是"键真按设备分"的正证 |
| **G8-SRV-KVKEY** | 跑完上面的闸后列举 KV `fbrate:` 前缀,**没有一个键的主体段匹配 IPv4/IPv6 形状**;`login_fail:` 前缀同 | 改前跑同样请求 ⇒ 能列出 IP 形状的键(数字贴回执)|
| **G8-SRV-UNIT** | `node tools/test_feedback.mjs` 全过(改前 177 条;新增用例后条数只增不减)| — |

## 4.2 法律站

| 闸 | 判据 | 阴性对照 |
|---|---|---|
| **G8-L-SCAN3** | `IP 地址|相册|Photos|照片` 在 **KV / 线上渲染 / `/edit` 编辑器** 三面各 **0** | 改前 privacy 12 · support 1(§1.2 表)|
| **G8-L-PERM3** | privacy §三 `<li><strong>` 条目数 = **3**,标题恰为 相机 / 健康写入 / 健康读取声明 | 改前 5 |
| **G8-L-INDEX3** | index 出现「3 项系统权限」1 处,「5 项」0 处 | 改前反过来 |
| **G8-L-TERMS0** | `content/terms.html` 与 `docs/terms.html` sha256 **与改前逐一相同** | — |
| **G8-L-DIFFSET** | `git diff` 里 content/ 的改动行集合 ⊆ §2.2 预期锚点集合;**无关段落 sha 不变**(按 `<section>` 切块比 sha)| — |
| **G8-L-CASCADE** | `node tools/gate_g8.mjs`(行距/层叠顺序结构闸)仍绿 | — |
| **G8-L-G5** | `python3 tools/gates_g5.py docs` 三条(NOSITE / PRICE / TECH)仍绿 | — |
| **G8-L-BUILD** | `python3 build.py` 三项自检过 + `node tools/test_render.mjs` 全过 | — |
| **G8-L-KVSYNC** | 发布后 KV 正文与 `content/*.html` 四页 sha256 逐一相同 | — |
| **G8-L-MIRROR** | GitHub Pages 备份站四页与主站**逐字节相同**(push 后自动追平) | — |

## 4.3 明确**不做**的
- 不动 terms 的排版/样式;不动字体资产;不动缓存口径;不碰 `xiaotiantian-legal.pages.dev` 那个重复站(已在颗粒 6 删除)。
- 不改任何限流阈值;不给 reply/thread 新加全局日限(见 §5 残留风险)。

---

# 5. 已知风险 / 要 owner 或别的执行线接手的

1. **App 与政策会短暂不一致(方向不利)**:App `ios/Resources/Info.plist` 现在仍有
   `NSPhotoLibraryUsageDescription` 与 `NSPhotoLibraryAddUsageDescription`,
   `MeasurementResultExamView.swift` 上仍有「保存到相册」按钮、`MeasurementViewModel.saveToPhotos`
   仍会 `PHPhotoLibrary.requestAuthorization(.addOnly)`。
   ⇒ 本轮改完是「**App 申请、政策不提**」,这是审核上更不利的方向(颗粒 10 是反过来的安全顺序)。
   **必须由 X121 侧删掉这两条权限与相册相关功能之后再提审。** 本轮照 owner 令执行并在此显式标记。
2. **失去"按 IP 拦陌生人"这层**:reply/thread 的限流主体变成工单号之后,
   拿到 `X-RC-Key` 的人可以用不同工单号绕开单主体的窗口(RC_KEY 在 App 二进制里,视同半公开)。
   contact 那条仍有全局 300/天 兜着;reply/thread **没有**全局兜底。
   本轮**不擅自加新阈值**(任务书写了"阈值不变"),把它列为待裁项。
3. **contact 限流的计数时机变了**:原来"请求体解析之前"就计数(垃圾请求也算),
   现在要先解析出 deviceId 才能计数 ⇒ **JSON 解析失败/超长的请求不再计入单主体窗口**,
   只被全局 300/天 计入。

---

# 6. 起点指纹(改前)

| 页 | `content/` sha256(前 16) | KV sha256(前 16) |
|---|---|---|
| index | 189ee062bc8057aa | 189ee062bc8057aa |
| privacy | 18a8d9e727632c22 | 18a8d9e727632c22 |
| terms | 792df4f20fd1d5a6 | 792df4f20fd1d5a6 |
| support | 832fa5452735d75f | 832fa5452735d75f |

改前线上四页已抓存:`/Users/cc/x123/g8/baseline/online-*.html`;KV 基线:同目录 `kv-*.html`。
