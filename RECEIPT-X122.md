# RECEIPT-X122 · 隐私政策 / 用户协议 / 支持页 公开上线(双托管)

> 2026-09-07 · 执行 session(Claude Code,mini 本机)· owner 亲自下令
> 本回执含 owner 两次改令的完整处置轨迹(GitHub Pages → 关停 → 恢复;COS → 作废;
> Cloudflare Pages → 已上线)。

---

## 简短大白话

三张给 App Store 和用户看的网页(隐私政策、用户协议、支持页)已经在公网上,
**主地址是 Cloudflare 的 `xiaotiantian-app.pages.dev`**,国内打开约 0.5 秒。
GitHub 那套 `cnaron.github.io/xiaotiantian-legal` 按你的意思**先留着**当备份,内容一样。

你要的 `xiaotiantian.pages.dev` **被别人占了**(那个地址现在是一个叫「小天天的个人网站」
的站,不在你的 Cloudflare 账号里)。按你给的优先级往下试,`xiaotiantian-app` 是干净可用的,
所以用了它。细节和证据在 §1.2。

**你以后可以自己改文案**,两条路(§5 有逐步说明):
- **A 最简单**:在 GitHub 网页上直接点开 html 文件改字、保存 —— 我给了每页的直达编辑链接。
- **B 一次性设置、以后全自动**:在 Cloudflare 控制台把这个项目「Connect to Git」接上仓库,
  接完以后你在 GitHub 改完保存,网站**自动更新**,不用再找我。在你接之前,改完告诉我,
  我跑一条命令发布。

另外为了让"接 Git 自动发布"这件事安全,我把六个对外文件收进了 `docs/` 文件夹:
两处托管都只发这个文件夹,**仓库里那些内部文档(回执、README)不会被公网看到**
——已实测这两个文件在两个站上都是 404。

## 1. 最终 URL

### 1.1 Cloudflare Pages(★ 主用,建议填 ASC)

| 用途 | URL |
|---|---|
| **隐私政策**(ASC「隐私政策 URL」) | https://xiaotiantian-app.pages.dev/privacy |
| **用户协议**(App 内设置页链接) | https://xiaotiantian-app.pages.dev/terms |
| **支持页**(ASC「支持 URL」,必填) | https://xiaotiantian-app.pages.dev/support |
| 目录页 | https://xiaotiantian-app.pages.dev/ |

- 项目名 `xiaotiantian-app`;**wrangler 直传**,未接 GitHub 仓库 ⇒ 这套地址与 `cnaron` 无关。
- ⚠️ Cloudflare 默认剥 `.html` 后缀:`/privacy.html` → 308 → `/privacy`(最终 200)。
  **填后台用不带 `.html` 的三条**,直接 200、少一跳。

### 1.2 ★ 子域抢注实况:`xiaotiantian` 被占,回退到 `xiaotiantian-app`

按 owner 给的优先级依次试:

| 顺位 | 项目名 | 结果 | 证据 |
|:--:|---|---|---|
| 1 | `xiaotiantian` | ❌ **裸子域被占** | 项目**建得出来**,但 Cloudflare 分配的地址是 `https://xiaotiantian-6mg.pages.dev/`(自动加随机后缀) |
| 2 | `xiaotiantian-app` | ✅ **可用** | `available at https://xiaotiantian-app.pages.dev/`,无后缀 |
| 3 | `xiaotiantianapp` | ✅ 也可用(未采用) | 同上形态,按优先级取第 2 顺位 |
| 4 | `xiaotiantian-legal` | (已存在,本轮早先所建) | 见 §1.3 |

**关于「被占的原文报错」**:wrangler **没有报错** —— 它不会告诉你子域被占,
而是**静默加一个随机后缀**(`-6mg`)。这是本次的一个认知更正:
**"项目创建成功" ≠ "拿到了你要的那个地址"**,必须读它回显的 `available at` 那一行。

占用方证据(不是 owner 的):

```
https://xiaotiantian.pages.dev/  -> 200
<title>小天天的个人网站</title>
```

且 owner 账号的 Pages 项目列表里**没有** `xiaotiantian` 这个项目(本轮 API 实读)
⇒ 属第三方账号占用,拿不到。

