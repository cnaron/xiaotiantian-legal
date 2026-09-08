# X123 颗粒 3 · 预注册 —— 工单后端搬到 Cloudflare Pages Functions

> 立于 2026-09-08 12:50 北京时间(动第一行代码前)。仓库 `xiaotiantian-legal`(legal-site),
> Pages 项目 `xiaotiantian-app`。对侧契约 = `gugushizi-server/docs/X123-G2-TICKETS-20260908.md`。

## 大白话解释

**要做什么。** 现在 App 里「联系我们」提交的东西,是发到国内那台 PHP 服务器(App server)
上处理的:它给开发者发一封邮件,再用 owner 本人的 GitHub 令牌去仓库里开一个「帖子」(工单)。
这一版把这套活儿整个搬到 Cloudflare(法律页现在就在那儿),并且换一种身份去开帖子——
不再借用 owner 本人的令牌,而是用 owner 新建的一个「机器人应用」(GitHub App)的身份。
搬完之后**不再自己发邮件**:GitHub 自己就会给 owner 发通知,一封信当两封用没意义。

**为什么值得搬。** 三件事:① 少一台机器要维护(PHP 那套要人管属主、管队列文件、管补发脚本);
② 机器人身份的权限只有「这一个仓库的 issue」,比 owner 本人的令牌小得多,丢了也不至于全盘皆输;
③ 法律页已经在 Cloudflare 上,合到一处,App 只要认一个域名。

**这一轮同时要修三处 App 侧报上来的毛病**(X121 颗粒 12 回执 §10):查一个不存在的工单号
应该回「找不到」却回了「没权限」;测试模式下工单状态冒出一个 App 不认识的 `test`;
用户追加一句回复以后,原来的第一条留言被顶掉了、而且回复的编号恒为 0(编号恒为 0 会让
App 的「有新回复红点」整个失效)。

**做完算什么样。** 在生产上真的开出工单、owner 在帖子里回一句、App(这轮用 curl 模拟)
能拉到这句并且带着一个大于 0 的编号、用户再回一句帖子里就真多一条评论。法律页四页
一个字节都不许变。

---

# 1. 已确认的事实(动手前实测,写死在这里)

| # | 事实 | 怎么确认的 |
|---|---|---|
| F1 | GitHub App `App ID 4868391` 的私钥 pem 在 Air `~/Downloads/xiaotiantian-feedback.2026-09-07.private-key.pem`(1675 字节,RSA 2048) | `scp` 到 mini `/tmp/x123g3/gh.pem` + `openssl rsa -noout -text` |
| F2 | **Installation ID = `159946289`**,account `cnaron`,`repository_selection=selected` | 用 pem 签 App JWT 调 `GET /app/installations` |
| F3 | 该 installation 能访问的仓库**只有 1 个**:`cnaron/rope-counter`(private) | installation token 调 `GET /installation/repositories` ⇒ `total_count=1` |
| F4 | 权限 = `{"issues":"write","metadata":"read"}` | `GET /app/installations/159946289` |
| F5 | installation token 形如 `ghs_…`(383 字符),换取成功 | `POST /app/installations/159946289/access_tokens` |
| F6 | 现有 Pages 项目 `xiaotiantian-app`,`pages_build_output_dir=docs`,KV binding `LEGAL_CONTENT`(id `c1f1…2621`),已有 `functions/` 七个路由 | 读 `wrangler.toml` / `ls functions` |
| F7 | Apple Root CA G3 在 `gugushizi-server/config/certs/AppleRootCA-G3.pem`,sha256 `63343abf…653e9179`,主体 `CN=Apple Root CA - G3` | `openssl x509 -fingerprint -sha256` |

**F4 的直接后果**:GitHub App 没有 `search` 权限之外的东西,`GET /search/issues` 对私有仓库
能不能用**未经证实** ⇒ 「一台设备一个工单」的**主路径必须是 KV 映射**,GitHub 搜索只当兜底,
且**兜底不通也不算失败**(退化成新开一个工单)。这一条在 §5 有闸。

# 2. 要交付的东西

同一个 Pages 项目下新增四条路由(**与法律页路径不重叠**,法律页占 `/`、`/privacy`、`/terms`、
`/support`、`/edit`、`/api/{login,logout,save,history,export}`):

| 方法 | 路径 | 作用 |
|---|---|---|
| POST | `/api/feedback/contact` | 提交反馈 ⇒ 开 issue 或追加到本设备已有 issue |
| GET | `/api/feedback/thread?id=&token=` | 拉整条对话 |
| POST | `/api/feedback/reply` | 用户追加一句 |
| GET | `/api/feedback/sendlog?key=` | owner 看发送记录(HTML) |

前三条要头 `X-RC-Key: xplKWMvye6xPk2OB`(沿用,写死在 App 里,**不是安全边界**);
`X-RC-Test: 1` = 单次测试模式。

