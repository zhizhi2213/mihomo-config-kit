# AI 接手操作指南

> 这份文档是写给**后续接手本仓库的 AI 会话**（或任何新模型）看的。目标：不看历史对话，只读本文件，就能安全地改配置、验证、发布，且不重犯已经踩过的坑。
>
> 人也可以读，但语气和结构是按「给 agent 执行」写的。可以直接把本文件内容作为任务上下文粘贴给任何模型。

---

## 0. 三十秒看懂

- **这是什么**：一份自持的 Mihomo 覆写脚本生成器。`scripts/build.js` 生成 `dist/mihomo-config.js`，客户端（FlClash / Clash Party / Clash Meta）把这个脚本当「覆写 / Override」加载后，会在用户订阅配置的基础上**重建** DNS(fake-ip) / Sniffer / 代理组 / rule-providers / rules。
- **产物不含节点**：节点来自用户自己的订阅，产物只是「改造订阅的剧本」。所以产物可以公开，但**订阅链接、节点密码、机场域名绝不能进仓库**。
- **项目与上游无关**：早期是 IvanSolis1989/Smart-Config-Kit 的补丁版，现已完全自研，不要再去拉任何上游脚本。
- **仓库**：`zhizhi2213/mihomo-config-kit`（公开，仅含规则与构建脚本）。

**如果只记住 5 条**：

1. 任何改动后必须 `node scripts/build.js`，自检不过就是没改完。
2. 探测地址必须 `https://`，改回 `http://` 会刷 `use of closed network connection` 假失败。
3. 规则/组的引用关系靠构建自检兜底，不要靠肉眼。
4. 产物里不能写时间戳（会破坏可复现构建，CI 会疯狂产生空提交）。
5. 改完要同步到本机 FlClash 的脚本文件，否则用户看不到效果。

---

## 1. 环境与快速上手

```bash
cd ~/workspace/mihomo-config-kit

node scripts/build.js            # 生成 + 自检（唯一必须掌握的命令）
```

成功输出形如：

```
✓ 已生成 dist/mihomo-config.js（18.4 KB）
  分组 28 个 / 规则 68 条 / 规则源 35 个
  自检通过：DNS / Sniffer / 分组顺序 / 区域匹配 / 伪节点剔除 / 规则引用 / provider 模式
```

环境要求：Node.js ≥ 18（CI 用 20）；`mihomo` 内核在 `/opt/homebrew/bin/mihomo`（本机已装，用于内核级校验）。

---

## 2. 文件地图：改什么去哪里

| 文件 | 职责 | 什么时候动它 |
|---|---|---|
| `config/direct-domains.txt` | 置顶直连白名单（数据文件，23 条） | 某个 App 的域名被 `ai-global.rule` 判进了国外 AI 代理组 |
| `scripts/build.js` 顶部数据区 | 区域正则、应用分组、规则源、DNS、探测地址 | 改分组结构、加区域、换规则源 |
| `scripts/build.js` 中段 `RUNTIME` 模板 | 运行时逻辑（真正跑在客户端里的代码） | 改运行时行为（极少需要） |
| `dist/mihomo-config.js` | **构建产物，不要手改**，由构建覆盖 | 只读，用于对比/排障 |
| `.github/workflows/build.yml` | CI：push 或每周一 04:00 重建并回提交 `dist/mihomo-config.js` | 改触发条件 |

`scripts/build.js` 里的关键常量（按名字搜，别按行号，行号会漂）：

| 常量 | 作用 |
|---|---|
| `PRIVATE_CIDRS` | 置顶内网直连网段（127/8、10/8、172.16/12、192.168/16） |
| `PROBE_URL` | 健康检查地址，**必须 HTTPS** |
| `INFO_NODE_RE` | 伪节点正则（Traffic / 流量 / 到期 …），建组前剔除 |
| `FAKE_IP_FILTER` | fake-ip 例外域名（局域网发现、游戏联机、Captive Portal） |
| `G` | 代理组名唯一数据源，改名前先改这里 |
| `REGION_GROUPS` | 区域 url-test 组：`include` / `exclude` 是 JS 正则 |
| `APP_GROUPS` | 应用分流组，`style` 决定可选项来源 |
| `RULE_BASE` / `COMMUNITY_FAKEIP_FILTER_URL` | yfamilys 分流源地址 / 社区 fake-ip 清单地址（v1.4.0 起已无 `ANTI_AD_URL`） |
| `RULESETS` | 规则源 → 目标组映射（顺序即规则优先级） |

