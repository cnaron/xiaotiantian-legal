# 预注册 · X122 颗粒 7 —— 把法律页里「联系我们」的过时表述改到 Cloudflare 工单现状

写于 **2026-09-08(北京时间)14:0x**,mini,**改动落 KV 之前**。
任务书:`/Users/cc/x122/TASKBOOK-X122-G7-PRIVACY-SYNC.md`。
上游事实源:`wt-v3design/docs/RECEIPT-X121-G13-CLOUDFLARE-20260908.md` §7、
`legal-site/RECEIPT-X123-G3.md`(工单后端契约)。

---

# 简短大白话

线上四个法律页上写的「联系我们」是**上上个版本**的事:说这条反馈会「经过我们的服务器变成一封
电子邮件发给开发者」「是全 App 唯一一次联网」「不写数据库」「不带设备唯一标识」。
现在这四句**全都不对了** —— 反馈是直接发到 Cloudflare、变成开发者 GitHub 私有仓库里的一条
工单,App 还会去拉开发者的回复、用户还能追着回一句(所以是三次联网不是一次),而且从这个版本
起会带一个 App 自己生成的设备编号、会员档、最近一局、权限状态、脱敏日志和购买快照。

这一颗粒就是**把这些句子改成真话**。做法上有两条硬纪律:一是**不整体覆盖**线上正文
(先把 KV 里现有的正文原样拉下来当基线,只动目标句,其余一个字节不动,保存后再逐字节比
"新 == 基线 + 我改的那几处"),免得把 owner 自己在网页上改过的东西冲掉;二是**只动
「联系我们 / 反馈 / 数据传输」这一类句子**,价格、权限、退款那些一概不碰。

改完线上和备份站都得能打开、页面上不能再留下「经我们的服务器转成电子邮件」这类过时说法 ——
而且要先证明**改之前这些说法确实在页面上**(阴性对照),不然"搜不到"可能只是尺子坏了。

---

# 1. 基线(改动前钉死)

`GET /api/export`(带登录 cookie),2026-09-08T06:01:24.506Z,四页 `from=kv`:

| 页 | 字节 | sha256(前 16) | 与仓库 `content/` |
|---|---|---|---|
| index | 1282 | `6a16ae4b5391164f` | `cmp` 0 差异 |
| privacy | 21840 | `39453176b5eecb38` | `cmp` 0 差异 |
| terms | 20170 | `e98e0e9c9d5e8f2a` | `cmp` 0 差异 |
| support | 5882 | `2ff22ceda5bfee68` | `cmp` 0 差异 |

⇒ 颗粒 6 之后 owner **没有**再在 `/edit` 上改过东西;但基线仍以 **KV 导出**为准,不以仓库为准。
基线副本存 `/Users/cc/x122/g7/baseline/`(不入 git,KV 正文不进仓库;收工时按 README 的
「拉回仓库」流程把最终正文同步进 `content/` 与 `docs/`)。

生效日期:privacy / terms 页顶已是 **2026年9月8日**(= 今天)⇒ **不需要 bump**。

# 2. 事实源(每条给代码出处,不照抄 §7 的口头描述)

| # | 事实 | 出处(仓库 / 文件:行) |
|---|---|---|
| F1 | 后端 = `https://xiaotiantian-app.pages.dev/api/feedback`,三个出口 `/contact` `/thread` `/reply` | wt-v3design `ios/Shared/RCContactRelayClient_claudecode_20260907.swift:endpointBase_20260908` |
| F2 | 三处联网全部由用户动作触发,无推送 / 后台任务 / 定时轮询 | 同上,颗粒 12 大注释块的三出口表 |
| F3 | 提交体字段:desc / contact / app / version / build / device / os / locale / plan / permissions / log / deviceId / payment / channel / lastSession(可缺) | 同上 `submitTicket_claudecode_20260908` 的 `payload` |
| F4 | `device` = `uname().machine`(机型级),**故意不用** `identifierForVendor` | 同上 `deviceModelIdentifier_claudecode_20260907()` |
| F5 | `deviceId` = App 首次使用时 `UUID().uuidString`,存 Keychain(`ThisDeviceOnly`、不进 iCloud);用途 = 串同一台设备的对话 + 防卸载重装刷免费额度;**不来自 IDFA / IDFV / UDID** | `ios/Shared/RCDeviceIdStore_claudecode_20260908.swift` |
| F6 | `lastSession` 只发 mode / durationSec / count / date;examPrep 的省份·年级·性别**不发** | `ios/Shared/RCTicketDiagnostics_claudecode_20260908.swift:lastSessionDict_/modeName_` |
| F7 | `permissions` 五项(camera / mic / photosRead / photosWrite / health),各 granted\|denied\|notDetermined | 同上 `collect_` |
| F8 | `log` 发送前过脱敏关口:UUID→`<uuid>`、路径→`<path>`、邮箱→`<email>`、11 位连号→`<num>`;≤64 KB;**黑名单式**(诚实边界) | `ios/Shared/RCTicketLogRedactor_claudecode_20260908.swift` |
| F9 | `payment` = plan / productId / purchaseDate / expiresAt / **originalTransactionId**(Apple 原始交易号) | `ios/Shared/RCPaymentSnapshot_claudecode_20260908.swift` |
| F10 | `channel` = kind / provisioning(**不含 UDID 列表**) / receiptEnv / appTransactionJWS | 同上 `RCChannelSnapshot_` |
| F11 | 服务端把它变成 `cnaron/rope-counter` 私有仓库的一条 issue(同 deviceId 追加到同一条,不新开) | legal-site `functions/api/feedback/contact.js`(`ticket:<deviceId>` 映射 + `appendUserMessage_`) |
| F12 | 写进 issue 正文的 IP **末段已抹**(`maskIp`) | `functions/api/feedback/contact.js:99` + `functions/_lib/feedback.js:55` |
| F13 | 完整 IP 只出现在限流键 `fbrate:<bucket>:<ip>`,`expirationTtl = 600 秒`(10 分钟)自动删 | `functions/_lib/feedback.js:9,233,240` |
| F14 | Cloudflare 侧发送记录 `sendlog:*` 的 `expirationTtl = 30*24*3600`(30 天);记录里**不含 IP** | `functions/_lib/feedback.js:24,280-290` |
| F15 | **不再发送任何电子邮件**,不再经过 App server / 老域名 | RECEIPT-X123-G3 §8;本仓 `functions/` 全文无 SMTP / mail 调用 |

