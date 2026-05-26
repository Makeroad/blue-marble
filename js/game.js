// ===== ゲーム全体状態と主要ロジック =====
// このファイルが最後にロードされる

// ===== 알림 토스트 시스템 =====
const _toasts = [];

function showNotification(message, type, color) {
  // 기존 토스트들을 위로 밀어 올리기
  _toasts.forEach(t => {
    const cur = parseInt(t.style.bottom) || 80;
    t.style.bottom = (cur + 46) + 'px';
  });

  const el = document.createElement('div');
  el.className = `notification-toast toast-${type || 'info'}`;
  el.textContent = message;
  if (color) el.style.borderLeftColor = color;
  el.style.bottom = '80px';
  document.body.appendChild(el);
  _toasts.push(el);

  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => {
      el.remove();
      const idx = _toasts.indexOf(el);
      if (idx !== -1) _toasts.splice(idx, 1);
    }, 300);
  }, 2200);
}

// ===== ゲーム状態 =====
let state = {
  mode:            null,    // 'bluemarble' | 'monopoly' | 'marblemoa'
  config:          null,    // gameConfig[mode]
  players:         [],
  cells:           [],      // boardData のランタイムコピー
  currentPlayerIdx: 0,
  phase:           'title', // 'title' | 'playing' | 'gameover'
  chanceDeck:      [],
  chanceDiscard:   [],
  dice:            [0, 0],
  lastDiceSum:     0,
  isDoubles:       false,
  pendingAction:   null,
  doubleRentFlag:  false,   // チャンスカード「空港2倍」フラグ
  titleMode:       'bluemarble', // タイトル画面で選択中のモード
  playerCount:     2,       // 総プレイヤー数
};

// ===== タイトル画面イベント =====
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.titleMode = btn.dataset.mode;
    updateTitleModeDesc(state.titleMode);
  });
});

document.querySelectorAll('.player-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.playerCount = parseInt(btn.dataset.count);
  });
});

document.getElementById('titleRulebook')?.addEventListener('click', () => {
  openRuleBook(state.titleMode);
});

document.getElementById('startBtn')?.addEventListener('click', () => {
  document.getElementById('titleScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'flex';
  document.getElementById('ruleBookBtn').style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      startGame(state.titleMode, state.playerCount);
    });
  });
});

function updateTitleModeDesc(mode) {
  const el = document.getElementById('modeDesc');
  if (el) el.textContent = modeDescriptions[mode] || '';
}

// ===== ゲーム初期化 =====
function startGame(mode, totalPlayers) {
  const aiCount = totalPlayers - 1;
  state.mode   = mode;
  state.config = gameConfig[mode];

  // プレイヤー初期化
  state.players = PLAYER_TEMPLATES.slice(0, 1 + aiCount).map(t => ({
    ...t,
    position:      0,
    money:         state.config.startMoney,
    inJail:        false,
    jailTurns:     0,
    doubleCount:   0,
    jailCard:      false,
    isBankrupt:    false,
    lapsCompleted: 0,   // 부루마블 용
    loanUsed:      false, // 모두의마블 용
    landmarkImmune: false, // 모두의마블 면역권
  }));

  // マス状態初期化
  state.cells = boardData.map(sq => ({
    ...sq,
    owner:           null,
    buildLevel:      0,
    mortgaged:       false,
    landmarkEligible: false, // 모두의마블: 랜드마크 건설 가능 플래그
    isLandmark:      false,
  }));

  // チャンスカード: モードに対応するカードだけ使う
  const filteredDeck = chanceDeck.filter(c => c.modes.includes(mode));
  state.chanceDeck    = shuffle([...filteredDeck]);
  state.chanceDiscard = [];

  state.currentPlayerIdx = 0;
  state.dice           = [0, 0];
  state.lastDiceSum    = 0;
  state.isDoubles      = false;
  state.pendingAction  = null;
  state.doubleRentFlag = false;
  state.phase          = 'playing';

  // DOM構築
  buildBoard();
  updateCenterDisplay();
  renderBoard();
  renderPlayerPanels();
  updateUI();

  // ゲーム開始: AIが先番の場合に備えて確認
  const cp = state.players[state.currentPlayerIdx];
  if (cp && cp.isAI) {
    sleep(rand(600, 900)).then(() => runAiTurn(cp));
  }
}

