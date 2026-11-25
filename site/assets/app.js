import {
  OS_LIST,
  OS_META,
  TOOLS,
  FORMATS,
  VERIFY_PROMPTS,
  buildBridgeCommand,
  buildLaunchpadCards,
  shellQuotePosix
} from './data.js';

const STORAGE_KEYS = {
  theme: 'kq-theme',
  os: 'kq-os',
  fullPath: 'kq-full-path',
  bridgeUrl: 'kq-bridge-url'
};

function detectOs() {
  const ua = (navigator.userAgent || '').toLowerCase();
  const plat = (navigator.platform || '').toLowerCase();
  if (ua.includes('win') || plat.includes('win')) return 'windows';
  if (ua.includes('mac') || plat.includes('mac')) return 'macos';
  return 'linux';
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch {
    // ignore storage errors
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function copyText(text, btn, liveRegion, customCopiedLabel) {
  let ok = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch {
    ok = false;
  }

  if (!ok) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
  }

  if (btn) {
    const original = btn.dataset.originalLabel || btn.textContent;
    btn.dataset.originalLabel = original;
    btn.textContent = ok ? customCopiedLabel || 'Copied' : 'Select & copy';
    btn.classList.toggle('is-copied', ok);
    window.clearTimeout(btn._copyTimer);
    btn._copyTimer = window.setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('is-copied');
    }, 1800);
  }

  if (liveRegion && ok) {
    liveRegion.textContent = 'Copied to clipboard.';
  }
}

