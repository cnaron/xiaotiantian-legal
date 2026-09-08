# 预注册 · X122 颗粒 4 —— 隐私政策/用户协议改用 owner 原版页面

登记时间:2026-09-08(北京时间),mini。执行:Claude Code。
起因:owner 原话「你这个隐私政策跟原版还是有差距呀,直接用原版代码就好了呀」。

---

# 简短大白话

我之前是照着老页面的意思**自己重写**了隐私政策和用户协议。owner 说不用重写,**直接把他原来那两页的代码原封不动搬过来**就行。
所以这一轮我做的事只有一件:把 `gugushizi.com` 上那两个原版页面整页搬到新站,一个字都不改;
只按 owner 之前定的规矩删掉页脚那行版权小字,再把页面里两处"从国外服务器加载"的东西改成本地自带(否则国内打开会很慢或加载不出来)。
原版里有些话跟 App 现在的实际情况对不上(比如价格、有没有存视频),**我不改**,只在回执里列一张表给 owner 看,让他自己决定要不要改。

---

# 1. 采用清单(哪些页用原版)

先在原站探测了 10 个候选路径。该站**任意不存在的路径都返回 200 + 一段报错 JSON**(软 404,X118 踩过),
所以判定标准是"正文是不是 HTML 文档",不是状态码。

| 路径 | HTTP | 正文 | 判定 |
|---|---|---|---|
| `/ropecounterprivacy.html` | 200 | 12466 B HTML | ✅ **有原版 ⇒ 采用** |
| `/ropecounterterms.html` | 200 | 12920 B HTML | ✅ **有原版 ⇒ 采用** |
| `/ropecountersupport.html` | 200 | 101 B 报错 JSON | ❌ 软 404 |
| `/ropecounter.html` | 200 | 101 B 报错 JSON | ❌ 软 404 |
| `/ropecounterdelete.html` | 200 | 101 B 报错 JSON | ❌ 软 404 |
| `/ropecounteraccount.html` | 200 | 101 B 报错 JSON | ❌ 软 404 |
| `/terms.html` `/support.html` `/ropecounterprivacy` `/ropecounter_privacy.html` | 200 | 101 B 报错 JSON | ❌ 软 404 |
| `/privacy.html` | 200 | 26090 B HTML | ⚠️ 是**古古识字**的隐私政策,不是跳绳 ⇒ 不采用 |

**结论:采用 2 页 —— `privacy` / `terms`。**
`support` 无原版 ⇒ 保持颗粒 2 版不动。`index` 按 owner 规则 3 保持颗粒 2 版不动。`404` 不动。

# 2. 允许改动清单(除此之外一字节不改)

原版两页头部结构完全相同(同一套内联 CSS + 同两处外链),故两页改动一致。

| # | 改动 | 依据 | 原样 → 改后 |
|---|---|---|---|
| A1 | 删页脚版权行 | owner 规则 2「去掉『回到主页』类导航与底栏」 | 删掉整个 `<footer class="mt-12 pt-8 …">© 2026 小天天练跳绳 版权所有</footer>` |
| A2 | Tailwind CDN 脚本 → 内联 CSS | 任务书允许改动②「外链资源内联/本地化(零外域)」;且本站架构**零脚本** | `<script src="https://cdn.tailwindcss.com"></script>` → `<style>` + **该 CDN 在这两页上实际生成的那份 CSS**(用真实 WebKit 跑原版页把注入的 `<style>` 抓出来,不是我手写近似) |
| A3 | Google Fonts `@import` → 本地化 | 同上;且国内 `fonts.googleapis.com` 不可达 | `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC…')` → 处置在 §3 决策点 D1 |
| A4 | viewport | 任务书允许改动③ | **原版已有** `<meta name="viewport" content="width=device-width, initial-scale=1.0">` ⇒ **不需要加,不登记为改动** |