// ===== チャンスカード引き =====
function drawChanceCard() {
  if (state.chanceDeck.length === 0) {
    state.chanceDeck    = shuffle([...state.chanceDiscard]);
    state.chanceDiscard = [];
  }
  const card = state.chanceDeck.pop();
  state.chanceDiscard.push(card);
  return card;
}

// ===== 임대료 계算 =====
function calcRent(cell, payer) {
  if (cell.mortgaged) return 0;
  const sq = boardData[cell.id];

  if (cell.type === 'airport') {
    const ownerAirports = state.cells.filter(c => c.type === 'airport' && c.owner === cell.owner).length;
    let rent = (sq.airportRents || [25000,50000,100000,200000])[ownerAirports - 1] || 25000;
    if (state.doubleRentFlag) rent *= 2;
    return rent;
  }

  if (cell.type === 'utility') {
    const ownerUtils = state.cells.filter(c => c.type === 'utility' && c.owner === cell.owner).length;
    return state.lastDiceSum * (ownerUtils >= 2 ? 10 : 4);
  }

  // property
  if (cell.buildLevel > 0) {
    return sq.rent[cell.buildLevel] || sq.rent[sq.rent.length - 1];
  }

  // 건물 없는 경우
  if (state.mode === 'monopoly') {
    const groupIds = getGroupIds(cell.group);
    const isMonopoly = groupIds.every(id => state.cells[id].owner === cell.owner);
    return isMonopoly ? sq.rent[0] * 2 : sq.rent[0];
  }

  return sq.rent[0];
}

// ===== 資金移動 =====
async function transferMoney(from, to, amount) {
  if (!from || amount <= 0) return;
  from.money -= amount;
  if (to) to.money += amount;
  renderPlayerPanels();

  // 인간 플레이어가 받는 경우 알림 표시
  const humanPlayer = state.players.find(p => !p.isAI);
  if (humanPlayer) {
    if (to && to.id === humanPlayer.id && from.id !== humanPlayer.id) {
      // 받는 경우
      const label = from ? `${from.name}에서` : '은행에서';
      showNotification(`💰 ${label} ${W(amount)} 수령!`, 'receive', '#4ade80');
    } else if (from.id === humanPlayer.id && to) {
      // 내는 경우 (AI에게) - 모달 없이 AI 차례에 발생하는 경우
      if (to.isAI !== false || to.id !== humanPlayer.id) {
        showNotification(`💸 ${to.name}에게 ${W(amount)} 납부`, 'pay', '#f87171');
      }
    } else if (from.id === humanPlayer.id && !to) {
      // 은행/세금에 납부
      showNotification(`💸 ${W(amount)} 납부`, 'pay', '#f87171');
    }
  }

  if (from.money < 0) {
    await handleInsolvency(from, to, amount);
  }
}

// ===== 자금 부족 처리 =====
async function handleInsolvency(player, creditor, needed) {
  const cfg = state.config;

  if (cfg.bankruptMode === 'liquidate') {
    // 모노폴리: 자산 처분 시도
    await aiLiquidateAssets(player, 0);
    if (player.money >= 0) {
      renderPlayerPanels();
      return;
    }
    // 여전히 부족하면 파산
    await declareBankruptcy(player, creditor);

  } else if (cfg.bankruptMode === 'forced_acquisition') {
    // 모두의마블: 대출 먼저 제시
    if (!player.loanUsed && !player.isAI) {
      const takeLoan = await showLoanModal(player);
      if (takeLoan) {
        player.loanUsed = true;
        player.money   += cfg.startMoney;
        renderPlayerPanels();
        if (player.money >= 0) return;
      }
    } else if (!player.loanUsed && player.isAI) {
      // AI는 자동으로 대출
      player.loanUsed = true;
      player.money   += cfg.startMoney;
      renderPlayerPanels();
      if (player.money >= 0) return;
    }

    // 대출 후에도 부족하면 강제 인수
    await forcedAcquisitionProcess(player, creditor, Math.abs(player.money));

  } else {
    // 부루마블: 즉시 파산
    await declareBankruptcy(player, creditor);
  }
}

