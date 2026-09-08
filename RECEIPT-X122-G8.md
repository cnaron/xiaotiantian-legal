# RECEIPT · X122 颗粒 8 —— 隐私政策 / 用户协议行间距修复 + 全站统一回复时效措辞

> 执行 session(Claude Code)· 2026-09-08 CST · 分支 `main` · 站点 `xiaotiantian-app.pages.dev`

---

# 一、大白话(不懂技术也能读完转述)

owner 说:「隐私政策和用户协议两页行间距太小了,就是上次编辑之后出的问题,参考 support 页面。」

**owner 说对了,而且上一轮(颗粒 6)给的「是浏览器缓存」这个答案在这件事上不成立。**
这次是真的排版坏了,坏在 **2026-09-08 上午颗粒 4 那次「整页搬原版」**。

一句话讲原理:这两页的 `<head>` 里有**两段样式表**。一段是页面自己写的(字要多高、段落之间留多宽、
标题多大多粗),另一段是 Tailwind 这个工具生成的、专门用来「把浏览器自带的默认样式清零」的。
浏览器的规矩是:**两段样式说的是同一件事时,写在后面的那段赢。**
颗粒 4 把「清零」那段放在了**后面** ⇒ 清零把页面自己的排版全盖掉了:

- 行高从 1.8 掉到 1.5(28.8 像素 → 24 像素)
- 段落之间的间距从 16 像素掉到 **0**(所以整页黏成一坨)
- 小标题从 20 号加粗掉回 16 号不加粗(所以看不出哪里是新一节)
- 项目符号列表的圆点和缩进直接没了

support 页走的是另一套样式文件,那套文件**把「清零」写在了前面**,所以它一直是对的 ——
这就是为什么 owner 一眼看出「两页跟 support 不一样」。

**修法**:把两段样式的**前后顺序调过来**,一条 CSS 都没改、正文一个字节没动。
改完实测,隐私政策 / 用户协议 / support **七项排版指标一模一样**。

另外按 owner 令,全站统一写明回复时效。改之前站上有**两个互相打架**的承诺
(support 写「2 个工作日」、隐私政策写「十五个工作日」、用户协议一句没写),现在三页统一成
「14 个工作日内回复,重复提交 / 信息不足 / 与本 App 无关的问题保留不逐一回复的权利」。

**对产品意味着什么**:两页现在长得跟 support 一样、读起来不再挤;时效承诺全站唯一,
不会出现「用户拿 support 页的 2 个工作日来质问」这种口径冲突。已上线,主站与备份站都发了。

**一件要先说清楚的事**:owner 的原版页 `gugushizi.com/ropecounterprivacy.html` **实测也是 24 像素**
—— 它自己从来没按自己写的样式表长过(见 §2.3)。所以本轮改完之后,我们的页面**不再逐像素等于原版**,
而是等于「原版样式表本来想要的样子」= support 的样子。这是按 owner 这次的令(「参考 support 页面」)
做的选择,**特此点名,若 owner 想要回原版那种紧凑长相,一条命令就能改回去**。

---

# 二、成因取证

## 2.1 先把上一轮的两个解释排除掉(不是猜,是跑出来的)

| 嫌疑(任务书列的) | 判定 | 证据 |
|---|---|---|
| ① `/api/save` 或渲染器白名单保存时剥掉 `style` / `class` / 整段 `<style>` | **证否** | `renderFull(KV 正文)` 与输入**逐字节相同**:privacy 25100 B、terms 20249 B,`render==src ? true` |
| ② Markdown 子集改写换行 / `<br>` / `<p>` | **证否** | 同上。privacy/terms 是整页模式,`renderPage()` 直接走 `renderFull`,压根不进 Markdown 分支 |
| ③ 颗粒 7 逐句替换带掉了包裹标签 / 类名 | **证否** | 颗粒 4 交付版 `af7de58:content/*.html` 与本轮改动前的 `<head>` **sha256 完全相同**(privacy `c330c2c3bd5b7b3c`、terms `76c3e1436f02c7c9`,均 8103 / 8337 B)⇒ 五次编辑一个样式字节都没碰 |
| ④ KV 正文与 template 外壳的 CSS 优先级变化(外壳覆盖) | **证否(但方向对)** | 整页模式下外壳 `template/shell.html` 与 `template/style.css` **完全不生效**(`renderPage()` 第一行就 return)。真正打架的两段样式**都在 KV 正文自己的 `<head>` 里** |
| 浏览器缓存(颗粒 6 的结论) | **本轮不成立** | 全部测量走 `probe … nocache`(`reloadIgnoringLocalAndRemoteCacheData`)与 `curl`,且缓存头已是颗粒 6 的 `max-age=0, must-revalidate` |

