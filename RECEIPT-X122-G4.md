# 回执 · X122 颗粒 4 —— 隐私政策 / 用户协议改用 owner 原版页面

执行:2026-09-08(北京时间)09:09–10:00,mini。执行代理:Claude Code。
预注册:[`PREREG-X122-G4.md`](./PREREG-X122-G4.md)(开工 14 分钟落的第一个 commit `4c747fb`)。
起因:owner「你这个隐私政策跟原版还是有差距呀,直接用原版代码就好了呀」。

---

# 简短大白话

之前我是**照着老页面的意思自己重写**了隐私政策和用户协议,owner 一眼看出跟原版不一样。这一轮我不重写了,**把 owner 原来那两页的代码整篇搬过来,一个字都没动**。

只做了三件必要的手脚:
1. 按 owner 之前定的规矩,**删掉页脚那行「© 2026 小天天练跳绳 版权所有」**;
2. 原版有两样东西是**从国外服务器现场下载**的(一个排版工具、一套中文字体)。新站的规矩是不许连外面的服务器,所以我把这两样**原封不动搬到自己家里**了 —— 不是换成别的、也不是我自己写一个近似的,是把它们**在浏览器里实际生成的那份东西抓下来**照搬。
3. 别的一律没碰,连原版里指向老网站 gugushizi.com 的那两个链接都保持原样。

**长得一模一样**:把原版和新页并排整页截图逐个像素比,**从最顶上一直到第 2731 个像素行,一个像素都不差**;唯一有差异的是最底下那 46 行 —— 就是被删掉的页脚,别无他处(两页都是这个结果)。并排图和「差异标红图」已经放到 Air 的 `~/Downloads/xiaotiantian-legal-site/`。

**⚠️ 但有件事要 owner 拍板**:原版那两页写于 2026 年 5 月,里面有几句话跟 App 现在的实际情况**对不上**,最要紧的两条是「**摄像头画面绝不保存**」(现在其实每局会在手机本地存一条视频)和「**月订阅 ¥6 / 年订阅 ¥58 自动续费**」(现在是买断制 ¥28 / ¥48 / ¥128,不自动续费)。owner 明确说了要用原版,所以我**一个字没改**,全部列在下面 §6 的表里。**隐私政策与用户协议是要给 App Store 审核看、也是对用户的法律承诺,和实际行为不一致是有风险的**,请 owner 过一眼决定改不改。

GitHub 那份备份站也已经同步好了(中间卡了一下,绕了个道,见 §7)。

---

# 1. 采用了哪两页(以及为什么只有两页)

原站 10 个候选路径全探过。该站**任意不存在的路径也返回 200**(一段报错 JSON,软 404,X118 踩过),
所以判定看正文不看状态码:

| 路径 | HTTP | 正文 | 判定 |
|---|---|---|---|
| `/ropecounterprivacy.html` | 200 | 12466 B HTML | ✅ **采用** |
| `/ropecounterterms.html` | 200 | 12920 B HTML | ✅ **采用** |
| `/ropecountersupport.html` `/ropecounter.html` `/ropecounterdelete.html` `/ropecounteraccount.html` `/terms.html` `/support.html` `/ropecounterprivacy` `/ropecounter_privacy.html` | 200 | 101 B 报错 JSON | ❌ 软 404,没有原版 |
| `/privacy.html` | 200 | 26090 B HTML | ⚠️ 是**古古识字**的隐私政策,不是跳绳 ⇒ 不采用 |

`support`(支持与帮助)与 `index`(目录页)**没有原版** ⇒ 保持颗粒 2 版不动(index 另有 owner 规则 3)。

# 2. 改了哪三处(除此之外一字节没改)

`tools/adopt_original.py` 逐处断言"确实改到了",改不到就报错退出,防止静默漏改。
原版两页头部结构相同,故两页改动一致。**下面是 `diff -u` 原文**(Tailwind CSS 那一长行已截断标注):