⚠️ 与 §7 改写稿**故意不同的两处**(§7 是文学稿,这里按代码校正):
- §7 写「记录中只保留到网段」——精确说法是:**写进工单的**那份 IP 末段抹去(F12);
  发送记录里根本没有 IP(F14);完整 IP 只在 10 分钟的限流计数键里(F13)。三者分开写。
- §7 只列了「会员档 / 最近一局 / 权限 / 日志 / 购买与安装渠道快照」,没点名
  `originalTransactionId`(F9)与 `appTransactionJWS`(F10)。这两项**要点名**,
  因为它们是"能把同一个人的多次购买串起来"的账务标识,含糊过去就是隐瞒。

# 3. 逐句改动清单(改动前钉死;行号 = 基线文件行号)

## 3.1 privacy(8 处)

| # | 行 | 现在写的(节选) | 为什么必须改 |
|---|---|---|---|
| P1 | 111 | 「全程不联网,唯一的例外是您**主动提交**「联系我们」时」 | 联网点从 1 处变 3 处(F2) |
| P2 | 123 | 不收集「…设备唯一标识符(IDFA / IDFV)等」 | 仍不收 IDFA/IDFV,但现在会带自生成的 `deviceId`(F5)⇒ 不加限定就是误导 |
| P3 | 124 | 整段(经我们的服务器转成电子邮件 / 唯一一处网络请求 / 不写入数据库 / 不带设备唯一标识 / IP 不留存) | **五处全错**(F1 F2 F3 F5 F11 F12 F13 F14 F15) |
| P4 | 127 | 「以下数据仅存储在您的设备本地…不会上传到任何服务器:」(下接跳绳记录) | 最近一局摘要现在会随反馈发出(F6) |
| P5 | 188 | 「所有跳绳记录与偏好设置…不涉及任何服务器上传」 | 同 P4 |
| P6 | 199 | 「购买状态…不上传到任何服务器」 | 购买快照现在会随反馈发出(F9) |
| P7 | 211 | 「不要求注册账号、不收集设备唯一标识」 | 同 P2 |
| P8 | 221 | 「没有需要您"删除""更正""导出"的服务器端数据」 | 反馈内容现在存在 GitHub 工单 + 30 天发送记录里(F11 F14) |

★ P4 / P5 与 §7 的「那部分仍然成立,不用改」**相反**:§7 说的是"跳绳记录与偏好不上传",
而 `lastSession`(最近一局的模式/时长/次数/时间)**就是**跳绳记录的一部分(F6)。
⇒ 本颗粒按代码判,给这两句加限定语,并在回执里点名这处偏离。

附:P8 之后**新增 1 个 `<li>`**(「删除反馈」控制权)—— 这是唯一一处"加内容"而非"改句子",
因为服务器端从此真的有数据了,权利清单里不能没有对应的删除途径。元素条数 +1 `li`。

## 3.2 support(4 处)

| # | 行 | 为什么改 |
|---|---|---|
| S1 | 4 | 「除了您主动提交「联系我们」,本 App 不联网」⇒ 三处(F2) |
| S2 | 42 | 「唯一一处会联网的地方…只发四样…不含任何能认出"是谁"的标识」⇒ 字段清单与身份判读都要重写(F3 F5 F9) |
| S3 | 48 | 「反馈时如果能附上以下信息」⇒ 机型/系统/App 版本现在自动附带(F3) |
| S4 | 64 | 「我们通常在 2 个工作日内回复」⇒ 补一句"回复会回到 App 内的对话里"(F2 的 `/thread`) |

