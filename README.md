# mihomo-config-kit

一套**自持**的 Mihomo 覆写脚本：给 FlClash / Clash Party / Clash Meta 系客户端的订阅配置做二次加工，重建 DNS、代理组和分流规则。不依赖任何第三方配置项目，全部逻辑都在本仓库里。

- 分流方案参考 [yfamilys](https://yfamilys.com/config/shadowrocket_basic.conf) 的分组与规则组织方式
- AI 分组拆分为 🇨🇳 国内 AI（豆包/通义/Kimi/DeepSeek 直连）与 🌍 国外 AI（ChatGPT/Claude/Gemini 代理）
- 不含去广告规则集（v1.4.0 起移除 anti-AD，原因见下）
- 节点永远来自你自己的订阅，本仓库不含任何节点信息

## 它做了什么

导入订阅后，脚本会在客户端应用配置前重写以下部分：

| 模块 | 内容 |
| --- | --- |
| DNS | fake-ip（`198.18.0.1/16`）、DoH 主解析（阿里 / 腾讯）、境外 fallback（Cloudflare / Google，带 `#RULES`）、`use-system-hosts: true`、`cache-algorithm: arc`；fake-ip 例外含内置 `geosite:cn` 与社区 `rule-set:fakeip-filter` |
| Sniffer | 识别 IP 直连中的域名，内网网段加入 `skip-dst-address`，避免本地 hosts 解析出的内网 IP 被还原 |
| 代理组 | 策略选择 / 自动选择 / 手动选择 / 20 个应用分流组（含国内/国外 AI）/ 漏网之鱼 / 区域节点组 |
| 规则源 | yfamilys 34 组分流规则（`.rule` 为 mihomo 兼容的 yaml payload）+ 1 份社区 fake-ip 豁免清单（`.mrs`，只供 DNS 查询，不生成分流规则） |
| 规则 | 见下方优先级 |

### 分组顺序

```
1  🚀 策略选择          select
2  ♻️ 自动选择          url-test（全部真实节点）
3  👐 手动选择          select
4  🇨🇳 国内 AI          DIRECT / 策略选择（豆包、通义、Kimi、DeepSeek 等直连）
   🌍 国外 AI  📲 Telegram  📹 YouTube  🎥 Netflix  🎬 Disney+
   🎻 Spotify  📄 Twitter  👤 Facebook  📖 Reddit  🐦 Discord
   🪙 Paypal  🎮 游戏平台  🍿 国外媒体  Ⓜ️ 微软服务  🍎 苹果服务
   📽 哔哩哔哩  🍔 国内媒体  🍟 新浪微博  🌐 全球直连
5  🐟 漏网之鱼
6  区域节点组：🇭🇰 港 / 🇨🇳 台 / 🇯🇵 日 / 🇸🇬 新 / 🇰🇷 韩 / 🇺🇸 美
             / 🇬🇧 英 / 🇩🇪 德 / 🇷🇺 俄 / 🇨🇦 加 / 🇮🇳 印
```

区域组按**节点名正则**动态匹配。内联节点订阅里没有对应节点时该组自动不创建；**proxy-providers 订阅**在覆写脚本期看不到节点，改用内核 `include-all: true` + `filter`/`exclude-filter`（Go 正则）动态筛选，全量创建地区组并用 `empty-fallback: REJECT` 兜底空组，同时给每个 provider 注入 `health-check`（否则地区测速组拿不到延迟、永远停在首个节点）。订阅附带的 `Traffic: xx GB` 这类流量信息行会被识别为伪节点并剔除，不参与测速。

### 规则优先级

```
1  内网/私网直连        IP-CIDR 4 段 + GEOSITE,private + GEOIP,private,no-resolve → DIRECT
2  系统对时直连         AND,((DST-PORT,123),(NETWORK,udp)) → DIRECT（早于所有 RULE-SET）
3  直连白名单           config/direct-domains.txt（置顶，按住 ai-global 里的字节系域名）
4  例外                 DOMAIN-SUFFIX,googleapis.cn → 🚀 策略选择（修 Google Play 下载卡「等待中」）
5  应用分流             34 组 yfamilys RULE-SET（国内 AI → 🇨🇳 国内 AI 直连；国外 AI → 🌍 国外 AI 代理）
6  国内兜底            GEOIP,CN,no-resolve → 🌐 全球直连（按 IP）；GEOSITE,cn → 🌐 全球直连（按域名）
7  兜底                MATCH → 🐟 漏网之鱼
```

> **国内域名为何要 `geosite:cn`**：DNS 是 fake-ip 模式，域名默认拿到 `198.18.x.x` 假 IP，`GEOIP,CN` 按 IP 判断时永远匹配不到，未收录的国内站点会掉进 `MATCH` 走代理。v1.2.0 在 `fake-ip-filter` 加内置 `geosite:cn` 让国内域名拿真实 IP，并在规则层补一条 `GEOSITE,cn` 按域名兜底（捞回解析到境外 CDN 的国内站点）。两处同源、零新增规则源——与 Syzygy33 脚本的 `rule-set:cn-domain` 三层联动同思路（那边用 mrs 规则源，这里用内核内置 geosite）。删掉任一处都会让国内直连退化。

> **v1.3.0 的 DNS / 对时优化**：① `cache-algorithm: arc`，比默认 LRU 命中率更高、内存更省；② 境外 fallback 的三个 DoH 全部加 `#RULES`，让 DoH 请求本身按分流规则出站——`1.1.1.1` / `8.8.8.8` / `dns.google` 在国内直连基本不可达，不加后缀 fallback 形同虚设；③ `AND,((DST-PORT,123),(NETWORK,udp)),DIRECT` 排在所有 `RULE-SET` 之前，很多节点丢弃或限制 UDP 123，时钟漂移会连带导致 DoH 的 TLS 证书校验失败。三项都是零面板变化。

> **社区 fake-ip 豁免清单**：`dns.fake-ip-filter` 除手工白名单与内置 `geosite:cn` 外，还引用 `rule-set:fakeip-filter`（[wwqgtxx/clash-rules](https://github.com/wwqgtxx/clash-rules) 的 `fakeip-filter.mrs`），补齐官方 geosite 未收录、但必须拿真实 IP 的域名（NTP / 局域网发现 / 游戏联机等）。它只作为 `rule-provider` 供 DNS 查询，**不生成任何 `RULE-SET` 规则**。`.mrs` 需要较新的 mihomo 内核（已在 1.19.33 实测加载成功）；清单下载失败时该条自动忽略，手工项与 `geosite:cn` 仍生效。

> **v1.4.0 移除 anti-AD**：`anti-ad-clash.yaml` 的 payload 是 `+.域名` 的 domain 格式，用 `behavior: classical` + `format: yaml` 加载时内核会逐条刷 `parse classical rule ... error: missing subsequent parameters`，去广告实际大面积失效，还逼着用置顶白名单把被误杀的字节/豆包域名救回来。移除后规则源 36→35、规则 69→68、面板少一个 🛑 广告拦截组。**`config/direct-domains.txt` 仍需保留**（见下一条）。如仍想去广告，建议改用 `behavior: domain` 的规则源单独接，别恢复旧写法。

> **v1.4.0 的测速与 provider 增强**：所有 `url-test` 组统一 `interval: 300` / `tolerance: 30` / `max-failed-times: 5` / `expected-status: 204`（配合 `generate_204`），失效节点更快被剔除；provider 模式补齐地区组、`health-check` 与空组兜底，详见「分组顺序」。已用内联 90 节点与 provider-only 两份真实配置分别跑过 `mihomo -t`，并短启动确认 `filter` 正则可编译。

> **v1.4.1 内部清理（分流行为与 v1.4.0 完全一致）**：移除 `skip-domain` 里的 `"Mijia Cloud"`——它不是合法域名，只在 SNI 恰好等于该字符串时才会精确命中（米家设备场景），常规域名匹配用不到；若米家设备经代理出现断连，单独加回这一条即可。另外清掉产物 `MIHOMO_KIT.G` 里 19 个运行时不读的死键、`urlTestGroup` 空壳包装，以及 `APP_GROUPS` 中已无组使用的 `fixed` 兜底分支。自检新增 G 键一致性、style 白名单、skip-domain 域名合法性三条断言防回流。

> 原单一 `ai.rule`（国内+国外 AI 混合）已拆为 `ai-cn.rule`（→ 🇨🇳 国内 AI，直连）与 `ai-global.rule`（→ 🌍 国外 AI，代理）。注意 `ai-global.rule` 里也含 `bytednsdoc.com` / `zijieapi.com` / `bytedance.com` 等字节域名，会被送进「国外 AI」代理组；置顶直连白名单 `config/direct-domains.txt` 已包含这些域名，按住它们直连——**因此白名单不可删**。

> ⚠️ 健康检查统一走 `https://www.gstatic.com/generate_204`。**不要改回 `http://`**：部分机场中继会直接断连 80 端口，日志里会刷 `failed to get the second response ... use of closed network connection` 的假失败。

## 一键导入

导入地址（客户端里选择「覆写 / 脚本」）：

```text
https://raw.githubusercontent.com/zhizhi2213/mihomo-config-kit/main/dist/mihomo-config.js
```

CDN 加速（国内直连可用）：

```text
https://fastly.jsdelivr.net/gh/zhizhi2213/mihomo-config-kit@main/dist/mihomo-config.js
```

> ⚠️ 本仓库是公开仓库，**只放规则与构建脚本**。不要把订阅链接、节点密码、机场域名提交进来。

FlClash 使用注意：

1. 添加订阅 → 覆写 → 填入上面的地址并启用
2. **关闭 App 自带的「DNS 覆写」**，否则会用 App 的设置覆盖脚本里的 DNS
3. 重新应用一次配置才会生效；分组改名后手动选择状态会重置

## 维护

### 直连白名单

改 [`config/direct-domains.txt`](./config/direct-domains.txt)，无需动代码，支持三种写法：

```text
doubao.com                                   # 简写，自动补成 DOMAIN-SUFFIX,doubao.com,DIRECT
DOMAIN-KEYWORD,p3-pack.byteimg.com,REJECT    # 完整规则行，原样使用
# 井号开头为注释
```

### 区域正则 / 应用分组 / 规则源

改 [`scripts/build.js`](./scripts/build.js) 顶部数据区：

| 常量 | 作用 |
| --- | --- |
| `REGION_GROUPS` | 区域组名称 + 匹配正则（`include` / `exclude`），数组顺序即面板顺序 |
| `APP_GROUPS` | 应用分流组，`style` 决定可选项：`proxy` / `direct` / `bilibili` / `final` |
| `RULESETS` | 分流规则文件 → 代理组映射，数组顺序即 `RULE-SET` 顺序 |
| `PROBE_URL` | 健康检查地址（必须 HTTPS） |
| `FAKE_IP_FILTER` | fake-ip 例外域名 |
| `INFO_NODE_RE` | 伪节点过滤正则（内联模式用；provider 模式同时作为 `exclude-filter` 的一部分） |
| `COMMUNITY_FAKEIP_FILTER_KEY` / `_URL` | 社区 fake-ip 豁免清单的 provider 名与下载地址 |
| `GEOX_URL` / `SNIFFER_SKIP_DOMAINS` | Geo 数据镜像地址 / Sniffer 跳过嗅探的域名 |

### 构建

```bash
node scripts/build.js
```

生成 `dist/mihomo-config.js`，并做一轮沙箱自检：DNS / Sniffer 是否设置（含 `arc`、`#RULES`、NTP 位置、社区清单引用与 provider 定义）、分组顺序、区域匹配、伪节点剔除、规则目标是否存在（会跳过 `no-resolve` 等修饰符）、组是否自引用、测速容错参数、`proxy-providers` 两种形态（内联节点 / 仅 provider）是否兼容，以及产物数据区无死数据（G 键与运行时引用一致）、style 枚举合法、`skip-domain` 不含非域名条目。

想再做一层内核校验，可以拿真实订阅跑一遍再交给 mihomo：

```bash
mihomo -t -d <包含 GEOIP.metadb 的目录> -f config.yaml
```

### 自动构建（GitHub Actions）

[`.github/workflows/build.yml`](./.github/workflows/build.yml) 会在以下时机重建产物并回提交 `dist/`：

- push 到 `main` 且改动涉及 `scripts/**`、`config/**` 或工作流自身
- 每周一北京时间 04:00 定时重建（规则源有更新时保持产物新鲜）
- 手动：Actions → Build Override Script → Run workflow

构建是可复现的（产物里不写时间戳），所以**源码没实质变化时不会产生空的 bot 提交**。

## 目录结构

```
config/direct-domains.txt       直连白名单（置顶规则）
scripts/build.js                构建脚本：数据 + 运行时模板 + 自检
dist/mihomo-config.js           构建产物（客户端导入的覆写脚本）
.github/workflows/build.yml     CI：改动即重建并回提交产物
docs/AI-HANDOFF.md              交接指南：后续接手者（人或 AI）的操作流程、硬约束、排障树
```

> 想让 AI 继续接手维护这个项目？把 [`docs/AI-HANDOFF.md`](./docs/AI-HANDOFF.md) 交给它即可 —— 里面写了改哪个文件、怎么验证、哪些改法一定会出 bug。

## 说明

- 产物只包含规则与分组逻辑，不含节点、订阅地址、密码等敏感信息，可以公开分享
- 客户端若自行生成含订阅信息的 `config.yaml`，那属于本地文件，不要提交到仓库
