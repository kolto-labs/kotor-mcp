export const REPO_URL = 'https://github.com/kolto-labs/kotor-mcp';
export const INSTALL_SH_URL =
  'https://raw.githubusercontent.com/kolto-labs/kotor-mcp/main/scripts/install.sh';
export const INSTALL_PS1_URL =
  'https://raw.githubusercontent.com/kolto-labs/kotor-mcp/main/scripts/install.ps1';

export const OS_LIST = [
  { id: 'windows', label: 'Windows' },
  { id: 'macos', label: 'macOS' },
  { id: 'linux', label: 'Linux' }
];

export const OS_META = {
  windows: {
    label: 'Windows',
    defaultInstallCmd: `powershell -ExecutionPolicy ByPass -c "irm ${INSTALL_PS1_URL} | iex"`,
    altInstallCmd: `cargo install --git ${REPO_URL} --locked`,
    verifyCmd: 'kq --version',
    fullBinPath: '%USERPROFILE%\\.local\\bin\\kq.exe',
    presets: [
      {
        label: 'KotOR I (Steam)',
        path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\swkotor'
      },
      {
        label: 'KotOR II / TSL (Steam)',
        path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Knights of the Old Republic II'
      },
      {
        label: 'KotOR I (GOG)',
        path: 'C:\\GOG Games\\Star Wars - KotOR'
      },
      {
        label: 'KotOR II (GOG)',
        path: 'C:\\GOG Games\\Star Wars - KotOR2'
      }
    ]
  },
  macos: {
    label: 'macOS',
    defaultInstallCmd: `curl -LsSf ${INSTALL_SH_URL} | sh`,
    altInstallCmd: `cargo install --git ${REPO_URL} --locked`,
    verifyCmd: 'kq --version',
    fullBinPath: '~/.local/bin/kq',
    presets: [
      {
        label: 'KotOR I (Steam)',
        path: '~/Library/Application Support/Steam/steamapps/common/swkotor/Knights of the Old Republic.app/Contents/KOTOR Data'
      },
      {
        label: 'KotOR II (Steam)',
        path: '~/Library/Application Support/Steam/steamapps/common/Knights of the Old Republic II/KOTOR2.app/Contents/GameData'
      }
    ]
  },
  linux: {
    label: 'Linux',
    defaultInstallCmd: `curl -LsSf ${INSTALL_SH_URL} | sh`,
    altInstallCmd: `cargo install --git ${REPO_URL} --locked`,
    verifyCmd: 'kq --version',
    fullBinPath: '~/.local/bin/kq',
    presets: [
      {
        label: 'KotOR I (Steam)',
        path: '~/.local/share/Steam/steamapps/common/swkotor'
      },
      {
        label: 'KotOR II / TSL (Steam)',
        path: '~/.local/share/Steam/steamapps/common/Knights of the Old Republic II'
      }
    ]
  }
};

