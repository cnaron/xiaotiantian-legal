# X123 颗粒 3 · 「联系我们」工单后端搬到 Cloudflare · 回执

> 状态:**已上线并端到端跑通**,2026-09-08 13:20 北京时间。
> 预注册 [`PREREG-X123-G3.md`](./PREREG-X123-G3.md)。
> 新 base URL:`https://xiaotiantian-app.pages.dev/api/feedback/`
> 真工单自证:[cnaron/rope-counter#3](https://github.com/cnaron/rope-counter/issues/3)(已 close + 打 `test` 标签)。
>
> ⚠️ **这个仓库是公开仓库(`cnaron/xiaotiantian-legal`,PUBLIC)。**
> 任何口令、key、secret 一律不写进来 —— 我第一版犯过这个错,见 §7①。
> 需要口令的交接项在 mini 本地 `/Users/cc/x123/DONE-G3`(不入 git)。

## 大白话解释

**做了什么。** 用户在 App 里点「联系我们」提交的东西,以前是发到国内那台自己的服务器
(App server)上处理:它给开发者发一封邮件,再用 owner 本人的 GitHub 令牌去私有仓库里
开一个「帖子」当工单。这一轮把这套活儿整个搬到了 Cloudflare(法律页已经在那儿),
并且换了个身份去开帖子——用 owner 新建的一个**机器人应用**(GitHub App,名字叫
`xiaotiantian-feedback`),它只有「这一个仓库的 issue 读写」这一点点权限。
搬完之后**不再自己发邮件**:帖子一开,GitHub 自己就会通知 owner,再发一封信没意义。

**真的跑通了吗。** 跑通了,而且是完整的一来一回:App(这轮用命令行模拟)提交 → 机器人
开出真帖子 #3 → owner 本人在帖子里回了一句 → App 那边拉对话,**看到了这句开发者回复**,
并且带着一个大于 0 的编号 → 用户再回一句,帖子里真多了一条 → 同一台手机第二次提交,
**没有新开帖子**,而是接在原帖后面 → 把帖子关掉之后用户又来说话,帖子**自动重新打开**了。
最后这条(自动重开)是上一轮一直没验到的分支,这次补上了。

**顺手修了 App 那边报的三个毛病。** ① 查一个不存在的工单号,以前回「没权限」,
现在回「找不到」;② 测试模式下工单状态以前会冒出一个 App 不认识的值,现在只会是
那三个约定值之一;③ 用户追加一句回复,以前会把最开始那条留言顶掉、而且回复编号恒为 0
(编号恒为 0 会让 App 的「有新回复红点」整个失效)——现在首帖好好留着,编号真实且递增。
三条都在生产上当场验了。

**踩到两个坑,都写在诚实栏里。** 一个是我把 App 请求头里那个 key 写进了这个**公开**仓库,
发现之后当场换了一把新的(所以改 App 的那一步必须同时换 key,见 §6);另一个是
`wrangler kv` 这个命令**默认改的是本机的假数据库不是线上的**,我头两次改开关都改到了
空气里,加 `--remote` 才是真的。

**对产品意味着什么。** 跳绳 App 的反馈链路从此**只用免费的 Cloudflare + GitHub**,
跟国内那台服务器和老域名彻底没关系了。下一步是改 App 指向新地址(另一个颗粒),
改完之后 App server 上那套 PHP 就可以按 §8 的清单整个删掉。

---

# 1. 上线了什么

Cloudflare Pages 项目 `xiaotiantian-app`(法律页那个,同一个项目、同一份 KV):

| 文件 | 作用 |
|---|---|
| `functions/api/feedback/contact.js` | 提交反馈 ⇒ 开 issue / 追加到本设备已有 issue |
| `functions/api/feedback/thread.js` | 拉整条对话 |
| `functions/api/feedback/reply.js` | 用户追加一句 |
| `functions/api/feedback/sendlog.js` | owner 看发送记录(HTML,口令进) |
| `functions/_lib/ghapp.js` | GitHub App 鉴权:pem → RS256 签 App JWT → 换 installation token(KV 缓存 50 分钟) |
| `functions/_lib/applejws.js` | AppTransaction JWS 验签 + **自己走一遍 X.509 证书链**(Workers 的 WebCrypto 不验链) |
| `functions/_lib/der.js` | 最小 DER 读写(证书解析 / PKCS#1→PKCS#8 / ECDSA 签名格式转换) |
| `functions/_lib/feedback.js` | 清洗 / token / 限流 / issue 正文组装 / 发送记录 |
| `functions/_lib/ticket.js` | 工单定位(先定位再验 token,这是 404/403 那条修正的落点) |
| `tools/test_feedback.mjs` | 单测 70 条 |

**没动**:法律页四页、`/edit` 编辑器、样式表、字体、缓存口径、`build.py`、`docs/`。
四页 + 编辑器部署前后**逐字节相同**(§5 G3-LEGAL)。

**GitHub App**(owner 已建,本轮取到并接上):
App ID `4868391` · **Installation ID `159946289`** · 装在 `cnaron/rope-counter`(唯一一个仓库)
· 权限 `{"issues":"write","metadata":"read"}` · 开出来的 issue 作者 = `app/xiaotiantian-feedback`(bot)。

# 2. 给 App 的契约(X121 颗粒 13 照这一节改)

**只改两处:base URL 和 `X-RC-Key` 的值。请求体字段、响应字段、HTTP 码一个都没变。**

| 项 | 旧 | 新 |
|---|---|---|
| base URL | 老服务器上的 `…/ropecounter/` 前缀 | **`https://xiaotiantian-app.pages.dev/api/feedback/`** |
| 提交 | `POST contact` | `POST /api/feedback/contact` |
| 拉对话 | `GET contact/thread?id=&token=` | `GET /api/feedback/thread?id=&token=` |
| 追加回复 | `POST contact/reply` | `POST /api/feedback/reply` |
| 请求头 | `X-RC-Key: <旧值>` | `X-RC-Key: <**新值**,在 `/Users/cc/x123/DONE-G3` 里,不写进公开仓库>` |
| 测试头 | `X-RC-Test: 1` | 一样,不变 |
| 请求体 | `desc/contact/deviceId/app/version/build/device/os/locale/plan/lastSession/permissions/payment/channel/log` | **一模一样,不变** |
| 响应 | `{"ok":true,"ticket":{"id","token","createdAt","mode"}}` | **一模一样,不变** |

`mode` 仍是 `issue` / `queued` / `test` 三取值;`state` 仍是 `open` / `closed` / `pending` 三取值。

# 3. 修掉的三处(X121 颗粒 12 回执 §10 报的,生产上逐条实测)

| # | 以前 | 现在 | 生产实测 |
|---|---|---|---|
| 1 | 不存在的 id ⇒ **403** | **404** | 未知 id + 对的 token ⇒ `404 not_found`;未知 id + **错**的 token ⇒ 仍 `404`;已知 id + 错 token ⇒ `403 forbidden`。三条只差一个变量 |
| 2 | 测试模式 `state:"test"`(契约里没有这个值) | `state:"pending"` | 测试件 thread 回 `"state":"pending"` |
| 3 | reply 回 `cid:0`,且首帖被顶掉 | 真 cid,首帖保留 | 测试件:reply 回 `cid:1`,再拉 thread 首帖 `cid:0` 仍在 + 新增 `cid:1`。真 issue:reply 回 `cid:5579550339`(GitHub 评论 id) |

**第 3 条的根因**(登记,免得别处再犯):老实现是拿「发送记录里 id 相同的**最后一条**」
当首帖,回复一写记录就把首帖挤掉了。新实现把测试件独立存成一个 KV 对象
(`fbtest:<id>` = `{createdAt, nextCid, messages[]}`),回复是 **append**,不是覆盖。

# 4. 端到端自证原文(全部实跑,2026-09-08 13:02–13:20 北京时间)

## ① 开工单(真路径,**本轮唯一一个真 issue**)

```
POST /api/feedback/contact   (不带 X-RC-Test,KV 总闸也没开)
{"ok":true,"ticket":{"id":3,"token":"…","createdAt":"2026-09-08T05:04:16Z","mode":"issue"}}
HTTP=200   耗时 7.26s(含建 label + 设备搜索 + 开单;后续请求 token 走 KV 缓存)
```

issue #3 的作者与正文(节选):

```
author  {'is_bot': True, 'login': 'app/xiaotiantian-feedback'}     ← 机器人身份,不是 owner 的 PAT
labels  ['user-feedback']
title   [反馈] 2026-09-08 13:04 · iPhone SE (3rd) · b111 · g3e2e555
body    device: g3e2e5555-1111-2222-3333-444444444444
        channel: development · verified: no · env: Sandbox
        @cnaron 有新的用户反馈。

        【问题描述】…
        【联系方式】… 【App 版本】2026.09.02 (build 111) …
        【来源 IP】43.155.174.x                          ← 末段抹成 x
        <details><summary>App 日志(3 行)</summary> … </details>
```

## ② owner 回一句 → App 拉到 `from:"dev"` 且 `cid>0` ✅ ★

**这条是 X121 颗粒 12 回执 §10② 明确写着「没有端到端跑通」的那一条。**
用 `gh` 以 `cnaron` 本人身份在 issue 里评论,然后拉 thread:

```json
{"ok":true,
 "ticket":{"id":"3","state":"open","createdAt":"2026-09-08T05:04:16Z"},
 "messages":[
   {"cid":0,          "from":"user","body":"X123-G3 端到端自证第一次提交 …"},
   {"cid":5579547568, "from":"dev", "body":"收到，能否说一下是哪一步出的问题？…"}]}
```

`cid=5579547568 > 0` ⇒ App 的红点判据 `cid > lastSeenCid` 成立。
**阴性对照**:同一份返回里 `from:"user"` 的那条同时存在 ⇒ 不是「把所有消息都判成 dev」。

## ③ 用户回复 → issue 上真多一条 ✅

```
POST reply → {"ok":true,"cid":5579550339}   HTTP=200
```

## ④ 同一台设备第二次提交 ⇒ 不新开工单 ✅

```
{"ok":true,"ticket":{"id":3, … ,"mode":"issue"}}   ← id 还是 3
```

四条消息按时间排下来(thread 全量):

```
cid=0            from=user  X123-G3 端到端自证第一次提交 …
cid=5579547568   from=dev   收到，能否说一下是哪一步出的问题？…
cid=5579550339   from=user  是在开始跳绳那一步，计数不动。
cid=5579550836   from=user  X123-G3 端到端自证第二次提交 —— 同一台设备，应该接在原工单后面。
```

## ⑤ 工单关掉之后用户又来说话 ⇒ 自动重开 ✅ ★

**这是 X123 颗粒 2 回执 §9.1 登记的「控制器里那份 reopen 分支未实证」那一条**,
这一版补上了(新版没有邮件成本,验它不花钱):

```
gh issue close 3          ⇒ CLOSED
POST contact(同一 deviceId)⇒ {"ok":true,"ticket":{"id":3, … "mode":"issue"}}
gh issue view 3 --json state ⇒ OPEN          ← 自动重开
```

## ⑥ 404 / 403 三条对照 ✅

```
未知 id + 对的 token   ⇒ {"ok":false,"err":"not_found"}  HTTP=404
已知 id + 错 token     ⇒ {"ok":false,"err":"forbidden"}  HTTP=403
未知 id + 错 token     ⇒ {"ok":false,"err":"not_found"}  HTTP=404
```

(未知 id 的 token 是拿生产 secret 现算的,**故意让它过 token 关**,否则测出来的 404 是假的。)

## ⑦ key 关 ✅

```
无 X-RC-Key ⇒ 403      错 key ⇒ 403 {"ok":false,"err":"forbidden"}
```

轮换之后(§7①)再验一次,同一个请求只差这个头:

```
旧 key ⇒ 403        新 key ⇒ 200
```

## ⑧ 限流 ✅

contact 桶(上限 5 / 10 分钟 / IP)。本轮从同一 IP 打过去的、**计数了的** contact 请求依次是:
测试件 1 → 空 body(400)2 → 真提交 3 → 第二次提交 4 → 重开提交 5,**第 6 次开始 429**:

```
第 6/7/8/9 次: {"ok":false,"err":"rate_limited"}  HTTP=429
```

(缺 key 的两次是 403,**没有**进计数 —— key 关在限流之前,符合设计。)

**分桶对照**:contact 已经 429 的同时,

```
thread HTTP=200      reply HTTP=400(参数错,说明没被限流拦)
```

**thread 桶(上限 30)**:用不存在的测试件 id 连打(不花 GitHub 调用),前面已用掉 8 次,
第 23 次翻 429 ⇒ 8+22 = 30,与上限吻合。

## ⑨ 测试模式两个开关,各自单独可动 ✅

**(a) 单次头**:带 `X-RC-Test: 1` ⇒ `{"mode":"test","id":"t1a07f65416dd86d"}`,GitHub 上 issue 数不增。

**(b) KV 总闸**(`feedback:test_mode=on`,**不带**任何测试头):

```
{"ok":true,"ticket":{"id":"t1a07f6c899d11a2", … ,"mode":"test"}}
提交前 issue 总数 = 3  →  提交后 issue 总数 = 3(不变)
issue #3 评论数 = 4  →  4(不变)
```

⇒ 总闸真的把「开工单」这一步短路掉了,不是靠请求头。

## ⑩ 发送记录页 ✅

```
无 key ⇒ 403     错 key ⇒ 403     对 key ⇒ 200 text/html
cache-control: no-store, no-cache, must-revalidate
x-robots-tag: noindex, nofollow, noarchive
页内 <meta name="robots" content="noindex,nofollow,noarchive">
6 条记录(issue 4 + test 2)· 横幅正确显示「总闸关着」
```

## ⑪ 隐私开关 `feedback:log_body` 两向可动 ✅

设成 `off` 再提交一条带暗号的:

```
新记录的正文进页面了吗:False(期望 False)      新记录的日志进页面了吗:False(期望 False)
占位串在:True                                 横幅改成 off 口径:True
log_body=on 时写的旧正文仍在:True(期望 True —— 开关只管新写入,不追溯)
```

## ⑫ 单测 70/70 ✅

`node tools/test_feedback.mjs`:token 正反 5 条 / id 清洗 8 条 / 文本清洗 14 条 /
限流 5 条 / from 判定 7 条 / 渠道文案 3 条 / Apple 根证书 4 条 / **JWS 11 条** /
GitHub App JWT 4 条。

JWS 那 11 条里**带阳性对照**——一把只会说「不通过」的尺子没有信息量,所以要证明它两向都动:

```
阳性:把测试 CA 当成钉死的根 ⇒ verified=true,链=ok
阴性①:同一份 JWS 换回苹果根 ⇒ verified=false,**签名仍判 ok**、只有链判 bad
阴性②:payload 改一个字、签名不动 ⇒ 签名 bad,原因点名「签名与 x5c 叶子证书对不上」
阴性③~⑦:alg 非 ES256 / x5c 只有一张 / 空串 / 不是三段 / 乱码,各自给出不同的具体原因
```

Apple Root CA G3 指纹 `63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179`,
与老实现在生产上实测的那一串逐字相同。

# 5. 闸账(预注册 §5 的 11 条,逐条填)

| 闸 | 判定 | 证据 |
|---|---|---|
| **G3-UNIT** | 🟢 | 70/70,含 JWS 阳性对照 + 6 条阴性(§4⑫) |
| **G3-AUTH** | 🟢 | 无 key/错 key ⇒ 403;对 key ⇒ 200(§4⑦) |
| **G3-TEST** | 🟢 | 头与 KV 总闸各自单独触发,issue 数与评论数前后不变(§4⑨) |
| **G3-E2E** | 🟢 | 五步全过 + 第六步(重开)额外补上(§4①–⑤) |
| **G3-404** | 🟢 | 三条对照(§4⑥) |
| **G3-STATE** | 🟢 | 实测出现过 `pending`(测试件/排队)、`open`(#3 开着时)、`closed`(#3 关掉后再拉);`git grep` 全仓无 `state.*'test'` |
| **G3-CID** | 🟢 | 测试件与真 issue 各一次,首帖都在、新 cid 都 >0(§3 表) |
| **G3-RATE** | 🟢 | contact 第 6 次 429、thread 第 30 次触顶、桶互不干扰(§4⑧) |
| **G3-LEGAL** | 🟢 | 四页 + `/edit` 部署前后逐字节相同(index 4913 / privacy 21841 / terms 20171 / support 9531 / edit 1918 字节);**阴性对照**:同一把闸喂 index vs privacy 报红 ⇒ 闸不是恒绿。线上 privacy 与仓库 `docs/privacy.html` 逐字节相同 ⇒ KV 取正文那条路也没被碰坏;`/api/login` 打错口令 ⇒ 401(路由活着,不是 500) |
| ↳ `gate_g6.mjs` 15 条 | 🟡 **只跑了 1 条** | 离线的 G6-SEC(14 例 XSS 全被转义)🟢;**其余 14 条需要编辑器口令,口令在 Air 上而 Air 当时连不上**(`ssh air` 超时)⇒ **没跑**,不是绿也不是红 |
| **G3-SECRET** | 🟢 | 全历史 `git grep`:私钥任一行 0 处 / `BEGIN RSA PRIVATE KEY` 0 处 / TICKET_SECRET 0 处 / sendlog 口令 0 处。**阴性对照**:搜一个确实在仓库里的串 ⇒ 命中 3 处,证明这条 grep 本身能命中。`/tmp/x123g3` 收工已删 |
| **G3-ISSUES** | 🟢 | 本轮开出真 issue **1 个**(#3,上限 2),收工时 `state=CLOSED`、标签 `user-feedback,test`;仓库里另两个(#1/#2)是上一颗粒的,同样已关闭并打 test |

# 6. ★ 交给协调 / X121 颗粒 13 的三件事

1. **改 App 的 base URL** 为 `https://xiaotiantian-app.pages.dev/api/feedback/`。
2. **同时换 `X-RC-Key` 的值** —— 旧值已作废(线上实测旧值 ⇒ 403)。新值在 mini
   `/Users/cc/x123/DONE-G3`,**不在这个公开仓库里**。这两件事必须一起发版,
   不能只改一个:只改 URL 不改 key ⇒ 全部 403;只改 key 不改 URL ⇒ 打到已停用的老服务器。
3. **老服务器上那套 PHP 按 §8 整个退场**(App 切过来并验证之后,由协调另派颗粒执行)。

# 7. ★★★ 诚实栏(没做到 / 做错了 / 边界)

## ① 我把 App 的 `X-RC-Key` 写进了这个**公开**仓库,发现后已轮换

第一版代码里有 `RC_KEY_FALLBACK_20260908 = '<旧 key>'`,预注册里也照抄了一遍,
两处都进了 commit `01894b4` 并推到了 GitHub。**发现时机**:准备写这份回执、
去查 `xiaotiantian-legal` 的可见性时才发现它是 **PUBLIC**。

- 严重程度:这个 key 本来就写死在 App 二进制里,任何人反编译都拿得到,老文档也写明
  「不是安全边界」。但写进公开仓库等于把门槛从「会反编译」降到「会用搜索」,是实打实的降级。
- **处置**:立刻生成新 key → 写进 Pages secret → **把代码里的默认值整个删掉**
  (现在 secret 缺席就全部 403,不再有任何写死的回落值)→ 预注册里那两处也清掉 →
  重新部署 → 线上验「旧 key 403 / 新 key 200」。
- **清不掉的部分**:git history 里那一版仍在(force push 是被禁的操作)。所以处置方式
  是**轮换**而不是「删掉当没发生」。
- **教训(值得记进纪律)**:往一个仓库写第一行代码之前先问「这个仓库是公开的吗」。
  我是在快收工时才问的。

## ② `wrangler kv key` 默认改的是**本机假数据库**,不是线上

wrangler 4.x 的 `kv key put/get/list/delete` **不加 `--remote` 就走本地 miniflare 状态**
(`.wrangler/state/`)。我头两次设 `feedback:test_mode` / `feedback:log_body` 都写进了
本地,线上一个字节没变 —— 而且**命令回显是成功的**(`✨ Writing the value "on" to key …`),
`kv key get` 也能读回来,完全看不出来。

发现是靠一个对不上的数:`kv key list` 说这个 namespace 里只有 1 个键,但线上的记录页
明明列出了 6 条记录。加 `--remote` 一看,真实是 67 个键。

- **后果**:我一度以为「KV 总闸开着」而其实没开,那期间的第一次真提交开出了真 issue #3。
  没有造成损害(本来就要开一个真 issue 来验),但**如果当时以为总闸开着而放心大胆地灌
  测试数据,就会开出一串真工单**。
- **处置**:所有 KV 操作改成带 `--remote` 重做了一遍,§4⑨⑪ 的结论都是 `--remote` 下测的;
  本地脏状态 `rm -rf .wrangler/state` 清掉了。
- **给 owner 的运维提醒**:以后动这两个开关,命令里**必须**有 `--remote`,并且改完
  用记录页顶部的横幅回读确认(横幅直接显示总闸开没开)。

## ③ 「拿到真苹果凭据会不会写 verified: yes」仍然没有实证

跟上一轮同一条边界,没有前进:手上没有真的 StoreKit2 AppTransaction JWS。
本轮验的是「这条链路两个部件各自双向可动」(阳性对照 + 两个方向的阴性),
**不是**「真凭据能过」。而且即使将来 yes,也只说明「苹果签的、没被改过」,
**不**说明「属于这台设备的这个 App」——`bundleId` / `appAppleId` / `deviceVerification`
三项比对**都没做**。别当防作弊结论用。

另外:本轮的链校验是**我自己写的**(Workers 的 WebCrypto 不验证书链),
做了:逐张验签名、issuer/subject DER 逐字节接得上、每张都在有效期内、链尾必须
逐字节等于钉死的那张 Apple Root G3。**没做**:吊销检查(CRL/OCSP)、
KeyUsage/EKU/basicConstraints。老实现用的 `openssl_x509_checkpurpose(…, X509_PURPOSE_ANY, …)`
同样不查吊销,这一点两版持平。

## ④ 「未知 id 回 404」是拿一点信息泄露换来的

为了让 App 分得清「票作废」和「服务器不认识这个号」,现在的顺序是**先定位再验 token**:
id 不存在 ⇒ 404(不管 token 对不对),存在但 token 不对 ⇒ 403。
代价:拿着 `X-RC-Key` 的人可以逐个号探测「issue #N 在不在」。**拿不到任何内容**,
只是存在性这一 bit,而且 thread 桶 30 次/10 分钟/IP 兜着。这是预注册 §7.1 就登记的、
为修 App 的毛病故意付的价,不是疏漏。

## ⑤ 发送记录会把用户正文和 App 日志落盘 30 天

与隐私政策「不保存用户反馈内容」的口径**不一致**(上一轮 §8.5 就提出了,owner 未裁)。
本轮给了开关:KV `feedback:log_body`,默认 `on`。设成 `off` 之后**新写入**的记录
只留元信息与长度,不落正文与日志(§4⑪ 实测两向可动);**已经落盘的旧记录不会追溯清除**,
要清得等它们 30 天自然过期,或手动删 `sendlog:*` 键。
**二选一仍然要 owner 拍板**:测试期结束把它关掉,或者把隐私文案改成
「反馈内容最多保留 30 天用于排查」。**我没有替 owner 改隐私文案。**

## ⑥ 发送记录页的口令与工单 token 同源,无法单独轮换

`key = HMAC(TICKET_SECRET, "sendlog")`,和工单 token 共用一个 secret ⇒
换这个口令 = 换 `TICKET_SECRET` = 已经发出去的工单 token 全部失效。与老版同一条限制,没改进。
**另外**:换了新的 `TICKET_SECRET` 之后,老服务器时代发给设备的 `ticket.token` 在新后端上
一律 403/404。影响面 = 目前为零(老服务器一直开着总闸,真实用户工单数 0)。

## ⑦ 别的登记

- **GitHub 搜索兜底可能压根用不了**:这个 App 只有 `issues:write` / `metadata:read`,
  `/search/issues` 对私有仓库能不能用**没有单独验过**(本轮 KV 映射一直命中,没走到兜底)。
  用不了的后果:KV 被清 / 换 namespace 之后,同一台设备会新开一个工单。不影响正确性。
- **子请求数没撞上限**:contact 最坏路径 7 次(取 token 2 + label 1 + 搜索 1 + 取 issue 1 +
  reopen 1 + 发评论 1),免费版上限 50。首次请求 7.26s(含建 label),后续 token 走 KV 缓存会快。
  **没有单独压测过并发**。
- **本轮在 owner 的私有仓库里留下了 1 个真 issue(#3)**,已 close + 打 `test`。
  正文里有一个我编的 deviceId 和一句测试文案,没有真实用户数据。
- `RECEIPT` / `PREREG` 这两个文件在**公开**仓库里 —— 里面写了 App ID / Installation ID
  (GitHub 官方口径:这两个不是机密,没有私钥用不了)、仓库名、接口路径。**没有**口令、
  key、secret、私钥。

# 8. ★ App server(gugushizi)彻底退出清单

> owner 2026-09-08 追加硬规则:**跳绳 App 相关的一切不再涉及 App server 与老域名,只用免费 Cloudflare。**
> 下面这份清单**本颗粒不执行**(执行会碰到那台机器),由协调在 App 切到新地址并验证通过后另派颗粒做。

## 8.1 仓库侧(`gugushizi-server`,git revert / 删文件 + `deploy.sh`)

X123 颗粒 1 与颗粒 2 在那个仓库里加的东西**全部是新增**,退出很干净:
`application/u3d/controller/RopeCounter.php` 这个文件是颗粒 1 建的(commit `0aee682`),
在那之前**不存在**;`route/route.php` 里在那之前 `ropecounter` 命中数 = **0**。
所以 X123 之前的基线 = commit `3fd4184`。

| # | 路径 | 动作 | 命令(在 `gugushizi-server` 工作区) |
|---|---|---|---|
| 1 | `application/u3d/controller/RopeCounter.php`(1690 行) | **整个删掉** | `git rm application/u3d/controller/RopeCounter.php` |
| 2 | `scripts/rc_issue_flush.php`(158 行) | **整个删掉** | `git rm scripts/rc_issue_flush.php` |
| 3 | `config/certs/AppleRootCA-G3.pem` | **整个删掉**(验签搬到 Cloudflare 了,根证书钉在 `functions/_lib/applejws.js` 里) | `git rm config/certs/AppleRootCA-G3.pem`;目录空了就 `rmdir config/certs` |
| 4 | `route/route.php` 第 181–189 行附近的 **4 条路由 + 注释块** | 删掉这几行 | 手改:删 `HdzDKJzWso9WGMLJmvdUVBE0ac2aMJZ4/ropecounter/contact{,/thread,/reply,/sendlog}` 四条 `Route::rule` 与上面的注释 |
| 5 | `.gitignore` 末尾 X123 加的 **3 行 + 2 行注释** | 删掉 | 手改:`/.rc_github_token`、`/.rc_ticket_secret`、`/.rc_mail_off` |
| 6 | `docs/X123-CONTACT-RELAY-20260907.md`(263 行)、`docs/X123-G2-TICKETS-20260908.md`(785 行) | **建议保留**,但在抬头加一行「已于 2026-09-08 由 Cloudflare 版取代,本文只作历史契约」 | 手改抬头 |
| 7 | 部署 | **只能走 deploy.sh** | `ssh appserver "cd /www/wwwroot/gugushizi && bash deploy.sh"` |

**验收**:删完之后 `curl` 老的四条路径应当 404;`privacy` / `privacy4third` / `downloadurl` /
`api/sendaction` 四个老接口仍 200(回归)。

## 8.2 生产机侧(`ssh appserver`,`/www/wwwroot/gugushizi/`,**不入 git 的文件**)

| # | 文件 | 是什么 | 删除命令 |
|---|---|---|---|
| 1 | `.rc_github_token` | owner 本人的 fine-grained PAT | `rm -f /www/wwwroot/gugushizi/.rc_github_token` |
| 2 | `.rc_ticket_secret` | 老的工单 token / sendlog 口令 secret | `rm -f /www/wwwroot/gugushizi/.rc_ticket_secret` |
| 3 | `.rc_mail_off` | 测试期总闸 | `rm -f /www/wwwroot/gugushizi/.rc_mail_off` |
| 4 | `runtime/rc_sendlog.jsonl` | **发送记录(含用户反馈正文与 App 日志)** | `rm -f /www/wwwroot/gugushizi/runtime/rc_sendlog.jsonl` |
| 5 | `runtime/rc_sendlog.prune` | 记录整理标记 | `rm -f …/runtime/rc_sendlog.prune` |
| 6 | `runtime/rc_issue_queue.jsonl` | 降级队列(里面有 4 条测试件) | `rm -f …/runtime/rc_issue_queue.jsonl` |
| 7 | `runtime/rc_issue_map.json` | 队列号 → issue 号 | `rm -f …/runtime/rc_issue_map.json` |
| 8 | `runtime/rc_tickets.json` | deviceId → issue 号 | `rm -f …/runtime/rc_tickets.json` |
| 9 | `runtime/rc_issue_flush.lock` | 补发互斥锁 | `rm -f …/runtime/rc_issue_flush.lock` |
| 10 | `runtime/rc_flush.log`(如果挂过 cron) | 补发日志 | `rm -f …/runtime/rc_flush.log` |
| 11 | cron | 上一轮**没有**装那条 `*/5 * * * * … rc_issue_flush.php`,但退场时应确认一次 | `crontab -l \| grep rc_issue_flush`(应为空) |

一条命令收干净(**执行前先确认 App 已经不再打老地址**):

```bash
ssh appserver 'cd /www/wwwroot/gugushizi && rm -f .rc_github_token .rc_ticket_secret .rc_mail_off \
  runtime/rc_sendlog.jsonl runtime/rc_sendlog.prune runtime/rc_issue_queue.jsonl \
  runtime/rc_issue_map.json runtime/rc_tickets.json runtime/rc_issue_flush.lock runtime/rc_flush.log && ls -la runtime/ | grep rc_ ; echo "剩余 rc_ 文件如上(应为空)"'
```

## 8.3 GitHub 侧

- **owner 本人那把 fine-grained PAT 建议撤销**(上一轮为了让 PHP 开 issue 才建的,
  新版用 GitHub App,不再需要):GitHub → Settings → Developer settings →
  Personal access tokens → Fine-grained tokens → 找到给 `rope-counter` 开 issue 的那把 → Revoke。
- GitHub App `xiaotiantian-feedback` **保留**(现役)。

## 8.4 路由保留期

按任务书:老的四条路由**先保留 30 天**(到 **2026-10-08**)再按 8.1 删,
给「万一有装着老版本 App 的机器还在打老地址」留一个缓冲。
不过 8.2 那些生产文件里的 `.rc_github_token` **可以立刻删**(删了就退化成 queued 模式,
用户侧照样 200,不报错)。

# 9. 运维速查(给 owner)

| 想做什么 | 怎么做 |
|---|---|
| 看有哪些反馈进来了 | GitHub 通知 / `cnaron/rope-counter` 的 `user-feedback` 标签;或打开发送记录页(链接在 `/Users/cc/x123/DONE-G3`) |
| 回复用户 | **直接在 issue 里评论**。App 会拉到 `from:"dev"`,红点会亮 |
| 暂时不开真工单(灌测试数据前) | `npx wrangler kv key put --remote --namespace-id <LEGAL_CONTENT> "feedback:test_mode" "on"` ⇒ 用记录页顶部横幅回读确认 |
| 恢复真开工单 | 把上面那个键 `delete` 掉(**记得带 `--remote`**) |
| 不想再落用户正文 | 把 `feedback:log_body` 设成 `off`(只管新写入) |
| 部署 | `cd legal-site && source tools/cfenv.sh && npx wrangler pages deploy` |
| 跑单测 | `node tools/test_feedback.mjs` |
| 换密钥 | `npx wrangler pages secret put <名字> --project-name xiaotiantian-app`(注意:换 `TICKET_SECRET` 会让已发出的工单 token 与记录页口令一起作废) |
