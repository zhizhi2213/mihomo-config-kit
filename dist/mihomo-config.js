// ============================================================
// mihomo-config-kit v1.5.0 [Classical 标准版] — Mihomo 覆写脚本（FlClash / Clash Party / Clash Meta）
// 本文件由 scripts/build.js 自动生成，请勿手动编辑
// 覆盖内容：DNS(fake-ip) / Sniffer / 代理组 / rule-providers / rules
// DNS：arc 缓存、respect-rules + nameserver-policy 防泄漏、fake-ip-filter 含 geosite:cn + 社区 rule-set:fakeip-filter
// 分组顺序：策略选择 → 自动/手动 → 国内/国外 AI → 应用分流 → 漏网之鱼 → 区域节点组
// 规则顺序：内网/private 直连 → NTP 直连 → 直连白名单 → googleapis.cn 例外 → yfamilys 分流（国内AI直连/国外AI代理） → GEOIP,CN → GEOSITE,cn → 漏网之鱼
// ============================================================

var MIHOMO_KIT = {
  "version": "1.5.0",
  "variant": "classical",
  "privateCidrs": [
    "127.0.0.0/8",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16"
  ],
  "directRules": [
    "DOMAIN-SUFFIX,doubao.com,DIRECT",
    "DOMAIN-SUFFIX,doubaocdn.com,DIRECT",
    "DOMAIN-SUFFIX,byteimg.com,DIRECT",
    "DOMAIN-SUFFIX,bytescm.com,DIRECT",
    "DOMAIN-SUFFIX,bytegoofy.com,DIRECT",
    "DOMAIN-SUFFIX,bytednsdoc.com,DIRECT",
    "DOMAIN-SUFFIX,bytecdntp.com,DIRECT",
    "DOMAIN-SUFFIX,bytetos.com,DIRECT",
    "DOMAIN-SUFFIX,douyinpic.com,DIRECT",
    "DOMAIN-SUFFIX,douyinstatic.com,DIRECT",
    "DOMAIN-SUFFIX,volccdn.com,DIRECT",
    "DOMAIN-SUFFIX,volces.com,DIRECT",
    "DOMAIN-SUFFIX,volcengine.com,DIRECT",
    "DOMAIN-SUFFIX,snssdk.com,DIRECT",
    "DOMAIN-SUFFIX,pstatp.com,DIRECT",
    "DOMAIN-SUFFIX,zijieapi.com,DIRECT",
    "DOMAIN-SUFFIX,ibytedapm.com,DIRECT",
    "DOMAIN-SUFFIX,bytedance.com,DIRECT",
    "DOMAIN-SUFFIX,bytedance.net,DIRECT",
    "DOMAIN-SUFFIX,ctobsnssdk.com,DIRECT",
    "DOMAIN-SUFFIX,dingtalk.com,DIRECT",
    "DOMAIN-SUFFIX,dingtalkapps.com,DIRECT",
    "DOMAIN-SUFFIX,dingtalkcloud.com,DIRECT"
  ],
  "fakeIpFilter": [
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
    "geosite:cn",
    "rule-set:fakeip-filter"
  ],
  "communityFakeIpFilterKey": "fakeip-filter",
  "communityFakeIpFilterUrl": "https://cdn.jsdmirror.com/gh/wwqgtxx/clash-rules@release/fakeip-filter.mrs",
  "probeUrl": "https://www.gstatic.com/generate_204",
  "infoNodeRe": "(剩余|官网|套餐|流量|到期|过期|更新|刷新|订阅|群|网址|客服|欢迎|加入|Expire|Traffic|Reset|重置|距离下次|已用|(^|[^A-Za-z0-9])(\\d+(\\.\\d+)?\\s*(GB|TB)|\\d+\\s*Days?)([^A-Za-z0-9]|$))",
  "geoxUrl": {
    "mmdb": "https://cdn.jsdmirror.com/gh/MetaCubeX/meta-rules-dat@release/country.mmdb",
    "geoip": "https://cdn.jsdmirror.com/gh/MetaCubeX/meta-rules-dat@release/geoip.dat",
    "geosite": "https://cdn.jsdmirror.com/gh/MetaCubeX/meta-rules-dat@release/geosite.dat"
  },
  "snifferSkipDomains": [
    "+.apple.com",
    "+.openai.com",
    "+.oaistatic.com",
    "+.oaiusercontent.com",
    "+.chatgpt.com"
  ],
  "regions": [
    {
      "name": "🇭🇰 香港节点",
      "include": "港|hk|hong ?kong",
      "exclude": "美|us|台|tw|日|jp|新加坡|sg|韩|kr"
    },
    {
      "name": "🇨🇳 台湾节点",
      "include": "台|tw|taiwan",
      "exclude": ""
    },
    {
      "name": "🇯🇵 日本节点",
      "include": "日|jp|japan|东京|大阪|tokyo|osaka",
      "exclude": ""
    },
    {
      "name": "🇸🇬 新加坡节点",
      "include": "新加坡|狮城|sg|singapore",
      "exclude": ""
    },
    {
      "name": "🇰🇷 韩国节点",
      "include": "韩|kr|korea|首尔|seoul",
      "exclude": ""
    },
    {
      "name": "🇺🇸 美国节点",
      "include": "美|us|united ?states|america|洛杉矶|圣何塞|西雅图|凤凰城|los ?angeles|seattle|san ?jose",
      "exclude": "俄罗斯|russia|新加坡|singapore|韩国|korea|台湾|taiwan|香港|hong ?kong|日本|japan|australia|austria|澳大利亚|奥地利"
    },
    {
      "name": "🇬🇧 英国节点",
      "include": "英|uk|伦敦|london|manchester|曼彻斯特",
      "exclude": "乌克兰|ukraine|日本|japan|fukuoka|福冈"
    },
    {
      "name": "🇩🇪 德国节点",
      "include": "德|germany|柏林|慕尼黑|法兰克福|frankfurt",
      "exclude": "印度|india|德里|马德里|阿德莱德"
    },
    {
      "name": "🇷🇺 俄罗斯节点",
      "include": "俄|russia|莫斯科|moscow|圣彼得堡",
      "exclude": ""
    },
    {
      "name": "🇨🇦 加拿大节点",
      "include": "加拿大|canada|多伦多|温哥华|toronto|vancouver",
      "exclude": ""
    },
    {
      "name": "🇮🇳 印度节点",
      "include": "印度|india|孟买|mumbai|新德里|delhi",
      "exclude": ""
    }
  ],
  "appGroups": [
    {
      "name": "🇨🇳 国内 AI",
      "style": "direct"
    },
    {
      "name": "🌍 国外 AI",
      "style": "proxy"
    },
    {
      "name": "📲 Telegram",
      "style": "proxy"
    },
    {
      "name": "📹 YouTube",
      "style": "proxy"
    },
    {
      "name": "🎥 Netflix",
      "style": "proxy"
    },
    {
      "name": "🎬 Disney+",
      "style": "proxy"
    },
    {
      "name": "🎻 Spotify",
      "style": "proxy"
    },
    {
      "name": "📄 Twitter",
      "style": "proxy"
    },
    {
      "name": "👤 Facebook",
      "style": "proxy"
    },
    {
      "name": "📖 Reddit",
      "style": "proxy"
    },
    {
      "name": "🐦 Discord",
      "style": "proxy"
    },
    {
      "name": "🪙 Paypal",
      "style": "proxy"
    },
    {
      "name": "🎮 游戏平台",
      "style": "proxy"
    },
    {
      "name": "🍿 国外媒体",
      "style": "proxy"
    },
    {
      "name": "Ⓜ️ 微软服务",
      "style": "direct"
    },
    {
      "name": "🍎 苹果服务",
      "style": "direct"
    },
    {
      "name": "📽 哔哩哔哩",
      "style": "bilibili"
    },
    {
      "name": "🍔 国内媒体",
      "style": "direct"
    },
    {
      "name": "🍟 新浪微博",
      "style": "direct"
    },
    {
      "name": "🌐 全球直连",
      "style": "direct"
    },
    {
      "name": "🐟 漏网之鱼",
      "style": "final"
    }
  ],
  "rulesets": [
    {
      "key": "ai-cn",
      "target": "🇨🇳 国内 AI"
    },
    {
      "key": "ai-global",
      "target": "🌍 国外 AI"
    },
    {
      "key": "Microsoft",
      "target": "Ⓜ️ 微软服务"
    },
    {
      "key": "AppleProxy",
      "target": "🚀 策略选择"
    },
    {
      "key": "Apple",
      "target": "🍎 苹果服务"
    },
    {
      "key": "AppStore",
      "target": "🍎 苹果服务"
    },
    {
      "key": "Telegram",
      "target": "📲 Telegram"
    },
    {
      "key": "Weibo",
      "target": "🍟 新浪微博"
    },
    {
      "key": "WeChat",
      "target": "🌐 全球直连"
    },
    {
      "key": "Twitter",
      "target": "📄 Twitter"
    },
    {
      "key": "PlayStation",
      "target": "🎮 游戏平台"
    },
    {
      "key": "Epic",
      "target": "🎮 游戏平台"
    },
    {
      "key": "Sony",
      "target": "🎮 游戏平台"
    },
    {
      "key": "Steam",
      "target": "🎮 游戏平台"
    },
    {
      "key": "Nintendo",
      "target": "🎮 游戏平台"
    },
    {
      "key": "WanMeiShiJie",
      "target": "🎮 游戏平台"
    },
    {
      "key": "Blizzard",
      "target": "🎮 游戏平台"
    },
    {
      "key": "Spotify",
      "target": "🎻 Spotify"
    },
    {
      "key": "PayPal",
      "target": "🪙 Paypal"
    },
    {
      "key": "Facebook",
      "target": "👤 Facebook"
    },
    {
      "key": "Reddit",
      "target": "📖 Reddit"
    },
    {
      "key": "Discord",
      "target": "🐦 Discord"
    },
    {
      "key": "YouTube",
      "target": "📹 YouTube"
    },
    {
      "key": "YouTubeMusic",
      "target": "📹 YouTube"
    },
    {
      "key": "Netflix",
      "target": "🎥 Netflix"
    },
    {
      "key": "Disney",
      "target": "🎬 Disney+"
    },
    {
      "key": "BiliBili",
      "target": "📽 哔哩哔哩"
    },
    {
      "key": "ChinaMedia",
      "target": "🍔 国内媒体"
    },
    {
      "key": "ProxyMedia",
      "target": "🍿 国外媒体"
    },
    {
      "key": "Twitch",
      "target": "🚀 策略选择"
    },
    {
      "key": "Douyu",
      "target": "🌐 全球直连"
    },
    {
      "key": "Google",
      "target": "🚀 策略选择"
    },
    {
      "key": "Proxy",
      "target": "🚀 策略选择"
    },
    {
      "key": "ASN-CN",
      "target": "🌐 全球直连"
    }
  ],
  "G": {
    "strategy": "🚀 策略选择",
    "auto": "♻️ 自动选择",
    "manual": "👐 手动选择",
    "direct": "🌐 全球直连",
    "final": "🐟 漏网之鱼",
    "hk": "🇭🇰 香港节点",
    "tw": "🇨🇳 台湾节点"
  },
  "ruleBase": "https://yfamilys.com/rule"
};

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