function downloadJson(filename, content) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const FILTER_TABS = [
  { id: 'all', label: 'All (12)' },
  { id: 'oneclick', label: '1-Click Dialog' },
  { id: 'claude', label: 'Claude' },
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'editors', label: 'Editors & Local' }
];

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const qOs = params.get('os');
  const qFilter = params.get('filter');

  const initialOs = OS_META[qOs] ? qOs : OS_META[safeGet(STORAGE_KEYS.os)] ? safeGet(STORAGE_KEYS.os) : detectOs();
  const initialFilter = FILTER_TABS.some((f) => f.id === qFilter) ? qFilter : 'all';

  const state = {
    os: initialOs,
    gamePath: OS_META[initialOs].presets[0].path,
    useFullPath: safeGet(STORAGE_KEYS.fullPath) === 'true',
    filter: initialFilter,
    prereqDismissed: false,
    bridgeUrl: safeGet(STORAGE_KEYS.bridgeUrl) || ''
  };

  const els = {
    live: document.getElementById('live-status'),
    themeToggle: document.getElementById('theme-toggle'),
    navToggle: document.getElementById('nav-toggle'),
    mobileDrawer: document.getElementById('mobile-drawer'),
    osPills: document.getElementById('os-pills'),
    pathInput: document.getElementById('game-path-input'),
    presetRow: document.getElementById('path-presets'),
    fullPathToggle: document.getElementById('full-path-toggle'),
    prereqCmd: document.getElementById('prereq-cmd'),
    prereqCopy: document.getElementById('prereq-copy'),
    prereqCargo: document.getElementById('prereq-cargo'),
    prereqToggle: document.getElementById('prereq-toggle'),
    prereqContent: document.getElementById('prereq-content'),
    prereqDone: document.getElementById('prereq-done'),
    filterRow: document.getElementById('filter-row'),
    cardsGrid: document.getElementById('cards-grid'),
    bridgeCmdPre: document.getElementById('bridge-cmd-pre'),
    bridgeCmdCopy: document.getElementById('bridge-cmd-copy'),
    bridgeUrlInput: document.getElementById('bridge-url-input'),
    bridgeClaudeBtn: document.getElementById('bridge-claude-btn'),
    bridgeChatgptBtn: document.getElementById('bridge-chatgpt-btn'),
    verifyPills: document.getElementById('verify-pills'),
    verifyClaudeLink: document.getElementById('verify-claude-link'),
    verifyChatgptLink: document.getElementById('verify-chatgpt-link'),
    smokePre: document.getElementById('smoke-pre'),
    smokeCopy: document.getElementById('smoke-copy'),
    refToolsGrid: document.getElementById('ref-tools-grid'),
    formatsBody: document.getElementById('formats-body')
  };

  /* Theme & mobile menu */
  function syncThemeAria() {
    const cur = document.documentElement.dataset.theme || 'dark';
    els.themeToggle.setAttribute('aria-pressed', cur === 'light' ? 'true' : 'false');
    els.themeToggle.setAttribute(
      'aria-label',
      cur === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    );
  }
  syncThemeAria();

  els.themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    safeSet(STORAGE_KEYS.theme, next);
    syncThemeAria();
  });

  if (els.navToggle && els.mobileDrawer) {
    els.navToggle.addEventListener('click', () => {
      const open = !els.mobileDrawer.classList.contains('is-open');
      els.mobileDrawer.classList.toggle('is-open', open);
      els.navToggle.setAttribute('aria-expanded', String(open));
    });
    els.mobileDrawer.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        els.mobileDrawer.classList.remove('is-open');
        els.navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function renderOsAndPresets() {
    els.osPills.innerHTML = '';
    OS_LIST.forEach((os) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'seg-btn';
      btn.setAttribute('aria-pressed', String(os.id === state.os));
      btn.textContent = os.label;
      btn.addEventListener('click', () => {
        const prevPresets = OS_META[state.os].presets.map((p) => p.path);
        const wasPreset = prevPresets.includes(state.gamePath);
        state.os = os.id;
        safeSet(STORAGE_KEYS.os, state.os);
        if (wasPreset || !state.gamePath.trim()) {
          state.gamePath = OS_META[state.os].presets[0].path;
          els.pathInput.value = state.gamePath;
        }
        renderAllDynamic();
      });
      els.osPills.appendChild(btn);
    });

    els.presetRow.innerHTML = '';
    OS_META[state.os].presets.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preset-btn${state.gamePath === p.path ? ' is-active' : ''}`;
      btn.textContent = p.label;
      btn.addEventListener('click', () => {
        state.gamePath = p.path;
        els.pathInput.value = p.path;
        renderAllDynamic();
      });
      els.presetRow.appendChild(btn);
    });

    const osMeta = OS_META[state.os];
    els.prereqCmd.textContent = osMeta.defaultInstallCmd;
    els.prereqContent.hidden = state.prereqDismissed;
    els.prereqDone.hidden = !state.prereqDismissed;
    els.prereqToggle.textContent = state.prereqDismissed ? 'Show installer' : 'Already installed';
  }

  function renderFilters() {
    els.filterRow.innerHTML = '';
    FILTER_TABS.forEach((f) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-btn';
      btn.setAttribute('aria-pressed', String(f.id === state.filter));
      btn.textContent = f.label;
      btn.addEventListener('click', () => {
        state.filter = f.id;
        renderFilters();
        renderCards();
      });
      els.filterRow.appendChild(btn);
    });
  }

  function renderCards() {
    const cards = buildLaunchpadCards({
      osId: state.os,
      gamePath: state.gamePath,
      useFullPath: state.useFullPath,
      bridgeUrl: state.bridgeUrl
    });

    const visible =
      state.filter === 'all'
        ? cards
        : cards.filter((c) => c.categories.includes(state.filter));

    els.cardsGrid.innerHTML = '';
    visible.forEach((card) => {
      const article = document.createElement('article');
      article.className = `app-card${card.badgeKind === 'oneclick' ? ' is-native' : ''}`;
      article.dataset.cardId = card.id;

      const badgeClass =
        card.badgeKind === 'oneclick'
          ? 'proto-badge is-oneclick'
          : card.badgeKind === 'web'
            ? 'proto-badge is-web'
            : 'proto-badge';

      article.innerHTML = `
        <div class="card-head">
          <div class="card-id">
            <span class="app-glyph" aria-hidden="true">${escapeHtml(card.glyph)}</span>
            <div class="card-titles">
              <h2>${escapeHtml(card.name)}</h2>
              <div class="card-sub">${escapeHtml(card.sub)}</div>
            </div>
          </div>
          <span class="${badgeClass}">${escapeHtml(card.badge)}</span>
        </div>
        <p class="card-desc">${escapeHtml(card.desc)}</p>
      `;

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      // Primary action
      if (card.primary.kind === 'link' || card.primary.kind === 'link-copy') {
        const a = document.createElement('a');
        a.className = `btn card-primary${card.badgeKind === 'oneclick' ? '' : ' accent'}`;
        a.href = card.primary.href;
        a.textContent = card.primary.label;
        if (card.primary.download) a.setAttribute('download', card.primary.download);
        if (card.primary.external) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        if (card.primary.kind === 'link-copy') {
          a.addEventListener('click', () => {
            copyText(card.primary.copyText, a, els.live, 'URL Copied — Opening');
          });
        }
        actions.appendChild(a);
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn secondary card-primary';
        btn.textContent = card.primary.label;
        btn.addEventListener('click', () => copyText(card.primary.text, btn, els.live));
        actions.appendChild(btn);
      }

      // Secondary actions
      if (card.secondaries && card.secondaries.length) {
        const sec = document.createElement('div');
        sec.className = 'card-secondary';
        card.secondaries.forEach((s) => {
          if (s.kind === 'link' || s.kind === 'anchor') {
            const a = document.createElement('a');
            a.className = 'btn-xs';
            a.href = s.href;
            a.textContent = s.label;
            if (s.external) {
              a.target = '_blank';
              a.rel = 'noopener noreferrer';
            }
            sec.appendChild(a);
          } else if (s.kind === 'download') {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn-xs';
            b.textContent = s.label;
            b.addEventListener('click', () => downloadJson(s.filename, s.content));
            sec.appendChild(b);
          } else {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'btn-xs';
            b.textContent = s.label;
            b.addEventListener('click', () => copyText(s.text, b, els.live));
            sec.appendChild(b);
          }
        });
        actions.appendChild(sec);
      }

      article.appendChild(actions);

      // Collapsible snippet preview
      const det = document.createElement('details');
      det.className = 'card-details';
      const sum = document.createElement('summary');
      sum.textContent = 'Show config / CLI';
      det.appendChild(sum);

      const snip = document.createElement('div');
      snip.className = 'card-snippet';

      const snipBar = document.createElement('div');
      snipBar.className = 'card-snippet-bar';
      const lbl = document.createElement('span');
      lbl.textContent = card.snippetLabel;
      const cp = document.createElement('button');
      cp.type = 'button';
      cp.className = 'btn-xs';
      cp.textContent = 'Copy';
      cp.addEventListener('click', () => copyText(card.snippet, cp, els.live));
      snipBar.appendChild(lbl);
      snipBar.appendChild(cp);

      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = card.snippet;
      pre.appendChild(code);

      snip.appendChild(snipBar);
      snip.appendChild(pre);
      det.appendChild(snip);
      article.appendChild(det);

      els.cardsGrid.appendChild(article);
    });
  }

  function renderBridgeAndSmoke() {
    const osMeta = OS_META[state.os];
    const cleanPath = state.gamePath.trim() || osMeta.presets[0].path;
    const cmd = state.useFullPath ? osMeta.fullBinPath : 'kq';
    const activeBridge = (state.bridgeUrl || '').trim() || 'https://your-tunnel.trycloudflare.com/mcp';

    els.bridgeCmdPre.textContent = buildBridgeCommand({
      osId: state.os,
      gamePath: cleanPath,
      useFullPath: state.useFullPath
    });

    els.bridgeClaudeBtn.href = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=kotor-mcp&connectorUrl=${encodeURIComponent(activeBridge)}`;
    els.bridgeChatgptBtn.dataset.copyUrl = activeBridge;

    els.smokePre.textContent =
      state.os === 'windows'
        ? `@'\n{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"cli","version":"0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"kq_info","arguments":{}}}\n'@ | ${cmd} mcp -i "${cleanPath}"`
        : `printf '%s\\n' \\\n  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"cli","version":"0"}}}' \\\n  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"kq_info","arguments":{}}}' \\\n  | ${cmd} mcp -i ${shellQuotePosix(cleanPath)}`;
  }

  function renderStatic() {
    els.verifyPills.innerHTML = '';
    VERIFY_PROMPTS.forEach((vp) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-xs';
      btn.textContent = `Copy: ${vp.label}`;
      btn.addEventListener('click', () => copyText(vp.prompt, btn, els.live));
      els.verifyPills.appendChild(btn);
    });
    els.verifyClaudeLink.href = `https://claude.ai/new?q=${encodeURIComponent(VERIFY_PROMPTS[0].prompt)}`;
    els.verifyChatgptLink.href = `https://chatgpt.com/?q=${encodeURIComponent(VERIFY_PROMPTS[0].prompt)}`;

    els.refToolsGrid.innerHTML = TOOLS.map(
      ([name, desc]) => `
      <div class="ref-tool">
        <code>${escapeHtml(name)}</code>
        <p>${escapeHtml(desc)}</p>
      </div>
    `
    ).join('');

    els.formatsBody.innerHTML = FORMATS.map(
      ([fmt, exts, out]) => `
      <tr>
        <td><strong>${escapeHtml(fmt)}</strong></td>
        <td><code>${escapeHtml(exts)}</code></td>
        <td>${escapeHtml(out)}</td>
      </tr>
    `
    ).join('');
  }

  function renderAllDynamic() {
    renderOsAndPresets();
    renderFilters();
    renderCards();
    renderBridgeAndSmoke();
  }

  /* Bind controls */
  els.pathInput.value = state.gamePath;
  els.fullPathToggle.checked = state.useFullPath;
  els.bridgeUrlInput.value = state.bridgeUrl;

  els.pathInput.addEventListener('input', () => {
    state.gamePath = els.pathInput.value;
    renderOsAndPresets();
    renderCards();
    renderBridgeAndSmoke();
  });

  els.fullPathToggle.addEventListener('change', () => {
    state.useFullPath = els.fullPathToggle.checked;
    safeSet(STORAGE_KEYS.fullPath, String(state.useFullPath));
    renderCards();
    renderBridgeAndSmoke();
  });

  els.bridgeUrlInput.addEventListener('input', () => {
    state.bridgeUrl = els.bridgeUrlInput.value;
    safeSet(STORAGE_KEYS.bridgeUrl, state.bridgeUrl);
    renderCards();
    renderBridgeAndSmoke();
  });

  els.prereqCopy.addEventListener('click', () =>
    copyText(OS_META[state.os].defaultInstallCmd, els.prereqCopy, els.live)
  );
  els.prereqCargo.addEventListener('click', () =>
    copyText(OS_META[state.os].altInstallCmd, els.prereqCargo, els.live)
  );
  els.prereqToggle.addEventListener('click', () => {
    state.prereqDismissed = !state.prereqDismissed;
    renderOsAndPresets();
  });

  els.bridgeCmdCopy.addEventListener('click', () =>
    copyText(els.bridgeCmdPre.textContent, els.bridgeCmdCopy, els.live)
  );
  els.bridgeChatgptBtn.addEventListener('click', () => {
    const url = els.bridgeChatgptBtn.dataset.copyUrl || '';
    copyText(url, els.bridgeChatgptBtn, els.live, 'URL Copied — Opening');
  });
  els.smokeCopy.addEventListener('click', () =>
    copyText(els.smokePre.textContent, els.smokeCopy, els.live)
  );

  renderStatic();
  renderAllDynamic();
});