---

## 3. 标准操作流程（改任何东西都走这 6 步）

```bash
# 1) 改文件（白名单 / build.js 数据区）

# 2) 构建 + 自检（必须綠）
node scripts/build.js

# 3) 抽查产物结构（可选，但改了分组/规则就该看）
node -e '
const fs=require("fs"),vm=require("vm");
const raw=fs.readFileSync("dist/mihomo-config.js","utf8");
const mk=n=>({name:n,server:"x",port:443,type:"ss",cipher:"aes-128-gcm",password:"x"});
const sb={console:{log(){},error(){},warn(){}}};vm.createContext(sb);vm.runInContext(raw,sb);
const out=sb.main({proxies:[mk("🇭🇰 香港 IEPL 01"),mk("美国 Los Angeles 01"),mk("Traffic: 1 GB | 10 GB")],"proxy-groups":[],rules:[]});
out["proxy-groups"].forEach((g,i)=>console.log(String(i+1).padStart(2),g.type.padEnd(8),g.name));
console.log("规则",out.rules.length,"| 首条",out.rules[0]);
'

# 4) 同步到本机 FlClash（这一步不做，用户永远看不到效果）
cp dist/mihomo-config.js \
   "$HOME/Library/Application Support/com.follow.clash/scripts/376298876295974912.js"

# 5) 提交（只提交源码与产物，不要提交订阅/密码）
git add -A && git commit -m "..." && git push origin main

# 6) 确认 CI（push 会触发 build.yml）
gh run list --limit 1
```

然后**告诉用户：在 FlClash 里重新应用一次覆写**。分组名变了的话，用户之前的手动选择会重置。

---

## 4. 内核级校验（改动影响规则/分组结构时做）

自检是沙箱断言，能挡住 90% 的低级错误；剩下的靠真实订阅 + `mihomo -t`。

```bash
mkdir -p /tmp/mihomo-verify && cd /tmp/mihomo-verify
npm i js-yaml --silent --no-fund --no-audit

cat > run.js <<'EOF'
const fs=require("fs"), vm=require("vm");
const yaml=require("/tmp/mihomo-verify/node_modules/js-yaml");
const script=fs.readFileSync(process.env.HOME+"/workspace/mihomo-config-kit/dist/mihomo-config.js","utf8");
const profile=fs.readFileSync(process.env.HOME+"/Library/Application Support/com.follow.clash/profiles/375849039972798464.yaml","utf8");
const sb={console:{log(){},error(){},warn(){}}};
vm.createContext(sb); vm.runInContext(script,sb);
const input=yaml.load(profile);
console.log("订阅节点数:",(input.proxies||[]).length);
const out=sb.main(input);
// 跨 realm 对象必须转成纯 JSON，否则 js-yaml 类型判断会失败
fs.writeFileSync("/tmp/mihomo-verify/config.yaml", yaml.dump(JSON.parse(JSON.stringify(out)),{lineWidth:4096}));
console.log("组",out["proxy-groups"].length,"| 规则",out.rules.length,"| 规则源",Object.keys(out["rule-providers"]).length);
EOF

node run.js

# GEOIP/GEOSITE 数据库从 FlClash 目录复制，否则 GEOIP,CN 规则会报错
cp "$HOME/Library/Application Support/com.follow.clash/"{GEOIP.metadb,GEOSITE.dat,ASN.mmdb} . 2>/dev/null
/opt/homebrew/bin/mihomo -t -d /tmp/mihomo-verify -f /tmp/mihomo-verify/config.yaml
```

判据：最后一行是 `test is successful`。订阅 profile 文件名可能变（FlClash 重新订阅后会换 id），失效时去 `profiles/` 里找最新的 `*.yaml`。

---

