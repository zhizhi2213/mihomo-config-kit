# mihomo-config-kit

一套**自持**的 Mihomo 覆写脚本生成器，适用于 FlClash / Clash Party / Clash Meta 系客户端。客户端加载构建产物 `dist/mihomo-config.js`（标准版）或 `dist/mihomo-config-mrs.js`（全量 MRS 二进制版）后，会在你的订阅配置基础上自动重建 **DNS（fake-ip）**、**Sniffer**、**代理组**、**规则源**与**分流规则**，不依赖任何第三方配置项目。

- **双版本并存**：同时提供 **Classical 标准版**（yfamilys 文本规则，易排查）与 **MRS 二进制版**（`MetaCubeX/meta-rules-dat` 官方 `.mrs` 规则，启动更快、内存更省、IP 规则全量 `no-resolve` 零 DNS 泄漏）
- **AI 独立分流**：拆分为 `🇨🇳 国内 AI`（直连）与 `🌍 国外 AI`（代理），并保留置顶白名单按住字节/豆包国内 CDN
- **多订阅形态兼容**：同时支持内联 `proxies`、纯 `proxy-providers` 与混合订阅，自动剔除流量/到期等伪节点
- **macOS / 内核兼容清理**：自动清理订阅中不兼容或已废弃字段（`clash-for-android`、`profile.tracing`、`global-client-fingerprint`、`bind-address` 与非 `utun` 开头的 `tun.device`）
- **不含节点信息**：节点永远来自你自己的订阅，本仓库仅包含规则与构建脚本

---

## 一键导入

在客户端「覆写 / Override → 脚本」中按需任选一个版本填入并启用：

### 1. MRS 全量二进制版（推荐：`dist/mihomo-config-mrs.js`）
> 采用 Mihomo 官方 `MetaCubeX/meta-rules-dat@meta` 全量 `.mrs` 二进制规则集（`domain` + `ipcidr`），走国内镜像下载，所有 IP 规则集自带 `no-resolve` 彻底杜绝规则匹配触发本地 DNS 解析。

- **GitHub Raw**：
  ```text
  https://raw.githubusercontent.com/zhizhi2213/mihomo-config-kit/main/dist/mihomo-config-mrs.js
  ```
- **CDN 加速（国内直连可用）**：
  ```text
  https://fastly.jsdelivr.net/gh/zhizhi2213/mihomo-config-kit@main/dist/mihomo-config-mrs.js
  ```

### 2. Classical 标准版（`dist/mihomo-config.js`）
> 采用 `yfamilys` 34 组 `classical` + `yaml` 文本分流规则集，本地缓存为明文 YAML，方便直接用文本工具检索排查。

- **GitHub Raw**：
  ```text
  https://raw.githubusercontent.com/zhizhi2213/mihomo-config-kit/main/dist/mihomo-config.js
  ```
- **CDN 加速（国内直连可用）**：
  ```text
  https://fastly.jsdelivr.net/gh/zhizhi2213/mihomo-config-kit@main/dist/mihomo-config.js
  ```

### FlClash 使用提示

1. 添加订阅后，进入 **覆写** 填入上述脚本地址并启用。
2. **关闭 App 自带的「DNS 覆写」**，避免客户端默认设置覆盖脚本内的 DNS 配置。
3. 每次更新脚本后需**重新应用一次配置**才会生效；若分组名称有变动，之前的手动节点选择会重置。

---

## 核心模块说明