**清理**:第 1、3 顺位那两个项目(`xiaotiantian` / `xiaotiantianapp`)都是本轮为试名而建、
**零部署**,已通过 API 删除(`success=true`),不在账号里留垃圾。

### 1.3 GitHub Pages(备份,按 owner 指令保留)

| 用途 | URL |
|---|---|
| 隐私政策 | https://cnaron.github.io/xiaotiantian-legal/privacy.html |
| 用户协议 | https://cnaron.github.io/xiaotiantian-legal/terms.html |
| 支持页 | https://cnaron.github.io/xiaotiantian-legal/support.html |

⚠️ **另有一个重复站** `https://xiaotiantian-legal.pages.dev/`(本轮更早所建,内容已同步一致)。
它现在是第三份拷贝 ⇒ **建议删掉**,免得日后改文案漏发一处、两个地址说法不一。
我没有自作主张删,因为上一版回执已经把它的地址给过 owner。
要删随时可以:`npx wrangler pages project delete xiaotiantian-legal`。

## 2. 国内 / 海外两侧可达性实测

- **国内侧** = `ssh appserver`(腾讯云国内机房,CentOS `VM-32-7-centos`)
- **海外侧** = mini 本机(经 Surge TUN → 首尔 VPS 出海)
- 每条 URL 连测 **5 次**;时间 2026-09-07 17:29 CST

| URL | 国内 | 国内最快 | 海外 | 海外最快 |
|---|:--:|--:|:--:|--:|
| `xiaotiantian-app.pages.dev/` | **200×5/5** | 0.516s | **200×5/5** | 0.549s |
| `xiaotiantian-app.pages.dev/privacy` | **200×5/5** | 0.516s | **200×5/5** | 0.259s |
| `xiaotiantian-app.pages.dev/terms` | **200×5/5** | 0.503s | **200×5/5** | 0.274s |
| `xiaotiantian-app.pages.dev/support` | **200×5/5** | 0.502s | **200×5/5** | 0.369s |
| `github.io/…/` | **200×5/5** | 0.395s | **200×5/5** | 0.237s |
| `github.io/…/privacy.html` | **200×5/5** | 0.404s | **200×5/5** | 0.367s |
| `github.io/…/terms.html` | **200×5/5** | 0.508s | **200×5/5** | 0.242s |
| `github.io/…/support.html` | **200×5/5** | 0.513s | **200×5/5** | 0.250s |

**两地两站 40/40 全绿。**

> ⚠️ 一次瞬时失败要如实登记:更早一轮(17:25)国内测 `github.io/…/support.html` 时,
> 第 3 次采样返回 `000`(连接失败)。随后**同一 URL 加测 10 次为 10/10 成功**,
> 判为瞬时抖动而非系统性不可达。但这提示 **github.io 的国内链路不如 pages.dev 稳**,
> 也是主用 Cloudflare、GitHub 只作备份的理由之一。

### 2.1 反向对照 + 正文核对(★ 防「软 404」与「打开了但内容不对」)

```
pages.dev/no-such-x122          -> 404   (真 404,不是软 200)
github.io/…/no-such-x122        -> 404   (真 404)
```

从**国内 appserver** 抓回正文(去标签后 grep)核对:

| 页面 | 关键句 | 命中 |
|---|---|:--:|
| `pages.dev/privacy` | 到期不自动续费 | ✅ ×2 |
| `pages.dev/privacy` | 只保留最新的一局 | ✅ ×2 |
| `pages.dev/privacy` | 没有任何联网上传功能 | ✅ ×1 |
| `pages.dev/terms` | ¥28 / ¥48 / ¥128 / ¥98 / ¥78 五档价格 | ✅ 五行全在 |
| `pages.dev/terms` | 到期不自动续费 | ✅ ×1 |
| `pages.dev/support` | shengtang003@126.com | ✅ ×2 |
| `github.io/…/privacy.html` | 到期不自动续费 | ✅ ×2 |
| `github.io/…/support.html` | shengtang003@126.com | ✅ ×2 |
| 两站 privacy | `<script` 出现次数 | ✅ **0** |

> ⚠️ 过程中一次假红:我最初用「`1 年 ¥28`」(带空格)去 grep `terms` 判 FAIL ——
> 实际是表格单元格,去标签后文本是「`1 年¥28`」。**是尺子写错,不是内容缺失**,
> 逐行打印价格后五档全在。登记在此,避免日后照抄这条错 grep。

