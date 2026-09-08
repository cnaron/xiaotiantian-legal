# X123 颗粒 6 · 预注册 —— 后端撤掉图片能力 + 删掉过期重复站

> 立于 2026-09-08 18:00 北京时间(动第一行代码前)。仓库 `xiaotiantian-legal`(legal-site,**PUBLIC**),
> Pages 项目 `xiaotiantian-app`。被撤的东西全部是 X123 颗粒 5 一天前刚上的。

## 大白话解释

**要做什么。** 昨天(颗粒 5)刚给「联系我们」加上了「用户可以传截图」的能力:App 把图传到
Cloudflare 的一个文件桶(R2)里,再把图的网址写进 GitHub 上那条工单里。owner 今天决定
**不要这个功能**——用户不上传图片。所以这一轮把服务端这半边整个撤掉:三个接口删掉、
文件桶的绑定去掉、桶里那几张测试图删掉、桶本身也删掉。

**还要删一个站。** 早先做法律页时开过一个叫 `xiaotiantian-legal.pages.dev` 的站,后来正式站
换成了 `xiaotiantian-app.pages.dev`,那个旧站就没人管了。它上面挂的是**旧内容**,而且页面里
**写着邮箱**——owner 已经定过「对外页面不写邮箱」。留着它等于线上同时挂着两份互相打架的
法律条款,所以这一轮把它删掉。

**做完算什么样。** ① 生产上传图的三个网址一律「找不到」(404),而提交工单/看对话/回复
这三条**照常好使**;② 法律四页和站内编辑器**一个字节都不许变**;③ 桶里对象清零、桶删掉;
④ 旧站访问不再返回 200,而正式站照常 200。

