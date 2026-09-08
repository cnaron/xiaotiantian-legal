# X123 颗粒 6 · 后端撤掉图片能力 + 删过期重复站 · 回执(**未完成,停在清桶中途**)

> 落于 2026-09-08 18:35 北京时间。预注册见 `PREREG-X123-G6.md`(动第一行代码前立的,判据事后没改)。
> 代码那半边**已完成并上线**;桶与重复站那半边**停在中途等 owner 点头**,状态与续跑命令见 §6。

## 大白话解释

**做了什么。** 昨天(颗粒 5)刚给「联系我们」加上「用户可以传截图」的能力,owner 今天决定不要。
这一轮把服务端这半边撤掉了:传图、把图嵌进工单、把图取出来这三个网址**已经从线上拿掉**,
存图用的绑定也从配置里去掉了。提交工单、看对话、回复这三条**照常好使**,法律四页
**一个字节都没变**。

**结论是什么。** 三条图片网址在线上已经和「一个从来不存在的网址」**返回一模一样的东西**
(逐字节比过);同一时刻,三条正常接口仍然正常 —— 所以不是我把站搞挂了。老工单
(#5 / #6)正文里已经写进去的那几行「图片代码」,服务端仍然会**剥掉**再给 App,
用户不会看到一行乱码似的东西;这一条拿两个真工单的**真正文**跑过,10 处图行全剥净。

**没做完的是什么。** 存图的那个桶里原本有 74 张图。删到第 45 张时 owner 中断了操作,
现在**还剩 29 张**(全是昨天测速/配额测试留下的临时件;两个真工单 #5 / #6 的 9 张
**已经删掉了,删掉就没了**)。桶本身、以及那个挂着邮箱的旧站 `xiaotiantian-legal`,
**都还在**,等 owner 说一声再继续。

**对产品意味着什么。** App 侧(颗粒 16)现在可以放心不做上传功能:后端已经没有接口可调了。
另外提醒一件事:owner 在 GitHub 上看 issue #5 / #6 时,里面的截图会显示成**裂图**——
图已经删了,这是预期结果,不是出故障。

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

# 4. 闸(13 条:🟢 绿 / 🔴 红 / ⬜ 没跑)

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
| **G6-R2-EMPTY** | 🔴 **未完成** | 删到一半被中断:**74 → 29**(§5) |
| **G6-R2-CONTROL** ★ | 🟢 | 阳性对照成立:列举确实看得见对象(首次列举 **74 条 / 7.29 MB**,不是一上来就是空) |
| **G6-DUP-BEFORE** | 🟢 | 删站前实测:`xiaotiantian-legal.pages.dev` 四页**全部 200**;正文裸词命中 `@126.com` **10** 处、`mailto:` **4** 处、`邮箱` **14** 处 ⇒ owner 的删站理由(挂邮箱、与裁决冲突)属实,不是我转述的 |
| **G6-DUP-AFTER** | ⬜ **没跑** | 站还在,没删(等 owner 点头) |
| **G6-SECRET** | 🟢 | 本轮两个 commit 改到的文件里,`X-RC-Key` 值 / sendlog key / Cloudflare token **0 命中**;阴性对照:同样的搜法在本机 `/Users/cc/x123/DONE-G3`(**不入 git**)里能搜到 ⇒ 尺子会数数 |

# 5. R2 现状(**这是本回执最要紧的一段**)

| 时刻 | 对象数 | 字节 | 按工单分 |
|---|---|---|---|
| 动手前 | **74** | 7 639 641(7.29 MB) | `5`:4 · `6`:5 · `t1a07ff14666714f`:22 · `t1a07ffd2e5ecadd`:20 · `t1a080000c0eb2a6`:12 · `t1a08000c95757d6`:10 · `t1a0805853137dbe`:1 |
| 中断后(现在) | **29** | 2 837 917(2.71 MB) | `t1a07ffd2e5ecadd`:6 · `t1a080000c0eb2a6`:12 · `t1a08000c95757d6`:10 · `t1a0805853137dbe`:1 |
| 差 | **已删 45** | | `5`:4 · `6`:5 · `t1a07ff14666714f`:22 · `t1a07ffd2e5ecadd`:14 |

- **已经不可逆的部分**:两个真工单 **#5(4 张)/ #6(5 张)的图已经删了**。
  ⇒ owner 在 GitHub 上看这两个 issue 会看到**裂图**。这是预期结果。
- 剩下的 29 张**全部是测试件**(`t…` 开头 = 颗粒 5 的测速/配额临时工单),没有真实用户数据。
- 复核过:现存 29 个键**全部来自动手前那份名单**,新增 **0** ⇒ 中间没有人往桶里写新东西
  (合理:上传接口已经下线)。
- 任务书原以为"桶里应只有 issue #5/#6 的测试图",**实测是 74 个、跨 7 个工单号**;
  多出来的是颗粒 5 §2 测速与配额测试灌进去的。这条差异属实,登记在此。
- 桶 `xiaotiantian-feedback` **还在**;`wrangler r2 bucket info` 报的 `object_count` 是**滞后值**
  (动手前它报 68,同一时刻真列举是 74)⇒ **不要拿 `bucket info` 当清零判据**,要用列举。
- 本机 `wrangler 4.129.1` **没有** `r2 object list` 子命令。预注册里为此准备了"临时只读列举端点",
  **实际没用上**:Cloudflare REST `GET /accounts/<id>/r2/buckets/<桶>/objects` 能直接列。
  ⇒ 少部署一个临时端点,也就少留一个历史部署 URL 上的钉子。

# 6. 没做完的三件事 + 续跑命令

停在这里的原因:清桶跑到一半时 owner 中断了工具调用,我问了"要不要继续"、**尚未拿到回复**。
删对象 / 删桶 / 删站都是**不可逆**且**对外**的操作,不拿到明确一声不自行续跑。

| # | 没做的事 | 续跑命令(在 `/Users/cc/Public/x84sb/legal-site` 下) |
|---|---|---|
| 1 | 删掉剩余 **29** 个对象 | `source tools/cfenv.sh` 后逐键 `DELETE /accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/xiaotiantian-feedback/objects/<key>`;名单已存 `/tmp/x123g6/keys_remaining.txt` |
| 2 | 删桶 | `npx wrangler r2 bucket delete xiaotiantian-feedback`(先再列一次确认 0 条) |
| 3 | 删重复站 | `npx wrangler pages project delete xiaotiantian-legal` —— **只删这个名字**,主站是 `xiaotiantian-app`,两个名字只差一个词,删错就没了。删完 `curl -sI https://xiaotiantian-legal.pages.dev/` 应非 200,且同一时刻主站仍 200 |

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
(本文件) docs(x123-g6): 回执 —— 停在清桶中途的如实记账
```
线上部署:`35829d09.xiaotiantian-app.pages.dev`(已是 production 别名指向的那个)。

# 10. 小坑记两条

- `tools/test_feedback.mjs` 里有 3 个控制字节(NUL 等,测 `cleanLog` 用的,**本轮之前就在**),
  git 与 grep 都把它当**二进制**:`git diff` 显示 `Bin …`、`grep` 默认一条不报。
  **查这个文件必须 `grep -a`** —— 我第一次搜"有没有图片相关测试"时搜出 0 条,差点得出
  "颗粒 5 没写单测"的错结论。
- `wrangler r2 bucket info` 的 `object_count` 滞后(报 68,真实 74),**不能当清零判据**。
