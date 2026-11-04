#!/usr/bin/env node
/**
 * 自动拉取 IvanSolis1989/Smart-Config-Kit 上游 Mihomo 覆写脚本并注入通用增强补丁：
 * 1. 节点超时与 DNS 循环死锁修复补丁（修复节点入口域名 + udp://127.0.0.1:7874 + respect-rules 死锁、剔除 Traffic 信息节点）
 * 2. 本地 Hosts 与内网直连通用补丁（开启 use-system-hosts、豁免内网网段 Sniffer 嗅探、置顶 IP-CIDR 内网直连规则，支持任意本地 Hosts 域名动态切换）
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const UPSTREAM_BASE = "https://raw.githubusercontent.com/IvanSolis1989/Smart-Config-Kit/main";

// 可选：如需额外强制指定公网开发域名直连，可在此数组中添加域名后缀（默认留空，走通用内网 IP 自动识别）
const CUSTOM_DEV_DOMAINS = [];

// 机场节点入口与 CNAME 重定向域名后缀（强制使用国内 DNS 直连解析，防止 respect-rules 死锁）
const NODE_SERVER_DOMAINS = [
  "aws-agent.org",
  "apt-agent.org",
];

const PRIVATE_CIDRS = [
  "127.0.0.0/8",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
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

function buildPatchSnippet(devDomains) {
  const devWildcards = devDomains.map((d) => `"+.${d}"`);
  const devExacts = devDomains.map((d) => `"${d}"`);
  const nodeWildcards = NODE_SERVER_DOMAINS.map((d) => `"+.${d}"`);
  const allFakeIpFilters = [...nodeWildcards, ...devWildcards, ...devExacts].join(", ");
  const allSnifferSkips = [...devWildcards].join(", ");
  const privateCidrsStr = PRIVATE_CIDRS.map((c) => `"${c}"`).join(", ");

  const dnsPolicies = [
    ...NODE_SERVER_DOMAINS.map((d) => `      config.dns["nameserver-policy"]["+.${d}"] = ["223.5.5.5", "119.29.29.29"];`),
    ...devDomains.map((d) => `      config.dns["nameserver-policy"]["+.${d}"] = ["system", "223.5.5.5"];`),
  ].join("\n");

  const directRules = [
    ...NODE_SERVER_DOMAINS.map((d) => `        "DOMAIN-SUFFIX,${d},DIRECT"`),
    ...devDomains.map((d) => `        "DOMAIN-SUFFIX,${d},DIRECT"`),
    ...PRIVATE_CIDRS.map((c) => `        "IP-CIDR,${c},DIRECT"`),
  ].join(",\n");

  const snifferDomainBlock = devDomains.length > 0 ? `
      if (!Array.isArray(config.sniffer["skip-domain"])) {
        config.sniffer["skip-domain"] = [];
      }
      [${allSnifferSkips}].forEach(function(d) {
        if (config.sniffer["skip-domain"].indexOf(d) === -1) {
          config.sniffer["skip-domain"].push(d);
        }
      });` : "";

  return `
    // === [Custom Patch] 修复节点 DNS 循环死锁 + 开启本地 Hosts 与内网直连 ===
    if (config.dns) {
      config.dns["use-system-hosts"] = true;
      // 移除订阅自带的 udp://127.0.0.1:7874 自指策略，避免配合 respect-rules: true 与 hosts CNAME 产生循环死锁导致全部节点超时
      delete config.dns["proxy-server-nameserver-policy"];
      config.dns["proxy-server-nameserver"] = [
        "223.5.5.5",
        "119.29.29.29",
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query"
      ];
      config.dns["default-nameserver"] = [
        "223.5.5.5",
        "119.29.29.29"
      ];
      if (!config.dns["nameserver-policy"] || typeof config.dns["nameserver-policy"] !== "object") {
        config.dns["nameserver-policy"] = {};
      }
${dnsPolicies}

      if (Array.isArray(config.dns["fake-ip-filter"])) {
        [${allFakeIpFilters}].forEach(function(d) {
          if (config.dns["fake-ip-filter"].indexOf(d) === -1) {
            config.dns["fake-ip-filter"].push(d);
          }
        });
      }
    }
    if (config.sniffer) {
      // 豁免所有内网网段的目标 IP 嗅探，防止本地 hosts 解析出的内网 IP 被 Sniffer 还原成域名
      if (!Array.isArray(config.sniffer["skip-dst-address"])) {
        config.sniffer["skip-dst-address"] = [];
      }
      [${privateCidrsStr}].forEach(function(cidr) {
        if (config.sniffer["skip-dst-address"].indexOf(cidr) === -1) {
          config.sniffer["skip-dst-address"].push(cidr);
        }
      });${snifferDomainBlock}
    }
    if (Array.isArray(config.rules)) {
      // 置顶内网网段直连规则（不加 no-resolve，自动触发本地 /etc/hosts 解析并直连）
      config.rules.unshift(
${directRules}
      );
    }
    // === [Custom Patch End] ===`;
}

function applyPatches(rawContent, targetName, devDomains) {
  let content = rawContent;

  // 1. 补充 TRAFFIC 到 INFO_RE，剔除 "Traffic: 3.3 GB | 150 GB" 等流量提示假节点
  const infoReTarget = "var INFO_RE = /\\b(?:USE|USED|TOTAL|EXPIRE|EMAIL|Panel|Channel|Author|Sign|Login|Register|Help|FAQ)\\b/i";
  const infoReReplacement = "var INFO_RE = /\\b(?:TRAFFIC|USE|USED|TOTAL|EXPIRE|EMAIL|Panel|Channel|Author|Sign|Login|Register|Help|FAQ)\\b/i";
  if (content.includes(infoReTarget)) {
    content = content.replace(infoReTarget, infoReReplacement);
  } else if (!content.includes("TRAFFIC|USE|USED")) {
    throw new Error(`[${targetName}] 未找到 INFO_RE 锚点，上游脚本结构可能已变更`);
  }

  // 2. 在 sortProxyGroups(config) 之后注入超时修复与本地 Hosts 补丁
  const sortAnchor = "    sortProxyGroups(config)";
  if (!content.includes(sortAnchor)) {
    throw new Error(`[${targetName}] 未找到 sortProxyGroups(config) 锚点`);
  }
  const patchSnippet = buildPatchSnippet(devDomains);
  content = content.replace(sortAnchor, sortAnchor + "\n" + patchSnippet);

  return content;
}

function verifyPatchedScript(code, targetName) {
  const sandbox = { console: { log() {}, error() {}, warn() {} } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const mockConfig = {
    dns: {
      enable: true,
      listen: "127.0.0.1:7874",
      "use-hosts": true,
      "use-system-hosts": false,
      nameserver: ["tls://119.29.29.29", "tls://223.5.5.5"],
      "proxy-server-nameserver": ["udp://127.0.0.1:7874"],
      "fake-ip-filter": ["+.apt-agent.org"],
      "enhanced-mode": "fake-ip",
    },
    hosts: {
      "fd025gz8-c617.aws-agent.org": "b36d5gz0-2ac1.apt-agent.org",
    },
    proxies: [
      { name: "Traffic: 3.3 GB | 150 GB", server: "fd025gz8-c617.aws-agent.org", port: 10013, type: "ss", cipher: "aes-128-gcm", password: "123" },
      { name: "🇭🇰 香港 IEPL 01", server: "fd025gz8-c617.aws-agent.org", port: 10013, type: "ss", cipher: "aes-128-gcm", password: "123" },
    ],
    "proxy-groups": [],
    rules: [],
  };

  const out = sandbox.main(mockConfig);
  if (!out || !out.dns || out.dns["use-system-hosts"] !== true) {
    throw new Error(`[${targetName}] 校验失败：use-system-hosts 未开启`);
  }
  if (out.dns["proxy-server-nameserver-policy"] !== undefined) {
    throw new Error(`[${targetName}] 校验失败：proxy-server-nameserver-policy 未清理`);
  }
  if (out.proxies.length !== 1 || out.proxies[0].name !== "🇭🇰 香港 IEPL 01") {
    throw new Error(`[${targetName}] 校验失败：Traffic 假节点未被过滤`);
  }
  if (!out.rules.includes("IP-CIDR,10.0.0.0/8,DIRECT") || !out.rules.includes("IP-CIDR,192.168.0.0/16,DIRECT")) {
    throw new Error(`[${targetName}] 校验失败：内网 IP-CIDR 直连规则未注入`);
  }
  if (Object.keys(out["rule-providers"] || {}).length < 100) {
    throw new Error(`[${targetName}] 校验失败：融合规则集数量异常`);
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
    const patched = applyPatches(raw, target.name, CUSTOM_DEV_DOMAINS);
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