**风险与代价(先写在这)。** 老工单(测试用的 #5 / #6)正文里已经写进去了 `![截图](网址)`
这种文字。图取不到了,那行文字如果照原样发给 App,用户会看到一行奇怪的乱码似的东西。
所以正文里的这类写法**仍然要在服务端剥掉**——但只剥不再给出 `images[]` 字段。这是本轮
唯一保留的"图相关"代码,理由与作用域写在 §3。

---

# 1. 动手前的事实(实测确认,写死在这)

| # | 事实 | 怎么确认的 |
|---|---|---|
| F1 | Pages 项目只有两个同名族:`xiaotiantian-app`(1 小时前改过)/ `xiaotiantian-legal`(1 天前) | `wrangler pages project list` |
| F2 | R2 桶 `xiaotiantian-feedback` 存在,创建于 2026-09-08T07:21:29Z | `wrangler r2 bucket list` |
| F3 | 本机 wrangler 4.129.1 **没有** `r2 object list` 子命令(只有 get/put/delete) | `wrangler r2 object --help` |
| F4 | 图相关代码分布:`functions/_lib/images.js` + 三个路由 + `wrangler.toml` 两处 `[[r2_buckets]]` + `thread.js` 引用 `splitImages` + 单测 ⑩ 节 | 仓库 grep(注意 `test_feedback.mjs` 含 JPEG 魔数字节,git/grep 视其为二进制,必须 `grep -a`) |
| F5 | `contact` 回的 `ticket.cid` 是给 attach 用的;`reply` 本来就回 cid,红点判据依赖它 | 读 `contact.js` / 颗粒 3 回执 |

**F3 的直接后果**:「桶里现在有哪些对象」用 CLI 查不到。本轮的取法 = **临时只读列举端点**
(部署一次,列完即删,`X-RC-Key` 保护,**没有删除能力**),删除动作走 CLI
`wrangler r2 object delete`。理由:一个能"删光整桶"的端点即使只活几分钟,它也会永久留在
Pages 的历史部署 URL 上(颗粒 5 §7⑤ 已经踩过这个坑);只读的那个留下也拿不到东西。

# 2. 要交付的东西

1. 删 `functions/api/feedback/upload.js`、`attach.js`、`img/[[key]].js`、`_lib/images.js`。
2. `wrangler.toml` 去掉 production + preview 两处 `[[r2_buckets]]`。
3. `thread.js` **移除** `images[]` 字段(与 App 颗粒 16 契约一致:App 不再读);
   `contact.js` 的 `ticket.cid` **保留**(reply 也回它,红点判据在用;它与图片无关)。
4. 正文里遗留的 `![alt](url)` 仍然剥掉 —— 函数搬进 `_lib/feedback.js`,改名
   `stripImageMarkdown_claudecode_20260908`,只回正文不回 URL 数组。
5. 单测同步(⑩ 节改成「剥图 + 阴性对照」,删掉键名/魔数/配额那些已无对象的用例)。
6. R2:列 → 逐个删 → 再列(应 0)→ 删桶。
7. `wrangler pages project delete xiaotiantian-legal`。
8. 回执 `RECEIPT-X123-G6.md` + README 追平 + `/Users/cc/x123/DONE-G6`。

**不做**:不删 Pages 历史部署(不可逆、owner 未裁 —— 颗粒 5 §7⑤ 已挂账,本轮只登记)。
不动 App 侧(那是颗粒 16)。不动法律页正文一个字。

# 3. 为什么"剥图"这段代码要留下

撤能力 ≠ 撤历史。issue #5 / #6 的正文里现在**确实**写着 `![截图](https://…/api/feedback/img/…)`。
桶删了之后那些 URL 全部取不到,但**那行 markdown 文字还在 GitHub 上**。thread 接口如果不剥,
App 的气泡里就会原样出现这一行。另外 owner 在 GitHub 网页上回复时也可能拖一张图进去,
同样产生这种写法。所以剥的作用域是「**显示层清洁**」,不是「图片能力」——它不碰 R2、
不产生 URL、不给 App 任何图片字段。作用域写死在函数注释里。

**诚实边界**:只剥 markdown 形式 `![...](...)`。GitHub 网页端有时生成 `<img src=...>` 这种
HTML 形式,本轮**不处理**(没有样本,不为想象中的输入写代码)。登记在回执诚实栏。

# 4. 闸(先写死判据,再去跑;每条都注明"绿/红/没跑"三态)

| 闸 | 判据(先写死) |
|---|---|
| **G6-404** | 生产上 `POST /api/feedback/upload`、`POST /api/feedback/attach`、`GET /api/feedback/img/<合法键>` 三条**全部 404**(且是 Pages 的静态 404,不是我们的 JSON 403) |
| **G6-404-CONTROL** ★ | 同一时刻、同一 base、同一把 `X-RC-Key`:`contact`(带 `X-RC-Test: 1`)/`thread`/`reply` **仍然 200**。没有这条,「404」只能证明我把站搞挂了 |
| **G6-OLD-DEPLOY** ★ | **阴性对照**:上一个历史部署 URL 上,同样三条请求**不是 404**(upload 无 key ⇒ 403 JSON)。证明 404 是本次部署造成的,不是那三条从来就没上线过 |
| **G6-NO-IMAGES-FIELD** | 回归跑完拿到的 `thread` JSON 里,`messages[]` 的每一项**不含** `images` 这个键(`Object.keys` 逐条查,不是 `images.length===0`) |
| **G6-STRIP** | 单测:带 `![截图](url)` 的正文剥完①没有 `![` 字面量、②`【问题描述】`那段还在(顺序对);阴性对照:没有图的正文**逐字节不变** |
| **G6-LEGAL-BYTES** | 部署前/部署后,`/`、`/privacy`、`/terms`、`/support`、`/edit` 五个 GET 的响应体 **sha256 两两相同** |
| **G6-UNIT** | `node tools/test_feedback.mjs` 退出码 0,报出条数记进回执(改前 95 条) |
| **G6-R2-EMPTY** | 删对象前列出的键 = N 条(贴进回执);删完再列 = **0 条**;`wrangler r2 bucket delete` 成功;`wrangler r2 bucket list` 里**不再有** `xiaotiantian-feedback` |
| **G6-R2-CONTROL** ★ | **阳性对照**:同一次列举里,先确认列举端点**真的能看见对象**(N>0)。若一上来就是 0,则这条闸判「没跑」,不许当绿 —— 一把只会说"空"的尺子说的"空"没有信息量 |
| **G6-DUP-BEFORE** | 删站前:`https://xiaotiantian-legal.pages.dev/` 返回 **200**,且其页面正文里**能搜到邮箱**(证明 owner 的删站理由属实,不是我编的) |
| **G6-DUP-AFTER** | 删站后:同一 URL **不返回 200**;`pages project list` 里**没有** `xiaotiantian-legal`;**阳性对照**:`xiaotiantian-app.pages.dev` 同一时刻仍 **200** |
| **G6-SECRET** | 本轮所有新增/改动文件里,`X-RC-Key` 值、`sendlog` 的 key、Cloudflare token **0 命中**(带阴性对照:故意搜一个确实存在于本机 DONE 文件里的串,应命中) |
| **G6-GREP-ZERO** | 全仓 `grep -a` :`FEEDBACK_IMG` / `feedback/img` / `upload` / `attach` / `r2_buckets` 在 `functions/` 与 `wrangler.toml` 下 **0 命中**(回执/预注册这类文档里允许出现) |

# 5. 已知会红 / 会「没跑」的

- **G6-OLD-DEPLOY** 依赖能拿到上一个部署的 URL。拿不到就判「没跑」,不许拿"我记得它上过线"顶替。
- 历史部署上那三条接口 **删不掉**(同颗粒 5 §7⑤)。桶删掉之后它们会回 500/503,
  但**它们仍在**。这一条**不许**在回执里写成"已彻底移除"。
- camo(GitHub 图片代理)上可能还缓存着 #5 那张图,**不归我们管、删不掉**,登记不清零。

# 6. 顺序(不可乱)

1. 本文件 commit(第一个 commit)。
2. 采「改动前」证据:五页 sha256、旧站 200 + 邮箱命中、上一部署 URL。
3. 临时只读列举端点 → 部署 → 列对象(**这时候 R2 绑定还在**)。
4. CLI 逐个删对象 → 再列(0)。
5. 撤图片能力的正式 commit(含删掉临时端点)→ 部署 → 跑 G6-404 / CONTROL / 回归 / 五页 sha256。
6. 删桶 → 删旧站 → 跑剩下的闸。
7. 回执 + README + DONE-G6。

> 立此存照:本文件在动第一行功能代码前提交。判据事后不改;真跑出别的结果就在回执里
> 写"预注册说 X,实测是 Y",不回来改这张表。
