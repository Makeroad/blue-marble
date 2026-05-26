// ===== AI 판단 로직 =====
// game.js の state を参照、変更は game.js の関数経由のみ

// ===== AI ターン実行 (非同期) =====
// 교도소/무인도 탈출 판단は executeTurn → handleJailTurn で処理
async function runAiTurn(player) {
  if (player.isBankrupt || state.phase !== 'playing') return;

  // AI의 사고 딜레이 (800~1200ms)
  await sleep(rand(800, 1200));

  // 트레이드 시도 (모노폴리만)
  if (state.config.canTrade) {
    await aiConsiderTrade(player);
  }

  // 건설 판단
  await aiConsiderBuilding(player);

  // 턴 실행 (교도소 탈출 판단은 executeTurn 내부에서 처리)
  await executeTurn(player);
}

// ===== AI 교도소 탈출 판단 =====
async function aiDecideJailEscape(player) {
  // 탈출권이 있으면 사용
  if (player.jailCard) {
    player.jailCard = false;
    player.inJail = false;
    player.jailTurns = 0;
    return;
  }

  // 자금 충분하고 2턴 이상 갇혀있으면 돈으로 탈출
  if (player.money > 300000 && player.jailTurns >= 1) {
    player.money -= 50000;
    player.inJail = false;
    player.jailTurns = 0;
  }
  // 나머지는 주사위로 시도
}

// ===== AI 건설 판단 =====
async function aiConsiderBuilding(player) {
  const cfg = state.config;

  if (state.mode === 'bluemarble') {
    if (player.lapsCompleted < 1) return;

    // 소유 부지에 건설
    const myProps = state.cells.filter(c => c.type === 'property' && c.owner === player.id && c.buildLevel < cfg.maxBuildLevel);
    for (const cell of myProps) {
      const sq = boardData[cell.id];
      if (player.money > sq.buildCost * 3) {
        buildOnCell(player, cell);
        await sleep(300);
      }
    }

  } else if (state.mode === 'monopoly') {
    // 독점 그룹의 최소 레벨 부지에 건설 (균등 원칙)
    const groups = {};
    state.cells.forEach(c => {
      if (c.type === 'property' && c.owner === player.id && !c.mortgaged) {
        if (!groups[c.group]) groups[c.group] = [];
        groups[c.group].push(c);
      }
    });

    for (const [grp, cells] of Object.entries(groups)) {
      const groupIds = getGroupIds(grp);
      if (!groupIds.every(id => state.cells[id].owner === player.id)) continue;

      const sortedByLevel = cells.filter(c => c.buildLevel < cfg.maxBuildLevel)
        .sort((a, b) => a.buildLevel - b.buildLevel);

      for (const cell of sortedByLevel) {
        const sq = boardData[cell.id];
        if (player.money > sq.buildCost * 2.5) {
          buildOnCell(player, cell);
          await sleep(300);
        }
        break; // 한 칸씩만
      }
    }

  } else if (state.mode === 'marblemoa') {
    // 소유 부지에 즉시 건설
    const myProps = state.cells.filter(c => c.type === 'property' && c.owner === player.id && c.buildLevel < 3);
    for (const cell of myProps) {
      const sq = boardData[cell.id];
      if (player.money > sq.buildCost * 3) {
        buildOnCell(player, cell);
        await sleep(200);
      }
    }
  }
}

// ===== AI 구매 판단 =====
function aiDecideBuy(player, cell) {
  const sq = boardData[cell.id];
  if (player.money < sq.price) return false;

  // 독점 완성에 필요한 경우 적극 구매
  if (sq.type === 'property') {
    const groupIds = getGroupIds(sq.group);
    const alreadyOwn = groupIds.filter(id => state.cells[id].owner === player.id).length;
    if (alreadyOwn > 0 && player.money >= sq.price * 1.2) return true;
  }

  // 공항은 적극 구매
  if (sq.type === 'airport' && player.money >= sq.price * 1.5) return true;

  // 기본 판단: 자금의 60% 이하 가격이면 구매
  return player.money > sq.price * 2;
}