## 5. 硬约束（违反就会出 bug，且不一定报错）

| 约束 | 原因 / 症状 |
|---|---|
| **探测地址必须 HTTPS** | 部分机场 IEPL 中继直接断连 80 端口 → 日志刷 `failed to get the second response ... use of closed network connection`（假失败，节点其实好的） |
| **注入的 IIFE 必须有前导分号** | 上游遗留的经验：无分号风格下 `foo(...)` 后接 `(function(){})()` 会被 ASI 解析成函数调用链，异常还会被 `try/catch` 吞掉 → 补丁静默失效 |
| **代理组不得自引用** | `🚀 策略选择` 的选项列表里不能再出现自己，Clash 会报错或行为异常。自检已覆盖 |
| **url-test 组不能含伪节点** | 订阅里的 `Traffic: 32.71 GB | 150 GB` 这类信息行被当成节点测速，必然失败刷屏。`INFO_NODE_RE` 负责剔除，自检会断言 |
| **产物不得写时间戳** | 破坏可复现构建：同一源码每次产物不同 → CI 每轮都产生只改时间戳的 bot 提交 |
| **区域组排在应用组之后** | 用户明确要求面板顺序：策略 → 自动/手动 → 应用分流 → 漏网之鱼 → 区域节点组（v1.4.0 起已无广告拦截组）。自检会断言 |
| **yfamilys 分流源必须是 `behavior: classical` + `format: yaml`** | yfamilys 的 `.rule` 文件是 `payload:` 列表格式；mrs（二进制 succinct-trie）无法用文本方式校验，排障时极难定位。唯一例外是社区 fake-ip 清单（`behavior: domain` + `format: mrs`），它只供 DNS 查询、不产出 `RULE-SET` |
| **本项目不含去广告规则集** | v1.4.0 起移除 anti-AD：其 payload 是 `+.域名` 的 domain 格式，用 `classical` 加载会逐条刷 `parse classical rule ... error`、实际大面积失效。要恢复请改接 `behavior: domain` 的源，别用旧写法 |
| **`skip-domain` 只放合法域名表达式** | 内核按域名模式匹配；社区脚本里的 `"Mijia Cloud"` 带空格、不是域名，只在 SNI 恰好等于该串时（米家设备）才精确命中，常规域名永不命中。主线 v1.4.1 已移除，自检会拦截非域名条目 |
| **产物 `MIHOMO_KIT.G` 只放运行时引用的键** | 其余组名在构建期已固化进 `appGroups` / `rulesets`，多打包就是死数据；自检比对 `D.G.*` 引用与打包键，新增引用忘了补会直接构建失败 |
| **`.github/workflows/` 需要 `workflow` scope** | OAuth token 默认没有，push 会被拒：`refusing to allow an OAuth App to create or update workflow`。解法：`gh auth refresh -s workflow` |
| **绝不提交凭据** | 订阅 URL（含 token）、节点密码、机场域名一律不进仓库。仓库是公开的 |

---

## 6. 排障决策树

**症状：某个 App 的图片/静态资源加载不出来**

1. 先在 FlClash 日志里找该域名的命中行，看是不是 `RuleSet(...) → REJECT` 或 `→ 某代理组`。
2. 下载实际规则源做整域比对（不要 grep mrs 二进制，那是 succinct-trie 编码，grep 不到）：

```bash
cd /tmp && curl -sSL -o ai-global.rule \
  https://yfamilys.com/rule/ai-global.rule
grep -iE "你的域名" ai-global.rule                # 先看最可能误判的国外 AI 源

# 其它 yfamilys 规则按需下载（key 见 scripts/build.js 的 RULESETS）
curl -sSL -o Proxy.rule https://yfamilys.com/rule/Proxy.rule
grep -iE "你的域名" Proxy.rule
```

3. 确认是「整域命中」才加白名单。子域命中（如 `+.opt.doubao.com`）通常只是遥测/统计域，**不要把整个域直连**，否则会牺牲分流精度。

**症状：日志刷 `use of closed network connection`**

