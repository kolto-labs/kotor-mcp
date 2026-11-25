import {
  APPS,
  COOKBOOK,
  FAQS,
  FORMATS,
  OS_LIST,
  OS_META,
  TOOLS,
  TRACES,
  getModePlan
} from './data.js';

const STORAGE_KEYS = {
  theme: 'kq-theme',
  os: 'kq-os',
  app: 'kq-app',
  mode: 'kq-mode',
  fullPath: 'kq-full-path'
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
    // ignore storage quota / privacy mode errors
  }
}

function readQueryState() {
  const params = new URLSearchParams(window.location.search);
  const qOs = params.get('os');
  const qApp = params.get('app');
  const validOs = OS_META[qOs] ? qOs : null;

  let resolvedApp = null;
  let resolvedMode = null;

  if (qApp) {
    const directApp = APPS.find((a) => a.id === qApp);
    if (directApp) {
      resolvedApp = directApp.id;
      resolvedMode = directApp.defaultMode;
    } else {
      for (const a of APPS) {
        const m = a.modes.find((mode) => mode.id === qApp);
        if (m) {
          resolvedApp = a.id;
          resolvedMode = m.id;
          break;
        }
      }
    }
  }

  return { os: validOs, app: resolvedApp, mode: resolvedMode };
}

function syncUrlQuery(osId, appId, modeId) {
  try {
    const url = new URL(window.location.href);
    const appObj = APPS.find((a) => a.id === appId);
    const appParam = appObj && appObj.modes.length > 1 ? modeId : appId;
    url.searchParams.set('app', appParam);
    url.searchParams.set('os', osId);
    window.history.replaceState(null, '', url.toString());
  } catch {
    // ignore history errors
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function copyText(text, btn, liveRegion) {
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
    btn.textContent = ok ? 'Copied' : 'Select & copy';
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

function downloadFile(filename, content) {
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

document.addEventListener('DOMContentLoaded', () => {
  const query = readQueryState();
  const initialOs = query.os || (OS_META[safeGet(STORAGE_KEYS.os)] ? safeGet(STORAGE_KEYS.os) : detectOs());
  const savedApp = APPS.find((a) => a.id === safeGet(STORAGE_KEYS.app)) ? safeGet(STORAGE_KEYS.app) : 'claude';
  const initialApp = query.app || savedApp;
  const appDef = APPS.find((a) => a.id === initialApp) || APPS[0];
  const savedMode = safeGet(STORAGE_KEYS.mode);
  const initialMode =
    query.mode ||
    (appDef.modes.some((m) => m.id === savedMode) ? savedMode : appDef.defaultMode);

  const state = {
    os: initialOs,
    app: initialApp,
    mode: initialMode,
    gamePath: OS_META[initialOs].presets[0].path,
    useFullPath: safeGet(STORAGE_KEYS.fullPath) === 'true',
    installCollapsed: false,
    activeTrace: TRACES[0].id,
    cookbookFilter: 'All'
  };

  const els = {
    live: document.getElementById('live-status'),
    themeToggle: document.getElementById('theme-toggle'),
    navToggle: document.getElementById('nav-toggle'),
    mobileDrawer: document.getElementById('mobile-drawer'),
    appTabs: document.getElementById('app-tabs'),
    osPills: document.getElementById('os-pills'),
    pathInput: document.getElementById('game-path-input'),
    presetRow: document.getElementById('path-presets'),
    submodeBar: document.getElementById('submode-bar'),
    submodePills: document.getElementById('submode-pills'),
    submodeNote: document.getElementById('submode-note'),
    step1Toggle: document.getElementById('step1-toggle'),
    step1Body: document.getElementById('step1-body'),
    installCmdPre: document.getElementById('install-cmd-pre'),
    installCmdCopy: document.getElementById('install-cmd-copy'),
    altInstallPre: document.getElementById('alt-install-pre'),
    altInstallCopy: document.getElementById('alt-install-copy'),
    fullPathToggle: document.getElementById('full-path-toggle'),
    fullPathHint: document.getElementById('full-path-hint'),
    step2Title: document.getElementById('step2-title'),
    step2Sub: document.getElementById('step2-sub'),
    step2Mount: document.getElementById('step2-mount'),
    step3PromptPre: document.getElementById('step3-prompt-pre'),
    step3PromptCopy: document.getElementById('step3-prompt-copy'),
    traceList: document.getElementById('trace-list'),
    traceStage: document.getElementById('trace-stage'),
    cookbookFilters: document.getElementById('cookbook-filters'),
    cookbookGrid: document.getElementById('cookbook-grid'),
    toolsGrid: document.getElementById('tools-grid'),
    formatsBody: document.getElementById('formats-body'),
    faqList: document.getElementById('faq-list')
  };

  /* Theme & Mobile Nav */
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

  /* Quick app jump pills in Hero */
  document.querySelectorAll('[data-jump-app]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const targetApp = el.dataset.jumpApp;
      const targetMode = el.dataset.jumpMode;
      const found = APPS.find((a) => a.id === targetApp);
      if (found) {
        state.app = found.id;
        state.mode =
          targetMode && found.modes.some((m) => m.id === targetMode)
            ? targetMode
            : found.defaultMode;
        safeSet(STORAGE_KEYS.app, state.app);
        safeSet(STORAGE_KEYS.mode, state.mode);
        renderConfigurator();
        const connectEl = document.getElementById('connect');
        if (connectEl && e.target.tagName !== 'A') {
          connectEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  /* App tabs & OS pills */
  function renderAppTabs() {
    els.appTabs.innerHTML = '';
    APPS.forEach((app, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-btn';
      btn.setAttribute('role', 'tab');
      btn.id = `tab-${app.id}`;
      btn.setAttribute('aria-selected', String(app.id === state.app));
      btn.tabIndex = app.id === state.app ? 0 : -1;
      btn.innerHTML = `<span>${escapeHtml(app.label)}</span><span class="tab-badge">${escapeHtml(app.badge)}</span>`;
      btn.addEventListener('click', () => {
        state.app = app.id;
        state.mode = app.defaultMode;
        safeSet(STORAGE_KEYS.app, state.app);
        safeSet(STORAGE_KEYS.mode, state.mode);
        renderConfigurator();
      });
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const next = APPS[(idx + dir + APPS.length) % APPS.length];
          state.app = next.id;
          state.mode = next.defaultMode;
          safeSet(STORAGE_KEYS.app, state.app);
          safeSet(STORAGE_KEYS.mode, state.mode);
          renderConfigurator();
          document.getElementById(`tab-${next.id}`)?.focus();
        }
      });
      els.appTabs.appendChild(btn);
    });
  }

  function renderOsPills() {
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
        }
        renderConfigurator();
      });
      els.osPills.appendChild(btn);
    });
  }

  function renderPresets() {
    const presets = OS_META[state.os].presets;
    els.presetRow.innerHTML = '';
    presets.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preset-btn${state.gamePath === p.path ? ' is-active' : ''}`;
      btn.textContent = p.label;
      btn.addEventListener('click', () => {
        state.gamePath = p.path;
        els.pathInput.value = p.path;
        renderStep2();
        renderPresets();
      });
      els.presetRow.appendChild(btn);
    });
  }

  function renderSubmodes() {
    const app = APPS.find((a) => a.id === state.app) || APPS[0];
    if (app.modes.length <= 1) {
      els.submodeBar.hidden = true;
      return;
    }
    els.submodeBar.hidden = false;
    els.submodePills.innerHTML = '';
    let activeNote = '';
    app.modes.forEach((m) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'seg-btn';
      const selected = m.id === state.mode;
      btn.setAttribute('aria-pressed', String(selected));
      btn.textContent = m.label;
      if (selected) activeNote = m.note;
      btn.addEventListener('click', () => {
        state.mode = m.id;
        safeSet(STORAGE_KEYS.mode, state.mode);
        renderConfigurator();
      });
      els.submodePills.appendChild(btn);
    });
    els.submodeNote.textContent = activeNote;
  }

  function createCodeBlock({ label, code, downloadFilename, downloadContent }) {
    const wrap = document.createElement('div');
    wrap.className = 'code-block';

    const head = document.createElement('div');
    head.className = 'code-head';

    const lbl = document.createElement('span');
    lbl.className = 'code-label';
    lbl.textContent = label;
    head.appendChild(lbl);

    const actions = document.createElement('div');
    actions.className = 'code-actions';

    if (downloadFilename && downloadContent) {
      const dlBtn = document.createElement('button');
      dlBtn.type = 'button';
      dlBtn.className = 'copy-btn';
      dlBtn.textContent = `Download ${downloadFilename}`;
      dlBtn.addEventListener('click', () => downloadFile(downloadFilename, downloadContent));
      actions.appendChild(dlBtn);
    }

    const cpBtn = document.createElement('button');
    cpBtn.type = 'button';
    cpBtn.className = 'copy-btn';
    cpBtn.textContent = 'Copy';
    cpBtn.addEventListener('click', () => copyText(code, cpBtn, els.live));
    actions.appendChild(cpBtn);

    head.appendChild(actions);

    const pre = document.createElement('pre');
    pre.className = 'code-pre';
    const codeEl = document.createElement('code');
    codeEl.textContent = code;
    pre.appendChild(codeEl);

    wrap.appendChild(head);
    wrap.appendChild(pre);
    return wrap;
  }

  function renderStep1() {
    const osMeta = OS_META[state.os];
    els.installCmdPre.textContent = osMeta.defaultInstallCmd;
    els.altInstallPre.textContent = osMeta.altInstallCmd;
    els.fullPathToggle.checked = state.useFullPath;
    els.fullPathHint.textContent = `Full path on ${osMeta.label}: ${osMeta.fullBinPath}`;
    els.step1Body.hidden = state.installCollapsed;
    els.step1Toggle.setAttribute('aria-expanded', String(!state.installCollapsed));
    els.step1Toggle.textContent = state.installCollapsed
      ? 'Show install commands'
      : 'Already installed kq? Collapse';
  }

  function renderStep2() {
    const plan = getModePlan({
      modeId: state.mode,
      osId: state.os,
      gamePath: state.gamePath.trim() || OS_META[state.os].presets[0].path,
      useFullPath: state.useFullPath
    });

    els.step2Title.textContent = plan.step2Title;
    els.step2Sub.textContent = plan.step2Sub;
    els.step2Mount.innerHTML = '';

    if (plan.switchAction) {
      const callout = document.createElement('div');
      callout.className = 'callout warn';
      const row = document.createElement('div');
      row.className = 'callout-row';
      const msg = document.createElement('span');
      msg.textContent =
        state.mode === 'gemini-web'
          ? 'Recommended: Gemini CLI connects directly to local kq mcp for free.'
          : 'Recommended: Codex CLI / Desktop runs local kq mcp natively without a tunnel.';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn sm';
      btn.textContent = plan.switchAction.label;
      btn.addEventListener('click', () => {
        state.app = plan.switchAction.targetApp;
        state.mode = plan.switchAction.targetMode;
        safeSet(STORAGE_KEYS.app, state.app);
        safeSet(STORAGE_KEYS.mode, state.mode);
        renderConfigurator();
      });
      row.appendChild(msg);
      row.appendChild(btn);
      callout.appendChild(row);
      els.step2Mount.appendChild(callout);
    }

    if (plan.deeplinkUrl) {
      const dlRow = document.createElement('div');
      dlRow.className = 'deeplink-row';
      const txt = document.createElement('p');
      txt.textContent =
        'One click opens Cursor with the kq server command and your KQ_INSTALL path prefilled.';
      const link = document.createElement('a');
      link.className = 'btn';
      link.href = plan.deeplinkUrl;
      link.textContent = 'Install in Cursor';
      dlRow.appendChild(txt);
      dlRow.appendChild(link);
      els.step2Mount.appendChild(dlRow);
    }

    els.step2Mount.appendChild(
      createCodeBlock({
        label: plan.primaryCodeLabel,
        code: plan.primaryCode,
        downloadFilename: plan.downloadFilename,
        downloadContent: plan.downloadContent
      })
    );

    if (plan.pathTip) {
      const tip = document.createElement('div');
      tip.className = 'callout';
      tip.textContent = plan.pathTip;
      els.step2Mount.appendChild(tip);
    }

    if (plan.metaSteps && plan.metaSteps.length) {
      const ol = document.createElement('ol');
      ol.className = 'meta-steps';
      plan.metaSteps.forEach((s) => {
        const li = document.createElement('li');
        li.textContent = s;
        ol.appendChild(li);
      });
      els.step2Mount.appendChild(ol);
    }

    if (plan.extraHintTitle && plan.extraHintCode) {
      const sec = document.createElement('div');
      sec.className = 'secondary-panel';
      sec.appendChild(
        createCodeBlock({
          label: plan.extraHintTitle,
          code: plan.extraHintCode
        })
      );
      els.step2Mount.appendChild(sec);
    }

    els.step3PromptPre.textContent = plan.verifyPrompt;
  }

  function renderConfigurator() {
    renderAppTabs();
    renderOsPills();
    els.pathInput.value = state.gamePath;
    renderPresets();
    renderSubmodes();
    renderStep1();
    renderStep2();
    syncUrlQuery(state.os, state.app, state.mode);
  }

  els.pathInput.addEventListener('input', () => {
    state.gamePath = els.pathInput.value;
    renderPresets();
    renderStep2();
  });

  els.fullPathToggle.addEventListener('change', () => {
    state.useFullPath = els.fullPathToggle.checked;
    safeSet(STORAGE_KEYS.fullPath, String(state.useFullPath));
    renderStep1();
    renderStep2();
  });

  els.step1Toggle.addEventListener('click', () => {
    state.installCollapsed = !state.installCollapsed;
    renderStep1();
  });

  els.installCmdCopy.addEventListener('click', () =>
    copyText(els.installCmdPre.textContent, els.installCmdCopy, els.live)
  );
  els.altInstallCopy.addEventListener('click', () =>
    copyText(els.altInstallPre.textContent, els.altInstallCopy, els.live)
  );
  els.step3PromptCopy.addEventListener('click', () =>
    copyText(els.step3PromptPre.textContent, els.step3PromptCopy, els.live)
  );

  /* Live Trace Simulator */
  function renderTraces() {
    els.traceList.innerHTML = '';
    const active = TRACES.find((t) => t.id === state.activeTrace) || TRACES[0];

    TRACES.forEach((trace) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'trace-tab';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(trace.id === active.id));
      btn.innerHTML = `
        <span class="trace-tab-kicker">${escapeHtml(trace.kicker)}</span>
        <span class="trace-tab-title">${escapeHtml(trace.title)}</span>
        <span class="trace-tab-desc">${escapeHtml(trace.desc)}</span>
      `;
      btn.addEventListener('click', () => {
        state.activeTrace = trace.id;
        renderTraces();
      });
      els.traceList.appendChild(btn);
    });

    const chips = active.tools.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('');
    const stepsHtml = active.steps
      .map(
        (s) => `
      <div class="trace-step">
        <div class="trace-step-bar">
          <span class="tool">tool call: ${escapeHtml(s.tool)}</span>
          <span class="note">args: ${escapeHtml(s.args)}</span>
        </div>
        <pre><code>${escapeHtml(s.output)}</code></pre>
      </div>
    `
      )
      .join('');

    els.traceStage.innerHTML = `
      <div class="trace-stage-head">
        <strong>${escapeHtml(active.title)}</strong>
        <div class="trace-chips">${chips}</div>
      </div>
      <div class="trace-stage-body">
        <div class="trace-user">
          <span class="role">YOUR PROMPT</span>
          <div>${escapeHtml(active.prompt)}</div>
        </div>
        ${stepsHtml}
        <div class="trace-reply">
          <span class="role">ASSISTANT REPLY (GROUNDED IN KQ OUTPUT)</span>
          <div>${active.answer}</div>
        </div>
      </div>
    `;
  }

  /* Prompt Cookbook */
  function renderCookbook() {
    const categories = ['All', ...new Set(COOKBOOK.map((c) => c.category))];
    els.cookbookFilters.innerHTML = '';
    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-btn';
      btn.setAttribute('aria-pressed', String(cat === state.cookbookFilter));
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        state.cookbookFilter = cat;
        renderCookbook();
      });
      els.cookbookFilters.appendChild(btn);
    });

    const items =
      state.cookbookFilter === 'All'
        ? COOKBOOK
        : COOKBOOK.filter((c) => c.category === state.cookbookFilter);

    els.cookbookGrid.innerHTML = '';
    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'recipe-card';

      const top = document.createElement('div');
      top.className = 'recipe-top';
      top.innerHTML = `<span class="recipe-cat">${escapeHtml(item.category)}</span>`;

      const cp = document.createElement('button');
      cp.type = 'button';
      cp.className = 'copy-btn';
      cp.textContent = 'Copy prompt';
      cp.addEventListener('click', () => copyText(item.prompt, cp, els.live));
      top.appendChild(cp);

      const promptBox = document.createElement('div');
      promptBox.className = 'recipe-prompt';
      promptBox.textContent = item.prompt;

      const chips = document.createElement('div');
      chips.className = 'trace-chips';
      item.tools.forEach((t) => {
        const span = document.createElement('span');
        span.className = 'chip';
        span.textContent = t;
        chips.appendChild(span);
      });

      const tip = document.createElement('p');
      tip.className = 'recipe-tip';
      tip.textContent = item.tip;

      card.appendChild(top);
      card.appendChild(promptBox);
      card.appendChild(chips);
      card.appendChild(tip);
      els.cookbookGrid.appendChild(card);
    });
  }

  /* Tools, Formats, FAQs */
  function renderReference() {
    els.toolsGrid.innerHTML = TOOLS.map(
      (t) => `
      <article class="tool-card">
        <div class="tool-head">
          <span class="tool-name">${escapeHtml(t.name)}</span>
          <span class="tool-ro">read-only</span>
        </div>
        <p class="tool-desc">${escapeHtml(t.desc)}</p>
        <div class="tool-cli">${escapeHtml(t.cli)}</div>
      </article>
    `
    ).join('');

    els.formatsBody.innerHTML = FORMATS.map(
      ([kind, exts, output]) => `
      <tr>
        <td><strong>${escapeHtml(kind)}</strong></td>
        <td><code>${escapeHtml(exts)}</code></td>
        <td>${escapeHtml(output)}</td>
      </tr>
    `
    ).join('');

    els.faqList.innerHTML = FAQS.map(
      (f, idx) => `
      <details class="faq-item"${idx === 0 ? ' open' : ''}>
        <summary>${escapeHtml(f.q)}</summary>
        <div class="faq-body"><p>${escapeHtml(f.a)}</p></div>
      </details>
    `
    ).join('');
  }

  renderConfigurator();
  renderTraces();
  renderCookbook();
  renderReference();
});