// ===== AI 경매 입찰 (모노폴리) =====
function aiGetAuctionBid(player, cell, currentHighest) {
  const sq = boardData[cell.id];
  const maxBid = Math.floor(player.money * 0.7);
  if (maxBid <= currentHighest) return 0;

  // 독점 완성에 필요하면 더 높게 입찰
  const groupIds = getGroupIds(sq.group || '');
  const alreadyOwn = groupIds.filter(id => state.cells[id].owner === player.id).length;
  const multiplier = alreadyOwn > 0 ? 1.3 : 1.0;

  const bid = Math.floor(sq.price * multiplier * (0.5 + Math.random() * 0.5));
  return Math.min(bid, maxBid) > currentHighest ? Math.min(bid, maxBid) : 0;
}

// ===== AI 거래 수락 판단 (모노폴리) =====
function aiEvaluateTrade(player, proposal) {
  // 받는 가치 계산
  let receiveValue = proposal.theirCash;
  proposal.myPropIds.forEach(id => {
    // theirProps = 상대가 주는 것 (proposal.theirPropIds)
  });

  // 간단한 평가: 제안받은 것의 총 가치 >= 주는 것의 90%
  const myPropValue  = proposal.myPropIds.reduce((s, id) => s + (boardData[id]?.price || 0), 0);
  const theirPropValue = proposal.theirPropIds.reduce((s, id) => s + (boardData[id]?.price || 0), 0);

  const givingTotal    = myPropValue  + proposal.myCash;
  const receivingTotal = theirPropValue + proposal.theirCash;

  // 독점 완성 여부 확인
  if (proposal.theirPropIds.length > 0) {
    for (const id of proposal.theirPropIds) {
      const sq = boardData[id];
      if (sq && sq.type === 'property') {
        const groupIds = getGroupIds(sq.group);
        const afterTrade = groupIds.every(gid =>
          state.cells[gid].owner === player.id || proposal.theirPropIds.includes(gid)
        );
        if (afterTrade) return true; // 독점 완성되면 무조건 수락
      }
    }
  }

  return receivingTotal >= givingTotal * 0.9;
}

// ===== AI 거래 시도 (모노폴리) =====
async function aiConsiderTrade(player) {
  // AI가 독점에 필요한 땅이 다른 플레이어에게 있는 경우 거래 시도
  // 간략 구현: 실제 복잡한 거래는 생략
}

// ===== AI 인수 판단 (모두의마블) =====
function aiDecideAcquire(player, cell) {
  const acqCost = getAcquisitionCost(cell);
  if (player.money < acqCost) return false;

  // 공격적 플레이: 자금의 80% 이하면 인수 시도
  return player.money > acqCost * 1.5;
}

// ===== AI 파산 시 자산 처분 (모노폴리 liquidate) =====
async function aiLiquidateAssets(player, needed) {
  const cfg = state.config;

  // 1단계: 건물 매각 (반값)
  const propsWithBuildings = state.cells.filter(c => c.owner === player.id && c.buildLevel > 0);
  for (const cell of propsWithBuildings) {
    if (player.money >= needed) break;
    const sq = boardData[cell.id];
    // 균등 철거: 최고 레벨부터
    const groupCells = getGroupIds(cell.group).map(id => state.cells[id]);
    const maxLvl = Math.max(...groupCells.map(c => c.buildLevel));
    if (cell.buildLevel === maxLvl) {
      player.money += Math.floor(sq.buildCost * 0.5);
      cell.buildLevel--;
      updateCell(cell.id);
    }
  }

  // 2단계: 저당
  if (!cfg.canMortgage) return;
  const mortgageable = state.cells.filter(c => c.owner === player.id && !c.mortgaged && c.buildLevel === 0);
  for (const cell of mortgageable) {
    if (player.money >= needed) break;
    mortgageCell(player, cell);
  }
}