export const APPS = [
  {
    id: 'claude',
    label: 'Claude',
    badge: 'Desktop + Code',
    defaultMode: 'claude-desktop',
    modes: [
      {
        id: 'claude-desktop',
        label: 'Claude Desktop',
        note: 'Paste into claude_desktop_config.json, then restart Claude Desktop.'
      },
      {
        id: 'claude-code',
        label: 'Claude Code',
        note: 'Install the full Kolto plugin (MCP + skills + explorer agent) or add the MCP server alone.'
      }
    ]
  },
  {
    id: 'gemini',
    label: 'Gemini',
    badge: 'CLI + Antigravity',
    defaultMode: 'gemini-cli',
    modes: [
      {
        id: 'gemini-cli',
        label: 'Gemini CLI',
        note: 'Fastest free local Gemini setup: one command adds kq to ~/.gemini/settings.json.'
      },
      {
        id: 'gemini-antigravity',
        label: 'Antigravity / IDE',
        note: 'Add kq to ~/.gemini/antigravity/mcp_config.json or project .gemini/settings.json.'
      },
      {
        id: 'gemini-web',
        label: 'Gemini Web',
        note: 'Browser-based gemini.google.com cannot spawn local stdio processes. Use Gemini CLI or paste kq output.'
      }
    ]
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    badge: 'Codex + Web',
    defaultMode: 'chatgpt-codex',
    modes: [
      {
        id: 'chatgpt-codex',
        label: 'Codex / Desktop',
        note: 'Native local stdio via OpenAI Codex CLI or Desktop (~/.codex/config.toml). No tunnel needed.'
      },
      {
        id: 'chatgpt-web',
        label: 'ChatGPT Web',
        note: 'Cloud ChatGPT requires an HTTPS MCP URL. Expose read-only kq mcp locally over a temporary tunnel.'
      }
    ]
  },
  {
    id: 'cursor',
    label: 'Cursor',
    badge: '1-Click',
    defaultMode: 'cursor-deeplink',
    modes: [
      {
        id: 'cursor-deeplink',
        label: 'One-click + mcp.json',
        note: 'Click the deeplink button to install directly in Cursor, or drop .cursor/mcp.json in your workspace.'
      }
    ]
  },
  {
    id: 'vscode',
    label: 'VS Code',
    badge: 'Copilot MCP',
    defaultMode: 'vscode-mcp',
    modes: [
      {
        id: 'vscode-mcp',
        label: '.vscode/mcp.json',
        note: 'VS Code uses the top-level "servers" key with "type": "stdio".'
      }
    ]
  },
  {
    id: 'other',
    label: 'Any MCP Client',
    badge: 'Stdio',
    defaultMode: 'other-stdio',
    modes: [
      {
        id: 'other-stdio',
        label: 'Standard JSON + Smoke Test',
        note: 'Works with Windsurf, OpenCode, Zed, or any client speaking MCP over stdio (2024-11-05 to 2025-11-25).'
      }
    ]
  }
];

export function shellQuotePosix(s) {
  return `'${String(s).replace(/'/g, "'\\''")}'`;
}

