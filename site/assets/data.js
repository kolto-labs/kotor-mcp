export const REPO_URL = 'https://github.com/kolto-labs/kotor-mcp';
export const INSTALL_SH_URL =
  'https://raw.githubusercontent.com/kolto-labs/kotor-mcp/main/scripts/install.sh';
export const INSTALL_PS1_URL =
  'https://raw.githubusercontent.com/kolto-labs/kotor-mcp/main/scripts/install.ps1';
export const MCPB_DOWNLOAD_PATH = 'downloads/kotor-mcp.mcpb';

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
    fullBinPath: '%USERPROFILE%\\.local\\bin\\kq.exe',
    presets: [
      {
        label: 'KotOR I (Steam)',
        path: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\swkotor'
      },
      {
        label: 'KotOR II (Steam)',
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
    fullBinPath: '~/.local/bin/kq',
    presets: [
      {
        label: 'KotOR I (Steam)',
        path: '~/.local/share/Steam/steamapps/common/swkotor'
      },
      {
        label: 'KotOR II (Steam)',
        path: '~/.local/share/Steam/steamapps/common/Knights of the Old Republic II'
      }
    ]
  }
};

export function shellQuotePosix(s) {
  return `'${String(s).replace(/'/g, "'\\''")}'`;
}

export function shellQuoteDouble(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function tomlBasicString(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
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

export function buildBridgeCommand({ osId, gamePath, useFullPath }) {
  const cmd = useFullPath ? OS_META[osId].fullBinPath : 'kq';
  if (osId === 'windows') {
    return [
      '# Terminal 1 — expose read-only kq mcp locally on port 8765',
      `npx -y supergateway --stdio "${cmd} mcp -i \\"${gamePath}\\"" --port 8765 --outputTransport streamableHttp`,
      '',
      '# Terminal 2 — temporary HTTPS tunnel',
      'cloudflared tunnel --url http://localhost:8765'
    ].join('\n');
  }
  return [
    '# Terminal 1 — expose read-only kq mcp locally on port 8765',
    `npx -y supergateway --stdio ${shellQuotePosix(`${cmd} mcp -i ${shellQuoteDouble(gamePath)}`)} --port 8765 --outputTransport streamableHttp`,
    '',
    '# Terminal 2 — temporary HTTPS tunnel',
    'cloudflared tunnel --url http://localhost:8765'
  ].join('\n');
}

export const VERIFY_PROMPTS = [
  {
    label: 'Check appearance.2da',
    prompt:
      'Run kq_info on my KotOR install, then run kq_which on appearance.2da and tell me which copy actually loads.'
  },
  {
    label: 'Search Taris dialogues',
    prompt:
      'Use kq_grep to find every .dlg dialogue in Taris modules mentioning Bastila and quote the exact EntryList field path.'
  },
  {
    label: 'Audit Override mods',
    prompt:
      'Run kq_graph with source "override" and no_assets true to list any shadowed files or missing references in my Override folder.'
  }
];

export function buildLaunchpadCards({ osId, gamePath, useFullPath, bridgeUrl }) {
  const os = OS_META[osId] || OS_META.windows;
  const cmd = useFullPath ? os.fullBinPath : 'kq';
  const cleanPath = gamePath.trim() || os.presets[0].path;
  const cleanBridgeUrl = (bridgeUrl || '').trim() || 'https://your-tunnel.trycloudflare.com/mcp';

  const stdioConfig = buildMcpServerObj(cmd, cleanPath);
  const stdioJsonStr = JSON.stringify(stdioConfig);
  const stdioB64 = encodeURIComponent(toBase64Utf8(stdioJsonStr));

  const mcpServersJson = JSON.stringify({ mcpServers: { kq: stdioConfig } }, null, 2);

  // VS Code URL-encoded JSON payload
  const vsCodePayloadObj = {
    name: 'kq',
    type: 'stdio',
    command: cmd,
    args: ['mcp'],
    env: { KQ_INSTALL: cleanPath }
  };
  const vsCodeEncoded = encodeURIComponent(JSON.stringify(vsCodePayloadObj));
  const vsCodeDirectUrl = `vscode:mcp/install?${vsCodeEncoded}`;
  const vsCodeInsidersUrl = `vscode-insiders:mcp/install?${vsCodeEncoded}`;
  const vsCodeWebUrl = `https://vscode.dev/redirect?url=${encodeURIComponent(vsCodeDirectUrl)}`;
  const vsCodeJson = JSON.stringify(
    {
      servers: {
        kq: {
          type: 'stdio',
          command: cmd,
          args: ['mcp'],
          env: { KQ_INSTALL: cleanPath }
        }
      }
    },
    null,
    2
  );

  // Cursor deeplinks
  const cursorDirectUrl = `cursor://anysphere.cursor-deeplink/mcp/install?name=kq&config=${stdioB64}`;
  const cursorWebUrl = `https://cursor.com/en/install-mcp?name=kq&config=${stdioB64}`;

  // LM Studio deeplinks
  const lmStudioDirectUrl = `lmstudio://add_mcp?name=kq&config=${stdioB64}`;
  const lmStudioWebUrl = `https://lmstudio.ai/install-mcp?name=kq&config=${stdioB64}`;

  // Goose deeplink
  const gooseParams = new URLSearchParams();
  gooseParams.set('cmd', cmd);
  gooseParams.append('arg', 'mcp');
  gooseParams.append('arg', '-i');
  gooseParams.append('arg', cleanPath);
  gooseParams.set('id', 'kq');
  gooseParams.set('name', 'kotor-mcp');
  gooseParams.set('description', 'Query KotOR I & II installs in place (read-only)');
  gooseParams.set('timeout', '300');
  const gooseUrl = `goose://extension?${gooseParams.toString()}`;

  // Raycast deeplink
  const raycastArgs = encodeURIComponent(
    JSON.stringify({ name: 'kq', command: cmd, args: ['mcp', '-i', cleanPath] })
  );
  const raycastUrl = `raycast://extensions/raycast/mcp/install-server?arguments=${raycastArgs}`;

  // Claude.ai custom connector modal deeplink
  const claudeModalUrl = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=kotor-mcp&connectorUrl=${encodeURIComponent(cleanBridgeUrl)}`;
  const claudeTestUrl = `https://claude.ai/new?q=${encodeURIComponent(VERIFY_PROMPTS[0].prompt)}`;

  // ChatGPT connectors + test prompt
  const chatgptConnectorsUrl = 'https://chatgpt.com/#settings/Connectors';
  const chatgptTestUrl = `https://chatgpt.com/?q=${encodeURIComponent(VERIFY_PROMPTS[0].prompt)}`;

  // Claude Code commands
  const claudeCodePlugin = `/plugin marketplace add kolto-labs/kotor-mcp\n/plugin install kq@kolto-labs`;
  const claudeCodeCli =
    osId === 'windows'
      ? `claude mcp add kq -e KQ_INSTALL="${cleanPath}" -- ${cmd} mcp`
      : `claude mcp add kq -e KQ_INSTALL=${shellQuotePosix(cleanPath)} -- ${cmd} mcp`;

  // Gemini CLI commands
  const geminiExtCmd = `gemini extensions install ${REPO_URL}`;
  const geminiAddCmd =
    osId === 'windows'
      ? `gemini mcp add kq -e KQ_INSTALL="${cleanPath}" ${cmd} mcp`
      : `gemini mcp add kq -e KQ_INSTALL=${shellQuotePosix(cleanPath)} ${cmd} mcp`;

  // Codex CLI + TOML
  const codexAddCmd =
    osId === 'windows'
      ? `codex mcp add kq --env KQ_INSTALL="${cleanPath}" -- ${cmd} mcp`
      : `codex mcp add kq --env KQ_INSTALL=${shellQuotePosix(cleanPath)} -- ${cmd} mcp`;
  const codexToml = [
    '[mcp_servers.kq]',
    `command = ${tomlBasicString(cmd)}`,
    'args = ["mcp"]',
    `env = { KQ_INSTALL = ${tomlBasicString(cleanPath)} }`
  ].join('\n');

  // Universal npx add-mcp + agent self-setup prompt
  const addMcpCmd =
    osId === 'windows'
      ? `npx add-mcp "${cmd} mcp -i \\"${cleanPath}\\"" --name kq -g`
      : `npx add-mcp ${shellQuotePosix(`${cmd} mcp -i ${shellQuoteDouble(cleanPath)}`)} --name kq -g`;

  const selfSetupPrompt = `Install kotor-mcp (kq 0.5.0+) from ${REPO_URL}, register its stdio MCP server \`kq mcp\` with KQ_INSTALL=${cleanPath}, and verify with kq_info.`;

  const bridgeCmd = buildBridgeCommand({ osId, gamePath: cleanPath, useFullPath });

  return [
    {
      id: 'cursor',
      name: 'Cursor',
      sub: 'Desktop IDE',
      glyph: 'CU',
      categories: ['oneclick', 'editors'],
      badge: '1-CLICK DIALOG',
      badgeKind: 'oneclick',
      desc: 'Opens Cursor’s native "Install MCP Server?" confirmation with your game folder prefilled.',
      primary: {
        kind: 'link',
        label: 'Add to Cursor',
        href: cursorDirectUrl
      },
      secondaries: [
        { kind: 'link', label: 'Web Link', href: cursorWebUrl, external: true },
        { kind: 'copy', label: 'Copy .cursor/mcp.json', text: mcpServersJson }
      ],
      snippetLabel: '.cursor/mcp.json',
      snippet: mcpServersJson
    },
    {
      id: 'vscode',
      name: 'VS Code',
      sub: 'Copilot MCP',
      glyph: 'VS',
      categories: ['oneclick', 'editors'],
      badge: '1-CLICK DIALOG',
      badgeKind: 'oneclick',
      desc: 'Triggers VS Code’s native MCP trust & install dialog using the top-level servers schema.',
      primary: {
        kind: 'link',
        label: 'Install in VS Code',
        href: vsCodeDirectUrl
      },
      secondaries: [
        { kind: 'link', label: 'Insiders', href: vsCodeInsidersUrl },
        { kind: 'link', label: 'vscode.dev', href: vsCodeWebUrl, external: true },
        { kind: 'copy', label: 'Copy .vscode/mcp.json', text: vsCodeJson }
      ],
      snippetLabel: '.vscode/mcp.json',
      snippet: vsCodeJson
    },
    {
      id: 'claude-desktop',
      name: 'Claude Desktop',
      sub: 'macOS & Windows',
      glyph: 'CD',
      categories: ['oneclick', 'claude'],
      badge: '.MCPB BUNDLE',
      badgeKind: 'oneclick',
      desc: 'Double-click the .mcpb extension to open Claude’s "Install Extension?" modal with a native folder picker.',
      primary: {
        kind: 'link',
        label: 'Download .mcpb Extension',
        href: MCPB_DOWNLOAD_PATH,
        download: 'kotor-mcp.mcpb'
      },
      secondaries: [
        { kind: 'copy', label: 'Copy config.json', text: mcpServersJson },
        {
          kind: 'download',
          label: 'Download JSON',
          filename: 'claude_desktop_config.json',
          content: mcpServersJson
        }
      ],
      snippetLabel:
        osId === 'macos'
          ? '~/Library/Application Support/Claude/claude_desktop_config.json'
          : osId === 'windows'
            ? '%APPDATA%\\Claude\\claude_desktop_config.json'
            : '~/.config/Claude/claude_desktop_config.json',
      snippet: mcpServersJson
    },
    {
      id: 'claude-web',
      name: 'Claude.ai (Web)',
      sub: 'Custom Connector Modal',
      glyph: 'CW',
      categories: ['oneclick', 'claude'],
      badge: 'WEB MODAL',
      badgeKind: 'web',
      desc: 'Opens Claude.ai’s "Add custom connector?" modal pre-filled with your active HTTPS bridge URL.',
      primary: {
        kind: 'link',
        label: 'Add Connector in Claude.ai',
        href: claudeModalUrl,
        external: true
      },
      secondaries: [
        { kind: 'anchor', label: 'Start Bridge ↓', href: '#web-bridge' },
        { kind: 'link', label: 'Test Prompt', href: claudeTestUrl, external: true }
      ],
      snippetLabel: 'Modal deeplink URL',
      snippet: claudeModalUrl
    },
    {
      id: 'chatgpt-web',
      name: 'ChatGPT (Web)',
      sub: 'Connectors & Developer Mode',
      glyph: 'GP',
      categories: ['chatgpt'],
      badge: 'WEB CONNECTOR',
      badgeKind: 'web',
      desc: 'Copies your active /mcp bridge URL to the clipboard and opens ChatGPT’s Connectors settings page.',
      primary: {
        kind: 'link-copy',
        label: 'Open ChatGPT Connectors',
        href: chatgptConnectorsUrl,
        copyText: cleanBridgeUrl,
        external: true
      },
      secondaries: [
        { kind: 'copy', label: 'Copy Bridge Cmd', text: bridgeCmd },
        { kind: 'link', label: 'Test Prompt', href: chatgptTestUrl, external: true }
      ],
      snippetLabel: 'Local HTTPS bridge (read-only)',
      snippet: bridgeCmd
    },
    {
      id: 'chatgpt-codex',
      name: 'ChatGPT / Codex CLI',
      sub: 'Local Stdio (No Tunnel)',
      glyph: 'CX',
      categories: ['chatgpt'],
      badge: 'LOCAL STDIO',
      badgeKind: 'std',
      desc: 'Connects ChatGPT’s Codex Desktop & CLI directly to your local kq binary over stdio.',
      primary: {
        kind: 'copy',
        label: 'Copy codex mcp add',
        text: codexAddCmd
      },
      secondaries: [{ kind: 'copy', label: 'Copy config.toml', text: codexToml }],
      snippetLabel:
        osId === 'windows' ? '%USERPROFILE%\\.codex\\config.toml' : '~/.codex/config.toml',
      snippet: `${codexAddCmd}\n\n# Or ~/.codex/config.toml:\n${codexToml}`
    },
    {
      id: 'claude-code',
      name: 'Claude Code',
      sub: 'Plugin + Skills + Explorer',
      glyph: 'CC',
      categories: ['claude'],
      badge: 'PLUGIN',
      badgeKind: 'std',
      desc: 'Installs the MCP server plus 5 KotOR skills (kq-query, review, merge-mods) and kq-explorer.',
      primary: {
        kind: 'copy',
        label: 'Copy Plugin Install',
        text: claudeCodePlugin
      },
      secondaries: [{ kind: 'copy', label: 'Copy claude mcp add', text: claudeCodeCli }],
      snippetLabel: 'Claude Code commands',
      snippet: `${claudeCodePlugin}\n\n# Or MCP server only:\n${claudeCodeCli}`
    },
    {
      id: 'gemini-cli',
      name: 'Gemini CLI & Antigravity',
      sub: 'gemini-extension.json',
      glyph: 'GM',
      categories: ['gemini'],
      badge: 'EXTENSION CLI',
      badgeKind: 'std',
      desc: 'Installs directly from the repo’s gemini-extension.json and prompts for your KotOR folder.',
      primary: {
        kind: 'copy',
        label: 'Copy Extension Install',
        text: geminiExtCmd
      },
      secondaries: [
        { kind: 'copy', label: 'Copy gemini mcp add', text: geminiAddCmd },
        { kind: 'copy', label: 'Copy Antigravity JSON', text: mcpServersJson }
      ],
      snippetLabel: 'Gemini CLI & ~/.gemini/antigravity/mcp_config.json',
      snippet: `${geminiExtCmd}\n\n# Or add MCP directly:\n${geminiAddCmd}`
    },
    {
      id: 'lmstudio',
      name: 'LM Studio',
      sub: 'Local Models (v0.3.17+)',
      glyph: 'LM',
      categories: ['oneclick', 'editors'],
      badge: '1-CLICK DIALOG',
      badgeKind: 'oneclick',
      desc: 'Launches LM Studio’s native "Add MCP Server" prompt and writes directly into mcp.json.',
      primary: {
        kind: 'link',
        label: 'Add to LM Studio',
        href: lmStudioDirectUrl
      },
      secondaries: [
        { kind: 'link', label: 'Web Link', href: lmStudioWebUrl, external: true },
        { kind: 'copy', label: 'Copy mcp.json', text: mcpServersJson }
      ],
      snippetLabel: 'lmstudio://add_mcp payload',
      snippet: mcpServersJson
    },
    {
      id: 'goose',
      name: 'Goose (Block)',
      sub: 'Desktop & CLI Agent',
      glyph: 'GS',
      categories: ['oneclick', 'editors'],
      badge: '1-CLICK DIALOG',
      badgeKind: 'oneclick',
      desc: 'Opens Goose’s native extension confirmation dialog with kq mcp and your game path.',
      primary: {
        kind: 'link',
        label: 'Install in Goose',
        href: gooseUrl
      },
      secondaries: [{ kind: 'copy', label: 'Copy goose:// URI', text: gooseUrl }],
      snippetLabel: 'goose://extension URI',
      snippet: gooseUrl
    },
    {
      id: 'raycast',
      name: 'Raycast',
      sub: 'Raycast AI (macOS / Win)',
      glyph: 'RC',
      categories: ['oneclick', 'editors'],
      badge: '1-CLICK DIALOG',
      badgeKind: 'oneclick',
      desc: 'Opens Raycast’s Install MCP Server command pre-populated with kq mcp -i <your folder>.',
      primary: {
        kind: 'link',
        label: 'Install in Raycast',
        href: raycastUrl
      },
      secondaries: [{ kind: 'copy', label: 'Copy mcp-config.json', text: mcpServersJson }],
      snippetLabel: 'Raycast mcp-config.json',
      snippet: mcpServersJson
    },
    {
      id: 'universal',
      name: 'Any Agent (Windsurf, Zed, Cline)',
      sub: 'npx add-mcp + Agent Self-Setup',
      glyph: 'MX',
      categories: ['editors'],
      badge: 'UNIVERSAL CLI',
      badgeKind: 'std',
      desc: 'Detects Windsurf, Zed, Cline, Roo Code, OpenCode, Claude, Cursor & Codex in one command.',
      primary: {
        kind: 'copy',
        label: 'Copy npx add-mcp',
        text: addMcpCmd
      },
      secondaries: [
        { kind: 'copy', label: 'Copy AI Self-Setup Prompt', text: selfSetupPrompt },
        { kind: 'copy', label: 'Copy JSON', text: mcpServersJson }
      ],
      snippetLabel: 'Universal CLI & agent prompt',
      snippet: `${addMcpCmd}\n\n# Or paste into any coding agent:\n${selfSetupPrompt}`
    }
  ];
}

export const TOOLS = [
  ['kq_info', 'Verify the resolved target, detect KotOR I vs II, and count resources by source or type.'],
  ['kq_ls', 'List resources inside BIF, ERF, RIM, MOD, SAV, and Override without extracting anything.'],
  ['kq_which', 'Show every copy of a ResRef in engine precedence order and star the exact loaded copy.'],
  ['kq_cat', 'Decode GFF, 2DA, TLK, decompiled NCS (to NSS), MDL, SSF, LIP, and BWM into text.'],
  ['kq_grep', 'Regex search over decoded resource text, returning exact field paths like EntryList[4].Text.'],
  ['kq_graph', 'Trace live reachability from engine roots to find used, unused, overshadowed, and missing refs.'],
  ['kq_delta', 'Structured field/row diff between two resources, loaded vs shadowed, or two installs.']
];

export const FORMATS = [
  ['GFF', 'utc utd ute uti utm utp uts utt utw dlg are git ifo jrl gui pth fac …', 'Field tree (JSON, gron, outline)'],
  ['2DA', '2da', 'Rows as objects with _row index'],
  ['TLK', 'tlk', 'strref + text + sound ResRef'],
  ['NCS', 'ncs', 'Decompiled NSS source by default; instruction tree via disasm'],
  ['MDL / MDX', 'mdl', 'Model IR (nodes, meshes, controllers, animations)'],
  ['BWM', 'wok dwk pwk', 'Walkmesh vertices, faces, materials, transition edges'],
  ['SSF / LIP / LTR', 'ssf lip ltr', 'Sound-event StrRefs, mouth keyframes, name tables'],
  ['TPC / WAV / BMU', 'tpc wav bmu', 'Dimensions, TXI text, rate, channels (metadata only)'],
  ['Plain text', 'nss lyt vis txi ini txt', 'Passed through directly']
];
