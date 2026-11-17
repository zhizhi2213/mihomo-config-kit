# mihomo-config-kit

一套**自持**的 Mihomo 覆写脚本：给 FlClash / Clash Party / Clash Meta 系客户端的订阅配置做二次加工，重建 DNS、代理组和分流规则。不依赖任何第三方配置项目，全部逻辑都在本仓库里。

- 分流方案参考 [yfamilys](https://yfamilys.com/config/shadowrocket_basic.conf) 的分组与规则组织方式
- 去广告使用 [anti-AD](https://anti-ad.net/) 规则集
- 节点永远来自你自己的订阅，本仓库不含任何节点信息

## 它做了什么

导入订阅后，脚本会在客户端应用配置前重写以下部分：

| 模块 | 内容 |
| --- | --- |
| DNS | fake-ip（`198.18.0.1/16`）、DoH 主解析（阿里 / 腾讯）、境外 fallback（Cloudflare / Google）、`use-system-hosts: true`（支持 SwitchHosts / `/etc/hosts`） |
| Sniffer | 识别 IP 直连中的域名，内网网段加入 `skip-dst-address`，避免本地 hosts 解析出的内网 IP 被还原 |
| 代理组 | 策略选择 / 自动选择 / 手动选择 / 广告拦截 / 20 个应用分流组 / 区域节点组 |
| 规则源 | anti-AD 去广告 + yfamilys 33 组分流规则（`.rule` 为 mihomo 兼容的 yaml payload） |
| 规则 | 见下方优先级 |

### 分组顺序

```
1  🚀 策略选择          select
2  ♻️ 自动选择          url-test（全部真实节点）
3  👐 手动选择          select
4  🛑 广告拦截          REJECT / DIRECT / 策略选择
5  🤖️ 人工智能  📲 Telegram  📹 YouTube  🎥 Netflix  🎬 Disney+
   🎻 Spotify  📄 Twitter  👤 Facebook  📖 Reddit  🐦 Discord
   🪙 Paypal  🎮 游戏平台  🍿 国外媒体  Ⓜ️ 微软服务  🍎 苹果服务
   📽 哔哩哔哩  🍔 国内媒体  🍟 新浪微博  🌐 全球直连
6  🐟 漏网之鱼
7  区域节点组：🇭🇰 港 / 🇨🇳 台 / 🇯🇵 日 / 🇸🇬 新 / 🇰🇷 韩 / 🇺🇸 美
             / 🇬🇧 英 / 🇩🇪 德 / 🇷🇺 俄 / 🇨🇦 加 / 🇮🇳 印
```

区域组按**节点名正则**动态匹配，订阅里没有对应节点时该组自动不创建；订阅附带的 `Traffic: xx GB` 这类流量信息行会被识别为伪节点并剔除，不参与测速。

### 规则优先级

```
1  内网网段直连         IP-CIDR 127/8、10/8、172.16/12、192.168/16 → DIRECT
2  直连白名单           config/direct-domains.txt（置顶，防止去广告规则误杀）
3  去广告               RULE-SET,anti-ad → 🛑 广告拦截
4  应用分流             33 组 yfamilys RULE-SET
5  兜底                GEOIP,CN → 🌐 全球直连；MATCH → 🐟 漏网之鱼
```

> ⚠️ 健康检查统一走 `https://www.gstatic.com/generate_204`。**不要改回 `http://`**：部分机场中继会直接断连 80 端口，日志里会刷 `failed to get the second response ... use of closed network connection` 的假失败。

## 导入

> 🔒 **本仓库是私有仓库**。私有仓库不能用 raw / jsDelivr 匿名拉取，所以不要填 `raw.githubusercontent.com` 或
> `cdn.jsdelivr.net` 地址（会 404）。用下面的本地脚本方式。

### 方式一：本地脚本（推荐）

```bash
# 构建 + 同步到 FlClash 脚本目录
cd ~/workspace/mihomo-config-kit && node scripts/build.js
cp dist/mihomo-config.js \
   "$HOME/Library/Application Support/com.follow.clash/scripts/376298876295974912.js"
```

然后在 FlClash 里：覆写 / 脚本 → 选中该本地脚本并启用 → 重新应用配置。

### 方式二：带 token 的 raw 地址（多设备时用）

把 PAT（classic，`repo` scope）拼进地址，FlClash 里可直接远程拉取：

```text
https://<你的PAT>@raw.githubusercontent.com/zhizhi2213/mihomo-config-kit/main/dist/mihomo-config.js
```

⚠️ token 会明文存在客户端配置里，且等于给了整个账号的读权限。仅在自己设备上用，别分享这条地址。
更安全的替代是把 `dist/mihomo-config.js` 手动拷到目标设备。

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
| `APP_GROUPS` | 应用分流组，`style` 决定可选项：`proxy` / `direct` / `bilibili` / `final` / `fixed` |
| `RULESETS` | 分流规则文件 → 代理组映射，数组顺序即 `RULE-SET` 顺序 |
| `PROBE_URL` | 健康检查地址（必须 HTTPS） |
| `FAKE_IP_FILTER` | fake-ip 例外域名 |

### 构建

```bash
node scripts/build.js
```

生成 `dist/mihomo-config.js`，并做一轮沙箱自检：DNS / Sniffer 是否设置、分组顺序、区域匹配、伪节点剔除、规则目标是否存在、组是否自引用、`proxy-providers` 形态是否兼容。

想再做一层内核校验，可以拿真实订阅跑一遍再交给 mihomo：

```bash
mihomo -t -d <包含 GEOIP.metadb 的目录> -f config.yaml
```

## 目录结构

```
config/direct-domains.txt   直连白名单（置顶规则）
scripts/build.js            构建脚本：数据 + 运行时模板 + 自检
dist/mihomo-config.js       构建产物（客户端导入的就是它）
```

## 说明

- 产物只包含规则与分组逻辑，不含节点、订阅地址、密码等敏感信息，可以公开分享
- 客户端若自行生成含订阅信息的 `config.yaml`，那属于本地文件，不要提交到仓库
