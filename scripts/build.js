#!/usr/bin/env node
/**
 * 自动拉取 IvanSolis1989/Smart-Config-Kit 上游 Mihomo 覆写脚本并注入自定义补丁。
 *
 * 补丁体系（自上游"融合规则集"迁移到 yfamilys 分流方案，参考
 * https://yfamilys.com/config/shadowrocket_basic.conf 的分组与分流设计）：
 * 1. 保留上游的 DNS 架构、节点适配（只取其内核兼容性处理，不再使用其融合规则集）
 * 2. 开启 config.dns["use-system-hosts"] = true，支持本地 /etc/hosts (如 SwitchHosts) 实时切换环境
 * 3. 将内网网段加入 sniffer["skip-dst-address"]，防止本地 hosts 解析出的内网 IP 被 Sniffer 还原成域名
 * 4. 重建代理组：♻️ 自动选择 / 👐 手动选择 / 区域 url-test 组（按节点名正则自动匹配，
 *    无匹配节点的区域自动省略）/ 🛑 广告拦截 / 各应用 select 组
 * 5. 重建 rule-providers：anti-AD 去广告 + yfamilys 全套分流规则（.rule 为 mihomo 兼容 yaml payload）
 * 6. 重建 rules：内网直连 → config/direct-domains.txt 白名单置顶 → 去广告 → 分流 → GEOIP,CN 兜底 → 漏网之鱼
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const UPSTREAM_BASE = "https://raw.githubusercontent.com/IvanSolis1989/Smart-Config-Kit/main";

const PRIVATE_CIDRS = [
  "127.0.0.0/8",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
];

// 直连域名清单：外置为纯文本，按行维护，无需改代码
const DIRECT_DOMAINS_FILE = path.resolve(__dirname, "..", "config", "direct-domains.txt");

// 健康检查探测地址：必须走 HTTPS，部分机场中继对 80 端口直接断连，
// 会刷出 "use of closed network connection" 的假失败（上游同款地址）
const PROBE_URL = "https://www.gstatic.com/generate_204";

// 订阅里常见的"伪节点"（流量/到期信息行），参与测速必然失败，建组时剔除
const INFO_NODE_RE = "^(Traffic|traffic|流量|剩余|到期|过期|Expire|expire|套餐|官网|重置|距离下次|套餐到期|已用)";

// ---------- 代理组名（唯一数据源，避免散落各处拼写不一致） ----------
const G = {
  strategy: "🚀 策略选择",
  auto: "♻️ 自动选择",
  manual: "👐 手动选择",
  adblock: "🛑 广告拦截",
  ai: "🤖️ 人工智能",
  telegram: "📲 Telegram",
  youtube: "📹 YouTube",
  netflix: "🎥 Netflix",
  disney: "🎬 Disney+",
  spotify: "🎻 Spotify",
  twitter: "📄 Twitter",
  facebook: "👤 Facebook",
  reddit: "📖 Reddit",
  discord: "🐦 Discord",
  paypal: "🪙 Paypal",
  game: "🎮 游戏平台",
  foreignMedia: "🍿 国外媒体",
  microsoft: "Ⓜ️ 微软服务",
  apple: "🍎 苹果服务",
  bilibili: "📽 哔哩哔哩",
  cnMedia: "🍔 国内媒体",
  weibo: "🍟 新浪微博",
  direct: "🌐 全球直连",
  final: "🐟 漏网之鱼",
  hk: "🇭🇰 香港节点",
  tw: "🇨🇳 台湾节点",
};

// ---------- 区域节点组（JS 正则，忽略大小写；无匹配节点的区域自动省略） ----------
const REGION_GROUPS = [
  { name: G.hk, include: "港|hk|hong ?kong", exclude: "美|us|台|tw|日|jp|新加坡|sg|韩|kr" },
  { name: G.tw, include: "台|tw|taiwan", exclude: "" },
  { name: "🇯🇵 日本节点", include: "日|jp|japan|东京|大阪|tokyo|osaka", exclude: "" },
  { name: "🇸🇬 新加坡节点", include: "新加坡|狮城|sg|singapore", exclude: "" },
  { name: "🇰🇷 韩国节点", include: "韩|kr|korea|首尔|seoul", exclude: "" },
  {
    name: "🇺🇸 美国节点",
    include: "美|us|united ?states|america|洛杉矶|圣何塞|西雅图|凤凰城|los ?angeles|seattle|san ?jose",
    exclude: "俄罗斯|russia|新加坡|singapore|韩国|korea|台湾|taiwan|香港|hong ?kong|日本|japan",
  },
  { name: "🇬🇧 英国节点", include: "英|uk|伦敦|london|manchester|曼彻斯特", exclude: "乌克兰|ukraine" },
  { name: "🇩🇪 德国节点", include: "德|germany|柏林|慕尼黑|法兰克福|frankfurt", exclude: "" },
  { name: "🇷🇺 俄罗斯节点", include: "俄|russia|莫斯科|moscow|圣彼得堡", exclude: "" },
  { name: "🇨🇦 加拿大节点", include: "加拿大|canada|多伦多|温哥华|toronto|vancouver", exclude: "" },
  { name: "🇮🇳 印度节点", include: "印度|india|孟买|mumbai|新德里|delhi", exclude: "" },
];

// ---------- 应用分流组（style 决定可选项，运行时按实际存在的区域组动态生成） ----------
const APP_GROUPS = [
  { name: G.adblock, style: "fixed", proxies: ["REJECT", "DIRECT", G.strategy] },
  { name: G.ai, style: "proxy" },
  { name: G.telegram, style: "proxy" },
  { name: G.youtube, style: "proxy" },
  { name: G.netflix, style: "proxy" },
  { name: G.disney, style: "proxy" },
  { name: G.spotify, style: "proxy" },
  { name: G.twitter, style: "proxy" },
  { name: G.facebook, style: "proxy" },
  { name: G.reddit, style: "proxy" },
  { name: G.discord, style: "proxy" },
  { name: G.paypal, style: "proxy" },
  { name: G.game, style: "proxy" },
  { name: G.foreignMedia, style: "proxy" },
  { name: G.microsoft, style: "direct" },
  { name: G.apple, style: "direct" },
  { name: G.bilibili, style: "bilibili" },
  { name: G.cnMedia, style: "direct" },
  { name: G.weibo, style: "direct" },
  { name: G.direct, style: "direct" },
  { name: G.final, style: "final" },
];

// ---------- yfamilys 分流规则源（key = 规则文件名，也是 rule-provider 名） ----------
// 参考 yfamilys.com/config/shadowrocket_basic.conf 的 [Rule] 顺序
const YFAMILYS_RULE_BASE = "https://yfamilys.com/rule";
const ANTI_AD_URL =
  "https://raw.githubusercontent.com/privacy-protection-tools/anti-AD/master/anti-ad-clash.yaml";

const RULESETS = [
  ["ai", G.ai],
  ["Microsoft", G.microsoft],
  ["Apple", G.apple],
  ["AppStore", G.apple],
  ["AppleProxy", G.strategy],
  ["Telegram", G.telegram],
  ["Weibo", G.weibo],
  ["WeChat", G.direct],
  ["Twitter", G.twitter],
  ["PlayStation", G.game],
  ["Epic", G.game],
  ["Sony", G.game],
  ["Steam", G.game],
  ["Nintendo", G.game],
  ["WanMeiShiJie", G.game],
  ["Blizzard", G.game],
  ["Spotify", G.spotify],
  ["PayPal", G.paypal],
  ["Facebook", G.facebook],
  ["Reddit", G.reddit],
  ["Discord", G.discord],
  ["YouTube", G.youtube],
  ["YouTubeMusic", G.youtube],
  ["Netflix", G.netflix],
  ["Disney", G.disney],
  ["BiliBili", G.bilibili],
  ["ChinaMedia", G.cnMedia],
  ["ProxyMedia", G.foreignMedia],
  ["Twitch", G.strategy],
  ["Douyu", G.direct],
  ["Google", G.strategy],
  ["Proxy", G.strategy],
  ["ASN-CN", G.direct],
];

const TARGETS = [
  {
    name: "FlClash (标准 Mihomo 内核)",
    upstreamPath: "Mihomo内核系/FlClash/FlClash(mihomo).js",
    outputPaths: [
      "Mihomo内核系/FlClash/FlClash(mihomo).js",
      "dist/FlClash.js",
      "dist/FlClash-Generic.js",
    ],
  },
  {
    name: "Clash Party (标准 Mihomo 内核)",
    upstreamPath: "Mihomo内核系/Clash Party/ClashParty(mihomo).js",
    outputPaths: [
      "Mihomo内核系/Clash Party/ClashParty(mihomo).js",
      "dist/ClashParty.js",
      "dist/ClashParty-Generic.js",
    ],
  },
  {
    name: "Clash Party (Mihomo Smart 内核)",
    upstreamPath: "Mihomo内核系/Clash Party/ClashParty(mihomo-smart).js",
    outputPaths: [
      "Mihomo内核系/Clash Party/ClashParty(mihomo-smart).js",
      "dist/ClashParty-Smart.js",
      "dist/ClashParty-Smart-Generic.js",
    ],
  },
];

function fetchUrl(url) {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || "";
  const args = ["-sSL", "--retry", "3", "--connect-timeout", "15"];
  if (proxy) {
    args.push("-x", proxy);
  }
  args.push(url);
  return execFileSync("curl", args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}

function loadDirectRules() {
  if (!fs.existsSync(DIRECT_DOMAINS_FILE)) {
    throw new Error(`未找到直连域名清单: ${DIRECT_DOMAINS_FILE}`);
  }

  const seen = new Set();
  const rules = [];

  fs.readFileSync(DIRECT_DOMAINS_FILE, "utf8")
    .split(/\r?\n/)
    .forEach((rawLine, idx) => {
      const line = rawLine.replace(/\s+#.*$/, "").trim();
      if (!line || line.startsWith("#")) return;

      // 含逗号视为完整规则行（如 DOMAIN-KEYWORD,xxx,REJECT），否则按域名简写补全
      const rule = line.includes(",") ? line : `DOMAIN-SUFFIX,${line},DIRECT`;

      if (seen.has(rule)) {
        console.warn(`  ⚠ 清单第 ${idx + 1} 行重复，已跳过: ${rule}`);
        return;
      }
      seen.add(rule);
      rules.push(rule);
    });

  if (rules.length === 0) {
    throw new Error(`直连域名清单为空: ${DIRECT_DOMAINS_FILE}`);
  }
  return rules;
}

/**
 * 生成注入到上游脚本 main() 内（sortProxyGroups(config) 之后）的运行时补丁。
 * 运行时基于订阅实际节点名动态匹配区域组，因此产物脚本对任何机场通用。
 */
