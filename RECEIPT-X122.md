# RECEIPT-X122 · 隐私政策 / 用户协议 / 支持页 公开上线(双托管)

> 2026-09-07 · 执行 session(Claude Code,mini 本机)· owner 亲自下令
> 本回执含 owner 两次改令的完整处置轨迹(GitHub Pages → 关停 → 恢复;COS → 作废;
> Cloudflare Pages → 已上线)。

---

## 简短大白话

三张给 App Store 和用户看的网页(隐私政策、用户协议、支持页)现在**挂在两个地方**,
两个都能打开:

1. **Cloudflare 的 `xiaotiantian-legal.pages.dev`** —— 地址里**不含你的 GitHub 用户名**,
   国内访问约 0.6 秒。**建议 App Store 后台填这一套。**
2. **GitHub 的 `cnaron.github.io/xiaotiantian-legal`** —— 保留作备份,内容一模一样。

内容不是照抄旧稿:逐条对着现在的 App 代码核过——权限确实 6 条、每局视频确实存在手机里
(只留最新一局)、付费确实是买断制(1 年 ¥28 / 3 年 ¥48 / 永久 ¥128,**到期不自动续费**)。
旧稿那些「绝不保存视频」「月订年订自动续费 + 3 天试用」的说法与现在的 App 不符,已全部改掉
——这几处正是审核最爱逐字挑的地方。

**两件要你知道的事:**
- 中途按你第一次的改令,GitHub 仓库被转成私有、Pages 关过一次(约 4 分半),第二次改令下来后
  已完全恢复公开。**那段时间网页其实一直能打开**(CDN 缓存没过期),细节见 §3。
- Cloudflare 那套地址是 `pages.dev/privacy`(**没有 `.html`**);带 `.html` 也能打开,
  但会先跳转一次。填后台建议用不带 `.html` 的,少一跳。

---

## 1. 两套 URL

### 1.1 Cloudflare Pages(★ 推荐填 ASC)

| 用途 | URL |
|---|---|
| **隐私政策**(ASC「隐私政策 URL」) | https://xiaotiantian-legal.pages.dev/privacy |
| **用户协议**(App 内设置页链接) | https://xiaotiantian-legal.pages.dev/terms |
| **支持页**(ASC「支持 URL」,必填) | https://xiaotiantian-legal.pages.dev/support |
| 目录页 | https://xiaotiantian-legal.pages.dev/ |

- 项目名 `xiaotiantian-legal`(中性,**与 GitHub 账号名无关**);**wrangler 直传**,
  没有接 GitHub 仓库 ⇒ pages.dev 这套地址与 `cnaron` 这个名字没有任何关联。
- ⚠️ **URL 形态**:Cloudflare Pages 默认把 `.html` 后缀剥掉。
  `/privacy.html` → **308 跳转** → `/privacy`(最终 200,浏览器与审核都能正常打开),
  但**填后台请用不带 `.html` 的那三条**,直接 200、少一跳。

### 1.2 GitHub Pages(备份,内容同源)

| 用途 | URL |
|---|---|
| 隐私政策 | https://cnaron.github.io/xiaotiantian-legal/privacy.html |
| 用户协议 | https://cnaron.github.io/xiaotiantian-legal/terms.html |
| 支持页 | https://cnaron.github.io/xiaotiantian-legal/support.html |
| 目录页 | https://cnaron.github.io/xiaotiantian-legal/ |

---

## 2. 国内 / 海外两侧可达性实测

- **国内侧** = `ssh appserver`(腾讯云国内机房,CentOS,`VM-32-7-centos`)
- **海外侧** = mini 本机(经 Surge TUN → 首尔 VPS 出海)
- 每条 URL 连测 3 次,取最快一次;时间 2026-09-07 17:14–17:15 CST

| URL | 国内 code | 国内最快 | 海外 code | 海外最快 |
|---|:--:|--:|:--:|--:|
| `pages.dev/privacy` | **200 ×3** | 0.610s | **200 ×3** | 0.946s |
| `pages.dev/terms` | **200 ×3** | 0.567s | **200 ×3** | 0.283s |
| `pages.dev/support` | **200 ×3** | 0.528s | **200 ×3** | 0.279s |
| `pages.dev/privacy.html` | 308 ×3 | 0.501s | 308 ×3 | 0.250s |
| `github.io/…/privacy.html` | **200 ×3** | 0.528s | **200 ×3** | 0.300s |
| `github.io/…/terms.html` | **200 ×3** | 0.701s | **200 ×3** | 0.379s |
| `github.io/…/support.html` | **200 ×3** | 0.700s | **200 ×3** | 0.724s |

**两地两站全部可达。**(308 那行是上面说的后缀剥离跳转,`curl -L` 跟随后为 200,跳 1 次。)

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

## 5. 部署方式与凭证处置

- **Cloudflare Pages**:mini 上 `npx wrangler@latest`(**未全局安装**),
  `pages project create xiaotiantian-legal --production-branch main` +
  `pages deploy dist --project-name xiaotiantian-legal`,上传 6 个文件。
- **凭证**:用 VPS `~/.bashrc` 里已有的 `CLOUDFLARE_API_TOKEN` + `~/.keys.md` 的 Account ID,
  **只经环境变量注入本次进程,未落盘、未写进本回执、未提交 git**。
  用前做了两步实测:`/user/tokens/verify` → `active`;列 Pages 项目 → 成功
  ⇒ **确认该 token 带 Pages 权限**(它原本登记为 "Workers Deploy Token")。
  ⚠️ 这是一把**账号级既有 token**,不是为本项目新建的最小权限 token;
  若要收紧,可另建只含 `Cloudflare Pages:Edit` 的 token 并轮换旧的。
- **发布目录用 `dist/`**:只放 6 个对外文件。`README.md` / `RECEIPT-X122.md` 这类内部文档
  **不进 dist**,不会被公网访问到(已核对 dist 内容)。
- **git 身份**:commit 署 `claudecode-ondevice-agent`,**没有借用 owner 身份**、
  没有改 git config(项目 CLAUDE.md §并行执行代理协调纪律 第 3 条)。

---

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
- ❌ **没有为本项目新建最小权限 Cloudflare token**(用的是既有账号级 token,见 §5)。

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

## 9. 以后怎么更新内容

```bash
cd /Users/cc/Public/x84sb/legal-site
#（改 *.html）
cp index.html privacy.html terms.html support.html 404.html style.css dist/
git add -u && git commit -m "docs(legal): …" && git push        # ← 发 GitHub Pages
export CLOUDFLARE_API_TOKEN=…  CLOUDFLARE_ACCOUNT_ID=…          # ← 见 VPS ~/.keys.md
npx --yes wrangler@latest pages deploy dist --project-name xiaotiantian-legal --branch main
```
**两条都要跑**,否则两套地址内容会不一致(见 §6.4)。