// ===== 강제 인수 처리 (모두의마블) =====
async function forcedAcquisitionProcess(debtor, creditor, debtAmount) {
  const availableProps = state.cells.filter(c =>
    c.owner === debtor.id && !c.isLandmark && c.type === 'property'
  );

  if (availableProps.length === 0) {
    await declareBankruptcy(debtor, creditor);
    return;
  }

  // 빚과 가장 가까운 가치의 땅 양도
  const target = availableProps.reduce((best, c) => {
    const bq = boardData[best.id];
    const tq = boardData[c.id];
    const bestVal = getAcquisitionCost(best);
    const thisVal = getAcquisitionCost(c);
    return Math.abs(thisVal - debtAmount) < Math.abs(bestVal - debtAmount) ? c : best;
  });

  await showForcedAcquisitionModal(debtor, creditor, target);

  if (creditor) {
    target.owner = creditor.id;
  } else {
    target.owner     = null;
    target.buildLevel = 0;
    target.isLandmark = false;
  }
  // 빚 탕감 (부채 = 0, 보유금 = 0)
  debtor.money = 0;

  updateCell(target.id);
  renderPlayerPanels();

  // 빈손이면 파산
  const remaining = state.cells.filter(c => c.owner === debtor.id);
  if (remaining.length === 0 && debtor.money <= 0) {
    await declareBankruptcy(debtor, creditor);
  }
}

// ===== 파산 선언 =====
async function declareBankruptcy(player, creditor) {
  player.isBankrupt = true;

  // 자산 귀속
  state.cells.forEach(c => {
    if (c.owner === player.id) {
      if (creditor && state.config.bankruptMode === 'immediate') {
        c.owner = creditor.id;
      } else {
        c.owner     = null;
        c.buildLevel = 0;
        c.mortgaged  = false;
        c.isLandmark = false;
      }
    }
  });

  player.money = 0;
  renderBoard();
  renderPlayerPanels();

  await showBankruptModal(player);
  await checkWinCondition();
}

// ===== 교도소/무인도 이동 =====
async function sendToJail(player) {
  await animateDirectMove(player, 10);
  player.inJail    = true;
  player.jailTurns = 0;
  player.doubleCount = 0;
  renderBoard();
  renderPlayerPanels();
}

// ===== マスイベント処理 =====
async function handleLanding(player) {
  const cell = state.cells[player.position];
  const sq   = boardData[player.position];

  switch (cell.type) {
    case 'start':
      // 출발 칸 정확히 착지 보너스 (추가 없음, 통과 시 이미 처리)
      break;

    case 'property':
    case 'airport':
    case 'utility':
      await handlePurchasableLanding(player, cell);
      break;

    case 'tax':
      if (!player.isAI) await showTaxModal(player, cell);
      await transferMoney(player, null, sq.amount);
      break;

    case 'chance':
      await handleChanceLanding(player);
      break;

    case 'go_to_jail':
      await sendToJail(player);
      break;

    case 'jail_visit':
    case 'free_parking':
      break;
  }

  renderPlayerPanels();
}

