# Smart-Config-Kit Custom (Mihomo / FlClash / Clash Party 本地 Hosts 增强版)

基于上游 [IvanSolis1989/Smart-Config-Kit](https://github.com/IvanSolis1989/Smart-Config-Kit)，通过 GitHub Actions 每日自动同步上游最新脚本，在 **100% 保留上游原有节点适配与 DNS 架构**的基础上，自动注入**本地 Hosts 与内网开发直连通用补丁**：

- **开启系统 Hosts**：设置 `dns.use-system-hosts = true`，支持使用 SwitchHosts 或修改本地 `/etc/hosts` 实时切换任意开发/测试环境域名。
- **置顶内网网段直连规则**：在分流规则最顶部插入私有内网网段（`127.0.0.0/8`、`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`，不带 `no-resolve`）`DIRECT` 直连规则，任何在 `/etc/hosts` 中指向内网 IP 的域名均可自动触发本地解析并直连。
- **豁免内网目标 IP 嗅探**：将上述内网网段加入 `sniffer.skip-dst-address`，防止已解析为内网 IP 的流量被 Sniffer 重新还原为域名。
- **置顶自定义直连域名**：读取 [`config/direct-domains.txt`](./config/direct-domains.txt)，把清单里的域名规则插到**所有 RULE-SET 之前**，用于修复上游规则集误杀（如 `scki-fused-010-ad-domain` 把 `doubao.com` 判为广告）或图片 CDN 走代理加载失败的问题。

### 维护直连域名清单

改 [`config/direct-domains.txt`](./config/direct-domains.txt) 即可，无需动代码，支持三种写法：

```text
doubao.com                                   # 简写，自动补成 DOMAIN-SUFFIX,doubao.com,DIRECT
DOMAIN-KEYWORD,p3-pack.byteimg.com,REJECT    # 完整规则行，原样使用
# 井号开头为注释
```

提交后 GitHub Actions 会自动重建 `dist/` 与 `Mihomo内核系/` 下的全部产物；本地可用
`node scripts/build.js` 手动重建（构建时会自动校验清单是否被正确置顶）。

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