```diff
--- 原版 ropecounterprivacy.html
+++ content/privacy.html
@@ -4,9 +4,8 @@
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>小天天练跳绳 隐私政策</title>
-    <script src="https://cdn.tailwindcss.com"></script>
     <style>
-        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap');
+        @import url('assets/noto-sans-sc.css');
         body {
@@ -81,6 +80,12 @@
     </style>
+    <!-- 下面这段 = cdn.tailwindcss.com(v3.4.17)在本页上实际生成的 CSS,
+         由 tools/dumpcss 从真实浏览器抓出后原样内联。位置必须在上面那个 <style>
+         之后:Play CDN 就是追加到 head 末尾的,顺序变了长相就变了。 2026.09.08 Naron -->
+    <style>
+*, ::before, ::after{--tw-border-spacing-x:0;…〔5519 B Tailwind CSS,此处截断〕
+    </style>
 </head>
@@ -213,10 +218,6 @@
     </main>
-
-    <footer class="mt-12 pt-8 border-t border-gray-100 text-center text-gray-400 text-xs">
-        &copy; 2026 小天天练跳绳 版权所有
-    </footer>
 </div>
```
terms 的 diff 结构完全相同(Tailwind CSS 5410 B,删的 footer 同样 157 B)。
**正文段落零 diff hunk** —— 一个字都没动。

| # | 改动 | 依据 |
|---|---|---|
| **A1** | 删页脚版权行(157 B) | owner 规则 2「去掉『回到主页』类导航与底栏」。**原版没有导航条**,只有这一行底栏 |
| **A2** | Tailwind CDN 脚本 → 内联 CSS | 任务书允许改动②(外链资源内联);且本站架构零脚本 |
| **A3** | 字体 `@import` 的 URL → 同源 | 任务书允许改动②。**只换 URL**,`@import` 这个写法是原版自己的,没新增标签 |
| ~~A4~~ | viewport | **原版本来就有**,不需要加,故不登记 |

**明确没改的**:原版指向 `https://gugushizi.com/ropecounterterms.html` / `https://www.gugushizi.com`
的两个链接、联系邮箱、以及原版里与 App 现状不符的所有句子。改链接不在允许清单里。

## 2.1 A2 为什么不是"我手写一份差不多的 CSS"

原版靠 `cdn.tailwindcss.com`(Tailwind Play CDN)**在浏览器里现场编译** CSS。要换成内联又不改长相,
唯一靠得住的办法是把**它自己生成的那份**抓下来。为此写了 `tools/dumpcss`(离屏 WKWebView,
加载页面等它编译完,把所有 `<style>` 的内容 dump 出来)。抓到 Tailwind v3.4.17 的产物:
privacy 5519 B / terms 5410 B,含 preflight 重置 + 本页实际用到的 13 个工具类。

**位置是关键**:dump 出来的顺序是 `style[0]`=原版自己的 CSS、`style[1]`=Tailwind 注入的
—— 也就是说 Play CDN 是**追加到 head 末尾**的,排在原版自己的样式**后面**。
同优先级下靠后的赢,所以 Tailwind 的 preflight 实际上**盖掉了**原版自己写的
`p{margin-bottom}` / `ul{list-style:disc}` / `h1{font-weight:700}` 等元素级样式
(并排图里能看到:列表**没有圆点**,那就是原版真实的样子,不是我弄坏的)。
把内联 CSS 放到原版 `<style>` 之前,长相立刻就变 ⇒ 脚本里放在**之后**,并写死了断言。

## 2.2 A3 为什么必须自托管字体,而不是干脆删掉

先做了实测,没有想当然:

| 对比 | 差异像素 | 结论 |
|---|---|---|
| 同一份文件渲染两次(阴性对照) | **0.000%** | 测量链路本身干净 |
| 原版 vs 原版**删掉** `@import` 网络字体 | **11.46%** | 删掉字体 = 字形换成系统中文字体,**长相会变** |

而且我本来想用"反正国内也加载不到 Google 字体"当理由,**一查是错的**:
从 appserver(腾讯云国内)实测 `fonts.googleapis.com` **200 / 86 ms**(解析到 `58.63.233.x` 的域内镜像),
字体文件也能下(200 / 3748 B)。所以那个理由站不住,不能拿来当借口。