链路一致性的三段等式(全部实跑):

```
KV 正文  ==  仓库 content/*.html  ==  线上 HTML
privacy: repo=1c50a43b31d711cf  kv=1c50a43b31d711cf   SAME
terms:   repo=9a678eada322b787  kv=9a678eada322b787   SAME
privacy: src=25100 rendered=25100 live=25100   render==src? true   render==live? true
terms:   src=20249 rendered=20249 live=20249   render==src? true   render==live? true
```

**⇒ 编辑链路是干净的。坏的不是「保存时被改了」,是「一开始就装错了顺序」。**

## 2.2 真成因:两个 `<style>` 的层叠顺序反了

`content/privacy.html` / `content/terms.html` 的 `<head>` 里有两个 `<style>`:

- **style[0]** = 原版页面自己的样式(2093 B):`body{line-height:1.8}` / `p{margin-bottom:1rem}` /
  `h2{font-size:1.25rem;font-weight:600;margin-top:2.5rem}` / `ul{list-style-type:disc;margin-left:1.5rem}`
- **style[1]** = Tailwind v3.4.17 生成的 CSS(5519 B),其中含 **Preflight**:

```css
:host,html{line-height:1.5;…}
body{margin:0;line-height:inherit}
h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}
blockquote,dd,dl,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}
menu,ol,ul{list-style:none;margin:0;padding:0}
```

两边**都是元素级选择器、优先级完全相同(0,0,1)** ⇒ **谁在后面谁赢**。style[1] 在后 ⇒ Preflight 全线覆盖。

引入点:**颗粒 4 `af7de58`**,`tools/adopt_original.py` 的 A2 步骤,原注释写得很明白:

```python
#      位置刻意放在原版自己那个 <style> **之后** —— 因为浏览器里 Play CDN 就是把样式追加到
#      head 末尾的,先后顺序决定同优先级规则谁赢(preflight 会盖掉原版的 p/ul/h1 元素级样式)。
#      放错位置 = 长相就变了。阴性对照见回执 G4-PIXEL。
```

这段推理**没有错**(Play CDN 确实追加到 head 末尾,照抄 DOM 顺序确实得到与原版相同的长相)——
它错在**把原版页自己的排版 bug 一起搬了过来**,而颗粒 4 的验收线正是「逐像素等于原版」,
所以那条闸**结构上不可能抓到这个问题**。

## 2.3 ★ 原版页自己也是坏的(WebKit 实测,不是推断)

对 `https://gugushizi.com/ropecounterprivacy.html`(仍在线)直接量:

```
styles in DOM order:
  style[0] len=2133 body.line-height=1.8      html.line-height=-
  style[1] len=5519 body.line-height=inherit  html.line-height=1.5
COMPUTED body: font-size=16px line-height=24px
  p[2] lh=24px mt=0px mb=0px
  ul[0] ml=0px pl=0px listStyle=none
```

**原版页实测 24px、段距 0、列表无圆点** —— 它从来没按它自己的样式表长过。
颗粒 4「除被删底栏外逐像素等于原版」这句是**真的**,只是等于的是一个本来就不对的东西。

## 2.4 改版前 / 现在 / 参照 三方对照(WebKit computedStyle,`nocache`)