→ 是健康检查失败，不是节点坏了。检查 `PROBE_URL` 是否被改回 `http://`；确认伪节点已剔除。个别节点持续报错属机场侧问题，url-test 会自动避开它，不影响使用。

**症状：客户端提示配置无效 / 加载后没变化**

→ 常见三种：① 规则目标组名拼错（自检会抓）；② 组自引用；③ 用户在客户端里没重新「应用」覆写 —— 脚本是加载时执行的，不重新应用就不生效。

**症状：分组顺序或名字不对**

→ `G` 常量是唯一数据源；`APP_GROUPS` 数组顺序决定面板顺序；区域组固定拼在末尾（`groups.concat(regionGroups)`）。

**症状：CI 红了**

→ 看 `gh run view <id> --log-failed`。历史上有两类：路径不存在（`git add` 了已删除的目录）、工作流文件因 scope 推不上去导致线上还是旧版本。

---

## 7. 白名单为什么必须保留（v1.4.0 起）

v1.4.0 移除 anti-AD 后，**置顶白名单 `config/direct-domains.txt` 仍然不能删**，理由从「防去广告误杀」换成了「防国外 AI 组误收」：

| 域名 | 现状 | 结论 |
|---|---|---|
| `doubao.com` / `bytedance.com` / `zijieapi.com` / `bytednsdoc.com` 等字节系 | yfamilys `ai-global.rule` 含这些整域条目 → 🌍 国外 AI（代理组） | 必须靠白名单置顶按住直连，否则国内 CDN 走代理会加载失败 |
| `ctobsnssdk.com` / 钉钉三域 | 埋点域、静态资源域走代理时页面功能异常 | 保持直连 |

`ai-global.rule` 每日更新，今天没收录不代表明天没有，清单里其余条目作为保险保留。想收紧（只放行业务子域）就删对应白名单条目，不用改代码。

---

## 8. 规则优先级（改动前必须理解）

```
1  IP-CIDR 内网四段 + GEOSITE,private + GEOIP,private,no-resolve → DIRECT
2  AND,((DST-PORT,123),(NETWORK,udp)) → DIRECT（NTP，早于所有 RULE-SET）
3  config/direct-domains.txt 白名单 → DIRECT / REJECT（逐条，置顶）
4  DOMAIN-SUFFIX,googleapis.cn → 🚀 策略选择（Google Play 下载例外）
5  RULESETS 34 组 → 各应用组（ai-cn / ai-global / Microsoft / Apple / … / ASN-CN）
6  GEOIP,CN,no-resolve → 🌐 全球直连（按 IP）；GEOSITE,cn → 🌐 全球直连（按域名）
7  MATCH → 🐟 漏网之鱼
```

**先匹配先生效**：想让某个域名强制直连，唯一入口是第 3 层白名单（置顶，早于所有 `RULE-SET`）。想让某个域名强制走代理且不被国内兜底捞回，要插在 `GEOSITE,cn` 之前——`googleapis.cn` 就是这么做的。

---

## 9. 不要做的事（前人踩过）

- ❌ 不要再去拉 Smart-Config-Kit 或其他上游脚本当底座（已彻底自研，拉回来就退化）。
- ❌ 不要用 `grep` 去读 `.mrs` 规则集缓存（二进制，读不出东西，会让你误判「规则里没有」）。
- ❌ 不要手改 `dist/mihomo-config.js`（下次构建就没了，还会与 `scripts/build.js` 不一致）。
- ❌ 不要为了「让日志安静」而调大 `timeout`/关掉健康检查 —— 真正的失败信息会被一起埋掉。
- ❌ 不要在仓库里放订阅链接做示例（连占位符都用 `https://example.com/sub`）。
- ❌ 不要因为「分组面板太多」就删区域组 —— 区域组是干活的（url-test 选最快节点），应用组才是给用户点的。

---

## 10. 需要人来做的事

- **重新应用覆写**：改完只能由用户在客户端里点一次，agent 无法代劳。
- **`gh auth refresh -s workflow`**：一旦要改 `.github/workflows/`，token 需要有该 scope，需用户授权。
- **判断「值不值得加白名单」**：涉及「直连 vs 代理」的取舍，最后由用户决定。
