# X123 颗粒 6 · 后端撤掉图片能力 + 删过期重复站 · 回执(**已完成**)

> 落于 2026-09-08 18:35 北京时间,**2026-09-09 02:20 补完收尾**(owner 09-09 明确「继续」后执行三件不可逆操作)。
> 预注册见 `PREREG-X123-G6.md`(动第一行代码前立的,判据事后没改)。**13 条闸:12 绿 / 1 黄 / 0 红 / 0 没跑**,
> 另补跑 2 条预注册里没有的(G6-STRIP-REAL、G6-AFTER-ALL,均绿)。

## 大白话解释

**做了什么。** 昨天(颗粒 5)刚给「联系我们」加上「用户可以传截图」的能力,owner 今天决定不要。
这一轮把服务端这半边撤掉了:传图、把图嵌进工单、把图取出来这三个网址**已经从线上拿掉**,
存图用的绑定也从配置里去掉了。提交工单、看对话、回复这三条**照常好使**,法律四页
**一个字节都没变**。

**结论是什么。** 三条图片网址在线上已经和「一个从来不存在的网址」**返回一模一样的东西**
(逐字节比过);同一时刻,三条正常接口仍然正常 —— 所以不是我把站搞挂了。老工单
(#5 / #6)正文里已经写进去的那几行「图片代码」,服务端仍然会**剥掉**再给 App,
用户不会看到一行乱码似的东西;这一条拿两个真工单的**真正文**跑过,10 处图行全剥净。

**收尾三件也做完了(owner 09-09 点头后执行,都不可逆)。** ① 存图的桶原本有 74 张图,
**现在一张不剩**(列举回读 = 0 条);② **桶本身已删除**(两条独立路径都回「这个桶不存在」);
③ 那个挂着邮箱的旧站 `xiaotiantian-legal.pages.dev` **已删除**,四页现在全部打不开,
而正式站同一时刻五页全部正常。

**对产品意味着什么。** App 侧(颗粒 16)现在可以放心不做上传功能:后端已经没有接口可调、
也没有地方存图了。两件要有心理准备的事:① owner 在 GitHub 上看 issue #5 / #6 时,里面的
截图会显示成**裂图**——图已经删了,这是预期结果不是故障;② 线上从此只有一份法律页
(`xiaotiantian-app.pages.dev`),不会再出现"两份条款互相打架"。

---

# 1. 改了什么(逐文件)

| 文件 | 动作 |
|---|---|
| `functions/api/feedback/upload.js` | **删**(收 JPEG 存 R2) |
| `functions/api/feedback/attach.js` | **删**(把图嵌进 issue 正文/评论) |
| `functions/api/feedback/img/[[key]].js` | **删**(从 R2 读图;目录一并没了) |
| `functions/_lib/images.js` | **删**(键名/配额/魔数/剥图公共件) |
| `tools/netprobe_bench_claudecode_20260908.sh` | **删**(只打已删的 netprobe 端点,量的是上传耗时 ⇒ 随能力一起退场;测出来的数字留在颗粒 5 回执 §2,不丢) |
| `wrangler.toml` | 去掉 production + preview 两处 `[[r2_buckets]]`;原地留一行注释说明「这里**故意没有** R2」 |
| `functions/api/feedback/thread.js` | 移除 `messages[].images`;测试件分支改成**白名单式挑四个字段**(`cid/from/body/at`)⇒ 颗粒 5 期间 attach 往 KV 里写过的 `images` 也漏不出去 |
| `functions/api/feedback/contact.js` | 只改注释:`ticket.cid` **保留**(reply 本来就回同一个东西、App 红点判据在用它、它与图片无关),把两处「给 attach 用」的说明改掉 |
| `functions/_lib/feedback.js` | **新增** `stripImageMarkdown_claudecode_20260908`:只剥正文里的 `![alt](url)`,不碰 R2、不产生 URL、不给 App 任何图片字段。作用域与理由写死在函数注释里 |
| `tools/test_feedback.mjs` | ⑩ 节换成「遗留图行剥除」:5 条正向 + 4 条阴性对照 + 1 条 `/g` 正则 lastIndex 陷阱。**95 → 80 条** |

**为什么"剥图"这段留下来**:撤能力 ≠ 撤历史。issue #5 / #6 正文里**已经**写着
`![截图](…)` 那几行;owner 在 GitHub 网页上回复时拖一张图进去也会产生同样的写法。
不剥,App 的气泡里就原样冒出这一行。见 §4 的 G6-STRIP-REAL(拿真正文跑的)。

# 2. 三条路由现在的样子(同一时刻、同一 base,一张表看完)

| 路径 | 方法 | HTTP | content-type | 字节 | body sha256(前 16) |
|---|---|---|---|---|---|
| `/api/feedback/upload` | POST | **405** | — | 0 | `e3b0c44298fc1c14`(空) |
| `/api/feedback/attach` | POST | **405** | — | 0 | `e3b0c44298fc1c14`(空) |
| `/api/feedback/zzz-never-existed` ★ | POST | **405** | — | 0 | `e3b0c44298fc1c14`(空) |
| `/api/feedback/img/3/<32hex>.jpg` | GET | **404** | text/html | 4086 | `6954ff2ca4af4c77` |
| `/api/feedback/zzz-never-existed` ★ | GET | **404** | text/html | 4086 | `6954ff2ca4af4c77` |
| `/api/feedback/contact` ☆ | POST | 403 | application/json | 30 | `235db86a668f0da3` |
| `/api/feedback/thread` ☆ | GET | 403 | application/json | 30 | `235db86a668f0da3` |
| `/api/feedback/reply` ☆ | POST | 403 | application/json | 30 | `235db86a668f0da3` |

★ = 从来不存在的路径(参照物);☆ = 仍然在的接口(阳性对照)。
**读法**:被删的三条与"从来不存在"**逐字节相同**;同一秒钟三条正常接口仍回自家的 403 JSON。

**预注册说 404,实测是 405** —— 差别不是我做错了什么:Pages 的静态层对**不存在的路径收到 POST**
统一回 405(不是 404),GET 才回 404 页。判据的实质("与从来不存在的路径不可区分")成立,
所以判绿,但**判据文字按实测更正**记在这里,不回去改预注册表。

# 3. 一个真踩到的坑:部署后立刻探测,读到的是旧代码

部署完成回显之后**马上**打这三条,拿到的是 `403 {"ok":false,"err":"forbidden"}` ——
也就是**旧的 Functions bundle 还在服务**。约 1 分钟后再打才变 405/404。
连**新部署自己的那个 hash 域名**(`35829d09.…`)当时也是旧行为。
⇒ **今后「部署后闸」必须重复采样直到稳定,一次读数不能当证据**;
本回执 §2 的表是稳定后重采的。

# 4. 闸(预注册 13 条 + 收尾补的 2 条 = 15 条:🟢 14 绿 / 🟡 1 黄 / 🔴 0 红 / ⬜ 0 没跑)

| 闸 | 状态 | 证据 |
|---|---|---|
| **G6-404** | 🟢 | §2 表;三条与"从来不存在"逐字节相同(判据文字按实测由 404 改为「405/404,与参照物不可区分」,见 §2) |
| **G6-404-CONTROL** ★ | 🟢 | 同一时刻同一 base:contact / thread / reply 仍 403 JSON(§2 表 ☆ 行)⇒ 不是把站搞挂了 |
| **G6-OLD-DEPLOY** ★ | 🟢 | 阴性对照:上一个部署 `f0136a34.xiaotiantian-app.pages.dev` 上,upload/attach 仍 **403 JSON(30 字节)**、img 仍 **404 text/plain(9 字节,带 X-Robots-Tag)** ⇒ 405/404 确实是本次部署造成的,不是那三条从来没上线 |
| **G6-NO-IMAGES-FIELD** | 🟢 | 线上真跑 thread,逐条 `Object.keys` = `["cid","from","body","at"]`;含 `images` 键 **0 条**;整段 JSON 里 `images` 字样 **0 次** |
| **G6-STRIP**(单测) | 🟢 | 10 条:剥净图行/剥净 URL/【问题描述】仍在/alt 是文件名也照剥/不留三连空行;阴性:无图**逐字节不变**、`[文档](url)` 不动、空串、null;另一条钉 `/g` 正则 lastIndex 陷阱 |
| **G6-STRIP-REAL** ★(预注册里没有,实测补的) | 🟢 | 拿 issue **#5 / #6 的真正文**(`gh api` 只读取回)跑本次部署的同一个函数:首帖+评论共 **10 处图行 ⇒ 全剥掉,残留图行 0、残留 img URL 0**;#5 首帖剥后 `firstPostBody` = 「X123-G5 真路径自证:这条留言应当带两张截图(A 横 / B 竖)。」⇒ 顺序对,正文没被截没 |
| **G6-LEGAL-BYTES** | 🟢 | 部署前/后 `/`、`/privacy`、`/terms`、`/support`、`/edit` 五个 sha256 **两两相同**(`7b75ffe5…` / `2036f5f6…` / `792df4f2…` / `14e2b4df…` / `4c3a2214…`) |
| **G6-UNIT** | 🟢 | `node tools/test_feedback.mjs` ⇒ **80/80 通过**(改前 95);`tools/test_render.mjs` ⇒ 46/46 |
| **G6-GREP-ZERO** | 🟡 **部分** | `functions/` + `wrangler.toml` 下:`FEEDBACK_IMG` **0**、`splitImages` **0**、`looksLikeJpeg` **0**;`r2_buckets` 1(wrangler.toml 里那句"故意没有"的注释)、`feedback/img` 1 + `attach` 2(三处解释性注释)、`upload` 1(**Tailwind CSS 里的 `::-webkit-file-upload-button`**,与我们无关)。**没有一处是可执行代码**。预注册写的是「0 命中」,实测 5 处,逐条列在这里,不改预注册 |
| **G6-R2-EMPTY** | 🟢 | 分两批删完 **74 → 45 → 0**;REST 列举回读 `success=true` / **0 条**;`wrangler r2 bucket delete` 成功;`bucket list` 里 `xiaotiantian-feedback` **0 命中**;`bucket info` 与 REST 两条独立路径都回 **10006 The specified bucket does not exist**(§5) |
| **G6-R2-CONTROL** ★ | 🟢 | 阳性对照成立:列举确实看得见对象(首次列举 **74 条 / 7.29 MB**,不是一上来就是空) |
| **G6-DUP-BEFORE** | 🟢 | 删站前实测:`xiaotiantian-legal.pages.dev` 四页**全部 200**;正文裸词命中 `@126.com` **10** 处、`mailto:` **4** 处、`邮箱` **14** 处 ⇒ owner 的删站理由(挂邮箱、与裁决冲突)属实,不是我转述的 |
| **G6-DUP-AFTER** | 🟢 | `pages project delete xiaotiantian-legal --yes` ⇒ `Successfully deleted`;`project list` 里只剩 `xiaotiantian-app`;旧站四页 `/`、`/privacy`、`/terms`、`/support` **全部 530**(Cloudflare `error code: 1016`,连查三次都是),邮箱裸词 **0 命中**(页面根本取不到);**阳性对照**:主站同一时刻五页 **全 200**(§5) |
| **G6-AFTER-ALL** ★(预注册里没有,收尾补的) | 🟢 | 删桶删站**之后**再全跑一遍:法律五页与**本轮动手前**仍逐字节相同;三条图片路由仍 405/405/404;带 key 真跑 contact→reply→thread **全绿**,`images` 字样 **0 次**、每条 keys 仍是 `cid/from/body/at` ⇒ 删桶没有波及工单功能 |
| **G6-SECRET** | 🟢 | 本轮两个 commit 改到的文件里,`X-RC-Key` 值 / sendlog key / Cloudflare token **0 命中**;阴性对照:同样的搜法在本机 `/Users/cc/x123/DONE-G3`(**不入 git**)里能搜到 ⇒ 尺子会数数 |

# 5. 三件不可逆操作的执行记录(命令 + 回读)

> owner 2026-09-09 明确「继续」后执行。每步都贴了命令与回读,回读一律用**能数出东西的尺子**
> (阳性对照),不用只会说"空"的那种。

## ① 清空 R2 对象:74 → 0

| 时刻 | 对象数 | 字节 | 按工单分 |
|---|---|---|---|
| 动手前(09-08) | **74** | 7 639 641(7.29 MB) | `5`:4 · `6`:5 · `t1a07ff14666714f`:22 · `t1a07ffd2e5ecadd`:20 · `t1a080000c0eb2a6`:12 · `t1a08000c95757d6`:10 · `t1a0805853137dbe`:1 |
| 第一批被中断后 | **29** | 2 837 917(2.71 MB) | 全部 `t…` 开头(测试件) |
| 第二批删完(09-09) | **0** | 0 | — |

- 命令:`DELETE /accounts/<id>/r2/buckets/xiaotiantian-feedback/objects/<key>`,逐键。
  第一批 45 条(其中含 issue **#5 的 4 张、#6 的 5 张**真截图);第二批 **29 条,成功 29 / 失败 0**。
- 回读:REST 列举 ⇒ `success=true`,**剩余 0 条**。
  **阳性对照**:同一把尺子在 `gugu-files` 桶上列出 5 条 ⇒ 这个 0 不是"它只会说空"。
- **不可逆且已发生**:#5 / #6 的 9 张图删掉就没了 ⇒ owner 在 GitHub 上看这两个 issue 是**裂图**。
  其余 65 张全是颗粒 5 测速/配额测试灌的临时件,无真实用户数据。
- 复核过:第二批删之前列出的 29 个键**全部来自动手前那份名单**,新增 **0**
  ⇒ 上传接口下线之后没有新对象落进来。
- 任务书原以为"桶里应只有 issue #5/#6 的测试图",**实测 74 个、跨 7 个工单号**。差异属实,登记。

## ② 删桶

```
$ npx wrangler r2 bucket delete xiaotiantian-feedback
Deleting bucket xiaotiantian-feedback.
Deleted bucket xiaotiantian-feedback.
```

回读(两条**独立**路径,不互相背书):

| 问法 | 回答 |
|---|---|
| `wrangler r2 bucket list` | `xiaotiantian-feedback` **0 命中**;阳性对照 `gugu-files` **1 命中** |
| `wrangler r2 bucket info xiaotiantian-feedback` | `ERROR … The specified bucket does not exist. [code: 10006]` |
| REST `GET …/buckets/xiaotiantian-feedback/objects` | `{"success":false,"errors":[{"code":10006,…}]}` |

## ③ 删重复站

```
$ npx wrangler pages project list        # 先核名
xiaotiantian-app     xiaotiantian-app.pages.dev     16 hours ago
xiaotiantian-legal   xiaotiantian-legal.pages.dev   1 day ago
$ npx wrangler pages project delete xiaotiantian-legal --yes
Deleting xiaotiantian-legal
Successfully deleted xiaotiantian-legal
```

| 域名 | 删之前 | 删之后 |
|---|---|---|
| `xiaotiantian-legal.pages.dev/` | **200**(2802 字节) | **530**(`error code: 1016`,连查 3 次都是) |
| `xiaotiantian-legal.pages.dev/privacy` | **200** | **530** |
| `xiaotiantian-legal.pages.dev/terms` | **200** | **530** |
| `xiaotiantian-legal.pages.dev/support` | **200** | **530** |
| ☆ `xiaotiantian-app.pages.dev` 五页 | 200 | **全部 200**(同一时刻,阳性对照) |

- 旧站邮箱裸词:删之前 `@126.com` **10 处**、`mailto:` **4 处**、`邮箱` **14 处**;
  删之后 **0 命中**(页面根本取不到)。
- `project list` 里现在只剩 `xiaotiantian-app` 一个 `xiaotiantian-*` 项目。
- **判据措辞救了一次**:预注册写的是「**非 200**」而不是「404」。Cloudflare 对"域名没有对应项目"
  回的是 **530**,不是 404 —— 要是当初把判据写成 404,这条绿闸会被自己判成红。

# 6. (原「没做完的三件事 + 续跑命令」一节已作废)

三件全部执行完毕,记录见 §5。`/Users/cc/x123/BLOCKED-G6` 已删除,改写 `DONE-G6`。

# 7. 诚实边界(不清零 / 不敢说满的)

1. **历史部署上那三条接口删不掉**。Pages 每个历史部署有自己的永久 URL,
   `f0136a34.…`(以及更早的)上 upload/attach/img **仍然活着**——本回执 §4 的 G6-OLD-DEPLOY
   正是拿它当阴性对照。桶删掉之后它们会回 500 `storage_unavailable`,**但它们仍在**。
   这一条**不许**写成"已彻底移除"。删历史部署不可逆、owner 未裁,同颗粒 5 §7⑤,本轮只登记。
2. **camo 上的缓存不归我们管**。GitHub 的图片代理可能还缓存着 #5/#6 那几张图的副本,
   我们删了 R2 也删不掉它。⇒ "图已彻底不存在"这句话说不出口。
3. **剥图只认 markdown 形式** `![...](...)`。GitHub 网页端有时生成 `<img src=...>` 的 HTML 形式,
   本轮**不处理**(手上没有这种样本,不为想象中的输入写代码)。
4. **真 GitHub 路径的 thread 没在线上端到端跑**。线上回归走的是测试模式(任务书指定),
   真工单要拿 `TICKET_SECRET` 算 token 才能拉,而开一个真工单不在本颗粒授权范围。
   补偿:G6-STRIP-REAL 拿 #5/#6 的**真正文**离线跑了同一个函数。
   ⇒ 判据写成「函数对真数据正确 + 测试路径端到端绿」,**不是**「真路径端到端绿」。
5. **App 侧未动**。App 还可能带着调 upload/attach 的代码(那是颗粒 16 的事)。
   在 App 改之前,它若真去调,会拿到 405 —— 客户端要能容错。
6. **顺序与预注册 §6 不同**:预注册写的是"先清桶再改代码",实际**先上线代码再清桶**。
   理由:接口先下线,清桶期间就不可能有新对象落进来(实测复核 §5:新增 0)。这是更强的做法,
   但确实与预注册不符,记在这里。

# 8. 顺手发现的一个老毛病(不是本轮造成的,交 owner 定夺)

issue **#6** 的第一条气泡在 App 里会是**空的**。成因在 `firstPostBody`:它截【问题描述】那一段时
以 `\n【` 当结束标记,而 #6 的描述**自己就以「【」开头**(「【X121 颗粒 15 自动化闸】…」)⇒
一上来就撞到结束标记,截出空串。
**与本轮无关**:剥图前后实测都是空串(两边都跑过)。颗粒 2/3 就有。修不修、怎么修,owner 定。

# 9. 本轮 commit

```
ae03c1c  prereg(x123-g6): 撤图片能力 + 删重复站 —— 13 条闸先写死(含 3 条对照)、6 步顺序、2 条已知不清零
664b9ac  feat(x123-g6)!: 后端撤掉图片能力 —— 删 upload/attach/img 三个路由 + _lib/images.js + R2 绑定;
         thread 移除 images[];正文里遗留的图行仍剥掉;单测 95→80
d5af0ed  docs(x123-g6): 回执 —— 停在清桶中途的如实记账
c9fdeff  docs(x123-g6): README 追平 —— 顶部加颗粒 6 段,颗粒 5 整段挂「已被撤销」告警
(本文件) docs(x123-g6): 回执收尾 —— 三件不可逆已执行(74→0 / 删桶 / 删旧站),12 绿 1 黄 0 红 0 没跑
```
线上部署:`35829d09.xiaotiantian-app.pages.dev`(已是 production 别名指向的那个)。

# 10. 小坑记几条

- `tools/test_feedback.mjs` 里有 3 个控制字节(NUL 等,测 `cleanLog` 用的,**本轮之前就在**),
  git 与 grep 都把它当**二进制**:`git diff` 显示 `Bin …`、`grep` 默认一条不报。
  **查这个文件必须 `grep -a`** —— 我第一次搜"有没有图片相关测试"时搜出 0 条,差点得出
  "颗粒 5 没写单测"的错结论。
- `wrangler r2 bucket info` 的 `object_count` **滞后**,**不能当清零判据**。两次实测:
  动手前它报 68 而真实 74;第二批删完(REST 列举已经是 0)它还在报 29。清零只认列举。
- **「站没了」不等于 404**。Cloudflare 对"域名没有对应 Pages 项目"回 **530 / error code 1016**。
  预注册当初写的是「非 200」才没把这条绿闸判成红 —— 下线类判据一律写成「非 200 且与在线时不同」,
  别写死具体状态码。
- `wrangler pages project delete` 会**交互式**问一遍,自动化里必须带 `--yes`,否则挂在提示上。
