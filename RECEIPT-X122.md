# RECEIPT-X122 · 隐私政策 / 用户协议 / 支持页 公开上线

> 2026-09-07 · 执行 session(Claude Code,mini 本机)· owner 亲自下令

---

## 简短大白话

三张给 App Store 审核和用户看的网页(隐私政策、用户协议、支持页)已经真的挂在
公网上了,任何人打开都能看到,**没有用你自己的域名、也没有用公司域名**,是免费的
GitHub Pages。三条网址填进 App Store Connect 就能用。

内容不是照抄旧稿:我逐条对着现在的 App 代码核过——权限确实是 6 条、每局视频确实会
存在手机里(只留最新一局)、付费确实是买断制(1 年 ¥28 / 3 年 ¥48 / 永久 ¥128,
**到期不自动续费**)。旧稿和旧线上版里那些"绝不保存视频""月订年订自动续费 ¥9/¥18/¥68
+ 3 天试用"的说法都与现在的 App 不符,已经全部改掉——这几句正是 App Store 审核
最容易逐字对照挑毛病的地方。

**一件要你知道的事**:网址里会出现你的 GitHub 用户名 `cnaron`。这不是公司名也不是
个人真名,一般没问题;如果你想要连这个都不出现,后面可以把同一个仓库接到 Cloudflare
Pages,换成 `xxx.pages.dev` 的地址(本次没做,见 §5)。

---

## 1. 三条 URL(+ 目录页)

| 用途 | URL | 实测 |
|---|---|:--:|
| **隐私政策**(ASC「隐私政策 URL」) | https://cnaron.github.io/xiaotiantian-legal/privacy.html | 200 ✅ |
| **用户协议**(App 内设置页链接) | https://cnaron.github.io/xiaotiantian-legal/terms.html | 200 ✅ |
| **支持页**(ASC「支持 URL」,必填) | https://cnaron.github.io/xiaotiantian-legal/support.html | 200 ✅ |
| 目录页 | https://cnaron.github.io/xiaotiantian-legal/ | 200 ✅ |

- 仓库:`cnaron/xiaotiantian-legal`(public)· commit `46fa3ec`
- 托管:GitHub Pages,`main` 分支根目录,HTTPS 强制开启(`https_enforced: true`)
- Pages 首次构建耗时约 38s(17:00:23 起 404 → 17:01:01 转 200,`pages.status` building→built)

### 1.1 反向对照(★ 防「软 404」)

AUDIT-X118 §4.1 记过一个坑:`gugushizi.com` 对**任何**不存在的路径都返回 200,
正文是一句服务器错误 JSON ⇒ 「打开没报错」证明不了页面存在。因此本次**两个方向都验**:

```
/privacy.html                  -> 200   (正路)
/definitely-not-real-x122.html -> 404   (反向对照,不是软 200)
```

⇒ 这个域下 404 是真 404,上面三个 200 是真页面。

---

## 2. 事实核对表(写进页面的每条 ↔ 代码出处)

对照基线:`/Users/cc/Public/x84sb/wt-v3design`,分支 `feature/v3-design-20260904`,
HEAD `029923f1`(build 108 世系)。**全部为本轮现读,不引旧文档结论。**