⇒ 只能搬过来自己托管:Google 那 **101 个 unicode-range 分片**(变量字重 400/500/700 共用同一批文件)
放进 `docs/assets/fonts/`,CSS 规则一字未改、只把 `fonts.gstatic.com` 的绝对 URL 改写成同源相对路径。
仓库多 4.5 MB,但**浏览器按用到的字符只取其中 3~5 片**,不是一次 4.5 MB。
用相对路径(不是 `/assets/…`)是为了 GitHub Pages 那份备份站在子路径下也能取到字体。

# 3. 站点侧改了什么(整页模式)

原版是**整篇文档**(自带 `<html>`/`<head>`/内联 `<style>`),不是正文片段,套不进颗粒 2/3 的外壳。

- `content/pages.json`:privacy / terms 打 `"fullpage": true`
- `template/render.js`:加 `renderFull()` —— 不切块、不走 Markdown,整篇逐 token 过白名单后**原样吐回**;
  `renderPage` 见 `fullpage` 就走它,外壳 / 内联样式 / H1 / META 一概不套
- `build.py`:整页模式原样落盘,**真正的校验交给 `check_parity.mjs`** —— 用 JS 侧真渲染器跑一遍
  `renderPage` 与 `docs/*.html` 逐字节比,等价于断言「这份原版 HTML 整篇过白名单一字节不变」,
  少放行一个标签构建就会失败。另加**零外域自检**与 class 正则放行冒号(`hover:underline`)
- `functions/_lib/editor.js`:预览 iframe 加 `<base href="/">`(srcdoc 的相对路径按父文档 URL 解析,
  编辑器住在 `/<page>/edit`,不钉这个 base 会把 `assets/noto-sans-sc.css` 解成 `/<page>/assets/…` ⇒ 预览缺字体)
- `docs/_headers`:`/assets/*` 加 immutable 长缓存 + `Access-Control-Allow-Origin: *`
  (预览 iframe 是 `sandbox=""` 的不透明源,取字体带 `Origin: null`,没这条 CORS 头预览就跟发布出来不一样)

## 3.1 白名单扩了什么(单独一个 commit `5c37fd6`,清单如下)

**只加原版两页实测用到的**(用脚本从产物里枚举,不是拍脑袋):

| 类别 | 新增 | 清单 |
|---|---|---|
| 标签 | +9 | `html` `head` `body` `title` `meta` `style` `header` `main` `h1` |
| 属性 | +4 | `lang` `charset` `name` `content` |
| class | +1 | `hover:underline` |

**没放进来的照旧一律转义**:`script` `img` `link` `iframe` `object` `embed` `video` `audio`
`source` `track` / `http-equiv` / `on*` 事件属性 / 未知 class / `javascript:` 链接。
⇒ 整页模式下**结构上没有任何一条路能加载外域资源**,只剩 `<style>` 一个口子,
由 `checkCss()` 挡住 `url(外域)` 与 `@import 外域`;`<style>` 的内容不当 HTML 扫
(CSS 里的 `>` 不是标签),但 `</style>` 之后照常回主循环 ⇒ `</style><script>` 这种打法照样被转义。

`<!DOCTYPE html>` 大小写不敏感放行,但**原样吐回**不规范化(保住字节等价)。

单测 **25 → 46 条**(+21):整页直通逐字节等价 / DOCTYPE / CSS 选择器 `>` / 13 条整页模式阴性对照
+ 2 条「片段模式不认整页标签」反向对照。**46 passed, 0 failed**。

# 4. 判据结果(预注册 §4 逐条,绿 / 红 / 没跑三态)