「改版前」= 颗粒 4 之前的 `af7de58^:docs/privacy.html`(走 `template/style.css`,复位写在第 ① 段、在前)。

| 指标 | 改版前(G4 之前) | **本轮修复前** | support(owner 指定参照) |
|---|---|---|---|
| body `line-height` | 28.80px | **24.00px** | 28.80px |
| 正文 `<p>` `line-height` | 28.80px | **24.00px** | 28.80px |
| 正文 `<p>` `margin-bottom` | 16px | **0px** | 16px |
| `h1` 字号 / 字重 | 16px / 700 | **16px / 400** | 16px / 700 |
| `h2` 字号 / 字重 | 20px / 600 | **16px / 400** | 20px / 600 |
| `h2` `margin-top` / `margin-bottom` | 40px / 16px | **0px / 0px** | 40px / 16px |
| `h3` 字号 / 字重 / `mt` / `mb` | 17.6px / 600 / 24px / 12px | **16px / 400 / 0 / 0** | 17.6px / 600 / 24px / 12px |
| `ul` `list-style` / `margin-left` | disc / 24px | **none / 0px** | disc / 24px |
| `li` `line-height` / `margin-bottom` | 28.80px / 8px | **24.00px** / 8px | 28.80px / 8px |

原始输出留档:`/Users/cc/x122/g8/metrics-live-after.txt`。

---

# 三、修法

**原则:不在 CSS 里硬加 `line-height` 盖住问题**(任务书明令)。只换两个 `<style>` 的**位置**。

| 层次 | 文件 | 改法 |
|---|---|---|
| **根因(生成器)** | `tools/adopt_original.py` A2 | 内联 Tailwind CSS 的锚点从「原版 `</style>` 之后」改成「原版 `<style>` **之前**」;注释改写成完整病理说明。以后重跑 `adopt_original.py` 产出的就是正确顺序 |
| **产物(已入库的两页)** | `tools/fix_cascade_order_claudecode_20260908.py`(新增) | 就地把两个 `<style>` 换序,自带断言:换序后两块的字节必须**与换序前完全一致、仅顺序调转** |
| **闸** | `tools/gate_g8.mjs`(新增) | 见 §5 |

### 3.1 换的是位置,不是内容 —— 自证

```
--- privacy ---
  old order sha: ['aedb43830bc2', '7feff2375649']
  new order sha: ['7feff2375649', 'aedb43830bc2']      ← 同一组,顺序调转
  同一组 CSS、顺序调转 ? True
  <body> 逐字节不变 ? True 16951 B
--- terms ---
  old order sha: ['e3961484717e', 'c1a2473dbfb7']
  new order sha: ['c1a2473dbfb7', 'e3961484717e']
  同一组 CSS、顺序调转 ? True
  <body> 逐字节不变 ? True 11866 B
```

### 3.2 生成器往返自证

从 owner 原版 + 现抓的 dumpcss 重跑修好的 `adopt_original.py`,产出的 `<head>` 与线上现网**逐字节相同**:

```
privacy  重生成 head sha= 6d6b649b35b4e694  现网 head sha= 6d6b649b35b4e694  相同? True
terms    重生成 head sha= fe248fb00f6a3ca8  现网 head sha= fe248fb00f6a3ca8  相同? True
```

### 3.3 修复后线上实测(三页逐项相等)

| 指标 | 线上 /privacy | 线上 /terms | 线上 /support |
|---|---|---|---|
| body `line-height` | 28.799999px | 28.799999px | 28.799999px |
| `<p>` `lh` / `mt` / `mb` | 28.80 / 0 / 16px | 28.80 / 0 / 16px | 28.80 / 0 / 16px |
| `h1` | 16px / 700 / mb 8px | 同左 | 同左 |
| `h2` | 20px / 600 / mt 40 / mb 16 | 同左 | 同左 |
| `h3` | 17.6px / 600 / mt 24 / mb 12 | 同左 | 同左 |
| `ul` | disc / ml 24px / pl 0 | 同左 | 同左 |
| `li` | 28.80px / mb 8px | 同左 | 同左 |