---

## 3. GitHub 仓库最终状态 + 中途关停轨迹

**最终状态:`cnaron/xiaotiantian-legal` = public,GitHub Pages = 开启(status `built`),
main 分支根目录,HTTPS 强制。**

| 时刻(CST) | 事件 | 证据 |
|---|---|---|
| 17:00:08 | 仓库创建,public | `repo_created_at=2026-09-07T09:00:08Z` |
| 17:01:01 | Pages 首次构建完成,privacy.html 首次 200 | until 循环第 13 次转 200 |
| **17:06:45** | **按 owner 第一次改令**:`DELETE /pages` + 转 private | `visibility=private`;`GET /pages` 返回 404 |
| 17:06–17:11 | 仓库匿名访问 404(确实私有) | `curl github.com/cnaron/…` → 404 |
| 17:11:13 | **按 owner 第二次改令**:恢复 public + 重开 Pages | `visibility=public private=false`;`status=building`→`built` |
| 17:1x | 四页重新核 200 | 见 §2 表 |

**★ 一条必须如实说的事:那 4 分 28 秒里,网页其实一直能打开。**
Pages 关掉后源站已下线,但 Fastly CDN 上那份缓存(`cache-control: max-age=600`)没到期,
我连续探测到 17:10:58 仍是 `200 / x-cache: HIT`。⇒ **「后台关掉」≠「公网立刻看不到」**,
这类下线要按缓存 TTL 等,或改内容强制刷新。

**曝光窗口登记**:public 累计约 **6 分 37 秒**(17:00:08 → 17:06:45)+ 17:11:13 至今(现为常态公开)。
GitHub 流量 API 在关停时读数:`views=0 uniques=0` / `clones=0 uniques=0`
(⚠️ 该 API 统计的是**仓库**访问,不含 Pages 站点访问;Pages 侧的访问只有我自己的探测)。

### 3.1 一处构建红灯(已修,登记备查)

推 `52aab00` 后 GitHub Pages 构建 **errored**(`Page build failed`):本回执 §4.1 里
引用 ToS 草案占位符 `{{DEVELOPER_NAME}}` 时,Jekyll 把它当 Liquid 变量去解析,构建挂掉。
**站点当时并没有断**(仍供上一版构建,页面 200)——这正是「构建红 ≠ 页面挂」的一例,
两者要分开看。修法:加 `.nojekyll` 旁路 Jekyll(本站是纯静态 HTML,本就不需要它),
`4b58dae` 构建 `built` 恢复正常。

---

## 4. 事实核对表(写进页面的每条 ↔ 代码出处)

对照基线:`/Users/cc/Public/x84sb/wt-v3design`,分支 `feature/v3-design-20260904`,
HEAD `029923f1`(build 108 世系)。**全部本轮现读,不引旧文档结论。**