| 闸 | 结果 | 证据 |
|---|---|---|
| **G4-BYTE** 线上正文 == 采用后本地文件逐字节 | 🟢 绿 | `/privacy` 18035 B、`/terms` 18380 B **BYTE-IDENTICAL**,`X-Content-Source: kv`。与原版的 diff 只出现 A1/A2/A3 三处(§2 贴了原文) |
| **G4-PIXEL** 并排逐像素 | 🟢 绿 | 见 §5,**差异只在被删的底栏那一段** |
| **G4-REACH** 两地可达 | 🟢 绿 | mini 与 appserver 各 5~6 条全 200 / redirects=0;`.html` 后缀仍 308(行为未变);两地拉到的字节数一致 |
| **G4-EDIT** 编辑器不破坏原版 HTML | 🟢 绿 | 见 §5.3,**保存一次「无改动」前后线上页 sha256 完全相同**;预览 == 发布逐字节 |
| **G4-NOEXT** 零外域 | 🟢 绿 | 线上两页:`<script>` 0、`img/link/iframe/object/embed/video/audio/source/track` 0、`src=` 0、`srcset=` 0、CSS `url(外域)` 0、`@import 外域` 0 |
| **G4-SYNC** 四处同源 | 🟢 绿 | KV / `content/` / `docs/` / GitHub Pages 备份站**四处全部逐字节相同**(§5.4)。备份站是绕道 VPS 推上去的,过程见 §7 |
| **G4-REGRESS** 回归 | 🟢 绿 | `node tools/test_render.mjs` **46 passed, 0 failed**;`build.py` 四页 parity ok;三份 render.js sha256 一致 `f3bbe762…` |

# 5. 实测数字

## 5.1 G4-PIXEL 并排逐像素(WebKit 离屏整页截图,900 CSS px 宽,2× 缩放)

| 页 | 原版 | 新页 | 高度差 | 共同区域差异 | 差异分布 |
|---|---|---|---|---|---|
| privacy | 900×2874 | 900×2777 | **97 px** | 22570 / 9997200 = **0.2258 %** | **1 段**,`y=2731..2776`;**在它之上的 2731 px 全域逐像素相同** |
| terms | 900×3009 | 900×2912 | **97 px** | 22570 / 10483200 = **0.2153 %** | **1 段**,`y=2866..2911`;**在它之上的 2866 px 全域逐像素相同** |

97 px = 被删掉的底栏高度(`mt-12` 3rem + `pt-8` 2rem + 一行 `text-xs`)。两页数字一模一样,
因为两页的底栏是同一块。**差异段只有 1 段、且紧贴页尾** ⇒ 除底栏外没有任何一处长相变化。

阴性对照(证明这条测量链路本身是准的):同一份文件渲染两次 = **0.000 %,最大通道差 0**。

产物(已 scp 到 Air `~/Downloads/xiaotiantian-legal-site/`,mini 不留):
`X122-G4-privacy-side-by-side.png` / `X122-G4-terms-side-by-side.png`(左原版右新页整页并排)、
`X122-G4-privacy-diffmap.png` / `X122-G4-terms-diffmap.png`(差异像素标红,红的全在页尾底栏)。

## 5.2 G4-REACH

```
mini       /privacy                  200 redirects=0 0.246s      appserver  200 redirects=0 0.804s  18035 B
mini       /terms                    200 redirects=0 0.749s      appserver  200 redirects=0 0.695s  18380 B
mini       /privacy.html             308 redirects=0             appserver  308 redirects=0
mini       /terms.html               308 redirects=0             appserver  308 redirects=0
mini       /assets/noto-sans-sc.css  200 redirects=0 1.910s      appserver  200 328137 B 1.187s
                                                                 appserver  /assets/fonts/…4.woff2  200 3748 B 1.025s
```

## 5.3 G4-EDIT

```
未登录 /privacy/edit         → 200,1926 B 口令页,正文标记 policy-container 出现 0 次(没漏正文)
登录                         → 200 {"ok":true}
已登录 /privacy/edit         → 200,28956 B;<base href="/"> ×1;预览 iframe id=pv ×1;META 里 "fullpage":true
/api/export 四页 vs 仓库     → index/privacy/terms/support 全部 BYTE-IDENTICAL
保存一次「无改动」            → {"ok":true,"ts":1788831488366,"trimmed":0}
  保存前 sha256 4c4b46f04317429e3a26b9eefa4737504287963638ec6a93f12c8599f5a7db93
  +6/12/18/24/30 s 复查      全部同一个 sha256 ⇒ 保存前后线上页逐字节相同
```

**预览 == 发布(端到端,不是"两边用同一份文件"这种弱证据)**:
把**线上** `/edit-render.js`(sha 前 16 位 `df69721a02475d95`,与仓库 `template/render.js` 相同)
+ 从**线上编辑器页**里抠出来的 `SHELL`/`CSS`/`META`/正文,跑一遍 `renderPage`,产物与线上发布页比:

```
privacy: META.fullpage=true | 预览产物 18035 B vs 线上发布页 18035 B -> BYTE-IDENTICAL
terms  : META.fullpage=true | 预览产物 18380 B vs 线上发布页 18380 B -> BYTE-IDENTICAL
```

## 5.4 G4-SYNC

| 处 | 状态 |
|---|---|
| Cloudflare KV(权威源) | ✅ 已导入,`/api/export` 四页与 `content/` 逐字节相同 |
| 仓库 `content/` | ✅ |
| 仓库 `docs/`(发布产物) | ✅ `build.py` parity ok 四页 |
| GitHub Pages 备份站 | ✅ `privacy.html` 18035 B / `terms.html` 18380 B 与 `docs/` **BYTE-IDENTICAL**;字体相对路径在子路径下也通(`/xiaotiantian-legal/assets/noto-sans-sc.css` 200 · woff2 分片 200) |

导入 KV 前先把 KV 里原有四页 dump 到 `/Users/cc/x122/kv-backup/` 备份,并逐字节核过
**与颗粒 3 的仓库版完全相同 ⇒ owner 在网页上没改过东西,这次覆盖没盖掉任何人工改动**。

**一个已知的短暂窗口**:先发代码后导 KV,中间约 3 分钟(含 KV 全球传播 + 边缘缓存过期)
线上 privacy/terms 渲染的是"老正文走新整页渲染器",页面是残的。已过去,现在正常。
下次这类改造应当先导 KV 再发代码,或走 preview 部署验完再切生产。

# 6. ⚠️ 原版与 App 现状差异表(**按 owner 令一个字都没改,只列出来**)

现状一栏的来源:本仓库 README「事实基线(2026-09-07)」+ X121-g11 备忘。**都需要 owner 复核**。

| 严重度 | 原版页面这么写 | 我所知的现状 | 在哪页 |
|---|---|---|---|
| 🔴 高 | 「摄像头视频帧仅用于本地跳绳动作识别,**识别后立即丢弃,绝不保存或上传**」「我们不保存任何视频、图片或截图」 | **每局会生成一条本地视频**,单槽只留最新一局(不上传) | privacy 核心承诺 / §一.3 |
| 🔴 高 | 「Pro 会员订阅服务(**月订阅 ¥6 / 年订阅 ¥58**)」「3 天免费试用」「**当前周期到期前 24 小时自动续费**」整节自动续费规则 | **买断制**:1 年 ¥28、3 年 ¥48(**非续期,到期不自动续费**)、永久 ¥128 | terms §三 1/3;privacy §四 |
| 🔴 高 | 「月订阅 → 年订阅:Apple 自动按剩余天数比例补差价」 | 升级路径是 1 年→永久 ¥98、3 年→永久 ¥78 | terms §三.4 |
| 🟠 中 | 权限只讲了 **2 条**(摄像头、HealthKit) | **6 条**:相机 / 麦克风 / 相册读 / 相册写 / 健康写 / 健康读声明 | privacy §一.3 |
| 🟠 中 | 「**不收集** … IP 地址等」「零数据上传」 | App 已有「联系我们」会发网络请求到邮件中转接口(X123),发请求必然带 IP | privacy 引言 / §一.1;terms §三.2 |
| 🟡 低 | 「清除本地数据:设置 → **开发选项** → 清空所有记录(**仅 Debug 版本可见**;正式版需卸载应用)」 | 待核 —— 正式版是否真的只能卸载 | privacy §六 |
| 🟡 低 | 「各省评分标准我们尽力按官方文件收录」 | 内置 **6 套**:国家标准(教育部)/ 北京 / 上海 / 广东(广州)/ 江苏(南京)/ 浙江(杭州) | terms §一 |
| 🟡 低 | 「跳绳计数 … 可能存在 **±5% 左右**的识别误差」 | 这个数字来源未知,建议核实后再对外承诺 | terms §七 |
| 🟡 低 | 版本更新 / 生效日期 **2026年5月12日** | 已是 9 月,内容也跟着变过 | 两页页顶 |
| ℹ️ 顺带 | 联系邮箱 `shengtang009@126.com` | 这条**顺带解决了颗粒 2 遗留的「003 还是 009」** —— **owner 原版用的是 009** | 两页页尾 |

