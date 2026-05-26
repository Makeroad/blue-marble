// ===== DOM レンダリング =====
// stateはgame.jsで定義、runtime参照のみ (読み取り専用)

// ===== ボード構築 (ゲーム開始時に一度だけ実行) =====
function buildBoard() {
  const board = document.getElementById('board');
  // 既存マスを削除
  board.querySelectorAll('.sq').forEach(el => el.remove());

  const boardSize = board.offsetWidth || 320;
  const cornerSize = boardSize / 11;
  const sideSize = (boardSize - 2 * cornerSize) / 9;

  boardData.forEach((sq, i) => {
    const el = document.createElement('div');
    el.className = 'sq';
    el.id = 'sq-' + i;
    el.dataset.sqId = i;

    // 位置・サイズ計算
    let x, y, w, h, side;
    if (i <= 10) {
      // 底辺: 右から左
      side = 'bottom';
      h = cornerSize;
      if (i === 0)       { x = boardSize - cornerSize; y = boardSize - cornerSize; w = cornerSize; }
      else if (i === 10) { x = 0;                      y = boardSize - cornerSize; w = cornerSize; }
      else               { x = boardSize - cornerSize - i * sideSize; y = boardSize - cornerSize; w = sideSize; }
    } else if (i <= 19) {
      // 左辺: 下から上
      side = 'left-col';
      w = cornerSize;
      x = 0;
      y = boardSize - cornerSize - (i - 10) * sideSize;
      h = sideSize;
    } else if (i <= 30) {
      // 上辺: 左から右
      side = 'top';
      h = cornerSize;
      if (i === 20)      { x = 0;                      y = 0; w = cornerSize; }
      else if (i === 30) { x = boardSize - cornerSize;  y = 0; w = cornerSize; }
      else               { x = (i - 20) * sideSize;    y = 0; w = sideSize; }
    } else {
      // 右辺: 上から下
      side = 'right-col';
      w = cornerSize;
      x = boardSize - cornerSize;
      y = (i - 30) * sideSize;
      h = sideSize;
    }

    el.classList.add(side);
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    el.style.width  = w + 'px';
    el.style.height = h + 'px';

    // コーナー判定
    if ([0, 10, 20, 30].includes(i)) el.classList.add('corner');

    // タイプ別クラス
    const typeClass = {
      chance:'chance', tax:'tax', jail_visit:'jail-visit',
      go_to_jail:'go-to-jail', free_parking:'free-parking',
      airport:'airport', utility:'utility', start:'start',
    };
    if (typeClass[sq.type]) el.classList.add(typeClass[sq.type]);

    // カラーバンド
    if (sq.color && (sq.type === 'property' || sq.type === 'airport')) {
      const band = document.createElement('div');
      band.className = 'color-band';
      band.style.background = sq.color;
      el.appendChild(band);
    }

    // マス名
    const nameEl = document.createElement('div');
    nameEl.className = 'sq-name';
    nameEl.textContent = getSquareIcon(sq) + (sq.color ? '' : ' ') + sq.name;
    el.appendChild(nameEl);

    // 価格表示
    if (sq.price) {
      const priceEl = document.createElement('div');
      priceEl.className = 'sq-price';
      priceEl.textContent = W(sq.price);
      el.appendChild(priceEl);
    }

    // 所有者バッジ
    const badge = document.createElement('div');
    badge.className = 'owner-badge';
    badge.id = 'badge-' + i;
    el.appendChild(badge);

    // 建物表示コンテナ
    const bld = document.createElement('div');
    bld.className = 'buildings';
    bld.id = 'bld-' + i;
    el.appendChild(bld);

    // トークンコンテナ
    const tokens = document.createElement('div');
    tokens.className = 'tokens';
    tokens.id = 'tokens-' + i;
    el.appendChild(tokens);

    board.appendChild(el);
  });
}

function getSquareIcon(sq) {
  const icons = {
    start:'🏁', chance:'❓', tax:'💰', jail_visit:'👀',
    go_to_jail:'🚔', free_parking:'🅿', airport:'✈️', utility:'⚡',
  };
  return icons[sq.type] || '';
}

// ===== ボード全体更新 =====
function renderBoard() {
  if (!state || state.phase === 'title') return;

  state.cells.forEach((cell, i) => {
    updateCell(i);
  });

  renderTokens();
}