**明确不改的**(容易手滑,先钉死):
- 原版里 `<a href="https://gugushizi.com/ropecounterterms.html">`、`https://www.gugushizi.com`、
  联系邮箱 `shengtang009@126.com` —— **保持原样**,不改写成站内相对链接。
  改链接不在允许清单里。("零外域"在本颗粒定义为**零外部资源加载**:script/link/@import/img/font 为 0;
  `<a href>` 是导航不是资源加载,不在此列。这条定义写在这里是为了事后不能挪门框。)
- 原版与 App 现状不符的句子(价格、视频留存、权限条数、是否自动续费等)⇒ **不改**,只进回执差异表。
- `support` / `index` / `404` 三页正文。

# 3. 决策点(实测后填,不是事后改口径)

- **D1 中文字体**:优先「自托管 woff2 子集」(下载 Google 的 unicode-range 分片放本站 `/assets/fonts/`,
  改成本地 `@font-face`),保住原版长相且零外域。若体积或分片数不可接受,退到「删掉 `@import`,
  由 `font-family: 'Noto Sans SC', sans-serif` 自然回退系统中文字体(iOS/macOS = PingFang SC)」。
  两条路都要在回执里给出**为什么**以及对并排截图的影响。
- **D2 白名单扩容**:整页 HTML 需要 `render.js` 白名单容纳原版实际用到的标签/属性/class。
  只加原版实测用到的,不放开成全通;清单单独一个 commit 列出。
- **D3 外壳**:privacy/terms 改「整页模式」(`pages.json` 加 `fullpage: true`),
  Function 与浏览器预览走同一条 `renderPage`,外壳/内联样式/H1/META 对这两页全部不套。

# 4. 判定式(绿 / 红 / 没跑 三态,先写死)

| 闸 | 判定式 | 通过线 |
|---|---|---|
| **G4-BYTE** | 线上 `https://xiaotiantian-app.pages.dev/privacy`(及 `/terms`)正文,与「原版 HTML 施加 §2 允许改动后的本地文件」`cmp` | **0 差异**。若有差异,只允许出现在 A1/A2/A3 三处,且必须在回执里**贴 diff 原文** |
| **G4-PIXEL** | WebKit 并排整页截图(原版线上页 vs 新页),逐像素比 | 结构差 ≈0(段落位置/字号/配色一致);字体差异若来自 D1 回退,须**单独量化并说明** |
| **G4-REACH** | mini + appserver 两地 `curl` `/privacy` `/terms` | 各 200,redirects=0 |
| **G4-EDIT** | `/privacy/edit` 打开 → 预览出图 → 点保存(**内容一字不改**)→ 再抓线上页 | 保存前后线上页**逐字节相同**(证明编辑器不破坏原版 HTML) |
| **G4-NOEXT** | 线上两页扫 `script src` / `link href` / `@import` / `url(http` / `<img` / `srcset` | **全 0** |
| **G4-SYNC** | KV / `content/` / `docs/` / GitHub Pages 备份四处 | 同一份内容(KV 与 docs 逐字节;github.io 页面与 docs 逐字节) |
| **G4-REGRESS** | `node tools/test_render.mjs` + `python3 build.py` 自检 | 单测全过;三份 render.js sha 一致;Function 侧组装 == `docs/*.html` |

# 5. 停下来报的条件(任务书给的)

原版依赖站内不可得资源 / 原版用了无法安全白名单的标签(如内联 script) / KV 写入失败。

> 注:原版确实带一个 `<script src="https://cdn.tailwindcss.com">`。这是**外链**脚本,不是内联脚本,
> 且它的作用纯粹是"在浏览器里现编译 CSS"。按允许改动②把它替换成**它自己生成的那份 CSS**,
> 页面长相不变、零脚本、零外域 —— 因此**不触发**停工条件。`<script>` 标签本身**不进白名单**。

# 6. 不碰

App、飞书通知、重复站 `xiaotiantian-legal.pages.dev`、owner 待裁三件、ASC 后台填写、App 内链接指向。