| # | 页面上的说法 | 代码 / 数据出处 | 判 |
|---|---|---|:--:|
| 1 | 系统权限**恰好 6 条**:相机 / 麦克风 / 相册读 / 相册写 / 健康写 / 健康读声明 | `ios/project.yml:100–112` | ✅ |
| 2 | 无「本地网络」权限 | 同上,无 `NSLocalNetworkUsageDescription` | ✅ |
| 3 | 每局生成一条本地视频,**单槽只留最新一局** | `LastReplayStore_claudecode_20260901.swift`(复制落槽 + 原子换名 + `prune`) | ✅ |
| 4 | 视频在沙盒;可主动保存到相册 / 分享 | `MeasurementViewModel.saveToPhotos` + `MeasurementResultExamView:640` | ✅ |
| 5 | **零网络请求**、零第三方 SDK | `grep URLSession/NWConnection` 在 App 侧**零命中** | ✅ |
| 6 | 无账号 / 无需注册登录 | 全仓无登录注册路径 | ✅ |
| 7 | 1 年 ¥28 / 3 年 ¥48 非续期订阅;永久 ¥128 非消耗型 | `SubscriptionPlan.swift`(X121 颗粒 6/7/9) | ✅ |
| 8 | 升级:1 年→永久 ¥98、3 年→永久 ¥78 | 同上 `upgradePriceFrom1y/3y_20260907` | ✅ |
| 9 | **到期不自动续费**(枚举里已无自动续订商品) | 同上文件头 + `SubscriptionStatus` 删掉试用/宽限期两态 | ✅ |
| 10 | 有效期按 **Apple 签名交易的购买日**在本机算 | `SubscriptionManager.refreshEntitlements` | ✅ |
| 11 | 恢复购买按**原始购买日**重算 | `SubscriptionManager.restorePurchases`(`AppStore.sync()`) | ✅ |
| 12 | 解锁范围:体测模式 / 完整历史与趋势 / 健康同步 | `SubscriptionPlan.swift` 注释「一条不多一条不少」 | ✅ |
| 13 | 免费档:体测**累计 3 次**、历史**最近 3 条** | `ProFeature.swift` `freeUsageLimit=3` / `freeHistoryLimit=3` | ✅ |
| 14 | 健康**只写不读** | `NSHealthShareUsageDescription` + entitlements 空数组 | ✅ |
| 15 | 麦克风会录进**旁边的人说话** | `NSMicrophoneUsageDescription` 逐字一致 | ✅ |
| 16 | 内置评分标准 **6 套** | `ChinaProvinceStandards.json` 实读 `n=6` | ✅ |
| 17 | 联系邮箱 `shengtang003@126.com` | 草案 §8 与 STORE-METADATA §4.3 一致 | ✅ |
| 18 | 页面零脚本、零第三方资源、不设 Cookie | 两站线上抓回 `<script` 命中 **0** | ✅ |

### 4.1 相对草案 / 旧线上版做的更正

| 处 | 旧说法 | 本次写法 | 理由 |
|---|---|---|---|
| 付费 | 月订 ¥9 / ¥18 / 年订 ¥68,自动续费,3 天试用 | 买断制五档 + **到期不自动续费** + 无试用 | X121 颗粒 6/7/9 已改制;AUDIT-X118 §3.6 把「3 天试用」列为收费风险 |
| 视频 | 「不保存任何视频、图片或截图」 | 每局存一条、只留最新一局、不上传、卸载即删 | 与 `LastReplayStore` 直接冲突,Guideline 5.1.1 命中面 |
| 相册读 | 当成可用功能写 | 「该入口在部分版本中可能不对外开放」 | X109 已把选片入口收进调试面 |
| 省份 | 「9 省」 | 6 套,并写明不凭推测填入 | JSON 实读 n=6 |
| HIIT / 自定义模板 | 旧 ToS 列进 Pro 权益 | **不写** | v3 三 Tab UI 无 HIIT 入口 |
| 开发者法定名称 / 管辖地 | `{{DEVELOPER_NAME}}` 占位符 | 留空,写成"本 App 开发者" | 不编造 owner 法定身份 |

---

## 5. ★ owner 自己改内容的两条入口

### 5.A 最简单:在 GitHub 网页上直接改(现在就能用)

点开链接 → 改中文字 → 页面底部 **Commit changes** → 完事。
(改完 **github.io 会自动更新**;`pages.dev` 在你做完 5.B 之前**还需要我跑一条命令**,见 §5.C。)

| 页面 | 直达编辑链接 |
|---|---|
| 隐私政策 | https://github.com/cnaron/xiaotiantian-legal/edit/main/docs/privacy.html |
| 用户协议 | https://github.com/cnaron/xiaotiantian-legal/edit/main/docs/terms.html |
| 支持页 | https://github.com/cnaron/xiaotiantian-legal/edit/main/docs/support.html |
| 目录页 | https://github.com/cnaron/xiaotiantian-legal/edit/main/docs/index.html |

**改的时候只要记住一条**:只改 `<p>` `<li>` `<td>` 这类尖括号**中间**的中文字,
尖括号本身别动。每页顶部我写了「给编辑的人」说明,正文按节插了路标注释,例如:

```html
<!-- ── 第 5 节 · 购买与支付(★ 改价格在这) ── -->
<!-- ── 第 8 节 · 联系方式(★ 改邮箱在这) ── -->
```

这些灰色注释**不会显示在网页上**,只是给你找位置用的。

### 5.B 一次性设置:接上 Git,以后全自动发布(推荐做一次)

做完这 5 步,以后你在 GitHub 改完保存,`pages.dev` 会**自动重新发布**,不用再找我。