// ===== 구매/임대 처리 =====
async function handlePurchasableLanding(player, cell) {
  if (cell.owner === null) {
    // 미소유 → 구매 제안
    if (player.isAI) {
      if (aiDecideBuy(player, cell)) {
        buyProperty(player, cell);
      } else if (state.config.canAuction) {
        await runAuction(cell);
      }
    } else {
      const buying = await showBuyModal(player, cell);
      if (buying) {
        buyProperty(player, cell);
      } else if (state.config.canAuction) {
        await runAuction(cell);
      }
    }

  } else if (cell.owner === player.id) {
    // 자신의 땅
    if (state.mode === 'marblemoa') {
      // 랜드마크 건설 가능한지 확인
      if (cell.buildLevel === 3 && !cell.isLandmark) {
        cell.landmarkEligible = true;
        if (!player.isAI) {
          await showMarblemoaBuildModal(player, cell);
        } else {
          const sq = boardData[cell.id];
          if (player.money >= sq.buildCost * 2) {
            buildOnCell(player, cell);
            updateCell(cell.id);
          }
        }
      } else if (cell.buildLevel < 3 && !player.isAI) {
        // 건설 선택지 표시
        const sq = boardData[cell.id];
        if (player.money >= sq.buildCost) {
          await showMarblemoaBuildModal(player, cell);
        }
      }
    } else if (!player.isAI) {
      // 자신 땅 착지 → 건설 추천
      const sq = boardData[cell.id];
      const cfg = state.config;
      let canBuild = false;

      if (state.mode === 'bluemarble' && player.lapsCompleted >= 1 && cell.buildLevel < cfg.maxBuildLevel) {
        canBuild = player.money >= sq.buildCost;
      } else if (state.mode === 'monopoly') {
        const groupIds = getGroupIds(cell.group || '');
        if (groupIds.every(id => state.cells[id].owner === player.id) && cell.buildLevel < cfg.maxBuildLevel) {
          canBuild = player.money >= sq.buildCost;
        }
      }

      if (canBuild) await showBuildRecommendModal(player, cell);
    }

  } else {
    // 타인 소유
    const owner = state.players.find(p => p.id === cell.owner);
    if (!owner || owner.isBankrupt) return;

    if (state.config.canAcquire && !cell.isLandmark && cell.type === 'property') {
      // 인수 가능 (모두의마블)
      if (player.isAI) {
        if (aiDecideAcquire(player, cell)) {
          const acqCost = getAcquisitionCost(cell);
          await acquireProperty(player, cell, acqCost);
          return;
        }
      } else {
        const doAcquire = await showAcquisitionModal(player, cell);
        if (doAcquire) {
          const acqCost = getAcquisitionCost(cell);
          await acquireProperty(player, cell, acqCost);
          return;
        }
      }
    }

    // 通常通行料
    const rent = calcRent(cell, player);
    if (rent === 0) return;
    if (!player.isAI) await showRentModal(player, owner, boardData[cell.id].name, rent);
    await transferMoney(player, owner, rent);
  }
}

// ===== 土地購入 =====
function buyProperty(player, cell) {
  if (player.money < cell.price) return;
  player.money  -= cell.price;
  cell.owner     = player.id;
  updateCell(cell.id);
  renderPlayerPanels();
}

// ===== 인수 (모두의마블) =====
async function acquireProperty(player, cell, cost) {
  const oldOwner = state.players.find(p => p.id === cell.owner);
  await transferMoney(player, oldOwner, cost);
  if (player.money >= 0) {
    // 인수 성공
    cell.owner = player.id;
    updateCell(cell.id);
    renderPlayerPanels();
  }
}

// ===== 건설 =====
// 返り値: 지불한 비용 (0 = 건설 안 됨)
function buildOnCell(player, cell) {
  const cfg = state.config;
  const sq  = boardData[cell.id];

  let cost = sq.buildCost;
  if (state.mode === 'marblemoa' && cell.buildLevel === 3) {
    // 랜드마크
    cost = sq.buildCost * 2;
    if (player.money < cost) return 0;
    if (!cell.landmarkEligible) return 0;
    player.money   -= cost;
    cell.buildLevel = 4;
    cell.isLandmark = true;
    cell.landmarkEligible = false;
    updateCell(cell.id);
    renderPlayerPanels();
    checkMonopolyWinCondition(player);
    return cost;
  }

  if (cell.buildLevel >= cfg.maxBuildLevel) return 0;
  if (player.money < cost) return 0;

  player.money   -= cost;
  cell.buildLevel += 1;
  updateCell(cell.id);
  renderPlayerPanels();
  return cost;
}

// ===== 저당 (모노폴리) =====
function mortgageCell(player, cell) {
  const sq = boardData[cell.id];
  player.money  += Math.floor(sq.price * 0.5);
  cell.mortgaged = true;
  updateCell(cell.id);
  renderPlayerPanels();
}

function unmortgageCell(player, cell) {
  const sq   = boardData[cell.id];
  const cost = Math.floor(sq.price * 0.55);
  if (player.money < cost) return false;
  player.money   -= cost;
  cell.mortgaged  = false;
  updateCell(cell.id);
  renderPlayerPanels();
  return true;
}

// ===== チャンスカード処理 =====
async function handleChanceLanding(player) {
  const card = drawChanceCard();
  await showChanceModal(player, card);
  await applyChanceCard(player, card);
}

