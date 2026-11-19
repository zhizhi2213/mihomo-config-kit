#!/usr/bin/env node
/**
 * mihomo-config-kit 构建脚本
 *
 * 生成 dist/mihomo-config.js —— 一个**自包含**的 Mihomo 覆写脚本：
 * FlClash / Clash Party / Clash Meta 系客户端导入后，会在订阅配置基础上重建
 * DNS(fake-ip) / Sniffer / 代理组 / rule-providers / rules，不依赖任何上游项目。
 *
 * 只需要维护两个地方：
 * - config/direct-domains.txt   直连白名单（置顶，按住 ai-global.rule 里的字节系域名走直连）
 * - 本文件顶部的数据区          区域正则 / 应用分组 / 分流规则源
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "dist", "mihomo-config.js");
const OUTPUT_MRS = path.join(ROOT, "dist", "mihomo-config-mrs.js");
const DIRECT_DOMAINS_FILE = path.join(ROOT, "config", "direct-domains.txt");
const VERSION = "1.5.0";

// ---------- 基础参数 ----------
const PRIVATE_CIDRS = ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"];

// 社区维护的 fake-ip 豁免清单（wwqgtxx/clash-rules，内核内置 geosite 未收录的部分）。
// 通过 dns.fake-ip-filter 的 rule-set: 引用，不产出任何 RULE-SET 规则；mrs 格式需较新 mihomo 内核。
// 清单下载失败时该条自动忽略，手工过滤项与 geosite:cn 仍然生效。
const COMMUNITY_FAKEIP_FILTER_KEY = "fakeip-filter";
const COMMUNITY_FAKEIP_FILTER_URL =
  "https://cdn.jsdmirror.com/gh/wwqgtxx/clash-rules@release/fakeip-filter.mrs";

// 健康检查探测地址：必须 HTTPS。部分机场中继对 80 端口直接断连，
// 会刷出 "use of closed network connection" 的假失败。
const PROBE_URL = "https://www.gstatic.com/generate_204";

// 订阅里常见的"伪节点"（流量/到期/群链接等信息行），参与测速必然失败，建组时剔除（非锚点匹配，兼容带表情前缀的节点名）
const INFO_NODE_RE =
  "(剩余|官网|套餐|流量|到期|过期|更新|刷新|订阅|群|网址|客服|欢迎|加入|Expire|Traffic|Reset|重置|距离下次|已用|(^|[^A-Za-z0-9])(\\d+(\\.\\d+)?\\s*(GB|TB)|\\d+\\s*Days?)([^A-Za-z0-9]|$))";

// Geo 数据库镜像地址（默认 GitHub 直连常被墙，改镜像确保首次启动拿到数据）
const GEOX_URL = {
  mmdb: "https://cdn.jsdmirror.com/gh/MetaCubeX/meta-rules-dat@release/country.mmdb",
  geoip: "https://cdn.jsdmirror.com/gh/MetaCubeX/meta-rules-dat@release/geoip.dat",
  geosite: "https://cdn.jsdmirror.com/gh/MetaCubeX/meta-rules-dat@release/geosite.dat",
};

// Sniffer 跳过嗅探的域名（证书固定 / 特殊校验的服务；只放合法域名匹配表达式）
const SNIFFER_SKIP_DOMAINS = [
  "+.apple.com",
  "+.openai.com",
  "+.oaistatic.com",
  "+.oaiusercontent.com",
  "+.chatgpt.com",
];

// fake-ip 白名单：这些域名始终真实解析（否则会破坏局域网发现、对时、游戏联机等）
const FAKE_IP_FILTER = [
  "*.lan",
  "*.local",
  "+.in-addr.arpa",
  "localhost.ptlogin2.qq.com",
  "+.ntp.org",
  "time.windows.com",
  "time.apple.com",
  "+.stun.*",
  "+.stun.*.*",
  "+.stun.*.*.*",
  "+.stun.*.*.*.*",
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
  "geosite:private",
  // 关键项：国内域名必须拿真实 IP，否则下面的 GEOIP,CN 永远匹配不到 fake-ip 假地址，
  // 未收录的国内站点会落 MATCH 走代理。Syzygy33 用 rule-set:cn-domain 同理；
  // 这里用内核内置 geosite:cn，不额外增加国内域名规则源、口径一致。
  "geosite:cn",
  // 社区清单补齐官方 geosite 未收录的 real-ip 刚需域名（NTP / 局域网发现 / 游戏联机等）
  "rule-set:" + COMMUNITY_FAKEIP_FILTER_KEY,
];

// ---------- 代理组名 ----------
const G = {
  strategy: "🚀 策略选择",
  auto: "♻️ 自动选择",
  manual: "👐 手动选择",
  ai: "🌍 国外 AI",
  aiCn: "🇨🇳 国内 AI",
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
    exclude: "俄罗斯|russia|新加坡|singapore|韩国|korea|台湾|taiwan|香港|hong ?kong|日本|japan|australia|austria|澳大利亚|奥地利",
  },
  { name: "🇬🇧 英国节点", include: "英|uk|伦敦|london|manchester|曼彻斯特", exclude: "乌克兰|ukraine|日本|japan|fukuoka|福冈" },
  { name: "🇩🇪 德国节点", include: "德|germany|柏林|慕尼黑|法兰克福|frankfurt", exclude: "印度|india|德里|马德里|阿德莱德" },
  { name: "🇷🇺 俄罗斯节点", include: "俄|russia|莫斯科|moscow|圣彼得堡", exclude: "" },
  { name: "🇨🇦 加拿大节点", include: "加拿大|canada|多伦多|温哥华|toronto|vancouver", exclude: "" },
  { name: "🇮🇳 印度节点", include: "印度|india|孟买|mumbai|新德里|delhi", exclude: "" },
];

// ---------- 应用分流组（style 仅支持 proxy / direct / bilibili / final，构建期有断言） ----------
const APP_GROUPS = [
  { name: G.aiCn, style: "direct" },
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

// v1.4.0 起移除 anti-AD：该源 payload 是 `+.域名` 的 domain 格式，用 behavior: classical
// 加载时内核会逐条刷 "parse classical rule ... missing subsequent parameters"，去广告实际大面积失效，
// 还逼着用 config/direct-domains.txt 救回被误杀的字节/豆包域名。去掉后白名单仍需保留（见 README）。

const RULESETS = [
  ["ai-cn", G.aiCn],
  ["ai-global", G.ai],
  ["Microsoft", G.microsoft],
  ["AppleProxy", G.strategy],
  ["Apple", G.apple],
  ["AppStore", G.apple],
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

// ---------- MRS 版分流规则源（MetaCubeX/meta-rules-dat@meta，全量 binary .mrs） ----------
// behavior 仅 domain / ipcidr；所有 ipcidr 规则集在运行时自动追加 ,no-resolve 防止触发本地 DNS 解析
const MRS_RULE_BASE = "https://cdn.jsdmirror.com/gh/MetaCubeX/meta-rules-dat@meta/geo";

const MRS_RULESETS = [
  // AI 分流（官方原生区分国内外 AI）
  { key: "ai-cn", behavior: "domain", path: "geosite/category-ai-cn.mrs", target: G.aiCn },
  { key: "ai-global", behavior: "domain", path: "geosite/category-ai-!cn.mrs", target: G.ai },
  // 微软 / 苹果（Apple Intelligence 优先走代理，其余走各自应用组）
  { key: "microsoft", behavior: "domain", path: "geosite/microsoft.mrs", target: G.microsoft },
  { key: "apple-proxy", behavior: "domain", path: "geosite/apple-intelligence.mrs", target: G.strategy },
  { key: "apple", behavior: "domain", path: "geosite/apple.mrs", target: G.apple },
  { key: "apple-cn", behavior: "domain", path: "geosite/apple-cn.mrs", target: G.apple },
  // 社交与通讯
  { key: "telegram", behavior: "domain", path: "geosite/telegram.mrs", target: G.telegram },
  { key: "telegram-ip", behavior: "ipcidr", path: "geoip/telegram.mrs", target: G.telegram },
  { key: "weibo", behavior: "domain", path: "geosite/sina.mrs", target: G.weibo },
  { key: "tencent", behavior: "domain", path: "geosite/tencent.mrs", target: G.direct },
  { key: "twitter", behavior: "domain", path: "geosite/twitter.mrs", target: G.twitter },
  { key: "twitter-ip", behavior: "ipcidr", path: "geoip/twitter.mrs", target: G.twitter },
  // 游戏平台（国服/下载 CDN 优先直连，其余走游戏平台组）
  { key: "games-cn", behavior: "domain", path: "geosite/category-games-cn.mrs", target: G.direct },
  { key: "steam-cn", behavior: "domain", path: "geosite/steam@cn.mrs", target: G.direct },
  { key: "playstation", behavior: "domain", path: "geosite/playstation.mrs", target: G.game },
  { key: "epic", behavior: "domain", path: "geosite/epicgames.mrs", target: G.game },
  { key: "sony", behavior: "domain", path: "geosite/sony.mrs", target: G.game },
  { key: "steam", behavior: "domain", path: "geosite/steam.mrs", target: G.game },
  { key: "nintendo", behavior: "domain", path: "geosite/nintendo.mrs", target: G.game },
  { key: "blizzard", behavior: "domain", path: "geosite/blizzard.mrs", target: G.game },
  // 平台与社区
  { key: "spotify", behavior: "domain", path: "geosite/spotify.mrs", target: G.spotify },
  { key: "paypal", behavior: "domain", path: "geosite/paypal.mrs", target: G.paypal },
  { key: "facebook", behavior: "domain", path: "geosite/facebook.mrs", target: G.facebook },
  { key: "facebook-ip", behavior: "ipcidr", path: "geoip/facebook.mrs", target: G.facebook },
  { key: "reddit", behavior: "domain", path: "geosite/reddit.mrs", target: G.reddit },
  { key: "discord", behavior: "domain", path: "geosite/discord.mrs", target: G.discord },
  // 流媒体
  { key: "youtube", behavior: "domain", path: "geosite/youtube.mrs", target: G.youtube },
  { key: "netflix", behavior: "domain", path: "geosite/netflix.mrs", target: G.netflix },
  { key: "netflix-ip", behavior: "ipcidr", path: "geoip/netflix.mrs", target: G.netflix },
  { key: "disney", behavior: "domain", path: "geosite/disney.mrs", target: G.disney },
  { key: "bilibili", behavior: "domain", path: "geosite/bilibili.mrs", target: G.bilibili },
  { key: "china-media", behavior: "domain", path: "geosite/category-entertainment-cn.mrs", target: G.cnMedia },
  { key: "proxy-media", behavior: "domain", path: "geosite/category-entertainment.mrs", target: G.foreignMedia },
  { key: "twitch", behavior: "domain", path: "geosite/twitch.mrs", target: G.strategy },
  { key: "douyu", behavior: "domain", path: "geosite/douyu.mrs", target: G.direct },
  // Google 与全球代理兜底
  { key: "google", behavior: "domain", path: "geosite/google.mrs", target: G.strategy },
  { key: "google-ip", behavior: "ipcidr", path: "geoip/google.mrs", target: G.strategy },
  { key: "gfw", behavior: "domain", path: "geosite/gfw.mrs", target: G.strategy },
  { key: "proxy", behavior: "domain", path: "geosite/geolocation-!cn.mrs", target: G.strategy },
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

/**
 * 产物头部不再写入构建时间戳。
 *
 * 原因：时间戳会让同一份源码每次构建产生不同产物，CI 里就会不断出现
 * 「只改了时间戳」的 bot 提交。产物新鲜度看 git 提交记录即可。
 */