// ===== 個別マス更新 =====
function updateCell(idx) {
  const cell = state.cells[idx];
  if (!cell) return;

  // 所有者バッジ
  const badge = document.getElementById('badge-' + idx);
  if (badge) {
    if (cell.owner) {
      const owner = PLAYER_TEMPLATES.find(p => p.id === cell.owner);
      badge.style.background = owner ? owner.color : '#999';
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  // 저당 표시
  const sqEl = document.getElementById('sq-' + idx);
  if (sqEl) {
    if (cell.mortgaged) sqEl.classList.add('mortgaged');
    else sqEl.classList.remove('mortgaged');
  }

  // 建物表示
  const bld = document.getElementById('bld-' + idx);
  if (bld && cell.type === 'property') {
    bld.innerHTML = '';
    if (cell.buildLevel > 0) {
      const cfg = state.config;
      if (state.mode === 'marblemoa') {
        // 깃발/빌라/빌딩/랜드마크
        const classes = ['', 'bld-flag', 'bld-villa', 'bld-building', 'bld-landmark'];
        for (let lvl = 1; lvl <= cell.buildLevel; lvl++) {
          if (lvl === cell.buildLevel) { // 最高レベルのみ表示
            const el = document.createElement('div');
            el.className = classes[lvl] || 'bld-house';
            bld.appendChild(el);
          }
        }
      } else if (state.mode === 'monopoly') {
        if (cell.buildLevel === 5) {
          const h = document.createElement('div');
          h.className = 'bld-hotel';
          bld.appendChild(h);
        } else {
          for (let j = 0; j < cell.buildLevel; j++) {
            const h = document.createElement('div');
            h.className = 'bld-house';
            bld.appendChild(h);
          }
        }
      } else {
        // 부루마블: 별장=1, 빌딩=2, 호텔=3
        if (cell.buildLevel === 3) {
          const h = document.createElement('div');
          h.className = 'bld-hotel';
          bld.appendChild(h);
        } else {
          for (let j = 0; j < cell.buildLevel; j++) {
            const h = document.createElement('div');
            h.className = 'bld-house';
            bld.appendChild(h);
          }
        }
      }
    }
  }
}

// ===== トークン描画 =====
function renderTokens() {
  if (!state) return;

  // 全トークンをクリア
  document.querySelectorAll('.tokens').forEach(el => (el.innerHTML = ''));

  // 位置ごとにグループ化
  const posMap = {};
  state.players.forEach(p => {
    if (p.isBankrupt) return;
    if (!posMap[p.position]) posMap[p.position] = [];
    posMap[p.position].push(p);
  });

  Object.entries(posMap).forEach(([pos, players]) => {
    const container = document.getElementById('tokens-' + pos);
    if (!container) return;
    players.forEach(p => {
      const tok = document.createElement('div');
      tok.className = 'token';
      tok.id = 'token-' + p.id;
      tok.style.background = p.color;
      tok.textContent = p.emoji;
      container.appendChild(tok);
    });
  });
}

// ===== プレイヤーパネル更新 =====
function renderPlayerPanels() {
  if (!state) return;
  const container = document.getElementById('playersContainer');
  if (!container) return;
  container.innerHTML = '';

  state.players.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'player-card' + (p.isBankrupt ? ' bankrupt' : '');
    card.id = 'pcard-' + p.id;
    if (idx === state.currentPlayerIdx && !p.isBankrupt) card.classList.add('active');

    const ownedCount = state.cells.filter(c => c.owner === p.id).length;
    const statusHtml = p.inJail
      ? `<div class="pc-status">🔒 ${state.config.jailName}</div>`
      : (p.loanUsed ? '<div class="pc-status">대출 사용됨</div>' : '');

    const lapHtml = state.mode === 'bluemarble' && p.lapsCompleted === 0
      ? '<div class="pc-status">첫 바퀴 중</div>' : '';

    card.innerHTML = `
      <div class="pc-header">
        <span class="pc-emoji">${p.emoji}</span>
        <span class="pc-name" style="color:${p.color}">${p.name}</span>
        ${p.jailCard ? '<span style="font-size:0.7rem" title="탈출권 보유">🃏</span>' : ''}
      </div>
      <div class="pc-money">${W(p.money)}</div>
      <div class="pc-owned">🏙 ${ownedCount}칸 소유</div>
      ${statusHtml}${lapHtml}
    `;
    container.appendChild(card);
  });
}

// ===== UI コントロール更新 =====
function updateUI() {
  if (!state || state.phase !== 'playing') return;

  // 破産者をスキップ
  while (
    state.players[state.currentPlayerIdx] &&
    state.players[state.currentPlayerIdx].isBankrupt
  ) {
    state.currentPlayerIdx = (state.currentPlayerIdx + 1) % state.players.length;
  }

  const cp = state.players[state.currentPlayerIdx];
  if (!cp) return;

  const rollBtn     = document.getElementById('rollBtn');
  const buildBtn    = document.getElementById('buildBtn');
  const tradeBtn    = document.getElementById('tradeBtn');
  const jailCardBtn = document.getElementById('jailCardBtn');
  const jailPayBtn  = document.getElementById('jailPayBtn');
  const turnInfo    = document.getElementById('turnInfo');

  if (!rollBtn) return;

  const isHuman = !cp.isAI;
  const isBlocked = state.pendingAction !== null;

  turnInfo.textContent = cp.isAI ? `${cp.name}의 차례` : '당신의 차례';

  rollBtn.disabled  = !isHuman || isBlocked;
  buildBtn.disabled = !isHuman || isBlocked;

  if (tradeBtn) {
    tradeBtn.style.display = (isHuman && state.config.canTrade && !isBlocked) ? 'block' : 'none';
  }

  if (jailCardBtn) {
    jailCardBtn.style.display =
      (isHuman && cp.jailCard && cp.inJail && !isBlocked) ? 'block' : 'none';
  }

  if (jailPayBtn) {
    jailPayBtn.style.display =
      (isHuman && cp.inJail && !cp.jailCard && !isBlocked) ? 'block' : 'none';
  }

  // アクティブカードの枠を更新
  document.querySelectorAll('.player-card').forEach(el => el.classList.remove('active'));
  const activeCard = document.getElementById('pcard-' + cp.id);
  if (activeCard) activeCard.classList.add('active');
}

// ===== 보드 중앙 타이틀 업데이트 =====
function updateCenterDisplay() {
  const titleEl = document.getElementById('centerTitle');
  const modeEl  = document.getElementById('centerMode');
  if (!state || !state.config) return;
  if (titleEl) titleEl.textContent = 'BLUE MARBLE';
  if (modeEl)  modeEl.textContent  = state.config.name;
}

// ===== リサイズ時のボード再構築 =====
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state && state.phase === 'playing') {
      buildBoard();
      renderBoard();
      renderPlayerPanels();
    }
  }, 200);
});