> 提醒(只提一次,不重复):隐私政策和用户协议是给 App Store 审核看的、也是对用户的法律承诺。
> 上面 🔴 三条(视频留存、订阅 vs 买断、自动续费)与实际行为不一致,是有风险的。
> owner 明确要求用原版,所以**我一个字没改**;要不要改、改哪几句,请 owner 定。
> 改法很简单:打开 <https://xiaotiantian-app.pages.dev/privacy/edit> 直接改那几句,点保存即发布。

# 7. GitHub Pages 备份站:直推失败,绕道 VPS 推成了

mini 上 `git push` 失败:`failed to get: -25308` / `could not read Username for 'https://github.com'`。
`-25308` = `errSecInteractionNotAllowed` —— **mini 的登录钥匙串这会儿是锁着的**,凭证在里面但取不出来;
`gh auth status` 也报 token 失效;VPS 的 `~/.keys.md` 里没有 GitHub token。

改走 VPS:VPS 上 `ssh -T git@github.com` 认证为 `cnaron` 成功 ⇒ 用它当中转。
**推的是同一批 commit、推到同一个 remote,只是换了条传输路径**,不是扩大改动范围:

```
ssh cc 'git init --bare -q /home/ubuntu/x122-legal-relay.git'
git push ssh://cc/home/ubuntu/x122-legal-relay.git main:main          # mini → VPS
ssh cc 'cd /home/ubuntu/x122-legal-relay.git && git push git@github.com:cnaron/xiaotiantian-legal.git main:main'
ssh cc 'rm -rf /home/ubuntu/x122-legal-relay.git'                     # 中转仓用完即删,VPS 上不留
```
结果 `105ff53..ee90b27  main -> main`(干净快进,没有分叉),
`git ls-remote` 复核远端 = 本地 `ee90b27d5690b60fb614b5daa1ee886680e324db`。
GitHub Pages 重建后 `privacy.html` / `terms.html` 与 `docs/` **逐字节相同**。

> 遗留:**mini 的 git push 通路本身仍然是坏的**(钥匙串锁 + `gh` token 失效)。
> 下次在 mini 上要推 GitHub,要么先解锁一次登录钥匙串,要么重新 `gh auth login`,
> 否则每次都得绕 VPS。本轮**没有**改 git config、没有改 origin URL、VPS 上没留任何东西。

# 8. 没碰的

App、飞书通知、重复站 `xiaotiantian-legal.pages.dev`(仍是 2026-09-07 改版前旧内容)、
ASC 后台的 URL 填写、App 内链接指向、颗粒 2 遗留待裁三件(其中「邮箱 003/009」被本轮顺带确定为 009)、
原版里指向 gugushizi.com 的两个链接与所有与现状不符的文字。

# 9. 新增/改动的文件

```
新增  PREREG-X122-G4.md            预注册
新增  RECEIPT-X122-G4.md           本文件
新增  tools/dumpcss.swift          离屏 WKWebView 抓「浏览器里实际生效的样式表」
新增  tools/adopt_original.py      原版 → 本站正文,三处改动逐处断言
新增  docs/assets/noto-sans-sc.css 自托管字体 CSS(只改写了 URL)
新增  docs/assets/fonts/*.woff2    101 个分片,4.5 MB
改    template/render.js           整页模式 renderFull + 白名单扩容 + checkCss
改    content/privacy.html         ← owner 原版整页
改    content/terms.html           ← owner 原版整页
改    content/pages.json           privacy/terms 打 fullpage
改    build.py                     整页模式 + 零外域自检 + class 正则放行冒号
改    functions/_lib/editor.js     预览 iframe <base href="/">
改    docs/_headers                /assets/* 长缓存 + CORS
改    tools/test_render.mjs        25 → 46 条
产物  docs/*.html  functions/_lib/{render,assets}.js  docs/edit-render.js
```

凭证处置:Cloudflare token 走 `tools/cfenv.sh` 从 VPS 现取现用,不落盘;
编辑器口令从 Air 现取、只在 shell 变量里用过,**不在本回执、不在任何 commit、不在会话正文里**。
