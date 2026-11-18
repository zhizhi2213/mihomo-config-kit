// ============================================================
// mihomo-config-kit v1.1.0 — Mihomo 覆写脚本（FlClash / Clash Party / Clash Meta）
// 本文件由 scripts/build.js 自动生成，请勿手动编辑
// 覆盖内容：DNS(fake-ip) / Sniffer / 代理组 / rule-providers / rules
// 分组顺序：策略选择 → 自动/手动 → 广告拦截 → 国内/国外 AI → 应用分流 → 漏网之鱼 → 区域节点组
// 规则顺序：内网直连 → 直连白名单 → anti-AD 去广告 → yfamilys 分流（国内AI直连/国外AI代理） → GEOIP,CN → 漏网之鱼
// ============================================================

var MIHOMO_KIT = {
  "version": "1.1.0",
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
    "+.srv.nintendo.net",
    "+.stun.playstation.net",
    "+.msftconnecttest.com",
    "+.msftncsi.com",
    "msftconnecttest.com",
    "xbox.*.microsoft.com",
    "*.battlenet.com.cn",
    "*.battlenet.com",
    "*.blzstatic.cn",
    "+.market.xiaomi.com"
  ],
  "probeUrl": "https://www.gstatic.com/generate_204",
  "infoNodeRe": "^(Traffic|traffic|流量|剩余|到期|过期|Expire|expire|套餐|官网|重置|距离下次|已用)",
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
      "exclude": "俄罗斯|russia|新加坡|singapore|韩国|korea|台湾|taiwan|香港|hong ?kong|日本|japan"
    },
    {
      "name": "🇬🇧 英国节点",
      "include": "英|uk|伦敦|london|manchester|曼彻斯特",
      "exclude": "乌克兰|ukraine"
    },
    {
      "name": "🇩🇪 德国节点",
      "include": "德|germany|柏林|慕尼黑|法兰克福|frankfurt",
      "exclude": ""
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
      "name": "🛑 广告拦截",
      "style": "fixed",
      "proxies": [
        "REJECT",
        "DIRECT",
        "🚀 策略选择"
      ]
    },
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
      "key": "Apple",
      "target": "🍎 苹果服务"
    },
    {
      "key": "AppStore",
      "target": "🍎 苹果服务"
    },
    {
      "key": "AppleProxy",
      "target": "🚀 策略选择"
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
    "adblock": "🛑 广告拦截",
    "ai": "🌍 国外 AI",
    "aiCn": "🇨🇳 国内 AI",
    "telegram": "📲 Telegram",
    "youtube": "📹 YouTube",
    "netflix": "🎥 Netflix",
    "disney": "🎬 Disney+",
    "spotify": "🎻 Spotify",
    "twitter": "📄 Twitter",
    "facebook": "👤 Facebook",
    "reddit": "📖 Reddit",
    "discord": "🐦 Discord",
    "paypal": "🪙 Paypal",
    "game": "🎮 游戏平台",
    "foreignMedia": "🍿 国外媒体",
    "microsoft": "Ⓜ️ 微软服务",
    "apple": "🍎 苹果服务",
    "bilibili": "📽 哔哩哔哩",
    "cnMedia": "🍔 国内媒体",
    "weibo": "🍟 新浪微博",
    "direct": "🌐 全球直连",
    "final": "🐟 漏网之鱼",
    "hk": "🇭🇰 香港节点",
    "tw": "🇨🇳 台湾节点"
  },
  "ruleBase": "https://yfamilys.com/rule",
  "antiAdUrl": "https://raw.githubusercontent.com/privacy-protection-tools/anti-AD/master/anti-ad-clash.yaml"
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