整页高度变化(900px 宽,同一份正文):privacy **4174 → 5713 px(+36.9%)**、terms **3255 → 4671 px(+43.5%)**
—— 字没多,是间距回来了。

---

# 四、措辞落点表

统一话术(owner 原话;**标点按各页既有风格用全角**,owner 原话是半角逗号 —— 这是唯一一处刻意偏离,如需改回一句话的事):

> 提交后，我们通常会在 **14 个工作日内**通过 App 内「联系我们」回复。对于重复提交、信息不足无法核实、或与本 App 无关的问题，我们保留不逐一回复的权利。

| 页 | 位置 | 改前 | 改后 |
|---|---|---|---|
| **support** | 「三、其它」`.contact-info` 框内,紧跟「联系方式」一行(**显眼处**) | (无) | 新增一行 `<strong>回复时效：</strong>` + 统一话术 |
| **support** | 同节末尾 `mt-4 text-sm text-gray-500` 段 | 「**我们通常在 2 个工作日内回复。**在 App 内「小天天 → 联系我们」提交的反馈,…」 | 删掉打头那句,其余保留(与上面新增行口径统一) |
| **privacy** | 第八节「如何联系我们」末段 | 「…我们将尽快审核所涉问题并予以回复,**通常在十五个工作日内**。」 | 「…」+ 统一话术 |
| **terms** | 第十节「如何联系我们」,`.contact-info` 框后新增一段 | **一句时效都没有** | 新增 `mt-4 text-sm text-gray-500` 段 = 统一话术 |
| **index** | —— | 通篇**没有联系段**(只有三个入口块各一行描述),也不含任何时效承诺 | **未改**(任务书「若有联系段同改」条件不成立)。脚本 `tools/edits_g8_claudecode_20260908.py` 里有断言钉住「index 不含『工作日』『逐一回复』」,以后写进去会当场报错 |

改前站上**两个承诺互相打架**(support「2 个工作日」vs privacy「十五个工作日」),现已唯一。
落档自证:四页里「工作日」共出现 3 次,**全部**是这一句;其它提法 0 处。

> App 内文案由 **X121 颗粒 14** 同步,不在本轮范围。

---

# 五、闸(`tools/gate_g8.mjs`,可重跑)

```
node tools/gate_g8.mjs                            # 只跑离线闸
EDIT_PASSPHRASE=<口令> node tools/gate_g8.mjs      # 全跑(会真往线上写一次再改回去)
```

## 5.1 本轮实跑结果:**20 条全绿**

| 闸 | 判定 | 结果 |
|---|---|---|
| **G8-CASCADE** | 绿 | Preflight 必须排在页面样式之前 —— privacy `@2434 < @5933`、terms `@2434 < @5824` |
| **G8-CASCADE·阴性对照** | 绿 | 拿**修复前字节**(`3a15497^`)跑,两页都红(`@4527 > @383` / `@4870 > @383`)⇒ 这条闸真的抓得住 |
| **G8-SLA** | 绿 | 统一话术 3 处(期望 3)· 其它「工作日」提法 0 处 |
| **G8-METRIC/privacy** | 绿 | WebKit 实测 7 项排版指标与 support **逐项相等** |
| **G8-METRIC/terms** | 绿 | 同上 |
| **G8-STRUCT/index** | 绿 | 「隐私」→「私隐」存一次:`<style>` 1 块 / `class` 6 个 / `style=` 0 个 / 165 行剖面,除被改词那行外逐字节不变 |
| **G8-STRUCT/privacy** | 绿 | 「不收集」→「未收集」:`<style>` 2 块 / `class` 24 个 / `style=` 0 个 / 257 行剖面 |
| **G8-STRUCT/terms** | 绿 | 「用户」→「使用者」:`<style>` 2 块 / `class` 13 个 / `style=` 0 个 / 291 行剖面 |
| **G8-STRUCT/support** | 绿 | 「常见」→「常问」:`<style>` 1 块 / `class` 11 个 / `style=` 0 个 / 218 行剖面 |
| **G8-STRUCT·阴性对照 ×4** | 绿 | 换成「保存时做归一化」的旧式链路,四页全被抓红(13 / 54 行剖面变化、`<style>` 内容变化) |
| **G8-STRUCT·复原 ×4** | 绿 | 四页改回后线上**逐字节复原** |
| **G8-STRUCT/收尾** | 绿 | KV 四页正文与开跑前逐字节相同 |
| **G8-LIVE** | 绿 | 主站 4 页逐字节 == `docs/`;备份站 4 页 200 |
| **G8-MAIL** | 绿 | 八页裸词 `@126.com` / `@qq.com` / `邮箱` 命中 **0** |