1. 打开 https://dash.cloudflare.com → 左侧 **Workers & Pages** → 点项目 **`xiaotiantian-app`**
2. 顶部 **Settings**(设置)→ 找到 **Builds & deployments**(构建与部署)
3. 点 **Connect to Git**(连接到 Git)→ 授权 GitHub → 选仓库 **`cnaron/xiaotiantian-legal`**
4. 构建配置按这三项填(**很重要**):
   - **Production branch(生产分支)**:`main`
   - **Framework preset(框架预设)**:`None`
   - **Build command(构建命令)**:**留空**
   - **Build output directory(构建输出目录)**:`docs`   ← ★ 必须填 `docs`
5. 点 **Save and Deploy**。以后每次在 GitHub 上 Commit,几十秒后网站自动更新。

> ★ 为什么输出目录必须是 `docs`:仓库根还放着 `README.md` / `RECEIPT-X122.md` 这类
> **内部文档**。填 `docs` 才能只发对外的六个文件;填根目录会把内部文档一起公开。
> (已实测:两个站上 `/RECEIPT-X122.md` 与 `/README.md` 都是 **404**。)

### 5.C 在你接 Git 之前,由我发布

```bash
cd /Users/cc/Public/x84sb/legal-site
git pull --ff-only                      # 拉下 owner 在网页上的改动
export CLOUDFLARE_API_TOKEN=…           # 值在 VPS ~/.bashrc(变量名同名)
export CLOUDFLARE_ACCOUNT_ID=…          # 值在 VPS ~/.keys.md 的 Cloudflare 段
npx --yes wrangler@latest pages deploy docs --project-name xiaotiantian-app --branch main
```

### 5.D 凭证处置

- 用的是 VPS `~/.bashrc` 里既有的 `CLOUDFLARE_API_TOKEN` + `~/.keys.md` 的 Account ID,
  **只经环境变量注入本次进程,未落盘、未写进本回执、未提交 git**。
- 用前实测两步:`/user/tokens/verify` → `active`;列 Pages 项目 → 成功
  ⇒ 确认该 token 带 Pages 权限(它原登记为 "Workers Deploy Token")。
- ⚠️ 这是**账号级既有 token**,不是为本项目新建的最小权限 token。要收紧可另建
  只含 `Cloudflare Pages:Edit` 的 token 并轮换旧的。
- **git 身份**:commit 署 `claudecode-ondevice-agent`,未借用 owner 身份、未改 git config。

### 5.E 仓库结构(为什么是 docs/)

```
cnaron/xiaotiantian-legal
├── docs/            ← ★ 两处托管都只发这个目录
│   ├── index.html  privacy.html  terms.html  support.html
│   ├── 404.html    style.css     .nojekyll
├── README.md        ← 内部,不公开
└── RECEIPT-X122.md  ← 内部,不公开
```

GitHub Pages 源已切到 `main` 分支的 `/docs`(URL 形态不变,`docs` 即站点根)。
原先的 `dist/` 副本已删除 —— 一份源、两处发,没有"两份不一致"的隐患。

## 6. 诚实边界

1. **法律措辞未经律师审阅。**本文是工程/产品口径的如实描述,不是法律意见。
2. **开发者法定名称与管辖地留空**(草案是占位符,不编造)。中国区上架若要求具名,
   owner 给名字后一行 `sed` 补上重推两站。
3. **`github.io` 的国内可达性只在 appserver 这一台上验过**:那是腾讯云机房出口,
   路由条件比家庭宽带好。**不能据此断言"国内到处都能打开 github.io"**。
   `pages.dev` 同理——Cloudflare 国内可达性随 ISP / 时段波动,只是通常比 github.io 稳。
   ⇒ 这也是保留两套地址的意义。
4. **两站内容目前一致,但没有自动同步机制**:GitHub Pages 跟 git 走,Cloudflare 是
   wrangler 直传。**以后改文案必须两边都发**(git push + 重跑一次 wrangler deploy),
   否则会出现两套地址内容不一致。
5. **未做真机 / 多机型视觉走查**:页面用响应式 CSS + 深色模式,但没在 iPhone 上实际打开看排版。
6. **免费档历史条数**取 `FeatureGate.freeHistoryLimit = 3`;代码里旧注释仍有「限 7 条」
   残留(`RecordsStore.swift:106`),**以常量为准**。
