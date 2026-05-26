// ===== ルールブック UI =====
// openRuleBook(defaultMode): オーバーレイを開く
// 탭 전환, 아코디언 토글, 닫기 처리

let rulebookCurrentMode = 'bluemarble';

// ===== ルールブックを開く =====
function openRuleBook(defaultMode) {
  rulebookCurrentMode = defaultMode || (state && state.mode) || 'bluemarble';

  // 既存のオーバーレイを削除
  const existing = document.getElementById('rulebookOverlay');
  if (existing) existing.remove();

  // オーバーレイ作成
  const overlay = document.createElement('div');
  overlay.className = 'rulebook-overlay';
  overlay.id = 'rulebookOverlay';

  // 背景クリックで閉じる
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeRuleBook();
  });

  const panel = document.createElement('div');
  panel.className = 'rulebook-panel';

  // ヘッダー
  const header = document.createElement('div');
  header.className = 'rulebook-header';
  header.innerHTML = `<h2>📖 룰북</h2>`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'rulebook-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', closeRuleBook);
  header.appendChild(closeBtn);

  // タブ
  const tabs = document.createElement('div');
  tabs.className = 'rulebook-tabs';

  const tabModes = [
    { key: 'bluemarble', label: '부루마블' },
    { key: 'monopoly',   label: '모노폴리' },
    { key: 'marblemoa',  label: '모두의마블' },
  ];

  tabModes.forEach(({ key, label }) => {
    const tab = document.createElement('button');
    tab.className = 'rulebook-tab' + (key === rulebookCurrentMode ? ' active' : '');
    tab.textContent = label;
    tab.dataset.mode = key;
    tab.addEventListener('click', () => switchRulebookTab(key));
    tabs.appendChild(tab);
  });

  // コンテンツ
  const content = document.createElement('div');
  content.className = 'rulebook-content';
  content.id = 'rulebookContent';

  panel.appendChild(header);
  panel.appendChild(tabs);
  panel.appendChild(content);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // 초기 탭 내용 렌더링
  renderRulebookContent(rulebookCurrentMode);
}

// ===== タブ切替 =====
function switchRulebookTab(mode) {
  rulebookCurrentMode = mode;

  // タブのactive更新
  document.querySelectorAll('.rulebook-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  renderRulebookContent(mode);
}

// ===== コンテンツ描画 =====
function renderRulebookContent(mode) {
  const content = document.getElementById('rulebookContent');
  if (!content) return;

  const data = ruleBook[mode];
  if (!data) return;

  content.innerHTML = '';

  // モードタイトル
  const titleEl = document.createElement('div');
  titleEl.className = 'rulebook-mode-title';
  titleEl.textContent = data.title;
  content.appendChild(titleEl);

  const subtitleEl = document.createElement('div');
  subtitleEl.className = 'rulebook-mode-subtitle';
  subtitleEl.textContent = data.subtitle;
  content.appendChild(subtitleEl);

  // アコーディオンセクション
  data.sections.forEach((section, idx) => {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'rulebook-section';
    sectionEl.id = `rb-section-${mode}-${idx}`;

    const headerEl = document.createElement('div');
    headerEl.className = 'rulebook-section-header';
    headerEl.innerHTML = `
      <span>${section.title}</span>
      <span class="rulebook-section-chevron">▼</span>
    `;
    headerEl.addEventListener('click', () => toggleRulebookSection(sectionEl));

    const contentEl = document.createElement('div');
    contentEl.className = 'rulebook-section-content';
    contentEl.textContent = section.content;

    sectionEl.appendChild(headerEl);
    sectionEl.appendChild(contentEl);
    content.appendChild(sectionEl);
  });
}

// ===== アコーディオン開閉 =====
function toggleRulebookSection(sectionEl) {
  sectionEl.classList.toggle('open');
}

// ===== ルールブックを閉じる =====
function closeRuleBook() {
  const overlay = document.getElementById('rulebookOverlay');
  if (overlay) overlay.remove();
}