**G8-STRUCT 就是任务书点名要的那条回归闸**:「任一页经 `/api/save` 保存一次(改一个词)后,
`<style>` / 所有 `class` / `style=` / 换行结构逐字节不变」。它钉四样东西:
① 每块 `<style>` 的内容逐字节;② 全部 `class="…"` 取值的有序列表;③ 全部 `style="…"` 取值;
④ 每行的「缩进宽度:行长」剖面 —— 只准**被改词那一行**长度变化,且变化量必须恰好等于换词长度差。

## 5.2 回归(既有闸)

| 闸 | 结果 |
|---|---|
| `python3 tools/gates_g5.py docs` | G5-NOSITE / G5-PRICE / G5-TECH **三条绿** |
| `bash tools/stale_scan_g7_claudecode_20260908.sh docs` | 6 条过时串 **TOTAL=0** |
| `node tools/test_render.mjs` | **46 passed, 0 failed** |
| `python3 build.py` | 双端同源 sha 一致 / class 白名单 16-16 / 零外域 5 页 0 处 / 四页 parity ok |
| 备份站逐字节 | 四页 `cnaron.github.io` 与 `docs/` **sha 全同** |
| 八页 200 | 主站 `/ /privacy /terms /support` + 备份站四页 **全 200** |

---

# 六、落地清单

| 步骤 | 结果 |
|---|---|
| `git push origin main` | `7de4347..1cbbfe8`(备份站随之更新) |
| `npx wrangler pages deploy` | 上传 3 个文件(106 已存在)+ Functions bundle,`https://7b7cb491.xiaotiantian-app.pages.dev` |
| **经 `/api/save` 逐页保存**(未用 `kv_import.py` 整体覆盖) | index 1358 B · privacy 25727 B · terms 21015 B · support 7242 B,四页 `ok=true` |
| KV == `content/` 逐字节 | 四页全 `true`,`from=kv` |

commit:

- `3a15497` fix(x122-g8):成因 + 根因修法(生成器 + 两页换序)
- `1cbbfe8` feat(x122-g8):统一措辞 + G8 五条闸
- (本回执 + README 追平)

截图:Air `~/Downloads/X122-G8/`(mini 留档 `/Users/cc/x122/g8/shots/`)

| 文件 | 内容 |
|---|---|
| `00-side-by-side-privacy-BEFORE-AFTER-support.png` | 三栏并排:改前 / 改后 / support 参照 |
| `01-privacy-BEFORE.png` / `02-privacy-AFTER.png` | 隐私政策整页 900×4174 → 900×5713 |
| `03-terms-BEFORE.png` / `04-terms-AFTER.png` | 用户协议整页 900×3255 → 900×4671 |
| `05-support-REFERENCE.png` | support 参照页 900×2826 |

截图工具用的是**不吃缓存**版(颗粒 7 修的 `shot.swift` 默认 `nonPersistent()`)。

---

# 七、诚实边界(没做的 / 打折的 / 要 owner 拍板的)