async function applyChanceCard(player, card) {
  switch (card.action) {
    case 'moveToStart':
      player.money += state.config.salaryOnPass;
      if (state.mode === 'bluemarble') player.lapsCompleted++;
      player.position = 0;
      renderTokens();
      await handleLanding(player);
      break;

    case 'moveToNearestAirport': {
      const nearest = AIRPORT_IDS.reduce((best, id) => {
        const d1 = (id - player.position + 40) % 40;
        const d2 = (best - player.position + 40) % 40;
        return d1 < d2 ? id : best;
      }, AIRPORT_IDS[0]);
      if ((nearest - player.position + 40) % 40 === 0) {
        // same spot — move to nearest forward
      }
      if (nearest < player.position) {
        player.money += state.config.salaryOnPass;
        if (state.mode === 'bluemarble') player.lapsCompleted++;
      }
      player.position = nearest;
      renderTokens();
      await handleLanding(player);
      break;
    }

    case 'goToJail':
      await sendToJail(player);
      break;

    case 'getJailCard':
      player.jailCard = true;
      break;

    case 'bankReceive':
      player.money += card.amount;
      renderPlayerPanels();
      break;

    case 'bankPay':
      await transferMoney(player, null, card.amount);
      break;

    case 'repairFee': {
      const myProps = state.cells.filter(c => c.owner === player.id && c.type === 'property');
      const hotels = myProps.filter(c => c.buildLevel === 5).length;
      const houses = myProps.reduce((s, c) => s + (c.buildLevel < 5 ? c.buildLevel : 0), 0);
      const fee = houses * 40000 + hotels * 115000;
      if (fee > 0) await transferMoney(player, null, fee);
      break;
    }

    case 'moveBack': {
      const newPos = ((player.position - card.steps) + 40) % 40;
      player.position = newPos;
      renderTokens();
      await handleLanding(player);
      break;
    }

    case 'payEachPlayer': {
      const others = state.players.filter(p => p.id !== player.id && !p.isBankrupt);
      for (const other of others) {
        await transferMoney(player, other, card.amount);
        if (player.isBankrupt) break;
      }
      break;
    }

    case 'receiveFromEach': {
      const others = state.players.filter(p => p.id !== player.id && !p.isBankrupt);
      for (const other of others) {
        await transferMoney(other, player, card.amount);
      }
      break;
    }

    case 'moveForward': {
      const newPos = (player.position + card.steps) % 40;
      if (newPos < player.position) {
        player.money += state.config.salaryOnPass;
        if (state.mode === 'bluemarble') player.lapsCompleted++;
      }
      player.position = newPos;
      renderTokens();
      await handleLanding(player);
      break;
    }

    case 'getLandmarkImmune':
      player.landmarkImmune = true;
      break;

    case 'getMonopolySkip':
      // 구현 간소화: 이번 턴 독점 승리 체크 스킵
      break;
  }

  renderBoard();
  renderPlayerPanels();
}

// ===== 経매処理 (モノポリー) =====
async function runAuction(cell) {
  const result = await showAuctionModal(cell);
  if (result.winner && result.amount > 0) {
    result.winner.money -= result.amount;
    cell.owner = result.winner.id;
    updateCell(cell.id);
    renderPlayerPanels();
  }
}

// ===== 거래 처리 (모노폴리) =====
async function handleTrade(initiator) {
  const proposal = await showTradeModal(initiator);
  if (!proposal) return;

  const { opponent, myPropIds, theirPropIds, myCash, theirCash } = proposal;

  // AI 수락/거절 판단
  let accepted = false;
  if (opponent.isAI) {
    accepted = aiEvaluateTrade(opponent, proposal);
  } else {
    const result = await showModal(
      '🤝 거래 제안',
      `${initiator.name}의 제안을 수락하시겠습니까?`,
      [
        { label:'수락', cls:'btn-primary', value:'accept' },
        { label:'거절', cls:'btn-secondary', value:'reject' },
      ]
    );
    accepted = result === 'accept';
  }

  if (!accepted) {
    if (!opponent.isAI) await showModal('거래', '거절되었습니다.', [{ label:'확인', cls:'btn-secondary' }]);
    return;
  }

  // 거래 실행
  if (myCash > 0) await transferMoney(initiator, opponent, myCash);
  if (theirCash > 0) await transferMoney(opponent, initiator, theirCash);

  myPropIds.forEach(id => {
    state.cells[id].owner = opponent.id;
    updateCell(id);
  });
  theirPropIds.forEach(id => {
    state.cells[id].owner = initiator.id;
    updateCell(id);
  });

  renderPlayerPanels();
}