7. **「后台关掉 ≠ 公网立刻消失」**(§3):CDN 缓存会继续供页面。这条对以后任何
   "紧急下线"类操作都成立。
8. **「项目创建成功 ≠ 拿到想要的地址」**(§1.2):wrangler 对子域被占**不报错**,
   静默加随机后缀。今后抢子域必须读回显的 `available at`,不能只看 "Successfully created"。
9. **切 GitHub Pages 源(根 → /docs)后有约 1 分钟的传播空窗**:期间旧路径 404、
   旧文件仍 200,看起来像"发反了"。等构建 `built` + 传播完成后复测才作数
   ——本轮就先读到过一次这种自相矛盾的中间态。
10. **三处站点没有自动互相同步**:github.io 跟 git 走,两个 pages.dev 靠 wrangler 手动发。
   owner 接 Git(§5.B)只解决 `xiaotiantian-app` 那一处。

---

## 7. 明确没做的事(别当做了)

- ❌ **App 内的链接没有替换。**`SettingsView` / Paywall 仍指向
  `https://gugushizi.com/ropecounterprivacy.html` 与 `…terms.html`(旧线上版,内容仍是 5 月那份)。
  换链接是代码改动,由协调另派。
- ❌ **App Store Connect 后台没填。**隐私政策 URL 仍是旧值,支持 URL 仍是 `null`。
- ❌ **旧线上页(gugushizi.com 那两张)没动**,无该站写权限。
- ❌ **腾讯云 COS 那条按第二次改令作废**,没建桶、没上传;
  过程中查明三台机器(mini / VPS / appserver)**都没有腾讯云 API 凭证**、
  都没装 `coscmd` / `tccli` —— 若日后要走 COS,这一步仍需 owner 在控制台操作。
- ❌ **没发飞书通知**(项目纪律:过程回报走会话)。
- ❌ **没动 rope-counter 仓库、没动 wt-v3design**(只读取,零写入)。
- ❌ **没有为本项目新建最小权限 Cloudflare token**(用的是既有账号级 token,见 §5.D)。
- ❌ **没有替 owner 接 Git**(§5.B 那 5 步要 owner 在 Cloudflare 控制台点,
  涉及授权 GitHub 账号,不是我该代劳的)。在此之前改文案仍需我跑一次 wrangler。
- ❌ **没删重复站 `xiaotiantian-legal.pages.dev`**(上一版回执已把它的地址给过 owner,
  不自作主张删;建议 owner 确认切到新地址后让我删,见 §1.3)。
- ❌ **没拿到 `xiaotiantian.pages.dev`** —— 被第三方占用,拿不到(§1.2)。
- ❌ **页面文案本身没有再改一个字**(本轮只加了给编辑看的注释路标 + 换了托管);
  内容仍是 §4 那张核对表的版本。

---

## 8. 验证命令(可复跑)

```bash
cf=https://xiaotiantian-legal.pages.dev
gh=https://cnaron.github.io/xiaotiantian-legal
# 国内侧
ssh appserver "for u in $cf/privacy $cf/terms $cf/support $gh/privacy.html; do \
  curl -s -o /dev/null -w '%{http_code} %{time_total}s  '\$u'\n' --max-time 12 \$u; done"
# 海外侧(mini 本机)同上去掉 ssh
# 反向对照:不存在的路径必须真 404
curl -s -o /dev/null -w '%{http_code}\n' $cf/no-such-x122
# 正文(去标签后 grep)
curl -s $cf/privacy | sed 's/<[^>]*>//g' | grep -c "到期不自动续费"
```

## 9. 以后怎么更新内容(执行线视角)

```bash
cd /Users/cc/Public/x84sb/legal-site
#（改 docs/*.html）
git add -u && git commit -m "docs(legal): …" && git push     # ← github.io 自动更新
export CLOUDFLARE_API_TOKEN=…  CLOUDFLARE_ACCOUNT_ID=…       # ← 见 VPS ~/.keys.md
npx --yes wrangler@latest pages deploy docs --project-name xiaotiantian-app --branch main
# 若 xiaotiantian-legal 那个重复站还没删,同一条命令再发它一次,否则两地内容会漂
```
**owner 做完 §5.B 接 Git 之后,上面第二条 wrangler 就不必再手动跑了。**