1. **★ 本轮之后我们的页面不再逐像素等于 owner 原版**。原版实测 24px / 段距 0 / 无圆点(§2.3),
   我们现在是「原版样式表本来想要的样子」= support 的样子。这是按 owner 这次的令做的取舍;
   要回到原版长相 = 把两个 `<style>` 再换回去,一条命令。**请 owner 过目截图确认这是他要的。**
2. **`h1` 仍是 16px 加粗**(不是更大的字号)。因为 Preflight 的 `h1{font-size:inherit}` 在前、
   页面样式只给了 `h1{font-weight:700}` 没给字号 —— **support 一直也是这样**,三页一致。
   如果 owner 觉得大标题该更大,那是一处**新的设计改动**,不在本轮「与 support 一致」的口径里,没动。
3. **`index` 目录页未加时效句**(§4),依据是任务书的「若有联系段同改」条件不成立。若 owner 认为
   目录页也该写,一行的事。
4. **统一话术的标点改成了全角**以匹配各页既有风格(owner 原话是半角逗号)。文字内容一字未改。
5. **重复站 `xiaotiantian-legal.pages.dev` 本轮未动**(任务书明令「不动重复站,待裁」)。
   它仍是 09-07 改版前的内容 —— 也就是说**它的行间距问题也还在**,且仍挂着邮箱地址。等 owner 裁:删 / 也发一份。
6. **颗粒 6 的结论没有被推翻,是被限定了**:owner 那次「看到的是 68 分钟前的旧页」是真的缓存问题,
   `stale-while-revalidate` 也确实该删。但**这次这个行间距是另一件事**,和缓存无关 ——
   两件事叠在一起过,所以上一轮只查到缓存就收了手。教训见 §八。
7. **G8-METRIC 依赖图形会话下的 `tools/probe`**(WKWebView)。无头 CI 里跑不了,已留 `--skip-metric` 开关;
   跳过时这条闸就**不算跑过**(按 X77-C 的三态闸账,记「没跑」不记绿)。
8. **只量了 900px 宽这一档**。`@media (max-width:640px)` 那档只改容器 padding,不涉及行高,没单独量。

---

# 八、这一轮抓到的坑(写给下一个 session)

1. **★★★「逐像素等于参照物」这类验收线,抓不到「参照物自己就是错的」。**
   颗粒 4 的 G4-PIXEL 闸设计得没毛病、跑出来也是真绿,但它的通过线是「等于原版」,
   而原版恰恰是坏的 ⇒ 这条闸**结构上不可能**报出本次问题。
   今后搬别人的页面时,除了「等于来源」,还要再钉一条**「等于我们自己已有的、已知正确的同类页」**
   (本轮的 G8-METRIC 就是这一条)。
2. **★★★ 同一个现象可以有两个独立成因,查到第一个就收手会漏掉第二个。**
   owner 两次说的都是「行间距变了」:第一次(颗粒 6)真凶是缓存,第二次真凶是层叠顺序。
   颗粒 6 那轮「逐像素 100.00% 相同」也是真的 —— 因为它比的是**两个都已经坏了的版本**。
   ⇒ 「A/B 逐像素相同」只能证明「这次编辑没弄坏」,**不能证明「现在是对的」**。
3. **★★ 取 `<style>` 前必须先剥 HTML 注释。** 本仓库的说明注释正文里带着字面量 `<style>`,
   `/<style>[\s\S]*?<\/style>/` 会从注释中间开始匹配,块边界找歪。
   `fix_cascade_order` 第一版就栽在这(断言当场报错,没造成错误产物)。
4. **★★ CSS 同优先级看先后**这条基本规则,在「把 CDN 生成物内联化」这类改造里是**头号风险点**:
   原来是运行时注入(位置由脚本决定),内联之后位置由**你写在哪一行**决定,一挪就变。
   `adopt_original.py` 老注释里其实**已经点名了这个风险**并做了选择 —— 选错的原因不是没想到,
   是把「复现原版」当成了唯一目标。