function buildData(variant = "classical") {
  const isMrs = variant === "mrs";
  return {
    version: VERSION,
    variant,
    privateCidrs: PRIVATE_CIDRS,
    directRules: loadDirectRules(),
    fakeIpFilter: FAKE_IP_FILTER,
    communityFakeIpFilterKey: COMMUNITY_FAKEIP_FILTER_KEY,
    communityFakeIpFilterUrl: COMMUNITY_FAKEIP_FILTER_URL,
    probeUrl: PROBE_URL,
    infoNodeRe: INFO_NODE_RE,
    geoxUrl: GEOX_URL,
    snifferSkipDomains: SNIFFER_SKIP_DOMAINS,
    regions: REGION_GROUPS,
    appGroups: APP_GROUPS,
    rulesets: isMrs
      ? MRS_RULESETS.map(({ key, behavior, path: relPath, target }) => ({ key, behavior, path: relPath, target }))
      : RULESETS.map(([key, target]) => ({ key, target })),
    // 运行时只读下面 7 个键；其余组名已在构建期固化进 appGroups / rulesets，
    // 打包进产物就是死数据，故只输出运行时真正引用的键（自检会核对两者一致）。
    G: {
      strategy: G.strategy,
      auto: G.auto,
      manual: G.manual,
      direct: G.direct,
      final: G.final,
      hk: G.hk,
      tw: G.tw,
    },
    ruleBase: isMrs ? MRS_RULE_BASE : RULE_BASE,
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
    cfg["find-process-mode"] = "off";
    cfg["keep-alive-idle"] = 180;
    cfg["keep-alive-interval"] = 30;
    cfg["geodata-mode"] = false;
    cfg["geodata-loader"] = "memconservative";
    var geox = cfg["geox-url"] && typeof cfg["geox-url"] === "object" && !Array.isArray(cfg["geox-url"]) ? cfg["geox-url"] : {};
    var mergedGeox = {};
    var k;
    for (k in D.geoxUrl) mergedGeox[k] = D.geoxUrl[k];
    for (k in geox) mergedGeox[k] = geox[k];
    cfg["geox-url"] = mergedGeox;
    delete cfg["global-client-fingerprint"];
    delete cfg["bind-address"];
    delete cfg["clash-for-android"];
    if (cfg.tun && typeof cfg.tun === "object" && !Array.isArray(cfg.tun) && cfg.tun.device && !/^utun/i.test(String(cfg.tun.device))) {
      delete cfg.tun.device;
    }
    if (!cfg["log-level"]) cfg["log-level"] = "warning";
    if (!cfg.profile || typeof cfg.profile !== "object" || Array.isArray(cfg.profile)) cfg.profile = {};
    delete cfg.profile.tracing;
    cfg.profile["store-selected"] = true;
    if (cfg.profile["store-fake-ip"] === undefined) cfg.profile["store-fake-ip"] = true;

    // ---------- 2. DNS（fake-ip + 本地 hosts + 防 DNS 泄漏分流） ----------
    var dns = cfg.dns && typeof cfg.dns === "object" && !Array.isArray(cfg.dns) ? cfg.dns : {};
    dns.enable = true;
    if (!dns.listen) dns.listen = "127.0.0.1:1053";
    dns.ipv6 = false;
    dns["prefer-h3"] = false;
    dns["enhanced-mode"] = "fake-ip";
    dns["fake-ip-range"] = "198.18.0.1/16";
    dns["fake-ip-filter-mode"] = "blacklist";
    dns["cache-algorithm"] = "arc";
    dns["use-system-hosts"] = true;
    dns["respect-rules"] = true;
    var cnDoH = ["https://223.5.5.5/dns-query", "https://doh.pub/dns-query"];
    dns["default-nameserver"] = ["223.5.5.5", "119.29.29.29"];
    dns["proxy-server-nameserver"] = cnDoH.slice();
    dns["direct-nameserver"] = cnDoH.slice();
    // 方案一（现代 Mihomo 防泄漏写法）：
    // 主 nameserver 仅使用境外 DoH（配合 respect-rules 走代理出站），
    // 国内与私网域名由 nameserver-policy 定向到阿里/腾讯 DoH，彻底废弃并发抢答的 fallback，避免向国内 DNS 泄漏未知/境外域名查询。
    dns.nameserver = [
      "https://1.1.1.1/dns-query",
      "https://8.8.8.8/dns-query",
      "https://dns.google/dns-query"
    ];
    var policy = dns["nameserver-policy"] && typeof dns["nameserver-policy"] === "object" && !Array.isArray(dns["nameserver-policy"])
      ? dns["nameserver-policy"]
      : {};
    policy["geosite:cn,private"] = cnDoH.slice();
    dns["nameserver-policy"] = policy;
    delete dns.fallback;
    delete dns["fallback-filter"];
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
    var skipDom = Array.isArray(sniffer["skip-domain"]) ? sniffer["skip-domain"].slice() : [];
    skipDom = mihomoKitUnique(skipDom.concat(D.snifferSkipDomains));
    sniffer["skip-domain"] = skipDom;
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
    var hasProvider = providers.length > 0;

    // provider / 混合模式：组的 url 测速只覆盖 proxies 成员，provider 节点必须靠自身 health-check
    // 产出延迟数据，否则地区 url-test 组拿不到延迟、永远停在第一个节点。订阅已有值保留，enable 强制开。
    if (hasProvider) {
      var providerMap = cfg["proxy-providers"];
      for (var pKey in providerMap) {
        var provider = providerMap[pKey];
        if (!provider || typeof provider !== "object" || Array.isArray(provider)) continue;
        var oldHc = provider["health-check"] && typeof provider["health-check"] === "object"
          && !Array.isArray(provider["health-check"]) ? provider["health-check"] : {};
        var hc = {
          enable: true,
          url: D.probeUrl,
          interval: 300,
          timeout: 5000,
          lazy: true,
          "expected-status": 204
        };
        for (var hKey in oldHc) hc[hKey] = oldHc[hKey];
        hc.enable = true;
        provider["health-check"] = hc;
      }
    }

    // ---------- 5. 区域节点组 ----------
    var regionGroups = [];
    var regionNames = [];
    var PROBE = {
      type: "url-test",
      url: D.probeUrl,
      interval: 300,
      tolerance: 30,
      timeout: 5000,
      lazy: true,
      "max-failed-times": 5,
      "expected-status": 204
    };
    function withProbe(extra) {
      var g = {};
      for (var baseKey in PROBE) g[baseKey] = PROBE[baseKey];
      for (var extraKey in extra) g[extraKey] = extra[extraKey];
      return g;
    }

    if (hasProvider) {
      // 含 proxy-providers 的订阅在脚本期看不到 provider 节点：用内核 include-all + Go 正则 filter 动态筛选（同时兼容内联节点），
      // 全量建地区组，一个节点都没匹配上时由 empty-fallback 落 REJECT，而不是留空组。
      D.regions.forEach(function (r) {
        regionNames.push(r.name);
        regionGroups.push(withProbe({
          name: r.name,
          "include-all": true,
          "exclude-type": "direct|reject",
          filter: "(?i)(" + r.include + ")",
          "exclude-filter": "(?i)(" + D.infoNodeRe + (r.exclude ? "|" + r.exclude : "") + ")",
          "empty-fallback": "REJECT"
        }));
      });
    } else {
      D.regions.forEach(function (r) {
        var matched = mihomoKitMatch(names, r.include, r.exclude);
        if (!matched.length) return;
        regionNames.push(r.name);
        regionGroups.push(withProbe({ name: r.name, proxies: matched }));
      });
    }

    // ---------- 6. 代理组（面板顺序：策略 → 自动/手动 → 应用 → 区域） ----------
    var nodeNames = names.length ? names.slice() : ["DIRECT"];
    var strategyOptions = [D.G.auto, D.G.manual].concat(regionNames, ["DIRECT"]);
    var proxyOptions = [D.G.strategy, D.G.auto, D.G.manual].concat(regionNames, ["DIRECT"]);
    var directOptions = ["DIRECT", D.G.strategy];
    var bilibiliOptions = ["DIRECT", D.G.strategy].concat(
      regionGroups
        .filter(function (g) { return g.name === D.G.hk || g.name === D.G.tw; })
        .map(function (g) { return g.name; })
    );

    var providerFilter = {
      "exclude-type": "direct|reject",
      "exclude-filter": "(?i)(" + D.infoNodeRe + ")"
    };
    function buildAllNodesGroup(base) {
      if (hasProvider) {
        base.use = providers;
        base["exclude-type"] = providerFilter["exclude-type"];
        base["exclude-filter"] = providerFilter["exclude-filter"];
        if (names.length) base.proxies = nodeNames;
      } else {
        base.proxies = nodeNames;
      }
      return base;
    }
    var groups = [
      { name: D.G.strategy, type: "select", proxies: strategyOptions },
      withProbe(buildAllNodesGroup({ name: D.G.auto })),
      buildAllNodesGroup({ name: D.G.manual, type: "select" })
    ];

    D.appGroups.forEach(function (a) {
      if (a.style === "proxy") groups.push({ name: a.name, type: "select", proxies: proxyOptions });
      else if (a.style === "direct") groups.push({ name: a.name, type: "select", proxies: directOptions });
      else if (a.style === "bilibili") groups.push({ name: a.name, type: "select", proxies: bilibiliOptions });
      else if (a.style === "final") groups.push({ name: a.name, type: "select", proxies: [D.G.strategy, "DIRECT"] });
    });

    cfg["proxy-groups"] = groups.concat(regionGroups);

    // ---------- 7. 规则源：业务分流（classical 或 mrs） + 社区 fake-ip 豁免清单 ----------
    var rp = {};
    var isMrs = D.variant === "mrs";
    D.rulesets.forEach(function (rs) {
      if (isMrs) {
        rp[rs.key] = {
          type: "http",
          behavior: rs.behavior,
          format: "mrs",
          url: D.ruleBase + "/" + rs.path,
          path: "./providers/rules/mrs-" + rs.key + ".mrs",
          interval: 86400
        };
      } else {
        rp[rs.key] = {
          type: "http",
          behavior: "classical",
          format: "yaml",
          url: D.ruleBase + "/" + rs.key + ".rule",
          path: "./providers/rules/" + rs.key + ".yaml",
          interval: 86400
        };
      }
    });
    // 仅供 dns.fake-ip-filter 的 "rule-set:<key>" 查询，不生成任何 RULE-SET 规则
    rp[D.communityFakeIpFilterKey] = {
      type: "http",
      behavior: "domain",
      format: "mrs",
      url: D.communityFakeIpFilterUrl,
      path: "./providers/rules/" + D.communityFakeIpFilterKey + ".mrs",
      interval: 86400
    };
    cfg["rule-providers"] = rp;

    // ---------- 8. 规则：内网/private 直连 → NTP 直连 → 白名单 → 例外 → 分流 → 兜底 ----------
    var rules = [];
    D.privateCidrs.forEach(function (c) { rules.push("IP-CIDR," + c + ",DIRECT,no-resolve"); });
    rules.push("GEOSITE,private,DIRECT");
    rules.push("GEOIP,private,DIRECT,no-resolve");
    // 系统对时优先于业务分流：很多节点丢弃/限制 UDP 123，时间偏差会连带让 DoH 的 TLS 证书校验失败
    rules.push("AND,((DST-PORT,123),(NETWORK,udp)),DIRECT");
    D.directRules.forEach(function (r) { rules.push(r); });
    // 修复 Google Play 下载/更新一直「等待中」：services.googleapis.cn 解析到境内 IP，需早于国内分流走代理
    rules.push("DOMAIN-SUFFIX,googleapis.cn," + D.G.strategy);
    D.rulesets.forEach(function (rs) {
      var suffix = rs.behavior === "ipcidr" ? ",no-resolve" : "";
      rules.push("RULE-SET," + rs.key + "," + rs.target + suffix);
    });
    rules.push("GEOIP,CN," + D.G.direct + ",no-resolve");
    // 域名兜底：GEOIP,CN 只靠 IP 判断，解析到境外 CDN 的国内站点会漏；
    // 与 DNS 侧 fake-ip-filter 的 geosite:cn 同源，按域名补判一次再捞回直连（Syzygy33 的 RULE-SET,cn-domain 同思路）
    rules.push("GEOSITE,cn," + D.G.direct);
    rules.push("MATCH," + D.G.final);
    cfg.rules = rules;

    return cfg;
  } catch (err) {
    console.log("[mihomo-config-kit] 配置生成失败: " + err);
    return config;
  }
}
`;

function generate(variant = "classical") {
  const data = buildData(variant);
  const isMrs = variant === "mrs";
  const variantLabel = isMrs ? " [MRS 全量二进制规则版]" : " [Classical 标准版]";
  const ruleSourceDesc = isMrs
    ? "MetaCubeX/meta-rules-dat 全量 .mrs 分流（domain + ipcidr no-resolve）"
    : "yfamilys 分流（国内AI直连/国外AI代理）";
  const header = `// ============================================================