function buildPatchSnippet() {
  const payload = {
    privateCidrs: PRIVATE_CIDRS,
    directRules: loadDirectRules(),
    regions: REGION_GROUPS,
    appGroups: APP_GROUPS,
    rulesets: RULESETS.map(([key, target]) => ({ key, target })),
    G,
    ruleBase: YFAMILYS_RULE_BASE,
    antiAdUrl: ANTI_AD_URL,
    probeUrl: PROBE_URL,
    infoNodeRe: INFO_NODE_RE,
  };

  return `
    // === [Custom Patch] Local Hosts + 内网直连 + yfamilys 分流/去广告（数据由 scripts/build.js 注入） ===
    // 注意：上游为无分号风格，前导分号防止 ASI 把 IIFE 解析成上一条语句的函数调用
    ;(function () {
      var D = ${JSON.stringify(payload, null, 6)};
      var cfg = config;

      // --- 1. 开启本地 Hosts 与内网嗅探豁免 ---
      if (cfg.dns) {
        cfg.dns["use-system-hosts"] = true;
      }
      if (cfg.sniffer) {
        if (!Array.isArray(cfg.sniffer["skip-dst-address"])) {
          cfg.sniffer["skip-dst-address"] = [];
        }
        D.privateCidrs.forEach(function (c) {
          if (cfg.sniffer["skip-dst-address"].indexOf(c) === -1) {
            cfg.sniffer["skip-dst-address"].push(c);
          }
        });
      }

      // --- 2. 按节点名匹配区域组（先剔除流量/到期信息伪节点） ---
      var infoRe = new RegExp(D.infoNodeRe, "i");
      var names = (cfg.proxies || [])
        .map(function (p) { return p.name; })
        .filter(function (n) { return !infoRe.test(n); });
      function match(include, exclude) {
        var re = new RegExp(include, "i");
        var neg = exclude ? new RegExp(exclude, "i") : null;
        return names.filter(function (n) { return re.test(n) && !(neg && neg.test(n)); });
      }
      var regionNames = [];
      var regionGroups = [];
      D.regions.forEach(function (r) {
        var matched = match(r.include, r.exclude);
        if (!matched.length) return;
        regionNames.push(r.name);
        regionGroups.push({
          name: r.name,
          type: "url-test",
          url: D.probeUrl,
          interval: 600,
          tolerance: 50,
          timeout: 5000,
          lazy: true,
          proxies: matched
        });
      });

      var nodeNames = names.length ? names.slice() : ["DIRECT"];
      var strategyOptions = [D.G.auto, D.G.manual].concat(regionNames, ["DIRECT"]);
      var proxyOptions = [D.G.strategy, D.G.auto, D.G.manual].concat(regionNames, ["DIRECT"]);
      var directOptions = ["DIRECT", D.G.strategy];
      var bilibiliOptions = ["DIRECT", D.G.strategy].concat(
        regionGroups
          .filter(function (g) { return g.name === D.G.hk || g.name === D.G.tw; })
          .map(function (g) { return g.name; })
      );

      // --- 3. 重建代理组（整体替换上游融合分组） ---
      var groups = [
        { name: D.G.strategy, type: "select", proxies: strategyOptions },
        { name: D.G.auto, type: "url-test", url: D.probeUrl, interval: 600, tolerance: 50, timeout: 5000, lazy: true, proxies: nodeNames },
        { name: D.G.manual, type: "select", proxies: nodeNames }
      ].concat(regionGroups);
      D.appGroups.forEach(function (a) {
        if (a.style === "proxy") groups.push({ name: a.name, type: "select", proxies: proxyOptions });
        else if (a.style === "direct") groups.push({ name: a.name, type: "select", proxies: directOptions });
        else if (a.style === "bilibili") groups.push({ name: a.name, type: "select", proxies: bilibiliOptions });
        else if (a.style === "final") groups.push({ name: a.name, type: "select", proxies: [D.G.strategy, "DIRECT"] });
        else groups.push({ name: a.name, type: "select", proxies: a.proxies });
      });
      cfg["proxy-groups"] = groups;

      // --- 4. 重建规则源：anti-AD 去广告 + yfamilys 全套分流 ---
      var rp = {
        "anti-ad": {
          type: "http",
          behavior: "classical",
          format: "yaml",
          url: D.antiAdUrl,
          path: "./providers/rules/anti-ad.yaml",
          interval: 86400
        }
      };
      D.rulesets.forEach(function (rs) {
        rp[rs.key] = {
          type: "http",
          behavior: "classical",
          format: "yaml",
          url: D.ruleBase + "/" + rs.key + ".rule",
          path: "./providers/rules/" + rs.key + ".yaml",
          interval: 86400
        };
      });
      cfg["rule-providers"] = rp;

      // --- 5. 重建规则：内网直连 → 白名单置顶 → 去广告 → 分流 → 兜底 ---
      var rules = [];
      D.privateCidrs.forEach(function (c) { rules.push("IP-CIDR," + c + ",DIRECT"); });
      D.directRules.forEach(function (r) { rules.push(r); });
      rules.push("RULE-SET,anti-ad," + D.G.adblock);
      D.rulesets.forEach(function (rs) { rules.push("RULE-SET," + rs.key + "," + rs.target); });
      rules.push("GEOIP,CN," + D.G.direct);
      rules.push("MATCH," + D.G.final);
      cfg.rules = rules;
    })();
    // === [Custom Patch End] ===`;
}

