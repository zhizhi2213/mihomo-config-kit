# Smart-Config-Kit Custom (Mihomo / FlClash / Clash Party — yfamilys 分流 + anti-AD 去广告版)

基于上游 [IvanSolis1989/Smart-Config-Kit](https://github.com/IvanSolis1989/Smart-Config-Kit)，通过 GitHub Actions 每日自动同步上游最新脚本。**只保留上游的节点适配与 DNS 架构**，其融合规则集和业务分组会被构建时注入的补丁**整体替换**为 [yfamilys](https://yfamilys.com/config/shadowrocket_basic.conf) 式的分组与分流方案 + [anti-AD](https://anti-ad.net/) 去广告：

- **区域节点组**：`♻️ 自动选择`、`👐 手动选择`、`🇭🇰 港 / 🇨🇳 台 / 🇯🇵 日 / 🇸🇬 新 / 🇺🇸 美 / 🇰🇷 韩 / 🇬🇧 英 / 🇩🇪 德 / 🇷🇺 俄 / 🇨🇦 加 / 🇮🇳 印` 区域 `url-test` 组 —— 按订阅节点名正则动态匹配，**无匹配节点的区域自动省略**，对任何机场通用。
- **应用分流组**：`🚀 策略选择`、`🤖️ 人工智能`、`📲 Telegram`、`📹 YouTube`、`🎥 Netflix`、`🎬 Disney+`、`🎻 Spotify`、`📄 Twitter`、`👤 Facebook`、`📖 Reddit`、`🐦 Discord`、`🪙 Paypal`、`🎮 游戏平台`、`🍿 国外媒体`、`Ⓜ️ 微软服务`、`🍎 苹果服务`、`📽 哔哩哔哩`、`🍔 国内媒体`、`🍟 新浪微博`、`🌐 全球直连`、`🐟 漏网之鱼`（全部 `select`，可手动覆盖）。
- **分流规则源**：anti-AD 去广告（`anti-ad-clash.yaml`）+ yfamilys 全套 `.rule`（mihomo 兼容 yaml payload，共 33 组，`RULE-SET` 顺序与 yfamilys 基础配置一致）。
- **规则优先级**：`内网网段直连 → config/direct-domains.txt 白名单 → 去广告 → 分流 → GEOIP,CN → 漏网之鱼`。
- **开启系统 Hosts**：`dns.use-system-hosts = true`，支持 SwitchHosts / `/etc/hosts` 实时切换开发环境。
- **豁免内网目标 IP 嗅探**：内网网段加入 `sniffer.skip-dst-address`。

### 维护直连域名清单

改 [`config/direct-domains.txt`](./config/direct-domains.txt) 即可，无需动代码，支持三种写法：

```text
doubao.com                                   # 简写，自动补成 DOMAIN-SUFFIX,doubao.com,DIRECT
DOMAIN-KEYWORD,p3-pack.byteimg.com,REJECT    # 完整规则行，原样使用
# 井号开头为注释
```

提交后 GitHub Actions 会自动重建 `dist/` 与 `Mihomo内核系/` 下的全部产物；本地可用
`node scripts/build.js` 手动重建（构建时会沙箱模拟执行并校验：白名单置顶、分组/规则引用完整性、无组自引用、规则源 URL 等）。

### 调整区域/分组/规则源

在 [`scripts/build.js`](./scripts/build.js) 顶部的数据区修改：`REGION_GROUPS`（区域正则）、`APP_GROUPS`（应用组）、`RULESETS`（yfamilys 规则文件 → 代理组映射）。

---

## 一键导入脚本链接

### 1. FlClash（标准 Mihomo 内核）

- **精简路径 Raw 链接（推荐）**：
  ```text
  https://raw.githubusercontent.com/zhizhi2213/smart-config-kit-custom/main/dist/FlClash.js
  ```
- **jsDelivr CDN 加速链接（免代理直连导入）**：
  ```text
  https://fastly.jsdelivr.net/gh/zhizhi2213/smart-config-kit-custom@main/dist/FlClash.js
  ```
- **与上游一致的原路径链接**：
  ```text
  https://raw.githubusercontent.com/zhizhi2213/smart-config-kit-custom/main/Mihomo%E5%86%85%E6%A0%B8%E7%B3%BB/FlClash/FlClash%28mihomo%29.js
  ```

---

### 2. Clash Party（标准 Mihomo 内核）

- **精简路径 Raw 链接（推荐）**：
  ```text
  https://raw.githubusercontent.com/zhizhi2213/smart-config-kit-custom/main/dist/ClashParty.js
  ```
- **jsDelivr CDN 加速链接**：
  ```text
  https://fastly.jsdelivr.net/gh/zhizhi2213/smart-config-kit-custom@main/dist/ClashParty.js
  ```
- **与上游一致的原路径链接**：
  ```text
  https://raw.githubusercontent.com/zhizhi2213/smart-config-kit-custom/main/Mihomo%E5%86%85%E6%A0%B8%E7%B3%BB/Clash%20Party/ClashParty%28mihomo%29.js
  ```

---

### 3. Clash Party（Mihomo Smart 内核）

- **精简路径 Raw 链接（推荐）**：
  ```text
  https://raw.githubusercontent.com/zhizhi2213/smart-config-kit-custom/main/dist/ClashParty-Smart.js
  ```
- **jsDelivr CDN 加速链接**：
  ```text
  https://fastly.jsdelivr.net/gh/zhizhi2213/smart-config-kit-custom@main/dist/ClashParty-Smart.js
  ```
- **与上游一致的原路径链接**：
  ```text
  https://raw.githubusercontent.com/zhizhi2213/smart-config-kit-custom/main/Mihomo%E5%86%85%E6%A0%B8%E7%B3%BB/Clash%20Party/ClashParty%28mihomo-smart%29.js
  ```

---

## 文档与教程

- 📖 **[FlClash / Mihomo 覆写脚本从入门到精通指南 (`docs/SCRIPT_GUIDE.md`)](./docs/SCRIPT_GUIDE.md)**：图文拆解 1700+ 行覆写脚本的 8 步执行流水线、核心数据结构与本地 Hosts 补丁写法。

---

## 本地构建

如需在本地重新拉取上游最新脚本并构建：

```bash
node scripts/build.js
```
提交推送到 GitHub 后，GitHub Actions 也会自动重新构建并校验所有脚本。