export function shellQuoteDouble(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function tomlBasicString(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function buildMcpServerObj(command, gamePath) {
  return {
    command,
    args: ['mcp'],
    env: {
      KQ_INSTALL: gamePath
    }
  };
}

export function buildCursorDeeplink(command, gamePath) {
  const cfg = buildMcpServerObj(command, gamePath);
  const json = JSON.stringify(cfg);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(bin);
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=kq&config=${encodeURIComponent(b64)}`;
}

export function getModePlan({ modeId, osId, gamePath, useFullPath }) {
  const os = OS_META[osId] || OS_META.windows;
  const cmd = useFullPath ? os.fullBinPath : 'kq';

  if (modeId === 'claude-desktop') {
    const configPath =
      osId === 'macos'
        ? '~/Library/Application Support/Claude/claude_desktop_config.json'
        : osId === 'windows'
          ? '%APPDATA%\\Claude\\claude_desktop_config.json'
          : '~/.config/Claude/claude_desktop_config.json';

    const openCmd =
      osId === 'macos'
        ? 'open ~/Library/Application\\ Support/Claude'
        : osId === 'windows'
          ? 'explorer "$env:APPDATA\\Claude"'
          : 'mkdir -p ~/.config/Claude && ${EDITOR:-nano} ~/.config/Claude/claude_desktop_config.json';

    const json = JSON.stringify(
      { mcpServers: { kq: buildMcpServerObj(cmd, gamePath) } },
      null,
      2
    );

    return {
      step2Title: 'Add kq to Claude Desktop',
      step2Sub:
        'Open Claude Desktop → Settings → Developer → Edit Config (or edit the file below), paste this JSON, and restart Claude Desktop.',
      primaryCodeLabel: configPath,
      primaryCode: json,
      downloadFilename: 'claude_desktop_config.json',
      downloadContent: json,
      extraHintTitle: osId === 'linux' ? 'Open or create config' : 'Quick-open config folder',
      extraHintCode: openCmd,
      pathTip:
        osId === 'windows'
          ? 'GUI desktop apps on macOS and Windows sometimes miss ~/.local/bin on PATH. If Claude Desktop reports ENOENT, toggle "Use full binary path" above.'
          : 'macOS GUI apps ignore shell RC files. Toggle "Use full binary path" above (~/.local/bin/kq) if Claude Desktop cannot find kq.',
      verifyPrompt:
        'Check my KotOR install with kq_info, then run kq_which on appearance.2da and tell me which copy actually loads.'
    };
  }

  if (modeId === 'claude-code') {
    const pluginCmd = [
      '/plugin marketplace add kolto-labs/kotor-mcp',
      '/plugin install kq@kolto-labs',
      '/kq:setup'
    ].join('\n');

    const cliCmd =
      osId === 'windows'
        ? `claude mcp add kq -e KQ_INSTALL="${gamePath}" -- ${cmd} mcp`
        : `claude mcp add kq -e KQ_INSTALL=${shellQuotePosix(gamePath)} -- ${cmd} mcp`;

    return {
      step2Title: 'Install the kq plugin (recommended) or MCP server in Claude Code',
      step2Sub:
        'The plugin adds the MCP server plus 5 KotOR workflows (kq-query, kq-formats, review, merge-mods, setup) and the kq-explorer agent.',
      primaryCodeLabel: 'Inside Claude Code (full plugin + skills)',
      primaryCode: pluginCmd,
      extraHintTitle: 'Or register only the MCP server in your terminal',
      extraHintCode: cliCmd,
      verifyPrompt:
        'Use kq_info to confirm my game folder, then find every dialogue in Taris mentioning Bastila.'
    };
  }

  if (modeId === 'gemini-cli') {
    const cliCmd =
      osId === 'windows'
        ? `gemini mcp add kq -e KQ_INSTALL="${gamePath}" ${cmd} mcp`
        : `gemini mcp add kq -e KQ_INSTALL=${shellQuotePosix(gamePath)} ${cmd} mcp`;

    const settingsJson = JSON.stringify(
      { mcpServers: { kq: buildMcpServerObj(cmd, gamePath) } },
      null,
      2
    );

    return {
      step2Title: 'Register kq in Gemini CLI',
      step2Sub:
        'Run this once in your terminal, then start Gemini CLI and type /mcp to verify the 7 kq_* tools appear.',
      primaryCodeLabel: 'Terminal command',
      primaryCode: cliCmd,
      extraHintTitle: 'Or edit ~/.gemini/settings.json directly',
      extraHintCode: settingsJson,
      downloadFilename: 'settings.json',
      downloadContent: settingsJson,
      verifyPrompt:
        'Run kq_info on my install, then check which copy of appearance.2da loads and show row 8.'
    };
  }

  if (modeId === 'gemini-antigravity') {
    const json = JSON.stringify(
      { mcpServers: { kq: buildMcpServerObj(cmd, gamePath) } },
      null,
      2
    );

    const cfgPath =
      osId === 'windows'
        ? '%USERPROFILE%\\.gemini\\antigravity\\mcp_config.json (or .gemini\\settings.json)'
        : '~/.gemini/antigravity/mcp_config.json (or .gemini/settings.json)';

    return {
      step2Title: 'Add kq to Antigravity / Gemini IDE MCP config',
      step2Sub:
        'Merge the mcpServers entry below into your Antigravity MCP config or project .gemini/settings.json.',
      primaryCodeLabel: cfgPath,
      primaryCode: json,
      downloadFilename: 'mcp_config.json',
      downloadContent: json,
      verifyPrompt:
        'Use kq_info to inspect my KotOR install and list all .utc creature templates in module danm13.'
    };
  }

  if (modeId === 'gemini-web') {
    const cliSnippet =
      osId === 'windows'
        ? `kq -i "${gamePath}" which appearance.2da\nkq -i "${gamePath}" cat appearance.2da | Select-Object -First 40`
        : `kq -i ${shellQuotePosix(gamePath)} which appearance.2da\nkq -i ${shellQuotePosix(gamePath)} cat appearance.2da | head -n 40`;

    return {
      step2Title: 'Two ways to use kq with Gemini',
      step2Sub:
        'Web chat at gemini.google.com runs in the cloud and cannot spawn local stdio MCP servers on your PC. For live tool calls, use Gemini CLI (free with your Google account); otherwise paste clean kq JSON/outline output straight into Gemini Web.',
      switchAction: {
        label: 'Switch to Gemini CLI (live MCP)',
        targetApp: 'gemini',
        targetMode: 'gemini-cli'
      },
      primaryCodeLabel: 'Run locally and paste output into Gemini Web',
      primaryCode: cliSnippet,
      verifyPrompt:
        'Here is the JSON output from `kq which` and `kq cat`. Which copy of appearance.2da is the game loading, and which fields differ from vanilla?'
    };
  }

  if (modeId === 'chatgpt-codex') {
    const cliCmd =
      osId === 'windows'
        ? `codex mcp add kq --env KQ_INSTALL="${gamePath}" -- ${cmd} mcp`
        : `codex mcp add kq --env KQ_INSTALL=${shellQuotePosix(gamePath)} -- ${cmd} mcp`;

    const toml = [
      '[mcp_servers.kq]',
      `command = ${tomlBasicString(cmd)}`,
      'args = ["mcp"]',
      `env = { KQ_INSTALL = ${tomlBasicString(gamePath)} }`
    ].join('\n');

    const tomlPath =
      osId === 'windows' ? '%USERPROFILE%\\.codex\\config.toml' : '~/.codex/config.toml';

    return {
      step2Title: 'Connect kq to OpenAI Codex CLI / Desktop',
      step2Sub:
        'Codex CLI and the ChatGPT Desktop / Codex workflow launch local stdio MCP servers directly with zero tunnels.',
      primaryCodeLabel: 'Terminal command',
      primaryCode: cliCmd,
      extraHintTitle: `Or add to ${tomlPath}`,
      extraHintCode: toml,
      verifyPrompt:
        'Confirm my KotOR install with kq_info, then run kq_graph on my Override folder for missing references.'
    };
  }

  if (modeId === 'chatgpt-web') {
    const bridgeCmd =
      osId === 'windows'
        ? `# Terminal 1 — expose read-only kq mcp locally on port 8765\nnpx -y supergateway --stdio "${cmd} mcp -i \\"${gamePath}\\"" --port 8765 --outputTransport streamableHttp\n\n# Terminal 2 — temporary HTTPS tunnel for ChatGPT Web\ncloudflared tunnel --url http://localhost:8765`
        : `# Terminal 1 — expose read-only kq mcp locally on port 8765\nnpx -y supergateway --stdio ${shellQuotePosix(`${cmd} mcp -i ${shellQuoteDouble(gamePath)}`)} --port 8765 --outputTransport streamableHttp\n\n# Terminal 2 — temporary HTTPS tunnel for ChatGPT Web\ncloudflared tunnel --url http://localhost:8765`;

    return {
      step2Title: 'Bridge local kq mcp to ChatGPT Web (or use Codex Desktop)',
      step2Sub:
        'ChatGPT on the web runs in OpenAI’s cloud and blocks localhost URLs. On supported ChatGPT plans with Developer Mode / Custom Apps, you can expose kq mcp (strictly read-only) via a temporary HTTPS tunnel, then paste https://<your-tunnel>/mcp as a custom MCP server.',
      switchAction: {
        label: 'Use Codex / Desktop instead (no tunnel)',
        targetApp: 'chatgpt',
        targetMode: 'chatgpt-codex'
      },
      primaryCodeLabel: 'Temporary read-only HTTPS bridge (stops when terminal closes)',
      primaryCode: bridgeCmd,
      metaSteps: [
        'Start both commands above (requires Node.js + cloudflared). Copy the https://*.trycloudflare.com URL printed by cloudflared.',
        'In ChatGPT Web, open Settings / Connectors (Developer Mode or Workspace Apps) → Add custom MCP server and enter https://<your-tunnel>/mcp.',
        'Close the terminal when finished to shut down the tunnel immediately.'
      ],
      verifyPrompt:
        'Call kq_info on my install, then search for dialogues mentioning Bastila in Taris.'
    };
  }

  if (modeId === 'cursor-deeplink') {
    const json = JSON.stringify(
      { mcpServers: { kq: buildMcpServerObj(cmd, gamePath) } },
      null,
      2
    );
    const deeplink = buildCursorDeeplink(cmd, gamePath);

    return {
      step2Title: 'Install kq into Cursor',
      step2Sub:
        'Use the one-click deeplink below (updates automatically as you edit your path), or place .cursor/mcp.json in your project.',
      deeplinkUrl: deeplink,
      primaryCodeLabel: '.cursor/mcp.json (or ~/.cursor/mcp.json)',
      primaryCode: json,
      downloadFilename: 'mcp.json',
      downloadContent: json,
      extraHintTitle: 'Optional: also install Cursor skills & kq.mdc rule from a checkout',
      extraHintCode: './scripts/install-agent-plugin.sh',
      verifyPrompt:
        'Use kq_info to inspect my KotOR install, then show which copy of k_pcarth_dlg.dlg loads.'
    };
  }

  if (modeId === 'vscode-mcp') {
    const json = JSON.stringify(
      {
        servers: {
          kq: {
            type: 'stdio',
            command: cmd,
            args: ['mcp'],
            env: {
              KQ_INSTALL: gamePath
            }
          }
        }
      },
      null,
      2
    );

    return {
      step2Title: 'Add kq to VS Code (.vscode/mcp.json)',
      step2Sub:
        'VS Code Copilot MCP uses a top-level "servers" object rather than "mcpServers". Save this in .vscode/mcp.json and click Start.',
      primaryCodeLabel: '.vscode/mcp.json',
      primaryCode: json,
      downloadFilename: 'mcp.json',
      downloadContent: json,
      metaSteps: [
        'Or press Ctrl/Cmd + Shift + P → run "MCP: Add Server" → choose Stdio.',
        `Enter command: ${cmd} mcp -i "${gamePath}" and name it kq.`
      ],
      verifyPrompt:
        'Run kq_info on the configured KotOR install and summarize the resource counts by type.'
    };
  }

  // Fallback: Any MCP client
  const genericJson = JSON.stringify(
    { mcpServers: { kq: buildMcpServerObj(cmd, gamePath) } },
    null,
    2
  );

  const smokeCmd =
    osId === 'windows'
      ? `@'\n{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"cli","version":"0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"kq_info","arguments":{}}}\n'@ | ${cmd} mcp -i "${gamePath}"`
      : `printf '%s\\n' \\\n  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"cli","version":"0"}}}' \\\n  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"kq_info","arguments":{}}}' \\\n  | ${cmd} mcp -i ${shellQuotePosix(gamePath)}`;

  return {
    step2Title: 'Connect kq to any MCP client',
    step2Sub:
      'kq mcp speaks newline-delimited JSON-RPC 2.0 over stdio (MCP 2024-11-05 through 2025-11-25). Works with Windsurf, OpenCode, Zed, or custom harnesses.',
    primaryCodeLabel: 'Standard mcpServers JSON',
    primaryCode: genericJson,
    downloadFilename: 'mcp.json',
    downloadContent: genericJson,
    extraHintTitle: 'Direct stdio command & raw JSON-RPC smoke test',
    extraHintCode: `${smokeCmd}\n\n# Or launch the interactive MCP Inspector:\nnpx @modelcontextprotocol/inspector ${cmd} mcp -i ${osId === 'windows' ? `"${gamePath}"` : shellQuotePosix(gamePath)}`,
    verifyPrompt:
      'Call kq_info to verify the game folder, then list the first 10 creature (.utc) templates.'
  };
}

export const TRACES = [
  {
    id: 'which-shadow',
    kicker: 'Override Precedence',
    title: 'Which appearance.2da actually loads?',
    desc: 'Resolve shadowed copies and diff what the active file changed.',
    tools: ['kq_which', 'kq_delta'],
    prompt:
      'Which copy of appearance.2da loads in my install, and what rows did my Override copy change from vanilla?',
    steps: [
      {
        tool: 'kq_which',
        args: '{"resref": "appearance.2da"}',
        output: `{
  "resref": "appearance",
  "type": "2da",
  "loaded": {
    "source": "override",
    "container": "Override/appearance.2da",
    "size": 103273
  },
  "overshadowed": [
    { "source": "rims", "container": "rims/global.rim/appearance.2da", "size": 98610 },
    { "source": "chitin", "container": "data/2da.bif/appearance.2da", "size": 98610 }
  ]
}`
      },
      {
        tool: 'kq_delta',
        args: '{"left": "appearance.2da", "shadow": true}',
        output: `~ [8].modela: "N_BastilaA" -> "N_BastilaAltA"
~ [8].texa:   "N_BastilaA01" -> "N_BastilaAlt01"
+ [512]:      { "_row": "512", "label": "P_Mandalorian_Alt", "race": "6", "modeltype": "B" }`
      }
    ],
    answer:
      'Your install loads <code>Override/appearance.2da</code> (103,273 bytes), shadowing both <code>rims/global.rim</code> and <code>data/2da.bif</code>. Compared against the shadowed copy, it updates row <code>[8]</code> (Bastila model/texture columns) and appends row <code>[512]</code>.'
  },
  {
    id: 'dialogue-grep',
    kicker: 'Dialogue & TLK',
    title: 'Find every dialogue mentioning Bastila on Taris',
    desc: 'Filter by type and module first so you never dump the whole install.',
    tools: ['kq_grep', 'kq_cat'],
    prompt: 'Find every dialogue in Taris modules that mentions Bastila and quote the field path.',
    steps: [
      {
        tool: 'kq_grep',
        args: '{"pattern": "Bastila", "type": ["dlg"], "module": ["tar_m02aa", "tar_m03aa"], "ignore_case": true, "limit": 5}',
        output: `{"resref":"tar02_carth021","type":"dlg","container":"modules/tar_m02aa_s.rim","path":"EntryList[4].Text","line":"We still have to find Bastila before the Sith lock down the Upper City."}
{"resref":"tar03_gadonal031","type":"dlg","container":"modules/tar_m03aa_s.rim","path":"EntryList[12].Text","line":"The Beks say Bastila's escape pod came down near the Undercity."}
{"resref":"tar03_zaalbar031","type":"dlg","container":"modules/tar_m03aa_s.rim","path":"ReplyList[2].Text","line":"Have you heard anything about Bastila?"}`
      }
    ],
    answer:
      'Found 3 matching dialogue nodes across <code>tar_m02aa_s.rim</code> and <code>tar_m03aa_s.rim</code> — for example <code>tar02_carth021.dlg</code> at <code>EntryList[4].Text</code> and <code>tar03_gadonal031.dlg</code> at <code>EntryList[12].Text</code>.'
  },
  {
    id: 'ncs-decompile',
    kicker: 'Scripts (NCS)',
    title: 'Read compiled module bytecode as NSS',
    desc: 'kq decodes NCS bytecode directly to NWScript source in memory.',
    tools: ['kq_which', 'kq_cat'],
    prompt: 'Show me what the trigger script k_pdan_bastila01.ncs actually does.',
    steps: [
      {
        tool: 'kq_cat',
        args: '{"resref": "k_pdan_bastila01.ncs", "module": "danm13"}',
        output: `// container: modules/danm13_s.rim/k_pdan_bastila01.ncs
void main() {
    object oBastila = GetObjectByTag("Bastila", 0);
    if (GetIsObjectValid(oBastila) && !GetGlobalBoolean("DAN_BASTILA_TALK")) {
        AssignCommand(oBastila, ActionStartConversation(GetFirstPC(), "dan13_bastila", 0, 0, 1, "", "", "", "", "", "", 0));
    }
}`
      }
    ],
    answer:
      'In <code>modules/danm13_s.rim/k_pdan_bastila01.ncs</code>, the script looks up tag <code>"Bastila"</code>, checks that global boolean <code>DAN_BASTILA_TALK</code> is unset, and starts conversation <code>dan13_bastila</code> with the player.'
  },
  {
    id: 'mod-graph',
    kicker: 'Mod Audit',
    title: 'Audit Override for broken links and conflicts',
    desc: 'Check live reachability, shadowed files, and missing referenced ResRefs.',
    tools: ['kq_graph'],
    prompt: 'Audit my Override folder: what is overshadowed, and are any scripts or dialogues missing targets?',
    steps: [
      {
        tool: 'kq_graph',
        args: '{"source": "override", "format": "lists", "no_assets": true, "limit": 8}',
        output: `{
  "summary": { "used": 41, "unused": 2, "overshadowed": 1, "missing_refs": 1 },
  "overshadowed": [
    { "resref": "k_act_cutscene01", "type": "ncs", "container": "Override/k_act_cutscene01.ncs", "hidden_by": "modules/danm13_s.rim/k_act_cutscene01.ncs" }
  ],
  "missing": [
    { "from": "Override/custom_merchant.dlg", "field": "EntryList[7].Script", "missing_resref": "k_give_bonus", "type": "ncs" }
  ]
}`
      }
    ],
    answer:
      '41 Override files resolve cleanly, 1 script (<code>k_act_cutscene01.ncs</code>) is shadowed when inside module <code>danm13</code>, and <code>Override/custom_merchant.dlg</code> at <code>EntryList[7].Script</code> points to missing script <code>k_give_bonus.ncs</code>.'
  }
];

export const COOKBOOK = [
  {
    category: 'Mod Conflicts',
    tools: ['kq_which', 'kq_delta'],
    prompt:
      'Check Override/appearance.2da with kq_which, then diff it against the shadowed copy using kq_delta.',
    tip: 'Always run which before cat so you read the copy the game actually loads.'
  },
  {
    category: 'Mod Conflicts',
    tools: ['kq_ls', 'kq_delta'],
    prompt:
      'Compare my modded KotOR install against my clean backup install for spells.2da using kq_delta.',
    tip: 'Use kq_delta with `other` when comparing two separate game directories.'
  },
  {
    category: 'Dialogue & Lore',
    tools: ['kq_grep', 'kq_cat'],
    prompt:
      'Search all .dlg resources in module danm13 for "Star Forge" (ignore case) and show the matching EntryList or ReplyList paths.',
    tip: 'Narrow grep by `type: ["dlg"]` and `module` for fast, clean hits.'
  },
  {
    category: 'Dialogue & Lore',
    tools: ['kq_grep'],
    prompt:
      'Search dialog.tlk for "Manaan" and return the first 20 matching StrRefs.',
    tip: 'TLK hits include `strref`, `text`, and `sound` VO filename when present.'
  },
  {
    category: 'Scripts (NCS)',
    tools: ['kq_cat'],
    prompt:
      'Decompile k_pdan_juhani01.ncs from danm14ac to NSS and list every global boolean or number it reads or sets.',
    tip: 'kq decodes NCS to NSS by default; ask for `disasm: true` if you need bytecode offsets.'
  },
  {
    category: 'Scripts (NCS)',
    tools: ['kq_grep'],
    prompt:
      'Grep all .ncs scripts in my Override folder for SetGlobalNumber and show which scripts modify globals.',
    tip: 'Use `source: "override"` with `type: ["ncs"]` to scan only modded scripts.'
  },
  {
    category: '2DA & Stats',
    tools: ['kq_cat'],
    prompt:
      'Inspect baseitems.2da using kq_cat with format "gron" and summarize the base damage and critical threat columns for lightsabers.',
    tip: 'Asking for `format: "gron"` gives exact `_row` and column paths.'
  },
  {
    category: '2DA & Stats',
    tools: ['kq_grep', 'kq_cat'],
    prompt:
      'Find all .uti item templates in Override or danm13 with Tag matching "w_lsabr*" and inspect their PropertyList.',
    tip: 'Combine `kq_ls` (name glob) with `kq_cat` (gron) for item property audits.'
  },
  {
    category: 'Mod Audits',
    tools: ['kq_graph'],
    prompt:
      'Inspect the reference graph for module manm26aa with missing: true to list any scripts, creatures, or dialogues referenced that do not exist.',
    tip: '`kq_graph` with `name` and `missing: true` catches broken module links immediately.'
  },
  {
    category: 'Mod Audits',
    tools: ['kq_info', 'kq_graph'],
    prompt:
      'Run kq_info by_type on my install, then check kq_graph with source: "override" and no_assets: true to find unused or overshadowed Override files.',
    tip: '`no_assets: true` skips textures, models, and audio so logic issues stand out.'
  }
];

export const TOOLS = [
  {
    name: 'kq_info',
    cli: 'kq info [--by-type]',
    desc: 'Verify the resolved target, detect KotOR I vs KotOR II (TSL), and count resources by source or type.'
  },
  {
    name: 'kq_ls',
    cli: 'kq ls [PATTERN] [-t TYPE] [-m MODULE]',
    desc: 'List resources inside BIF, ERF, RIM, MOD, SAV, and Override without extracting anything.'
  },
  {
    name: 'kq_which',
    cli: 'kq which RESREF',
    desc: 'Show every copy of a resource in engine precedence order and star the exact copy the game loads.'
  },
  {
    name: 'kq_cat',
    cli: 'kq cat RESREF [-f json|gron|outline]',
    desc: 'Decode and print a resource (GFF, 2DA, TLK, decompiled NCS, MDL, SSF, LIP, BWM) as structured text.'
  },
  {
    name: 'kq_grep',
    cli: 'kq grep PATTERN [-t TYPE] [--ignore-case]',
    desc: 'Regex search across decoded resource text, returning exact field paths like EntryList[4].Text.'
  },
  {
    name: 'kq_graph',
    cli: 'kq graph [NAME] [--missing] [--no-assets]',
    desc: 'Trace live reachability from engine roots to report used, unused, overshadowed, and missing ResRefs.'
  },
  {
    name: 'kq_delta',
    cli: 'kq delta LEFT [RIGHT | --shadow | --other]',
    desc: 'Structured field/row diff between two resources, a loaded file vs what it shadows, or across two installs.'
  }
];

export const FORMATS = [
  ['GFF', 'utc utd ute uti utm utp uts utt utw dlg are git ifo jrl gui pth fac …', 'Decoded field tree (JSON, gron, outline)'],
  ['2DA', '2da', 'Rows as objects with _row index and column keys'],
  ['TLK', 'tlk', 'strref + text + sound ResRef when present'],
  ['NCS', 'ncs', 'Decompiled NSS source by default; bytecode instruction tree via disasm'],
  ['MDL / MDX', 'mdl', 'Full model IR (nodes, meshes, controllers, animations); binary pairs .mdx'],
  ['BWM', 'wok dwk pwk', 'Walkmesh vertices, faces, materials, area-transition edges'],
  ['SSF', 'ssf', '28 named creature sound-event StrRefs'],
  ['LIP', 'lip', 'Duration + mouth-shape keyframes'],
  ['LTR', 'ltr', 'Letter probability tables for name generation'],
  ['TPC', 'tpc', 'Dimensions, format, mipmaps, trailing TXI text (metadata, not pixels)'],
  ['WAV / BMU', 'wav bmu', 'Encoding kind, sample rate, channels (metadata, not samples)'],
  ['Plain text', 'nss lyt vis txi ini txt', 'Passed through directly']
];

export const FAQS = [
  {
    q: 'My desktop app (Claude Desktop, Cursor) says spawn kq ENOENT or command not found.',
    a: 'GUI apps launched from Finder, Spotlight, or the Windows Start menu do not always load your terminal PATH (~/.local/bin or %USERPROFILE%\\.local\\bin). Toggle "Use full binary path" in Step 1/2 above so the config points directly to ~/.local/bin/kq or %USERPROFILE%\\.local\\bin\\kq.exe, then restart the app.'
  },
  {
    q: 'kq returns exit code 4 ("no install resolved") — what folder should I pass?',
    a: 'Point KQ_INSTALL (or the tool’s install parameter) at the game root folder containing chitin.key — not Override or modules. On macOS Steam/App Store builds, chitin.key sits inside the .app bundle (for example .../Knights of the Old Republic.app/Contents/KOTOR Data or .../KOTOR2.app/Contents/GameData). You can also query a single .mod, .utc, or loose folder directly.'
  },
  {
    q: 'Can kq modify, corrupt, or write into my KotOR install?',
    a: 'No. Every MCP tool exposed by kq mcp is strictly read-only (marked readOnlyHint: true). It memory-maps and decodes your game archives in place and writes its read cache separately under ~/.cache/kq (or $KQ_CACHE_DIR). Even the CLI patch and merge commands only print or write to an explicit -o file.'
  },
  {
    q: 'How do I get engine function names when decompiling .ncs scripts?',
    a: 'kq does not bundle BioWare’s nwscript.nss. If your install or working directory has nwscript.nss (or you pass --nwscript PATH when starting kq mcp), decompiled scripts resolve engine action names and parameter signatures automatically.'
  },
  {
    q: 'Why can’t Gemini Web or ChatGPT Web launch local kq directly without a bridge or CLI?',
    a: 'Web apps run in remote cloud containers and have no access to local processes or files on your hard drive. For zero-friction local MCP on those ecosystems, use Gemini CLI (free with a Google account) or OpenAI Codex CLI / Desktop. If you specifically need ChatGPT Web, use the temporary HTTPS tunnel snippet in the ChatGPT Web tab.'
  },
  {
    q: 'I installed new mods — does the kq cache go stale?',
    a: 'No. The cache key fingerprints archive names, sizes, and modification times without hashing 1.3 GB of BIF data on every query, so changed files trigger a fast re-index automatically. You can always run kq cache clear if you want a clean rebuild.'
  },
  {
    q: 'Can I query two different installs (like KotOR I and TSL) in one session?',
    a: 'Yes. KQ_INSTALL sets your default install, and every kq_* MCP tool accepts an optional install parameter to override the path for that single call — or compare two installs side-by-side with kq_delta.'
  }
];