function applyPatches(rawContent, targetName) {
  const sortAnchor = "    sortProxyGroups(config)";
  if (!rawContent.includes(sortAnchor)) {
    throw new Error(`[${targetName}] 未找到 sortProxyGroups(config) 锚点`);
  }
  return rawContent.replace(sortAnchor, sortAnchor + "\n" + buildPatchSnippet());
}

const BUILTIN_TARGETS = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"]);

function verifyPatchedScript(code, targetName) {
  const sandbox = { console: { log() {}, error() {}, warn() {} } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  // 覆盖多个区域的假节点，验证区域组动态匹配逻辑
  const mockConfig = {
    proxies: [
      { name: "🇭🇰 香港 IEPL 01", server: "hk.example.com", port: 10013, type: "ss", cipher: "aes-128-gcm", password: "123" },
      { name: "美国 Los Angeles 01", server: "us.example.com", port: 10014, type: "ss", cipher: "aes-128-gcm", password: "123" },
      { name: "日本 Tokyo 01", server: "jp.example.com", port: 10015, type: "ss", cipher: "aes-128-gcm", password: "123" },
      { name: "新加坡 SG 01", server: "sg.example.com", port: 10016, type: "ss", cipher: "aes-128-gcm", password: "123" },
      { name: "台湾 TW 01", server: "tw.example.com", port: 10017, type: "ss", cipher: "aes-128-gcm", password: "123" },
      { name: "Traffic: 32.71 GB | 150 GB", server: "info.example.com", port: 1, type: "ss", cipher: "aes-128-gcm", password: "123" },
    ],
    "proxy-groups": [],
    rules: [],
  };

  const out = sandbox.main(mockConfig);

  // --- DNS / 嗅探补丁 ---
  if (!out.dns || out.dns["use-system-hosts"] !== true) {
    throw new Error(`[${targetName}] 校验失败：use-system-hosts 未开启`);
  }

  // --- 规则结构 ---
  const rules = out.rules || [];
  if (rules[0] !== "IP-CIDR,127.0.0.0/8,DIRECT") {
    throw new Error(`[${targetName}] 校验失败：首条规则应为内网直连，实际为 ${rules[0]}`);
  }
  const expectedDomainRules = loadDirectRules();
  const missingRules = expectedDomainRules.filter((r) => !rules.includes(r));
  if (missingRules.length > 0) {
    throw new Error(`[${targetName}] 校验失败：直连域名规则未注入 -> ${missingRules.slice(0, 3).join(" | ")}`);
  }
  const domainRulesPos = rules.indexOf(expectedDomainRules[0]);
  if (domainRulesPos !== PRIVATE_CIDRS.length) {
    throw new Error(`[${targetName}] 校验失败：直连域名规则未紧跟内网规则置顶，位置 ${domainRulesPos}`);
  }
  if (!rules.includes("RULE-SET,anti-ad,🛑 广告拦截")) {
    throw new Error(`[${targetName}] 校验失败：anti-AD 去广告规则未注入`);
  }
  if (!rules.includes("MATCH,🐟 漏网之鱼") || !rules.includes("GEOIP,CN,🌐 全球直连")) {
    throw new Error(`[${targetName}] 校验失败：兜底规则未注入`);
  }

  // --- 分流规则的目标组必须真实存在 ---
  const groupNames = new Set((out["proxy-groups"] || []).map((g) => g.name));  const badTargets = [];
  for (const r of rules) {
    const parts = r.split(",");
    const target = r.startsWith("MATCH") ? parts[1] : parts[parts.length - 1];
    if (!BUILTIN_TARGETS.has(target) && !groupNames.has(target)) {
      badTargets.push(`${r} -> ${target}`);
    }
  }
  if (badTargets.length > 0) {
    throw new Error(`[${targetName}] 校验失败：规则指向不存在的代理组 -> ${badTargets.slice(0, 3).join(" | ")}`);
  }

  // --- 代理组不得自引用（如 🚀 策略选择 包含自己） ---
  const selfRef = (out["proxy-groups"] || []).filter((g) => (g.proxies || []).includes(g.name));
  if (selfRef.length > 0) {
    throw new Error(`[${targetName}] 校验失败：代理组自引用 -> ${selfRef.map((g) => g.name).join(", ")}`);
  }

  // --- 区域组动态匹配 ---
  const hkGroup = (out["proxy-groups"] || []).find((g) => g.name === "🇭🇰 香港节点");
  if (!hkGroup || !hkGroup.proxies.includes("🇭🇰 香港 IEPL 01")) {
    throw new Error(`[${targetName}] 校验失败：香港区域组未正确匹配节点`);
  }

  // --- 健康检查必须走 HTTPS（80 端口探测会被部分中继断连） + 剔除信息伪节点 ---
  const urlTestGroups = (out["proxy-groups"] || []).filter((g) => g.type === "url-test");
  const badProbe = urlTestGroups.filter((g) => !/^https:\/\//.test(String(g.url)));
  if (badProbe.length > 0) {
    throw new Error(`[${targetName}] 校验失败：测速组未使用 HTTPS 探测地址 -> ${badProbe.map((g) => g.name).join(", ")}`);
  }
  const infoLeak = (out["proxy-groups"] || []).filter((g) => (g.proxies || []).some((n) => /^Traffic/i.test(n)));
  if (infoLeak.length > 0) {
    throw new Error(`[${targetName}] 校验失败：信息伪节点混入代理组 -> ${infoLeak.map((g) => g.name).join(", ")}`);
  }

  // --- rule-providers ---
  const rp = out["rule-providers"] || {};
  if (!rp["anti-ad"] || Object.keys(rp).length < RULESETS.length + 1) {
    throw new Error(`[${targetName}] 校验失败：rule-providers 数量异常（${Object.keys(rp).length}）`);
  }
  for (const [key] of RULESETS) {
    if (!rp[key] || !String(rp[key].url).endsWith(`/${key}.rule`)) {
      throw new Error(`[${targetName}] 校验失败：分流规则源缺失或 URL 错误 -> ${key}`);
    }
  }

  // --- 上游融合规则集应已不再使用 ---
  const sckiLeftover = Object.keys(rp).filter((k) => k.startsWith("scki-fused"));
  if (sckiLeftover.length > 0) {
    throw new Error(`[${targetName}] 校验失败：上游融合规则集未被替换 -> ${sckiLeftover.slice(0, 3).join(", ")}`);
  }
}

function main() {
  const rootDir = path.resolve(__dirname, "..");

  for (const target of TARGETS) {
    const encodedPath = target.upstreamPath
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    const url = `${UPSTREAM_BASE}/${encodedPath}`;
    console.log(`正在拉取上游脚本: ${target.name}\n  URL: ${url}`);

    const raw = fetchUrl(url);
    const patched = applyPatches(raw, target.name);
    verifyPatchedScript(patched, target.name);

    for (const relOut of target.outputPaths) {
      const fullOut = path.join(rootDir, relOut);
      fs.mkdirSync(path.dirname(fullOut), { recursive: true });
      fs.writeFileSync(fullOut, patched, "utf8");
      console.log(`  ✓ 已生成并校验通过: ${relOut}`);
    }
  }

  console.log("\n全部脚本构建及自检完成！");
}

main();
