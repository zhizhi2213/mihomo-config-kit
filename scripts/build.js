#!/usr/bin/env node
/**
 * 自动拉取 IvanSolis1989/Smart-Config-Kit 上游 Mihomo 覆写脚本并仅注入「本地 Hosts 与内网直连」补丁：
 * - 100% 保留上游原有的 DNS 架构、节点适配与分流逻辑
 * - 开启 config.dns["use-system-hosts"] = true，支持本地 /etc/hosts (如 SwitchHosts) 实时切换环境
 * - 将内网网段加入 sniffer["skip-dst-address"]，防止本地 hosts 解析出的内网 IP 被 Sniffer 还原成域名
 * - 在 rules 顶部置顶内网网段（127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16）DIRECT 直连规则
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

function buildPatchSnippet() {
  const privateCidrsStr = PRIVATE_CIDRS.map((c) => `"${c}"`).join(", ");
  const directRules = PRIVATE_CIDRS.map((c) => `        "IP-CIDR,${c},DIRECT"`).join(",\n");

  return `
    // === [Custom Patch] 开启本地 Hosts 与内网开发直连 ===
    if (config.dns) {
      config.dns["use-system-hosts"] = true;
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
      });
    }
    if (Array.isArray(config.rules)) {
      // 置顶内网网段直连规则（不加 no-resolve，自动触发本地 /etc/hosts 解析并直连）
      config.rules.unshift(
${directRules}
      );
    }
    // === [Custom Patch End] ===`;
}

function applyPatches(rawContent, targetName) {
  const sortAnchor = "    sortProxyGroups(config)";
  if (!rawContent.includes(sortAnchor)) {
    throw new Error(`[${targetName}] 未找到 sortProxyGroups(config) 锚点`);
  }
  return rawContent.replace(sortAnchor, sortAnchor + "\n" + buildPatchSnippet());
}

function verifyPatchedScript(code, targetName) {
  const sandbox = { console: { log() {}, error() {}, warn() {} } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const mockConfig = {
    proxies: [
      { name: "🇭🇰 香港 IEPL 01", server: "hk.example.com", port: 10013, type: "ss", cipher: "aes-128-gcm", password: "123" },
    ],
    "proxy-groups": [],
    rules: [],
  };

  const out = sandbox.main(mockConfig);
  if (!out || !out.dns || out.dns["use-system-hosts"] !== true) {
    throw new Error(`[${targetName}] 校验失败：use-system-hosts 未开启`);
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