// ===== 교도소 턴 처리 =====
async function handleJailTurn(player) {
  let action = 'roll';

  if (!player.isAI) {
    action = await showJailModal(player);
  } else {
    await aiDecideJailEscape(player);
    action = player.inJail ? 'roll' : 'skip';
  }

  if (action === 'card') {
    player.jailCard  = false;
    player.inJail    = false;
    player.jailTurns = 0;
    return false; // 탈출 완료 → executeTurn에서 정상 굴리기
  }

  if (action === 'pay') {
    await transferMoney(player, null, 50000);
    if (!player.isBankrupt) {
      player.inJail    = false;
      player.jailTurns = 0;
    }
    return false;
  }

  // 'skip': AI가 이미 탈출한 경우 (runAiTurn 로직과의 이중처리 방지)
  if (action === 'skip') {
    return false;
  }

  // 주사위 굴리기 시도
  const d1 = rand(1, 6);
  const d2 = rand(1, 6);
  await animateDice(d1, d2);
  state.dice      = [d1, d2];
  state.lastDiceSum = d1 + d2;

  if (d1 === d2) {
    // 더블 탈출
    player.inJail    = false;
    player.jailTurns = 0;
    player.doubleCount = 0;
    await animateTokenMove(player, d1 + d2, onPassStart);
    await handleLanding(player);
  } else {
    player.jailTurns++;
    if (player.jailTurns >= 3) {
      // 3턴 후 강제 보석금
      await transferMoney(player, null, 50000);
      if (!player.isBankrupt) {
        player.inJail    = false;
        player.jailTurns = 0;
        await animateTokenMove(player, d1 + d2, onPassStart);
        await handleLanding(player);
      }
    }
  }

  return true; // 교도소 턴 소비 → endTurn
}

// ===== 출발 통과 콜백 =====
function onPassStart(player) {
  player.money += state.config.salaryOnPass;
  if (state.mode === 'bluemarble') player.lapsCompleted++;
  renderPlayerPanels();
  showNotification(`🏁 출발 통과! +${W(state.config.salaryOnPass)}`, 'receive', player.color);
}

// ===== メインターン実行 =====
async function executeTurn(player) {
  if (state.phase !== 'playing') return;

  state.pendingAction = 'rolling';
  updateUI();

  // 교도소/무인도 턴
  if (player.inJail) {
    const consumed = await handleJailTurn(player);
    if (player.isBankrupt) { state.pendingAction = null; return; }
    if (consumed) {
      state.pendingAction = null;
      await endTurn();
      return;
    }
  }

  // 주사위 굴리기
  const d1 = rand(1, 6);
  const d2 = rand(1, 6);
  state.dice        = [d1, d2];
  state.lastDiceSum = d1 + d2;
  state.isDoubles   = d1 === d2;

  await animateDice(d1, d2);

  if (state.isDoubles) {
    player.doubleCount++;

    const maxDoubles = state.config.maxConsecutiveDoubles;
    if (maxDoubles !== Infinity && player.doubleCount >= maxDoubles) {
      // 3연속 더블 → 교도소/무인도
      await sendToJail(player);
      state.pendingAction = null;
      player.doubleCount  = 0;
      await endTurn();
      return;
    }
  } else {
    player.doubleCount = 0;
  }

  // 이동
  await animateTokenMove(player, d1 + d2, onPassStart);

  // 착지 처리
  await handleLanding(player);

  if (player.isBankrupt) {
    state.pendingAction = null;
    return;
  }

  // 더블이면 한 번 더
  if (state.isDoubles && !player.inJail && state.phase === 'playing') {
    state.pendingAction = null;
    if (player.isAI) {
      await sleep(rand(600, 1000));
      await executeTurn(player);
    } else {
      updateUI(); // 플레이어가 주사위 버튼 다시 누를 수 있도록
    }
    return;
  }

  state.pendingAction = null;
  await endTurn();
}