| # | 页面上的说法 | 代码 / 数据出处 | 判 |
|---|---|---|:--:|
| 1 | 系统权限**恰好 6 条**:相机 / 麦克风 / 相册读 / 相册写 / 健康写 / 健康读声明 | `ios/project.yml:100–112` 六条 `NS*UsageDescription` | ✅ |
| 2 | 无「本地网络」权限 | 同上,无 `NSLocalNetworkUsageDescription` | ✅ |
| 3 | 每局生成一条本地视频,**单槽只留最新一局**,新局自动覆盖 | `LastReplayStore_claudecode_20260901.swift`(复制落槽 + 原子换名 + `prune` 只留 video/index 两个文件) | ✅ |
| 4 | 视频在沙盒、其它 App 看不到;可主动保存到相册 / 分享 | `MeasurementViewModel.saveToPhotos` + `MeasurementResultExamView:640`「保存到相册」按钮 | ✅ |
| 5 | **零网络请求**、零第三方 SDK | `grep URLSession/NWConnection` 在 `ios/App|Features|Sources|Shared` **零命中** | ✅ |
| 6 | 无账号 / 无需注册登录 | 全仓无登录注册路径 | ✅ |
| 7 | 1 年 ¥28 / 3 年 ¥48 = **非续期订阅**,永久 ¥128 = 非消耗型 | `SubscriptionPlan.swift`(X121 颗粒 6/7/9 定案表) | ✅ |
| 8 | 升级:1 年→永久 ¥98、3 年→永久 ¥78 | 同上 `upgradePriceFrom1y/3y_20260907` | ✅ |
| 9 | **到期不自动续费**;枚举里已无自动续订商品 | 同上文件头「旧的月订 / 年订两个自动续订商品已从本枚举移除」+ `SubscriptionStatus` 删掉试用 / 宽限期两态 | ✅ |
| 10 | 有效期按 **Apple 签名交易的购买日**在本机算 | `SubscriptionManager.refreshEntitlements`(`Transaction.all` → `purchaseDate` → `ExamEntitlement.resolve`) | ✅ |
| 11 | 恢复购买 = 同步历史交易后按**原始购买日**重算 | `SubscriptionManager.restorePurchases`(`AppStore.sync()`) | ✅ |
| 12 | 付费解锁:体测模式不限次 / 完整历史与趋势 / 健康同步 | `SubscriptionPlan.swift` 注释「isPro 解锁中考模式 / 完整历史与趋势 / 健康同步,一条不多一条不少」 | ✅ |
| 13 | 免费档:体测模式**累计 3 次**、历史**最近 3 条** | `ProFeature.swift` `freeUsageLimit=3` / `freeHistoryLimit=3`(2026-05-12 由 7 收紧到 3) | ✅ |
| 14 | 健康**只写不读**,读权限仅为满足框架要求 | `NSHealthShareUsageDescription` 原文 + entitlements `healthkit.access` 空数组(AUDIT-X118 §3.5) | ✅ |
| 15 | 麦克风会录进**旁边的人说话** | `NSMicrophoneUsageDescription` 原文逐字一致 | ✅ |
| 16 | 内置评分标准 **6 套**(国标 / 北京 / 上海 / 广东(广州) / 江苏(南京) / 浙江(杭州)) | `ChinaProvinceStandards.json` 本轮解析 `n=6`,含 `missingProvinces` | ✅ |
| 17 | 联系邮箱 `shengtang003@126.com` | 草案 §8 与 STORE-METADATA §4.3 一致(任务书:草案另有邮箱则以草案为准) | ✅ |
| 18 | 页面自身零脚本、零第三方资源、不设 Cookie | 线上抓回四页 `<script` 命中 **0**;唯二外链是 `reportaproblem.apple.com`(可点击的跳转,非加载资源) | ✅ |

### 2.1 相对草案 / 旧线上版做的更正(★ 都是审核逐字对照面)

| 处 | 旧说法 | 本次写法 | 理由 |
|---|---|---|---|
| 付费 | 草案 §5 + 旧 ToS §3:「月订 ¥9 / ¥18 / 年订 ¥68,自动续费,3 天免费试用」 | 买断 / 期限制五档 + **到期不自动续费** + 无试用 | X121 颗粒 6/7/9 已改制,代码里自动续订商品已删;AUDIT-X118 §3.6 曾把「3 天试用是空口承诺」列为收费风险 |
| 视频 | 旧线上版「我们不保存任何视频、图片或截图」 | 每局存一条、只留最新一局、不上传、卸载即删 | 与 `LastReplayStore` 直接冲突,Guideline 5.1.1 命中面 |
| 相册读 | 草案写成一个可用功能 | 「该入口在部分版本中可能不对外开放,权限声明保留以覆盖此用途」 | X109 已把选片入口收进调试面(`X77PhotoPicker` 在 `Features/DevTools/`)⇒ 不承诺没有的入口 |
| 省份 | 描述里的「9 省」 | 6 套,并写明"不会凭推测填入" | JSON 实读 n=6 |
| HIIT / 自定义模板 | 旧 ToS 列进 Pro 权益 | **不写** | v3 三 Tab UI 无 HIIT 入口目录;不承诺没有的功能 |
| 开发者法定名称 / 管辖地 | 草案是 `{{DEVELOPER_NAME}}` / `{{DEVELOPER_LOCATION}}` 占位符 | 写成"本 App 开发者"、"有管辖权的人民法院",**不填具体名字与城市** | 不编造 owner 的法定身份信息,见 §4 |