| 模块 | 配置与行为 |
| --- | --- |
| **基础兼容** | 开启 `unified-delay`、`tcp-concurrent`；关闭 `find-process-mode` 与 `geodata-mode`（`memconservative`）；配置 `geox-url` 国内镜像；清理 `clash-for-android`、`profile.tracing`、`global-client-fingerprint`、`bind-address` 及非 `utun` 的 `tun.device` |
| **DNS** | `fake-ip` 模式（`198.18.0.1/16`）、`cache-algorithm: arc`、`use-system-hosts: true`、`respect-rules: true`；主 `nameserver` 使用境外 DoH（Cloudflare / Google，跟随分流规则走代理）；`nameserver-policy`（`geosite:cn,private`）、`proxy-server-nameserver` 与 `direct-nameserver` 定向国内 DoH（阿里 / DNSPod），清理旧 `fallback` 彻底防止并发抢答导致的 DNS 泄漏；`fake-ip-filter` 包含内置 `geosite:cn`、`geosite:private` 与社区 `rule-set:fakeip-filter` |
| **Sniffer** | 启用 HTTP / TLS / QUIC 域名嗅探；内网 CIDR 加入 `skip-dst-address`；Apple 与 OpenAI 系列域名加入 `skip-domain` |
| **代理组** | 策略选择 / 自动选择 / 手动选择 / 20 个应用分流组 / 漏网之鱼 / 11 个区域节点 `url-test` 组；统一使用 `https://www.gstatic.com/generate_204` 进行健康检查 |
| **规则源** | **标准版**：[yfamilys](https://yfamilys.com/config/shadowrocket_basic.conf) 34 组（`classical` + `yaml`）；**MRS 版**：[MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat/tree/meta/geo) 39 组（`domain` / `ipcidr` + `mrs` 二进制）；两版均含 [wwqgtxx/clash-rules](https://github.com/wwqgtxx/clash-rules) 的 `fakeip-filter.mrs`（仅用于 DNS） |

---

## 代理组与规则结构

### 代理组顺序

```text
1  🚀 策略选择     select（自动选择 / 手动选择 / 区域组 / DIRECT）
2  ♻️ 自动选择     url-test（全部真实节点，自动剔除伪节点）
3  👐 手动选择     select（全部真实节点，自动剔除伪节点）
4  应用分流组      🇨🇳 国内 AI  🌍 国外 AI  📲 Telegram  📹 YouTube  🎥 Netflix
                  🎬 Disney+   🎻 Spotify  📄 Twitter   👤 Facebook 📖 Reddit
                  🐦 Discord   🪙 Paypal   🎮 游戏平台  🍿 国外媒体 Ⓜ️ 微软服务
                  🍎 苹果服务  📽 哔哩哔哩 🍔 国内媒体  🍟 新浪微博 🌐 全球直连
5  🐟 漏网之鱼     select（策略选择 / DIRECT）
6  区域节点组      🇭🇰 香港 / 🇨🇳 台湾 / 🇯🇵 日本 / 🇸🇬 新加坡 / 🇰🇷 韩国 / 🇺🇸 美
                  🇬🇧 英国 / 🇩🇪 德国 / 🇷🇺 俄罗斯 / 🇨🇦 加拿大 / 🇮🇳 印度
```

- **内联订阅**：按正则动态匹配节点，无对应节点时自动省略该区域组。
- **Provider / 混合订阅**：自动为 `proxy-providers` 开启 `health-check`，并使用 `include-all`、`filter` / `exclude-filter` 与 `empty-fallback: REJECT` 动态筛选节点；`♻️ 自动选择` 与 `👐 手动选择` 同样会剔除伪节点与 `direct|reject` 类型节点。

### 规则优先级

```text
1  内网/私网直连   IP-CIDR 4 段（no-resolve）+ GEOSITE,private + GEOIP,private,no-resolve → DIRECT
2  系统对时直连    AND,((DST-PORT,123),(NETWORK,udp)) → DIRECT（早于所有 RULE-SET，保障 DoH TLS 校验）
3  直连白名单      config/direct-domains.txt（置顶，按住 ai-global 中的字节系与钉钉域名）
4  代理例外        DOMAIN-SUFFIX,googleapis.cn → 🚀 策略选择（修复 Google Play 下载卡「等待中」）
5  应用分流        标准版 34 组 yfamilys RULE-SET / MRS 版 39 组 MetaCubeX .mrs RULE-SET（IP 规则均带 no-resolve）
6  国内兜底        GEOIP,CN,no-resolve → 🌐 全球直连；GEOSITE,cn → 🌐 全球直连
7  最终兜底        MATCH → 🐟 漏网之鱼
```

> **为什么不使用 anti-AD 等去广告源？**
> v1.4.0 起已移除 anti-AD（因其 payload 为 `+.域名` 的 domain 格式，用 `classical` 加载会逐条报错且大面积失效，还会误杀国内静态资源）。如确有去广告需求，建议单独接入 `behavior: domain` 的规则源。

---

## 本地维护与构建

日常只需维护两处文件：

1. **置顶直连白名单**（[`config/direct-domains.txt`](./config/direct-domains.txt)）：每行一个域名（自动补全为 `DOMAIN-SUFFIX,<域名>,DIRECT`）或完整规则行，`#` 为注释。
2. **规则与分组配置**（[`scripts/build.js`](./scripts/build.js)）：修改顶部数据区（`REGION_GROUPS`、`APP_GROUPS`、`RULESETS`、`FAKE_IP_FILTER` 等）。

修改完成后，在仓库根目录执行构建与沙箱自检（需 Node.js ≥ 18）：

```bash
node scripts/build.js
```

脚本会同时生成 [`dist/mihomo-config.js`](./dist/mihomo-config.js) 与 [`dist/mihomo-config-mrs.js`](./dist/mihomo-config-mrs.js)，并自动校验两份产物的一致性、DNS / Sniffer 配置、规则顺序、目标组存在性、防自引用、伪节点剔除、`provider` 模式兼容性及 MRS `no-resolve` 约束。如需进一步验证真实订阅，可用内核校验：

```bash
mihomo -t -d <包含 GEOIP.metadb 的目录> -f <生成的 yaml>
```

### 自动构建（GitHub Actions）

[`.github/workflows/build.yml`](./.github/workflows/build.yml) 会在以下情况自动执行 `node scripts/build.js` 并回提交 `dist/mihomo-config.js`：

- 推送到 `main` 且改动涉及 `scripts/**`、`config/**` 或工作流文件本身
- 每周一北京时间 04:00 定时重建
- 在 GitHub Actions 页面手动触发 `Run workflow`

产物头部不写入构建时间戳，源码无实质变化时不会产生空提交。

---

## 目录结构

```text
config/direct-domains.txt       置顶直连白名单
scripts/build.js                构建脚本（配置数据 + 运行时模板 + 沙箱自检）
dist/mihomo-config.js           构建产物：Classical 标准版（yfamilys yaml 规则源，勿手改）
dist/mihomo-config-mrs.js       构建产物：MRS 全量二进制版（MetaCubeX .mrs 规则源，勿手改）
.github/workflows/build.yml     CI 自动构建与回提交工作流
docs/AI-HANDOFF.md              AI / 维护者交接指南（操作流程、硬约束与排障决策树）
```

> ⚠️ **安全提示**：本仓库为公开仓库，切勿将包含 token 的订阅链接、节点密码、机场域名或客户端生成的本地 `config.yaml` 提交进仓库。