**Base URL(交给 X121 颗粒 13 改 App)**:`https://xiaotiantian-app.pages.dev/api/feedback/`。
**请求体字段、响应字段、HTTP 码一律沿用 G2 §2 契约**,只做 §3 那三处修正。

# 3. 与 G2 契约的三处**故意不同**(修 App 报的毛病)

| # | G2 实跑 | 本轮 | 理由 |
|---|---|---|---|
| D1 | 未知 id + 别的工单的 token ⇒ **403** | **404** | App 分不清「我这张票作废了」和「服务器不认识这个号」。改法:token 不对时**再查一次这个 id 存不存在**,不存在回 404、存在才回 403。代价:泄露「issue #N 在不在」这一 bit(§7 登记) |
| D2 | 测试模式 `state:"test"` | `state:"pending"` | 契约里 `state` 只有 open/closed/pending 三值;测试件本来就是「还没成为真工单」,语义正好是 pending |
| D3 | 测试模式 reply 回 `cid:0`,且 thread 里首帖被这条回复顶掉 | reply 回**递增的 cid(>0)**,thread 里首帖保留、回复另起一条 | PHP 的 bug 是 `sendlogFind` 按 id 取**最后一条**记录当首帖。本轮测试件独立存 KV `ftest:<id>` = `{createdAt, messages:[…]}`,append 而非覆盖;测试件 cid 用 KV 计数器,从 1 起 |

真 issue 路径下 `cid` 本来就是 GitHub 的评论 id(必然 >0 且随时间递增)——D3 在真路径上是**复验**,不是改行为。

# 4. 架构(照任务书)

- **鉴权**:pem(secret `GH_APP_PRIVATE_KEY`)→ WebCrypto `RSASSA-PKCS1-v1_5 / SHA-256` 签 App JWT
  (iat=now-60, exp=now+540, iss=GH_APP_ID)→ `POST /app/installations/<GH_INSTALLATION_ID>/access_tokens`
  → installation token 存 KV `ghtok`,TTL/缓存 **50 分钟**(GitHub 给 60 分钟)。
  拿不到 token ⇒ 与 PHP 一样**降级**:用户侧照常 200,内容进 KV 队列(`fq:<qid>`),`mode:"queued"`。
- **issue 形态**:label `user-feedback`;标题 `[反馈] <YYYY-MM-DD HH:mm> · <device> · b<build> · <deviceId 前 8>`;
  正文首行 `device: <deviceId>`,第二行 `channel: … · verified: … · env: …`,再一行 `@cnaron`(让 owner 被 at 到);
  然后 `【问题描述】` + 诊断各字段 + 折叠的 JWS/日志。**首帖 `【问题描述】` 段的提取规则不变**,
  App 拿到的 `body` 与 G2 一致。
- **一台设备一 issue**:KV `fdev:<deviceId>` → issue 号(主路径);没有再问 GitHub 搜索(兜底,失败不算错);
  找到 ⇒ 追加评论 `[用户消息 #n]`,issue 关着先 `PATCH state=open`;找不到 ⇒ 新建 + 写 KV。
- **token**:`HMAC-SHA256(TICKET_SECRET, id)` 前 32 位十六进制(与 PHP 同式,但**换了新 secret**
  ⇒ PHP 时代发出去的 token 在新后端上无效,见 §7)。
- **限流**:KV 滑动窗口,窗口 600 s;contact 5、thread 30、reply 5、sendlog 60(每 IP);
  另加**全局每日 300 次**(KV `frate:global:<YYYYMMDD>`)。body ≤128 KB,reply body ≤8 KB。
- **测试模式**:KV 旗 `feedback:test_mode`(值 `on`)= 总闸,或单次头 `X-RC-Test: 1`。
  命中 ⇒ 不调 GitHub,只写记录 + 存 `ftest:<id>`,返回 `id` 以 `t` 开头、`mode:"test"`、
  thread 里 `state:"pending"`。
- **发送记录**:KV `sendlog:<ts>-<rand>`,TTL 30 天;`GET /api/feedback/sendlog?key=<HMAC(TICKET_SECRET,"sendlog") 前 32>`
  出 HTML(`no-store` + `noindex`)。**正文/日志记不记**由 KV 旗 `feedback:log_body` 控制
  (默认 `on`;设成 `off` 后只记元信息与长度,不落正文——隐私含义见 §7)。
- **不发邮件**,不再依赖 App server。

# 5. 判定式(闸,做完逐条填绿/红/没跑)