// ===== ターン終了 =====
async function endTurn() {
  state.pendingAction = null;
  if (state.phase !== 'playing') return;

  // 次のプレイヤーを選択
  let next = (state.currentPlayerIdx + 1) % state.players.length;
  let guard = 0;
  while (state.players[next].isBankrupt) {
    next = (next + 1) % state.players.length;
    if (++guard > state.players.length) break;
  }
  state.currentPlayerIdx = next;

  // 生存者確認
  const active = state.players.filter(p => !p.isBankrupt);
  if (active.length <= 1) {
    if (active.length === 1) await showGameOverModal(active[0]);
    return;
  }

  renderPlayerPanels();
  updateUI();

  const cp = state.players[state.currentPlayerIdx];
  if (cp && cp.isAI && state.phase === 'playing') {
    await sleep(rand(500, 900));
    await runAiTurn(cp);
  }
}

// ===== 승리 조건 확인 =====
async function checkWinCondition() {
  if (state.phase !== 'playing') return;

  const active = state.players.filter(p => !p.isBankrupt);
  if (active.length <= 1) {
    if (active.length === 1) {
      state.phase = 'gameover';
      await showGameOverModal(active[0]);
    }
    return;
  }

  if (state.config.winByMonopoly) {
    for (const player of active) {
      if (checkMonopolyWin(player)) {
        state.phase = 'gameover';
        await showGameOverModal(player);
        return;
      }
    }
  }
}

// ===== 모두의마블 독점 승리 판정 =====
function checkMonopolyWin(player) {
  return checkTripleMonopoly(player) || checkLineMonopoly(player) || checkTourismMonopoly(player);
}

function checkMonopolyWinCondition(player) {
  if (state.config.winByMonopoly && checkMonopolyWin(player)) {
    state.phase = 'gameover';
    showGameOverModal(player);
  }
}

// 트리플 독점: 같은 색 그룹 전부 소유
function checkTripleMonopoly(player) {
  const groups = ['A','B','C','D','E','F','G','H'];
  return groups.some(g => {
    const ids = getGroupIds(g);
    return ids.length >= 3 && ids.every(id => state.cells[id].owner === player.id);
  });
}

// 라인 독점: 한 면의 모든 부동산 소유
function checkLineMonopoly(player) {
  return Object.values(LINE_PROPERTIES).some(ids =>
    ids.every(id => state.cells[id].owner === player.id)
  );
}

// 관광지 독점: 공항 4곳 전부 소유
function checkTourismMonopoly(player) {
  return AIRPORT_IDS.every(id => state.cells[id].owner === player.id);
}

// ===== 플레이어 주사위 버튼 =====
document.getElementById('rollBtn')?.addEventListener('click', async () => {
  const cp = state.players[state.currentPlayerIdx];
  if (!cp || cp.isAI || state.pendingAction || state.phase !== 'playing') return;
  await executeTurn(cp);
});

// ===== 건설 버튼 =====
document.getElementById('buildBtn')?.addEventListener('click', async () => {
  const cp = state.players[state.currentPlayerIdx];
  if (!cp || cp.isAI || state.pendingAction || state.phase !== 'playing') return;
  await showBuildModal(cp);
});

// ===== 거래 버튼 (모노폴리) =====
document.getElementById('tradeBtn')?.addEventListener('click', async () => {
  const cp = state.players[state.currentPlayerIdx];
  if (!cp || cp.isAI || state.pendingAction || state.phase !== 'playing') return;
  await handleTrade(cp);
});

// ===== 교도소 보석금 버튼 =====
document.getElementById('jailPayBtn')?.addEventListener('click', async () => {
  const cp = state.players[state.currentPlayerIdx];
  if (!cp || cp.isAI || !cp.inJail) return;
  await transferMoney(cp, null, 50000);
  if (!cp.isBankrupt) {
    cp.inJail    = false;
    cp.jailTurns = 0;
    renderPlayerPanels();
    updateUI();
    await executeTurn(cp);
  }
});

// ===== 탈출권 버튼 =====
document.getElementById('jailCardBtn')?.addEventListener('click', async () => {
  const cp = state.players[state.currentPlayerIdx];
  if (!cp || cp.isAI || !cp.jailCard || !cp.inJail) return;
  cp.jailCard  = false;
  cp.inJail    = false;
  cp.jailTurns = 0;
  renderPlayerPanels();
  updateUI();
  await executeTurn(cp);
});

// ===== 룰북 버튼 =====
document.getElementById('ruleBookBtn')?.addEventListener('click', () => {
  openRuleBook(state.mode || 'bluemarble');
});

// ===== タイトル画面の初期説明文 =====
updateTitleModeDesc('bluemarble');
