#!/usr/bin/env node
/**
 * mihomo-config-kit 构建脚本
 *
 * 生成 dist/mihomo-config.js —— 一个**自包含**的 Mihomo 覆写脚本：
 * FlClash / Clash Party / Clash Meta 系客户端导入后，会在订阅配置基础上重建
 * DNS(fake-ip) / Sniffer / 代理组 / rule-providers / rules，不依赖任何上游项目。
 *
 * 只需要维护两个地方：
 * - config/direct-domains.txt   直连白名单（置顶，防止去广告规则误杀）
 * - 本文件顶部的数据区          区域正则 / 应用分组 / 分流规则源
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "dist", "mihomo-config.js");
const DIRECT_DOMAINS_FILE = path.join(ROOT, "config", "direct-domains.txt");
const VERSION = "1.0.0";

// ---------- 基础参数 ----------
const PRIVATE_CIDRS = ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"];

// 健康检查探测地址：必须 HTTPS。部分机场中继对 80 端口直接断连，
// 会刷出 "use of closed network connection" 的假失败。
const PROBE_URL = "https://www.gstatic.com/generate_204";

// 订阅里常见的"伪节点"（流量/到期信息行），参与测速必然失败，建组时剔除
const INFO_NODE_RE = "^(Traffic|traffic|流量|剩余|到期|过期|Expire|expire|套餐|官网|重置|距离下次|已用)";

// fake-ip 白名单：这些域名始终真实解析（否则会破坏局域网发现、游戏联机等）
const FAKE_IP_FILTER = [
  "*.lan",
  "*.local",
  "+.in-addr.arpa",
  "localhost.ptlogin2.qq.com",
  "+.srv.nintendo.net",
  "+.stun.playstation.net",
  "+.msftconnecttest.com",
  "+.msftncsi.com",
  "msftconnecttest.com",
  "xbox.*.microsoft.com",
  "*.battlenet.com.cn",
  "*.battlenet.com",
  "*.blzstatic.cn",
  "+.market.xiaomi.com",
];

// ---------- 代理组名 ----------
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

// ---------- 分流规则源（key = 规则文件名，也是 rule-provider 名） ----------
// 顺序参考 yfamilys 基础配置的 [Rule] 段
const RULE_BASE = "https://yfamilys.com/rule";
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

function buildData() {
  return {
    version: VERSION,
    buildTime: new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
    privateCidrs: PRIVATE_CIDRS,
    directRules: loadDirectRules(),
    fakeIpFilter: FAKE_IP_FILTER,
    probeUrl: PROBE_URL,
    infoNodeRe: INFO_NODE_RE,
    regions: REGION_GROUPS,
    appGroups: APP_GROUPS,
    rulesets: RULESETS.map(([key, target]) => ({ key, target })),
    G,
    ruleBase: RULE_BASE,
    antiAdUrl: ANTI_AD_URL,
  };
}

const RUNTIME = `
function mihomoKitMatch(names, include, exclude) {
  var re = new RegExp(include, "i");
  var neg = exclude ? new RegExp(exclude, "i") : null;
  var out = [];
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    if (re.test(n) && !(neg && neg.test(n))) out.push(n);
  }
  return out;
}

function mihomoKitUnique(list) {
  var seen = {};
  var out = [];
  for (var i = 0; i < list.length; i++) {
    if (!seen[list[i]]) {
      seen[list[i]] = true;
      out.push(list[i]);
    }
  }
  return out;
}

function main(config) {
  try {
    if (!config || typeof config !== "object" || Array.isArray(config)) return config;

    var D = MIHOMO_KIT;
    var cfg = config;
    var i;

    // ---------- 1. 基础参数 ----------
    if (!cfg.mode) cfg.mode = "rule";
    cfg["unified-delay"] = true;
    cfg["tcp-concurrent"] = true;
    if (!cfg["log-level"]) cfg["log-level"] = "warning";
    if (!cfg.profile || typeof cfg.profile !== "object") cfg.profile = {};
    cfg.profile["store-selected"] = true;
    if (cfg.profile["store-fake-ip"] === undefined) cfg.profile["store-fake-ip"] = true;

    // ---------- 2. DNS（fake-ip + 本地 hosts） ----------
    var dns = cfg.dns && typeof cfg.dns === "object" && !Array.isArray(cfg.dns) ? cfg.dns : {};
    dns.enable = true;
    if (!dns.listen) dns.listen = "0.0.0.0:1053";
    dns.ipv6 = false;
    dns["enhanced-mode"] = "fake-ip";
    dns["fake-ip-range"] = "198.18.0.1/16";
    dns["use-system-hosts"] = true;
    dns["default-nameserver"] = ["223.5.5.5", "119.29.29.29"];
    dns.nameserver = ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"];
    dns["proxy-server-nameserver"] = ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"];
    dns.fallback = ["https://1.1.1.1/dns-query", "https://8.8.8.8/dns-query", "https://dns.google/dns-query"];
    dns["fallback-filter"] = { geoip: true, "geoip-code": "CN", ipcidr: ["240.0.0.0/4"] };
    var fakeIp = Array.isArray(dns["fake-ip-filter"]) ? dns["fake-ip-filter"].slice() : [];
    fakeIp = mihomoKitUnique(fakeIp.concat(D.fakeIpFilter));
    dns["fake-ip-filter"] = fakeIp;
    cfg.dns = dns;

    // ---------- 3. Sniffer（识别 IP 直连里的域名，内网网段豁免） ----------
    var sniffer = cfg.sniffer && typeof cfg.sniffer === "object" ? cfg.sniffer : {};
    sniffer.enable = true;
    sniffer["force-dns-mapping"] = false;
    sniffer["parse-pure-ip"] = true;
    sniffer["override-destination"] = false;
    if (!sniffer.sniff) {
      sniffer.sniff = {
        HTTP: { ports: [80, "8080-8880"] },
        TLS: { ports: [443, 8443] },
        QUIC: { ports: [443, 8443] }
      };
    }
    var skipDst = Array.isArray(sniffer["skip-dst-address"]) ? sniffer["skip-dst-address"].slice() : [];
    skipDst = mihomoKitUnique(skipDst.concat(D.privateCidrs));
    sniffer["skip-dst-address"] = skipDst;
    cfg.sniffer = sniffer;

    // ---------- 4. 节点来源：内联 proxies 优先，否则退回 proxy-providers ----------
    var infoRe = new RegExp(D.infoNodeRe, "i");
    var names = [];
    var proxies = Array.isArray(cfg.proxies) ? cfg.proxies : [];
    for (i = 0; i < proxies.length; i++) {
      var p = proxies[i];
      if (p && p.name && !infoRe.test(p.name)) names.push(p.name);
    }
    var providers = Object.keys(cfg["proxy-providers"] || {});
    var useProvider = names.length === 0 && providers.length > 0;

    // ---------- 5. 区域节点组 ----------
    var regionGroups = [];
    var regionNames = [];
    if (!useProvider) {
      D.regions.forEach(function (r) {
        var matched = mihomoKitMatch(names, r.include, r.exclude);
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
    }

    // ---------- 6. 代理组（面板顺序：策略 → 自动/手动 → 广告拦截 → 应用 → 区域） ----------
    var nodeNames = names.length ? names.slice() : ["DIRECT"];
    var strategyOptions = [D.G.auto, D.G.manual].concat(regionNames, ["DIRECT"]);
    var proxyOptions = [D.G.strategy, D.G.auto, D.G.manual].concat(regionNames, ["DIRECT"]);
    var directOptions = ["DIRECT", D.G.strategy];
    var bilibiliOptions = ["DIRECT", D.G.strategy].concat(
      regionGroups
        .filter(function (g) { return g.name === D.G.hk || g.name === D.G.tw; })
        .map(function (g) { return g.name; })
    );

    function urlTestGroup(extra) {
      var base = { type: "url-test", url: D.probeUrl, interval: 600, tolerance: 50, timeout: 5000, lazy: true };
      for (var k in extra) base[k] = extra[k];
      return base;
    }

    var groups = [
      { name: D.G.strategy, type: "select", proxies: strategyOptions },
      urlTestGroup(useProvider ? { name: D.G.auto, use: providers } : { name: D.G.auto, proxies: nodeNames }),
      useProvider ? { name: D.G.manual, type: "select", use: providers } : { name: D.G.manual, type: "select", proxies: nodeNames }
    ];

    D.appGroups.forEach(function (a) {
      if (a.style === "proxy") groups.push({ name: a.name, type: "select", proxies: proxyOptions });
      else if (a.style === "direct") groups.push({ name: a.name, type: "select", proxies: directOptions });
      else if (a.style === "bilibili") groups.push({ name: a.name, type: "select", proxies: bilibiliOptions });
      else if (a.style === "final") groups.push({ name: a.name, type: "select", proxies: [D.G.strategy, "DIRECT"] });
      else groups.push({ name: a.name, type: "select", proxies: a.proxies });
    });

    cfg["proxy-groups"] = groups.concat(regionGroups);

    // ---------- 7. 规则源：anti-AD 去广告 + yfamilys 分流 ----------
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

    // ---------- 8. 规则：内网直连 → 白名单 → 去广告 → 分流 → 兜底 ----------
    var rules = [];
    D.privateCidrs.forEach(function (c) { rules.push("IP-CIDR," + c + ",DIRECT"); });
    D.directRules.forEach(function (r) { rules.push(r); });
    rules.push("RULE-SET,anti-ad," + D.G.adblock);
    D.rulesets.forEach(function (rs) { rules.push("RULE-SET," + rs.key + "," + rs.target); });
    rules.push("GEOIP,CN," + D.G.direct);
    rules.push("MATCH," + D.G.final);
    cfg.rules = rules;

    return cfg;
  } catch (err) {
    console.log("[mihomo-config-kit] 配置生成失败: " + err);
    return config;
  }
}
`;

function generate() {
  const data = buildData();
  const header = `// ============================================================
// mihomo-config-kit v${data.version} — Mihomo 覆写脚本（FlClash / Clash Party / Clash Meta）
// 生成时间：${data.buildTime}
// 本文件由 scripts/build.js 自动生成，请勿手动编辑
// 覆盖内容：DNS(fake-ip) / Sniffer / 代理组 / rule-providers / rules
// 分组顺序：策略选择 → 自动/手动 → 广告拦截 → 应用分流 → 漏网之鱼 → 区域节点组
// 规则顺序：内网直连 → 直连白名单 → anti-AD 去广告 → yfamilys 分流 → GEOIP,CN → 漏网之鱼
// ============================================================

var MIHOMO_KIT = ${JSON.stringify(data, null, 2)};
`;
  return header + RUNTIME;
}

const BUILTIN_TARGETS = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"]);

function verify(code) {
  const sandbox = { console: { log() {}, error() {}, warn() {} } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const data = buildData();
  const mk = (name) => ({ name, server: "x.example.com", port: 443, type: "ss", cipher: "aes-128-gcm", password: "x" });

  // --- 场景 A：内联节点（FlClash 常见形态） ---
  const inline = sandbox.main({
    proxies: [
      mk("🇭🇰 香港 IEPL 01"),
      mk("香港高级 IEPL 专线 2"),
      mk("🇨🇳 台湾 TW 01"),
      mk("日本 Tokyo 01"),
      mk("美国 Los Angeles 01"),
      mk("Traffic: 32.71 GB | 150 GB"),
    ],
    "proxy-groups": [{ name: "旧分组", type: "select", proxies: ["DIRECT"] }],
    rules: ["MATCH,DIRECT"],
  });

  if (!inline.dns || inline.dns["use-system-hosts"] !== true) throw new Error("DNS：use-system-hosts 未开启");
  if (inline.dns["enhanced-mode"] !== "fake-ip") throw new Error("DNS：未使用 fake-ip 模式");
  if (!inline.sniffer || inline.sniffer.enable !== true) throw new Error("Sniffer：未开启");
  if (inline.sniffer["skip-dst-address"].indexOf("192.168.0.0/16") === -1) throw new Error("Sniffer：内网网段未豁免");

  const rules = inline.rules || [];
  if (rules[0] !== "IP-CIDR,127.0.0.0/8,DIRECT") throw new Error(`规则：首条应为内网直连，实际 ${rules[0]}`);
  const missing = data.directRules.filter((r) => !rules.includes(r));
  if (missing.length) throw new Error(`规则：直连白名单未注入 -> ${missing.slice(0, 3).join(" | ")}`);
  if (rules.indexOf(data.directRules[0]) !== PRIVATE_CIDRS.length) throw new Error("规则：白名单未紧跟内网规则置顶");
  if (!rules.includes("RULE-SET,anti-ad,🛑 广告拦截")) throw new Error("规则：anti-AD 未注入");
  if (!rules.includes("MATCH,🐟 漏网之鱼") || !rules.includes("GEOIP,CN,🌐 全球直连")) throw new Error("规则：兜底规则缺失");

  const groups = inline["proxy-groups"] || [];
  const groupNames = new Set(groups.map((g) => g.name));
  if (groupNames.has("旧分组")) throw new Error("分组：订阅旧分组未被替换");

  // 规则目标必须存在
  const badTargets = [];
  for (const r of rules) {
    const parts = r.split(",");
    const target = r.startsWith("MATCH") ? parts[1] : parts[parts.length - 1];
    if (!BUILTIN_TARGETS.has(target) && !groupNames.has(target)) badTargets.push(`${r} -> ${target}`);
  }
  if (badTargets.length) throw new Error(`规则：指向不存在的组 -> ${badTargets.slice(0, 3).join(" | ")}`);

  // 组不得自引用
  const selfRef = groups.filter((g) => (g.proxies || []).includes(g.name));
  if (selfRef.length) throw new Error(`分组：自引用 -> ${selfRef.map((g) => g.name).join(", ")}`);

  // 区域组
  const order = groups.map((g) => g.name);
  const hk = groups.find((g) => g.name === "🇭🇰 香港节点");
  if (!hk || hk.proxies.length !== 2) throw new Error("区域：香港组未正确匹配 2 个节点");
  if (order.indexOf("🇭🇰 香港节点") < order.indexOf("🐟 漏网之鱼")) throw new Error("分组：区域组未排在应用组之后");
  if (order.includes("🇰🇷 韩国节点")) throw new Error("区域：无匹配节点时不应创建韩国组");

  // 伪节点不得混入
  const infoLeak = groups.filter((g) => (g.proxies || []).some((n) => /^Traffic/i.test(n)));
  if (infoLeak.length) throw new Error(`分组：伪节点混入 -> ${infoLeak.map((g) => g.name).join(", ")}`);

  // 测速组必须 HTTPS
  const badProbe = groups.filter((g) => g.type === "url-test" && !/^https:\/\//.test(String(g.url)));
  if (badProbe.length) throw new Error(`测速：未使用 HTTPS -> ${badProbe.map((g) => g.name).join(", ")}`);

  // 规则源
  const rp = inline["rule-providers"] || {};
  if (!rp["anti-ad"]) throw new Error("规则源：anti-AD 缺失");
  for (const rs of data.rulesets) {
    if (!rp[rs.key] || !String(rp[rs.key].url).endsWith(`/${rs.key}.rule`)) {
      throw new Error(`规则源：${rs.key} 缺失或 URL 错误`);
    }
  }

  // --- 场景 B：仅 proxy-providers（无内联节点） ---
  const provider = sandbox.main({
    proxies: [],
    rules: [],
    "proxy-groups": [],
    "proxy-providers": { Sub: { type: "http", url: "https://example.com/sub", path: "./p/sub.yaml", interval: 86400 } },
  });
  const pGroups = provider["proxy-groups"] || [];
  const pAuto = pGroups.find((g) => g.name === "♻️ 自动选择");
  const pManual = pGroups.find((g) => g.name === "👐 手动选择");
  if (!pAuto || !Array.isArray(pAuto.use) || pAuto.use[0] !== "Sub") throw new Error("provider 模式：自动选择未使用 use");
  if (!pManual || !Array.isArray(pManual.use)) throw new Error("provider 模式：手动选择未使用 use");
  if (pGroups.some((g) => g.type === "url-test" && !g.use && !g.proxies)) throw new Error("provider 模式：存在空组");
  if (!provider.rules.includes("MATCH,🐟 漏网之鱼")) throw new Error("provider 模式：规则未生成");

  return { groups: groups.length, rules: rules.length, providers: Object.keys(rp).length };
}

function main() {
  const code = generate();
  const stat = verify(code);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, code, "utf8");

  console.log(`✓ 已生成 ${path.relative(ROOT, OUTPUT)}（${(code.length / 1024).toFixed(1)} KB）`);
  console.log(`  分组 ${stat.groups} 个 / 规则 ${stat.rules} 条 / 规则源 ${stat.providers} 个`);
  console.log("  自检通过：DNS / Sniffer / 分组顺序 / 区域匹配 / 伪节点剔除 / 规则引用 / provider 模式");
}

main();