| 闸 | 通过线 | 阴性对照 |
|---|---|---|
| **G3-UNIT** | `node tools/test_feedback.mjs` 全绿:HMAC token 正反、id 清洗、限流窗口、`from` 判定四类正文、`firstPostBody` 抽段、DER/EC 签名转换、JWS 验签**正反两向** | 有:改一个字节的 payload ⇒ 判 `签名 bad`;换一个非苹果根 ⇒ 判 `链 bad`;把测试 CA 当根 ⇒ 判 `ok`(证明尺子两向可动) |
| **G3-AUTH** | 生产上 `X-RC-Key` 缺/错 ⇒ 403;带对 ⇒ 不是 403 | 同一请求只差这一个头 |
| **G3-TEST** | 带 `X-RC-Test:1` ⇒ 200 且 `mode:"test"`、`id` 以 t 开头;**GitHub 上 issue 数不增**(前后各数一次) | 不带这个头的同一请求会开真 issue(§G3-E2E 已证) |
| **G3-E2E** | 真路径五步全过:①提交⇒真 issue ②owner(gh, cnaron 身份)在 issue 里评论一句 ③thread 出现 `from:"dev"` 且 `cid>0` ④reply ⇒ 200 且 `cid>0`,issue 上真多一条 `[用户回复]` 评论 ⑤同一 deviceId 再提交 ⇒ **不新开** issue,而是追加 `[用户消息 #2]` | ③ 里 `from:"user"` 的那条同时存在(证明不是把所有消息都判成 dev) |
| **G3-404** | 未知 id + 任意 token ⇒ **404**;已知 id + 错 token ⇒ **403**;已知 id + 对 token ⇒ 200 | 三条同源只差一个变量 |
| **G3-STATE** | 全部路径下 `state` ∈ {open, closed, pending};测试件回 `pending` | grep 代码里没有 `'test'` 作为 state 值 |
| **G3-CID** | reply 后再拉 thread:首帖仍在(`cid:0`,正文是最初那段描述)且新增一条 `cid>0` 的 user 消息 | 测试件与真 issue **各跑一次** |
| **G3-RATE** | contact 第 6 次 429;thread 第 31 次 429 | 429 之后换一个桶(thread)仍 200 ⇒ 桶是分开的 |
| **G3-LEGAL** | 四页(`/`、`/privacy`、`/terms`、`/support`)+ `/edit` 部署前后**逐字节相同**;`tools/gate_g6.mjs` 15 条仍全绿 | gate_g6 自带 4 条阴性对照 |
| **G3-SECRET** | `git grep` 在本仓库全历史搜不到 pem 任一行、`TICKET_SECRET`、`RC_KEY` 明文;`/tmp/x123g3` 收工后不存在 | 用一个**故意造的**假串验 grep 命令本身能搜到东西 |
| **G3-ISSUES** | 本轮在 `cnaron/rope-counter` 上开的真 issue **≤2 个**,收工时**全部 close + 打 `test` 标签** | 收工前 `gh issue list` 全量点名 |

# 6. 不做的事(划界)

- 不删 PHP 代码,不动 App server 上的 `.rc_mail_off`(保持开着);下线步骤只写进回执。
- 不改 App(iOS)——base URL 交 X121 颗粒 13。
- 不做 `bundleId` / `deviceVerification` 比对(G2 §5 就没做,不在本轮范围)。
- 不动法律页任何内容 / 样式 / 缓存口径。
- 不做邮件。

# 7. 预先登记的代价与风险(做完必须在回执里回答)

1. **D1 的信息泄露**:token 不对时会去查 issue 存不存在 ⇒ 拿着 `X-RC-Key`(写死在 App 里,
   任何人反编译都拿得到)的人可以逐个号探测「私有仓库里 issue #N 存不存在」。**内容拿不到**,
   只是存在性。限流 30 次/10 分钟/IP 兜着。**这是为修 App 的毛病付的价,登记在案。**
2. **换了 secret ⇒ 旧 token 全废**:PHP 时代发给设备的 `ticket.token` 在新后端上一律 403/404。
   影响面 = 目前只有测试件(生产总闸开着,真实用户工单为 0)。回执里写清楚。
3. **发送记录会落用户正文 30 天**,与隐私政策「不保存反馈内容」的口径不一致(G2 §8.5 已提出,
   owner 未裁)。本轮给出 `feedback:log_body` 开关,**默认 on**;回执写明「关掉它 = 只记元信息」。
4. **GitHub 搜索兜底可能压根不可用**(F4)。若不可用,「换机器/KV 被清」以后同一台设备会新开工单。
5. **Pages Functions 的限制**未知:子请求数(免费 50/请求)、CPU 时间。contact 最坏路径约 7 次子请求,
   预计不撞;**撞上就停下来报**(任务书列的停下来条件之一)。
6. 真 issue 会被 bot 开在 owner 的私有仓库里,收工要清理(G3-ISSUES)。

# 8. 留痕

新增文件一律带日期后缀注释;函数名按项目惯例 `_claudecode_20260908`——
**但 Pages Functions 的路由文件名由 Cloudflare 决定,不能加后缀**(`contact.js` 必须叫这个名),
所以留痕落在**文件头注释 + 内部函数名**上。