// mihomo-config-kit v${data.version}${variantLabel} — Mihomo 覆写脚本（FlClash / Clash Party / Clash Meta）
// 本文件由 scripts/build.js 自动生成，请勿手动编辑
// 覆盖内容：DNS(fake-ip) / Sniffer / 代理组 / rule-providers / rules
// DNS：arc 缓存、respect-rules + nameserver-policy 防泄漏、fake-ip-filter 含 geosite:cn + 社区 rule-set:fakeip-filter
// 分组顺序：策略选择 → 自动/手动 → 国内/国外 AI → 应用分流 → 漏网之鱼 → 区域节点组
// 规则顺序：内网/private 直连 → NTP 直连 → 直连白名单 → googleapis.cn 例外 → ${ruleSourceDesc} → GEOIP,CN → GEOSITE,cn → 漏网之鱼
// ============================================================

var MIHOMO_KIT = ${JSON.stringify(data, null, 2)};
`;
  return header + RUNTIME;
}

const BUILTIN_TARGETS = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "COMPATIBLE"]);

function verify(code, variant = "classical") {
  const sandbox = { console: { log() {}, error() {}, warn() {} } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const data = buildData(variant);
  const isMrs = variant === "mrs";
  const mk = (name) => ({ name, server: "x.example.com", port: 443, type: "ss", cipher: "aes-128-gcm", password: "x" });

  // 产物数据区不得有死数据：G 只保留运行时真正引用的键
  const runtimeGKeys = [...new Set((code.match(/D\.G\.[A-Za-z]+/g) || []).map((s) => s.slice(4)))].sort();
  const packedGKeys = Object.keys(sandbox.MIHOMO_KIT.G).sort();
  if (runtimeGKeys.join() !== packedGKeys.join()) {
    throw new Error(`产物：G 键与运行时引用不一致 -> 打包 ${packedGKeys} / 引用 ${runtimeGKeys}`);
  }
  // style 枚举固定，运行时已无兜底分支；未知 style 会静默丢组，必须在构建期拦住
  const badStyle = data.appGroups.filter((a) => !["proxy", "direct", "bilibili", "final"].includes(a.style));
  if (badStyle.length) throw new Error(`分组：未知 style -> ${badStyle.map((a) => a.name).join(", ")}`);

  // --- 场景 A：内联节点（FlClash 常见形态） ---
  const inline = sandbox.main({
    "global-client-fingerprint": "chrome",
    "bind-address": "*",
    "clash-for-android": { "append-system-dns": false },
    profile: { tracing: true },
    tun: { enable: true, device: "Meta" },
    dns: { fallback: ["https://1.1.1.1/dns-query"], "fallback-filter": { geoip: true } },
    proxies: [
      mk("🇭🇰 香港 IEPL 01"),
      mk("香港高级 IEPL 专线 2"),
      mk("🇨🇳 台湾 TW 01"),
      mk("日本 Tokyo 01"),
      mk("美国 Los Angeles 01"),
      mk("Traffic: 32.71 GB | 150 GB"),
      mk("📢 剩余流量：88 GB"),
    ],
    "proxy-groups": [{ name: "旧分组", type: "select", proxies: ["DIRECT"] }],
    rules: ["MATCH,DIRECT"],
  });

  if ("global-client-fingerprint" in inline || "bind-address" in inline || "clash-for-android" in inline) {
    throw new Error("基础：未清理废弃或易告警字段 global-client-fingerprint / bind-address / clash-for-android");
  }
  if ("tracing" in (inline.profile || {})) throw new Error("基础：未清理废弃字段 profile.tracing");
  if ("device" in (inline.tun || {})) throw new Error("TUN：未清理非 utun 开头的 tun.device");
  if (inline["find-process-mode"] !== "off" || inline["geodata-mode"] !== false || inline["geodata-loader"] !== "memconservative") {
    throw new Error("性能：find-process-mode / geodata-mode / geodata-loader 未正确设置");
  }
  if (inline["keep-alive-idle"] !== 180 || !inline["geox-url"] || !inline["geox-url"].mmdb) {
    throw new Error("性能：keep-alive-idle 或 geox-url 未正确设置");
  }
  if (!inline.dns || inline.dns["use-system-hosts"] !== true) throw new Error("DNS：use-system-hosts 未开启");
  if (inline.dns["enhanced-mode"] !== "fake-ip") throw new Error("DNS：未使用 fake-ip 模式");
  if (inline.dns["cache-algorithm"] !== "arc") throw new Error("DNS：cache-algorithm 未设为 arc");
  if (inline.dns["fake-ip-filter-mode"] !== "blacklist" || inline.dns["prefer-h3"] !== false) {
    throw new Error("DNS：fake-ip-filter-mode 或 prefer-h3 未正确设置");
  }
  if (inline.dns["respect-rules"] !== true) {
    throw new Error("DNS：respect-rules 未开启（境外 nameserver 必须按分流规则走代理）");
  }
  if ("fallback" in inline.dns || "fallback-filter" in inline.dns) {
    throw new Error("DNS：未清理旧 fallback / fallback-filter（会导致并发抢答引起 DNS 泄漏）");
  }
  const ns = inline.dns.nameserver || [];
  if (!ns.length || ns.some((u) => /223\.5\.5\.5|119\.29\.29\.29|doh\.pub/i.test(String(u)))) {
    throw new Error("DNS：主 nameserver 不应包含国内 DNS（否则未知/境外域名会向国内 DNS 泄漏）");
  }
  const policy = inline.dns["nameserver-policy"] || {};
  const cnPolicy = policy["geosite:cn,private"];
  if (!Array.isArray(cnPolicy) || !cnPolicy.includes("https://223.5.5.5/dns-query")) {
    throw new Error("DNS：nameserver-policy 缺少 geosite:cn,private 国内 DoH 定向");
  }
  const directNs = inline.dns["direct-nameserver"] || [];
  if (!directNs.includes("https://223.5.5.5/dns-query")) {
    throw new Error("DNS：direct-nameserver 未配置国内 DoH");
  }
  if (!inline.sniffer || inline.sniffer.enable !== true) throw new Error("Sniffer：未开启");
  if (inline.sniffer["skip-dst-address"].indexOf("192.168.0.0/16") === -1) throw new Error("Sniffer：内网网段未豁免");
  const skipDomains = inline.sniffer["skip-domain"] || [];
  if (!skipDomains.includes("+.openai.com") || !skipDomains.includes("+.apple.com")) {
    throw new Error("Sniffer：skip-domain 缺少 Apple / OpenAI 例外");
  }
  // skip-domain 按域名模式匹配；非域名字符串（含空格等）永远不会命中，禁止再混入
  const badSkipDomain = skipDomains.filter((d) => !/^[+*]?\.?[a-z0-9.*-]+\.[a-z*]{2,}$/i.test(String(d)));
  if (badSkipDomain.length) throw new Error(`Sniffer：skip-domain 含非域名条目 -> ${badSkipDomain.join(", ")}`);

  const rules = inline.rules || [];
  if (rules[0] !== "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve") throw new Error(`规则：首条应为内网直连，实际 ${rules[0]}`);
  if (!rules.includes("GEOSITE,private,DIRECT") || !rules.includes("GEOIP,private,DIRECT,no-resolve")) {
    throw new Error("规则：缺少 GEOSITE,private / GEOIP,private,DIRECT,no-resolve");
  }
  const ntpRule = "AND,((DST-PORT,123),(NETWORK,udp)),DIRECT";
  const ntpIdx = rules.indexOf(ntpRule);
  const firstRuleSet = rules.findIndex((r) => r.startsWith("RULE-SET,"));
  if (ntpIdx === -1 || firstRuleSet === -1 || ntpIdx > firstRuleSet) {
    throw new Error("规则：NTP 直连缺失或未排在所有 RULE-SET 之前");
  }
  const missing = data.directRules.filter((r) => !rules.includes(r));
  if (missing.length) throw new Error(`规则：直连白名单未注入 -> ${missing.slice(0, 3).join(" | ")}`);
  if (rules.indexOf(data.directRules[0]) !== PRIVATE_CIDRS.length + 3) throw new Error("规则：白名单未紧跟内网/private/NTP 规则置顶");
  if (!rules.includes("DOMAIN-SUFFIX,googleapis.cn,🚀 策略选择")) throw new Error("规则：googleapis.cn 修复规则缺失");
  if (rules.some((r) => r.includes("anti-ad"))) throw new Error("规则：不应再有 anti-AD 规则");
  if (!rules.includes("RULE-SET,ai-cn,🇨🇳 国内 AI")) throw new Error("规则：国内 AI 分组未注入");
  if (!rules.includes("RULE-SET,ai-global,🌍 国外 AI")) throw new Error("规则：国外 AI 分组未注入");
  if (rules.includes("RULE-SET,ai,🤖️ 人工智能")) throw new Error("规则：旧混合 AI 分组不应存在");
  if (!rules.includes("MATCH,🐟 漏网之鱼") || !rules.includes("GEOIP,CN,🌐 全球直连,no-resolve")) throw new Error("规则：兜底规则或 GEOIP,CN,no-resolve 缺失");
  if (!rules.includes("GEOSITE,cn,🌐 全球直连")) throw new Error("规则：国内域名兜底 GEOSITE,cn 缺失");
  if (rules.indexOf("GEOSITE,cn,🌐 全球直连") > rules.indexOf("MATCH,🐟 漏网之鱼")) throw new Error("规则：GEOSITE,cn 必须在 MATCH 之前");
  const fakeIp = inline.dns["fake-ip-filter"] || [];
  if (!fakeIp.includes("geosite:cn") || !fakeIp.includes("geosite:private") || !fakeIp.includes("+.ntp.org")) {
    throw new Error("DNS：fake-ip-filter 缺少 geosite:cn / geosite:private / +.ntp.org");
  }
  if (!fakeIp.includes("rule-set:" + data.communityFakeIpFilterKey)) {
    throw new Error("DNS：fake-ip-filter 缺少社区豁免清单 rule-set 引用");
  }

  const groups = inline["proxy-groups"] || [];
  const groupNames = new Set(groups.map((g) => g.name));
  if (groupNames.has("旧分组")) throw new Error("分组：订阅旧分组未被替换");

  // 规则目标必须存在（末尾的 no-resolve 等修饰符不是目标，需跳过）
  const badTargets = [];
  for (const r of rules) {
    const parts = r.split(",");
    let end = parts.length - 1;
    while (end > 1 && /^(no-resolve|src|dst)$/i.test(parts[end].trim())) end--;
    const target = r.startsWith("MATCH") ? parts[1] : parts[end];
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
  const infoLeak = groups.filter((g) => (g.proxies || []).some((n) => /^(Traffic|📢)/i.test(n)));
  if (infoLeak.length) throw new Error(`分组：伪节点混入 -> ${infoLeak.map((g) => g.name).join(", ")}`);

  // 测速组必须 HTTPS，且容错参数统一
  const badProbe = groups.filter((g) => g.type === "url-test" && !/^https:\/\//.test(String(g.url)));
  if (badProbe.length) throw new Error(`测速：未使用 HTTPS -> ${badProbe.map((g) => g.name).join(", ")}`);
  const badProbeCfg = groups.filter((g) => g.type === "url-test" &&
    (g.interval !== 300 || g.tolerance !== 30 || g["max-failed-times"] !== 5 || g["expected-status"] !== 204));
  if (badProbeCfg.length) throw new Error(`测速：容错参数不一致 -> ${badProbeCfg.map((g) => g.name).join(", ")}`);

  // 规则源
  const rp = inline["rule-providers"] || {};
  if (rp["anti-ad"]) throw new Error("规则源：不应再有 anti-AD 源");
  if (groupNames.has("🛑 广告拦截")) throw new Error("分组：不应再有广告拦截组");
  for (const rs of data.rulesets) {
    const p = rp[rs.key];
    if (!p) throw new Error(`规则源：${rs.key} 缺失`);
    if (isMrs) {
      if (p.format !== "mrs" || !["domain", "ipcidr"].includes(p.behavior) || !String(p.url).endsWith(".mrs")) {
        throw new Error(`规则源（MRS）：${rs.key} 格式或 behavior 错误 -> ${JSON.stringify(p)}`);
      }
      if (!String(p.path).startsWith("./providers/rules/mrs-")) {
        throw new Error(`规则源（MRS）：${rs.key} 本地缓存路径未加 mrs- 前缀隔离`);
      }
      if (rs.behavior === "ipcidr" && !rules.includes(`RULE-SET,${rs.key},${rs.target},no-resolve`)) {
        throw new Error(`规则（MRS）：ipcidr 规则集 ${rs.key} 必须带 ,no-resolve`);
      }
    } else {
      if (p.format !== "yaml" || p.behavior !== "classical" || !String(p.url).endsWith(`/${rs.key}.rule`)) {
        throw new Error(`规则源：${rs.key} 缺失或 URL 错误`);
      }
    }
  }
  const communityProvider = rp[data.communityFakeIpFilterKey];
  if (!communityProvider || communityProvider.format !== "mrs" ||
      communityProvider.behavior !== "domain" || communityProvider.url !== data.communityFakeIpFilterUrl) {
    throw new Error("规则源：社区 fake-ip-filter 清单缺失或格式错误");
  }
  if (rules.some((r) => r.startsWith("RULE-SET," + data.communityFakeIpFilterKey))) {
    throw new Error("规则源：社区豁免清单只能供 DNS 查询，不应产出 RULE-SET 规则");
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
  if (!pAuto["exclude-filter"] || pAuto["exclude-type"] !== "direct|reject") throw new Error("provider 模式：自动选择缺少伪节点过滤");
  if (!pManual || !Array.isArray(pManual.use)) throw new Error("provider 模式：手动选择未使用 use");
  if (!pManual["exclude-filter"] || pManual["exclude-type"] !== "direct|reject") throw new Error("provider 模式：手动选择缺少伪节点过滤");
  if (pGroups.some((g) => g.type === "url-test" && !g.use && !g.proxies && !g["include-all"])) {
    throw new Error("provider 模式：存在空组");
  }
  if (!provider.rules.includes("MATCH,🐟 漏网之鱼")) throw new Error("provider 模式：规则未生成");

  // provider 模式地区组：include-all + Go 正则筛选 + 空组兜底，全量创建
  const pRegions = pGroups.filter((g) => g["include-all"] === true);
  if (pRegions.length !== data.regions.length) throw new Error("provider 模式：地区组未全量创建");
  const pHk = pGroups.find((g) => g.name === "🇭🇰 香港节点");
  if (!pHk || !String(pHk.filter).startsWith("(?i)") || !pHk["exclude-filter"] ||
      pHk["exclude-type"] !== "direct|reject" || pHk["empty-fallback"] !== "REJECT") {
    throw new Error("provider 模式：地区组缺少 include-all 筛选参数");
  }
  if (pRegions.some((g) => g.interval !== 300 || g["expected-status"] !== 204)) {
    throw new Error("provider 模式：地区组测速参数不一致");
  }
  const pHc = (provider["proxy-providers"] || {}).Sub["health-check"];
  if (!pHc || pHc.enable !== true || pHc.url !== data.probeUrl || pHc["expected-status"] !== 204) {
    throw new Error("provider 模式：provider health-check 未注入（地区测速会卡在首个节点）");
  }

  return { groups: groups.length, rules: rules.length, providers: Object.keys(rp).length };
}

function main() {
  const targets = [
    { variant: "classical", output: OUTPUT, label: "Classical 标准版 (yfamilys)" },
    { variant: "mrs", output: OUTPUT_MRS, label: "MRS 二进制版 (MetaCubeX)" },
  ];

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  for (const t of targets) {
    const code = generate(t.variant);
    const stat = verify(code, t.variant);
    fs.writeFileSync(t.output, code, "utf8");
    console.log(`✓ 已生成 ${path.relative(ROOT, t.output)} [${t.label}]（${(code.length / 1024).toFixed(1)} KB）`);
    console.log(`  分组 ${stat.groups} 个 / 规则 ${stat.rules} 条 / 规则源 ${stat.providers} 个`);
  }
  console.log("  自检通过：DNS / Sniffer / 分组顺序 / 区域匹配 / 伪节点剔除 / 规则引用 / provider 模式 / MRS 校验");
}

main();