---

## 3. 怎么做的 / 为什么是这个域

- **不用 owner 或公司域名**(任务书硬约束)⇒ 选 GitHub Pages:免费、纯静态、
  HTTPS、Apple 审核可访问、无需备案。
- 仓库名取中性的 `xiaotiantian-legal`,**不含公司名**。
- ⚠️ **URL 里会出现 GitHub 用户名 `cnaron`** —— 这是 `github.io` 的固有形式,
  已如实登记(见 §5 可选去名方案)。
- git 身份:commit 署 `claudecode-ondevice-agent`,**没有借用 owner 身份**、
  没有改 git config(项目 CLAUDE.md §并行执行代理协调纪律 第 3 条)。

---

## 4. 诚实边界(没做 / 不确定 / 需要 owner 决定)

1. **法律措辞未经律师审阅。** 本文两份文本是工程/产品口径的如实描述,不是法律意见。
2. **开发者法定名称与管辖地留空**:草案里是占位符,我不编造。若上架需要具名
   (中国区上架通常要求主体信息),owner 给名字后一行 `sed` 即可补上并重新 push。
3. **年龄分级 4+ / 9+ 的矛盾没解决**(AUDIT-X118 §3.3:后台 9+ 是人为 override,
   商店描述写 4+)——那是 ASC 后台 + 商店描述的事,本颗粒不碰,页面里没提年龄分级。
4. **GitHub 在国内偶有不稳**:`github.io` 大多数时候可达,但国内网络环境下不保证
   100% 稳定。Apple 审核在境外访问,不受影响;若担心国内用户点 App 内链接打不开,
   走 §5 的 Cloudflare Pages 更稳。
5. **未做真机 / 多机型视觉走查**:页面用响应式 CSS(`viewport` + `max-width: 760px`
   + 深色模式适配),但我没有在 iPhone 上实际打开看排版。
6. **免费档历史条数**取 `FeatureGate.freeHistoryLimit = 3`(2026-05-12 由 7 收紧);
   代码里旧注释仍有「限 7 条」残留(`RecordsStore.swift:106`),**以常量为准**。

---

## 5. 明确没做的事(别当做了)

- ❌ **App 内的链接没有替换。** `SettingsView` / Paywall 里仍指向
  `https://gugushizi.com/ropecounterprivacy.html` 与 `…terms.html`(旧线上版,
  内容仍是 2026-05-12 那份)。换链接是代码改动,由协调另派。
- ❌ **App Store Connect 后台没填。** 隐私政策 URL / 支持 URL 仍是后台原值
  (支持 URL 依然是 `null`)。ASC 需要 owner 或另一颗粒去填。
- ❌ **旧线上页(gugushizi.com 那两张)没动。** 本颗粒无该站写权限,也不在授权范围。
- ❌ **没发飞书通知**(项目纪律:过程回报走会话)。
- ❌ **没动 rope-counter 仓库、没动 wt-v3design**(只读取,零写入)。
- ⬜ **可选后续:完全去掉 URL 里的 `cnaron`。** 在 Cloudflare Pages 里「Connect to Git」
  选这个仓库,即可得到 `xxx.pages.dev` 地址(可自定项目名),内容自动同步。
  **本颗粒未做**,等 owner 决定是否需要。

---

## 6. 验证命令(可复跑)

```bash
base=https://cnaron.github.io/xiaotiantian-legal
for p in "" privacy.html terms.html support.html; do
  curl -sI "$base/$p" | head -1
done
# 反向对照:不存在的路径必须真 404,不是软 200
curl -s -o /dev/null -w "%{http_code}\n" "$base/definitely-not-real-x122.html"
# 正文关键句(去标签后 grep)
curl -s "$base/privacy.html" | sed 's/<[^>]*>//g' | grep -c "到期不自动续费"
```

本轮实测输出:三页 + 目录页全 200;不存在路径 404;
`到期不自动续费` 在 privacy/terms/support 三页均命中;四页 `<script` 命中 0。