## 3.3 index(1 处)

| # | 行 | 为什么改 |
|---|---|---|
| I1 | 3 | 「除您主动在 App 内提交「联系我们」之外,本 App 不进行任何网络请求」⇒ 三处(F2) |

## 3.4 terms(**0 处**,逐条给不改的理由)

| 行 | 句子 | 判定 |
|---|---|---|
| 198 | 无广告、无第三方 SDK | 仍成立,与工单无关 |
| 205 | 有效期「不依赖我们的服务器」 | 仍成立 —— 到期日在本机按 Apple 凭证算(F9 只是**把快照发给开发者看**,不是让服务器决定权益) |
| 258 | 不可抗力免责 | 与本颗粒无关 |
| 274-277 | 十、如何联系我们 + 联系邮箱 | 邮箱是**用户主动写信**的真实渠道,没过时;App 不再发邮件 ≠ 这个地址失效。**不动** |

★ 考虑过但**不做**:给 privacy §八 / terms §十 补一句「也可以在 App 内提交」。
理由:那是"加新渠道说明",不是"改过时表述",超出本颗粒范围;留给 owner。

# 4. 判定式(通过线,改动前钉死;绿 / 红 / 没跑三态)

| 闸 | 通过线 | 怎么算红 |
|---|---|---|
| **G7-BASE** 不覆盖 owner 改动 | 保存后重新 `GET /api/export`,四页正文与「基线 + 本清单所列改动」**逐字节相同** | 出现任何一处清单外的字节差异 |
| **G7-UNTOUCHED** 未列页零变化 | terms 保存后不动 ⇒ 线上 terms 的 sha256 与基线**完全相同** | 变了 |
| **G7-STALE** 过时词清零 | 改后四页正文搜下面 6 条过时串,命中 **0**;**且阴性对照**:同一把尺子在基线上命中 **≥3** | 改后 >0,或基线命中 <3(尺子坏) |
| **G7-KEEPWORD** 不误伤 | 改后仍存在的每一处「邮箱 / 服务器 / 上传」逐条给"仍成立"的理由(表进回执) | 有一处说不出理由 |
| **G7-LIVE** 两地可达 | 主站 4 页 + 备份站 4 页,`http=200`;主站四页正文与保存的内容一致 | 任一非 200 |
| **G7-NOGGS** 零 `gugushizi` | 四页正文 + 渲染后 HTML 搜 `gugushizi`,命中 0(基线也是 0 ⇒ 这条是**回归闸**不是修复闸,如实标) | >0 |
| **G7-FACT** 逐句可核 | 改后每一处新表述在 §2 的 F1–F15 里有对应出处编号(表进回执) | 有一句找不到出处 |

**G7-STALE 的 6 条过时串**(改前后都用这一把尺子,`grep -F`):
1. `经由我们的服务器`
2. `转成一封电子邮件`
3. `唯一一处网络请求`
4. `不写入数据库`
5. `开发者邮箱`
6. `gugushizi`

预期基线命中:1️⃣2️⃣3️⃣4️⃣5️⃣ 各 ≥1(共 ≥5),6️⃣ 为 0。⇒ 阴性对照 ≥3 满足。

# 5. 操作流程(不可跳步)

1. `POST /api/login`(口令从 Air 现取,**不落盘**)→ cookie 只放 `/tmp`。
2. `GET /api/export` → 基线四份(已完成,§1)。
3. 本地按 §3 逐句改 → **本地先 diff**,确认只有清单内的 hunk。
4. `POST /api/save` 逐页(只 save index / privacy / support,**不 save terms**)。
5. 重新 `GET /api/export` → 与本地改后文件逐字节比(G7-BASE)。
6. 拉主站四页 + 备份站四页(G7-LIVE / G7-STALE / G7-NOGGS)。
7. 同步 `content/` + `python3 build.py` 出 `docs/` + push(备份站)。
8. 写回执 → `touch /Users/cc/x122/DONE-G7`。

# 6. 已知会踩的坑(先写下来)

- **缓存**:颗粒 6 已把公开页改成 `max-age=0, must-revalidate`;但 CF 边缘仍可能有条目,
  `save` 里已带 `caches.default.delete`。核验一律用 `curl -H 'Cache-Control: no-cache'`,
  并且**同时**取一份不带该头的做对照。
- **备份站不自动跟**(颗粒 3 起):GitHub Pages 那份必须人手 `build.py` + push,
  否则 G7-LIVE 的备份站那一半会拿到旧文。
- **`grep -F` 中文与 HTML 实体**:页面里有 `&quot;` 之类,搜过时串要在**KV 正文**上搜
  (那才是权威源),渲染后 HTML 只作旁证。
