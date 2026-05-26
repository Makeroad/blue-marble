// ===== モーダル / ポップアップ管理 =====
// showModal はすべて Promise を返す

// ===== 汎用モーダル =====
function showModal(title, bodyHtml, buttons) {
  return new Promise(resolve => {
    const titleEl = document.getElementById('modalTitle');
    const bodyEl  = document.getElementById('modalBody');
    const btnsEl  = document.getElementById('modalBtns');

    titleEl.textContent = title;
    bodyEl.innerHTML    = bodyHtml;
    btnsEl.innerHTML    = '';

    buttons.forEach(btn => {
      const el = document.createElement('button');
      el.className = btn.cls || 'btn-primary';
      el.textContent = btn.label;
      el.disabled = btn.disabled || false;
      el.addEventListener('click', () => {
        closeModal();
        if (btn.cb) btn.cb();
        resolve(btn.value !== undefined ? btn.value : btn.label);
      }, { once: true });
      btnsEl.appendChild(el);
    });

    document.getElementById('modalBackdrop').classList.add('open');
  });
}

// モーダルを閉じる
function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
}

// ===== 土地購入モーダル =====
async function showBuyModal(player, cell) {
  const sq = boardData[cell.id];
  const canAfford = player.money >= cell.price;
  const result = await showModal(
    '🏠 부지 구매',
    `<strong>${sq.name}</strong><br>가격: <span class="modal-highlight">${W(cell.price)}</span>
     ${!canAfford ? '<br><span style="color:var(--red)">자금 부족!</span>' : ''}`,
    [
      { label:'구매', cls:'btn-primary', value:'buy', disabled: !canAfford },
      { label:'패스', cls:'btn-secondary', value:'pass' },
    ]
  );
  return result === 'buy';
}

// ===== 임대료 알림 모달 =====
async function showRentModal(payer, owner, cellName, amount) {
  await showModal(
    '💸 임대료',
    `<strong>${cellName}</strong><br>${payer.name} → ${owner.name}<br>임대료: <span class="modal-highlight">${W(amount)}</span>`,
    [{ label:'확인', cls:'btn-primary' }]
  );
}

// ===== 찬스 카드 모달 =====
async function showChanceModal(player, card) {
  await showModal(
    '❓ 찬스 카드',
    `<strong style="font-size:1.1rem">${card.text}</strong>`,
    [{ label:'확인', cls:'btn-primary' }]
  );
}

// ===== 파산 모달 =====
async function showBankruptModal(player) {
  await showModal(
    '💀 파산',
    `<div class="gameover-winner">${player.emoji}</div>
     <strong>${player.name}</strong> 파산!<br>모든 자산이 처리됩니다.`,
    [{ label:'확인', cls:'btn-danger' }]
  );
}

// ===== 게임 오버 모달 =====
async function showGameOverModal(winner) {
  await showModal(
    '🏆 게임 종료!',
    `<div class="gameover-winner">${winner.emoji}</div>
     <span class="modal-highlight">${winner.name} 승리!</span>
     최종 자산: ${W(winner.money)}`,
    [{ label:'다시 하기', cls:'btn-primary', cb: () => location.reload() }]
  );
}

// ===== 교도소 선택지 모달 =====
async function showJailModal(player) {
  const jailName = state.config.jailName;
  const buttons = [
    { label:`${W(50000)} 납부`, cls:'btn-danger', value:'pay' },
    { label:'주사위로 탈출 시도', cls:'btn-secondary', value:'roll' },
  ];
  if (player.jailCard) {
    buttons.unshift({ label:'탈출권 사용 🃏', cls:'btn-green', value:'card' });
  }
  return await showModal(
    `🔒 ${jailName}`,
    `${jailName}에 갇혀있습니다. (${player.jailTurns + 1}/3턴)<br>탈출 방법을 선택하세요.`,
    buttons
  );
}

// ===== 건설/부동산관리 모달 =====
function showBuildModal(player) {
  // 모두의마블: 새 4-선택지 모달로 리다이렉트
  if (state.mode === 'marblemoa') {
    const cell = state.cells[player.position];
    if (cell && cell.type === 'property' && cell.owner === player.id && cell.buildLevel < state.config.maxBuildLevel) {
      return showMarblemoaBuildModal(player, cell);
    }
    return showModal('🏠 건설', '현재 위치한 땅에서만 건설할 수 있습니다.<br>내 소유 땅에 착지할 때 건설할 수 있습니다.', [{ label:'닫기', cls:'btn-secondary' }]);
  }
  return new Promise(resolve => {
    const cfg = state.config;
    const cells = state.cells;

    // 건설/관리 가능한 부지 목록 작성
    const manageable = buildGetManageableList(player);

    if (manageable.length === 0) {
      let msg;
      if (state.mode === 'marblemoa') {
        const curCell = state.cells[player.position];
        if (!curCell || curCell.owner !== player.id) {
          msg = '현재 위치한 땅이 내 소유가 아닙니다.<br>내 땅에 착지할 때만 건설할 수 있습니다.';
        } else if (curCell.buildLevel >= cfg.maxBuildLevel) {
          msg = '이미 최고 단계 건물이 있습니다.';
        } else {
          msg = '현재 위치에서 건설할 수 없습니다.';
        }
      } else if (cfg.requireMonopoly) {
        msg = '건설 가능한 부지가 없습니다.<br>같은 색 그룹을 독점해야 건설할 수 있습니다.';
      } else if (state.mode === 'bluemarble' && player.lapsCompleted === 0) {
        msg = '첫 바퀴를 완주한 후 건설이 가능합니다.';
      } else {
        msg = '건설 가능한 부지가 없습니다.';
      }
      showModal('🏠 건설', msg, [{ label:'닫기', cls:'btn-secondary' }]).then(resolve);
      return;
    }

    const titleEl = document.getElementById('modalTitle');
    const bodyEl  = document.getElementById('modalBody');
    const btnsEl  = document.getElementById('modalBtns');

    titleEl.textContent = '🏠 부동산 관리';
    bodyEl.innerHTML = '';
    btnsEl.innerHTML = '';

    const list = document.createElement('div');
    list.className = 'build-list';

    manageable.forEach(item => {
      const cell = item.cell;
      const sq   = boardData[cell.id];
      const div = document.createElement('div');
      div.className = 'build-item' + (cell.mortgaged ? ' mortgaged-item' : '');

      const band = document.createElement('div');
      band.className = 'bi-band';
      band.style.background = sq.color || '#999';

      const info = document.createElement('div');
      info.className = 'bi-info';
      const statusText = buildGetStatusText(cell);
      info.innerHTML = `<div class="bi-name">${sq.name}</div><div class="bi-status" id="bistatus-${cell.id}">${statusText}</div>`;

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '4px';
      actions.style.flexShrink = '0';

      // 건설 버튼 (2단계 확인: 첫 클릭 → "확인?" 상태, 두 번째 클릭 → 건설)
      if (item.canBuild) {
        const buildBtn = document.createElement('button');
        buildBtn.className = 'bi-btn bi-btn-build';
        buildBtn.textContent = buildGetBuildLabel(cell);
        buildBtn.disabled = !item.canAfford;
        buildBtn.title = item.canAfford ? '' : '자금 부족';

        let confirmTimer = null;
        let isConfirming = false;

        const resetBtn = () => {
          isConfirming = false;
          clearTimeout(confirmTimer);
          buildBtn.textContent = buildGetBuildLabel(cell);
          buildBtn.style.background = '';
          buildBtn.style.color = '';
          buildBtn.style.borderColor = '';
        };

        buildBtn.addEventListener('click', () => {
          if (!isConfirming) {
            // 첫 클릭: 확인 요청 상태로 전환
            isConfirming = true;
            const cost = (state.mode === 'marblemoa' && cell.buildLevel === 3)
              ? sq.buildCost * 2 : sq.buildCost;
            buildBtn.textContent = `✓ ${W(cost)}?`;
            buildBtn.style.background = '#f59e0b';
            buildBtn.style.color = '#1a1a1a';
            // 3초 안에 다시 안 누르면 자동 취소
            confirmTimer = setTimeout(resetBtn, 3000);
          } else {
            // 두 번째 클릭: 실제 건설 실행
            clearTimeout(confirmTimer);
            isConfirming = false;
            buildBtn.style.background = '';
            buildBtn.style.color = '';

            const cost = buildOnCell(player, cell);
            if (cost > 0) {
              const statEl = document.getElementById('bistatus-' + cell.id);
              if (statEl) statEl.textContent = buildGetStatusText(cell);
              buildBtn.textContent = buildGetBuildLabel(cell);
              const nextCost = (state.mode === 'marblemoa' && cell.buildLevel === 3)
                ? sq.buildCost * 2 : sq.buildCost;
              buildBtn.disabled = cell.buildLevel >= cfg.maxBuildLevel
                || player.money < nextCost;
              renderPlayerPanels();
              updateCell(cell.id);
            } else {
              resetBtn();
            }
          }
        });
        actions.appendChild(buildBtn);
      }

      // 저당 버튼 (모노폴리만)
      if (cfg.canMortgage) {
        if (!cell.mortgaged && cell.buildLevel === 0 && item.canMortgage) {
          const btn = document.createElement('button');
          btn.className = 'bi-btn bi-btn-mortgage';
          btn.textContent = '저당';
          btn.addEventListener('click', () => {
            mortgageCell(player, cell);
            div.classList.add('mortgaged-item');
            const statEl = document.getElementById('bistatus-' + cell.id);
            if (statEl) statEl.textContent = buildGetStatusText(cell);
            btn.remove();
            // 해제 버튼 추가
            const unBtn = createUnmortgageBtn(player, cell, div, statEl);
            actions.appendChild(unBtn);
            renderPlayerPanels();
          });
          actions.appendChild(btn);
        } else if (cell.mortgaged) {
          const statEl = document.getElementById('bistatus-' + cell.id);
          const unBtn = createUnmortgageBtn(player, cell, div, statEl);
          actions.appendChild(unBtn);
        }
      }

      div.appendChild(band);
      div.appendChild(info);
      div.appendChild(actions);
      list.appendChild(div);
    });

    bodyEl.appendChild(list);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-secondary';
    closeBtn.textContent = '닫기';
    closeBtn.style.flex = '1';
    closeBtn.style.height = '48px';
    closeBtn.addEventListener('click', () => {
      closeModal();
      resolve();
    }, { once: true });
    btnsEl.appendChild(closeBtn);

    document.getElementById('modalBackdrop').classList.add('open');
  });
}

// 저당 해제 버튼 생성ヘルパー
function createUnmortgageBtn(player, cell, divEl, statEl) {
  const sq = boardData[cell.id];
  const cost = Math.floor(sq.price * 0.55);
  const btn = document.createElement('button');
  btn.className = 'bi-btn bi-btn-unmortgage';
  btn.textContent = '해제';
  btn.title = `${W(cost)} 필요`;
  btn.disabled = player.money < cost;
  btn.addEventListener('click', () => {
    if (unmortgageCell(player, cell)) {
      divEl.classList.remove('mortgaged-item');
      if (statEl) statEl.textContent = buildGetStatusText(cell);
      btn.remove();
      renderPlayerPanels();
    }
  });
  return btn;
}

// 建設可能リスト取得
function buildGetManageableList(player) {
  const cfg = state.config;
  const result = [];

  state.cells.forEach(cell => {
    if (cell.type !== 'property') return;
    if (cell.owner !== player.id) return;

    const sq = boardData[cell.id];
    let canBuild = false;
    let canAfford = player.money >= sq.buildCost;
    let canMortgage = false;

    if (state.mode === 'bluemarble') {
      canBuild = player.lapsCompleted >= 1 && cell.buildLevel < cfg.maxBuildLevel;
    } else if (state.mode === 'monopoly') {
      const groupIds = getGroupIds(cell.group);
      const monopoly = groupIds.every(id => state.cells[id].owner === player.id);
      if (monopoly && cell.buildLevel < cfg.maxBuildLevel && !cell.mortgaged) {
        // 균등 건설 체크
        const group = groupIds.map(id => state.cells[id]);
        const minLvl = Math.min(...group.map(c => c.buildLevel));
        canBuild = cell.buildLevel === minLvl;
      }
      canMortgage = !cell.mortgaged && cell.buildLevel === 0;
      // 저당된 땅도 관리 목록에 표시
      if (cell.mortgaged) {
        result.push({ cell, canBuild: false, canAfford: false, canMortgage: false });
        return;
      }
    } else if (state.mode === 'marblemoa') {
      // 모두의마블: 현재 착지한 칸에서만 건설 가능
      if (cell.id !== player.position) return;
      if (cell.buildLevel === 3) {
        // 랜드마크: 빌딩 있는 내 땅에 다시 도착한 경우만 가능
        canBuild = cell.landmarkEligible;
        canAfford = player.money >= sq.buildCost * 2;
      } else if (cell.buildLevel < 3) {
        canBuild = true;
      }
    }

    if (canBuild || (cfg.canMortgage && (canMortgage || cell.mortgaged))) {
      result.push({ cell, canBuild, canAfford, canMortgage });
    }
  });

  return result;
}

// 建設ラベル取得
function buildGetBuildLabel(cell) {
  const cfg = state.config;
  if (cell.buildLevel >= cfg.maxBuildLevel) return '최대';
  if (state.mode === 'marblemoa' && cell.buildLevel === 3) return '⭐ 랜드마크';
  const nextLabel = cfg.buildLabels[cell.buildLevel + 1] || '최대';
  return '+' + nextLabel;
}

// 건물 현황 텍스트
function buildGetStatusText(cell) {
  const cfg = state.config;
  const sq  = boardData[cell.id];
  if (cell.mortgaged) return `저당 중 (해제: ${W(Math.floor(sq.price * 0.55))})`;
  const label = cfg.buildLabels[cell.buildLevel] || '?';
  const cost  = cell.buildLevel < cfg.maxBuildLevel ? ` | 건설비 ${W(sq.buildCost)}` : '';
  return `${label}${cost}`;
}

// ===== 경매 모달 (모노폴리) =====
function showAuctionModal(cell) {
  return new Promise(resolve => {
    const sq = boardData[cell.id];
    const titleEl = document.getElementById('modalTitle');
    const bodyEl  = document.getElementById('modalBody');
    const btnsEl  = document.getElementById('modalBtns');

    titleEl.textContent = '🔨 경매';

    let highestBid = 0;
    let highestBidder = null;

    // AI 입찰 결정
    const aiBids = [];
    state.players.filter(p => p.isAI && !p.isBankrupt).forEach(p => {
      const maxBid = Math.floor(p.money * 0.7);
      if (maxBid > highestBid) {
        const bid = Math.floor(Math.random() * (maxBid - Math.floor(maxBid * 0.2)) + Math.floor(maxBid * 0.2));
        aiBids.push({ player: p, bid });
        if (bid > highestBid) { highestBid = bid; highestBidder = p; }
      }
    });

    const renderBody = (currentBid, currentBidder) => {
      bodyEl.innerHTML = `
        <strong>${sq.name}</strong><br>
        가격: ${W(sq.price)}<br>
        <div class="auction-info">
          현재 최고 입찰: <div class="auction-current-bid">${W(currentBid || 0)}</div>
          ${currentBidder ? `<span style="color:${currentBidder.color}">${currentBidder.name}</span>` : '입찰 없음'}
        </div>
        AI 입찰:<br>${aiBids.map(b => `<span style="color:${b.player.color}">${b.player.name}: ${W(b.bid)}</span>`).join(' / ') || '없음'}
        <div class="auction-input-row">
          <input type="number" class="auction-input" id="auctionInput" placeholder="입찰 금액" min="${currentBid + 1}" max="${state.players.find(p => !p.isAI).money}">
          <button class="btn-blue" id="auctionBidBtn" style="min-height:44px;padding:0 12px">입찰</button>
        </div>
      `;

      const bidBtn = document.getElementById('auctionBidBtn');
      if (bidBtn) {
        bidBtn.addEventListener('click', () => {
          const inputEl = document.getElementById('auctionInput');
          const amount = parseInt(inputEl.value) || 0;
          const humanPlayer = state.players.find(p => !p.isAI && !p.isBankrupt);
          if (humanPlayer && amount > currentBid && amount <= humanPlayer.money) {
            highestBid = amount;
            highestBidder = humanPlayer;
            renderBody(highestBid, highestBidder);
          }
        });
      }
    };

    renderBody(highestBid, highestBidder);

    btnsEl.innerHTML = '';
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-primary';
    confirmBtn.textContent = '낙찰 확정';
    confirmBtn.style.flex = '1';
    confirmBtn.style.height = '48px';
    confirmBtn.addEventListener('click', () => {
      closeModal();
      resolve({ winner: highestBidder, amount: highestBid });
    }, { once: true });

    const passBtn = document.createElement('button');
    passBtn.className = 'btn-secondary';
    passBtn.textContent = '경매 취소';
    passBtn.style.flex = '1';
    passBtn.style.height = '48px';
    passBtn.addEventListener('click', () => {
      closeModal();
      resolve({ winner: null, amount: 0 });
    }, { once: true });

    btnsEl.appendChild(confirmBtn);
    btnsEl.appendChild(passBtn);

    document.getElementById('modalBackdrop').classList.add('open');
  });
}

// ===== 거래 모달 (모노폴리) =====
function showTradeModal(initiator) {
  return new Promise(resolve => {
    const opponents = state.players.filter(p => p.id !== initiator.id && !p.isBankrupt);
    if (opponents.length === 0) { resolve(null); return; }

    const titleEl = document.getElementById('modalTitle');
    const bodyEl  = document.getElementById('modalBody');
    const btnsEl  = document.getElementById('modalBtns');

    titleEl.textContent = '🤝 거래 제안';

    let selectedOpponent = opponents[0];

    const render = () => {
      const myProps = state.cells.filter(c => c.type === 'property' && c.owner === initiator.id);
      const theirProps = state.cells.filter(c => c.type === 'property' && c.owner === selectedOpponent.id);

      bodyEl.innerHTML = `
        <div class="trade-section">
          <div class="trade-section-label">거래 상대</div>
          <div class="trade-opponent-select" id="tradeOpponents">
            ${opponents.map(op => `
              <button class="trade-opponent-btn${op.id === selectedOpponent.id ? ' active' : ''}"
                data-id="${op.id}" style="color:${op.color}">
                ${op.emoji} ${op.name}
              </button>`).join('')}
          </div>
        </div>
        <div class="trade-section">
          <div class="trade-section-label">내가 줄 것</div>
          <div class="trade-cash-row">
            <span class="trade-cash-label">현금</span>
            <input type="number" class="trade-cash-input" id="myOfferCash" placeholder="0" min="0" max="${initiator.money}">
          </div>
          <div class="trade-property-list" id="myOfferProps">
            ${myProps.map(c => {
              const sq = boardData[c.id];
              return `<label class="trade-property-item">
                <input type="checkbox" class="my-prop-cb" value="${c.id}">
                <div class="trade-prop-band" style="background:${sq.color}"></div>
                <span>${sq.name}</span>
              </label>`;
            }).join('') || '<span style="color:var(--text-muted);font-size:0.8rem">보유 부지 없음</span>'}
          </div>
        </div>
        <div class="trade-section">
          <div class="trade-section-label">내가 받을 것</div>
          <div class="trade-cash-row">
            <span class="trade-cash-label">현금</span>
            <input type="number" class="trade-cash-input" id="theirOfferCash" placeholder="0" min="0" max="${selectedOpponent.money}">
          </div>
          <div class="trade-property-list" id="theirOfferProps">
            ${theirProps.map(c => {
              const sq = boardData[c.id];
              return `<label class="trade-property-item">
                <input type="checkbox" class="their-prop-cb" value="${c.id}">
                <div class="trade-prop-band" style="background:${sq.color}"></div>
                <span>${sq.name}</span>
              </label>`;
            }).join('') || '<span style="color:var(--text-muted);font-size:0.8rem">보유 부지 없음</span>'}
          </div>
        </div>
      `;

      // 상대 선택 버튼 이벤트
      document.querySelectorAll('#tradeOpponents .trade-opponent-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedOpponent = state.players.find(p => p.id === btn.dataset.id);
          render();
        });
      });
    };

    render();

    btnsEl.innerHTML = '';
    const proposeBtn = document.createElement('button');
    proposeBtn.className = 'btn-primary';
    proposeBtn.textContent = '제안하기';
    proposeBtn.style.flex = '1';
    proposeBtn.style.height = '48px';
    proposeBtn.addEventListener('click', () => {
      const myProps  = [...document.querySelectorAll('.my-prop-cb:checked')].map(el => parseInt(el.value));
      const theirProps = [...document.querySelectorAll('.their-prop-cb:checked')].map(el => parseInt(el.value));
      const myCash    = parseInt(document.getElementById('myOfferCash')?.value) || 0;
      const theirCash = parseInt(document.getElementById('theirOfferCash')?.value) || 0;
      closeModal();
      resolve({
        opponent: selectedOpponent,
        myPropIds: myProps,
        theirPropIds: theirProps,
        myCash,
        theirCash,
      });
    }, { once: true });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = '취소';
    cancelBtn.style.flex = '1';
    cancelBtn.style.height = '48px';
    cancelBtn.addEventListener('click', () => { closeModal(); resolve(null); }, { once: true });

    btnsEl.appendChild(proposeBtn);
    btnsEl.appendChild(cancelBtn);

    document.getElementById('modalBackdrop').classList.add('open');
  });
}

// ===== 인수 모달 (모두의마블) =====
async function showAcquisitionModal(player, cell) {
  const sq = boardData[cell.id];
  const owner = state.players.find(p => p.id === cell.owner);
  const acqCost = getAcquisitionCost(cell);
  const canAfford = player.money >= acqCost;

  const result = await showModal(
    '🔄 인수',
    `<strong>${sq.name}</strong> (소유: ${owner ? owner.name : '?'})<br>
     통행료 대신 인수할 수 있습니다.<br>
     인수 비용: <span class="acquire-cost">${W(acqCost)}</span>
     ${!canAfford ? '<br><span style="color:var(--red)">자금 부족</span>' : ''}`,
    [
      { label: '인수하기', cls:'btn-primary', value:'acquire', disabled: !canAfford },
      { label: '통행료 납부', cls:'btn-secondary', value:'rent' },
    ]
  );
  return result === 'acquire';
}

// 인수 비용 계산
function getAcquisitionCost(cell) {
  const sq = boardData[cell.id];
  const buildCosts = cell.buildLevel * sq.buildCost;
  return sq.price + buildCosts;
}

// ===== 대출 모달 (모두의마블) =====
async function showLoanModal(player) {
  const loanAmount = state.config.startMoney;
  const result = await showModal(
    '💳 대출',
    `자금이 부족합니다.<br>
     <div class="loan-info">
       대출 가능액: <span class="modal-highlight">${W(loanAmount)}</span>
       (게임당 1회)
     </div>
     대출을 받겠습니까?`,
    [
      { label:'대출받기', cls:'btn-primary', value:'loan' },
      { label:'거절', cls:'btn-secondary', value:'no' },
    ]
  );
  return result === 'loan';
}

// ===== 강제 인수 알림 모달 (모두의마블) =====
async function showForcedAcquisitionModal(debtor, creditor, transferredCell) {
  const sq = boardData[transferredCell.id];
  await showModal(
    '⚡ 강제 인수',
    `${debtor.name}의 <strong>${sq.name}</strong>이(가)<br>
     ${creditor ? creditor.name : '은행'}에 강제 양도됩니다.`,
    [{ label:'확인', cls:'btn-danger' }]
  );
}

// ===== 건설 추천 모달 =====
async function showBuildRecommendModal(player, cell) {
  const sq  = boardData[cell.id];
  const cfg = state.config;
  const nextLevel = cell.buildLevel + 1;
  const nextLabel = cfg.buildLabels[nextLevel] || '';
  const nextRent  = sq.rent[nextLevel] || sq.rent[sq.rent.length - 1];
  const cost = (state.mode === 'marblemoa' && cell.buildLevel === 3)
    ? sq.buildCost * 2 : sq.buildCost;

  if (player.money < cost) return;

  const result = await showModal(
    '💡 건설 추천',
    `<strong>${sq.name}</strong><br>
     ${nextLabel} 건설: <span class="modal-highlight">${W(cost)}</span>
     건설 후 임대료: ${W(nextRent)}`,
    [
      { label:'건설하기', cls:'btn-primary', value:'build' },
      { label:'나중에', cls:'btn-secondary', value:'skip' },
    ]
  );
  if (result === 'build') {
    buildOnCell(player, cell);
    updateCell(cell.id);
    renderPlayerPanels();
  }
}

// ===== 세금 모달 =====
async function showTaxModal(player, cell) {
  const sq = boardData[cell.id];
  await showModal(
    '💰 세금',
    `<strong>${sq.name}</strong><br>납부액: <span class="modal-highlight">${W(sq.amount)}</span>`,
    [{ label:'납부', cls:'btn-primary' }]
  );
}

// ===== 모두의마블 건설 선택지 모달 =====
function showMarblemoaBuildModal(player, cell) {
  const sq  = boardData[cell.id];
  const cfg = state.config;
  const labels = cfg.buildLabels; // ['공터','깃발','빌라','빌딩','랜드마크']
  const icons  = cfg.buildIcons;  // ['','🚩','🏠','🏢','⭐']

  // 선택 가능한 옵션 목록 작성
  const options = [];
  for (let lvl = cell.buildLevel + 1; lvl <= 3; lvl++) {
    const steps = lvl - cell.buildLevel;
    const cost  = steps * sq.buildCost;
    options.push({ level: lvl, label: labels[lvl] || String(lvl), icon: icons[lvl] || '', cost });
  }
  if (cell.buildLevel === 3 && cell.landmarkEligible) {
    options.push({ level: 4, label: labels[4] || '랜드마크', icon: icons[4] || '⭐', cost: sq.buildCost * 2 });
  }

  if (options.length === 0) {
    return showModal('🏠 건설', '더 이상 건설할 수 없습니다.', [{ label:'닫기', cls:'btn-secondary' }]);
  }

  return new Promise(resolve => {
    const titleEl = document.getElementById('modalTitle');
    const bodyEl  = document.getElementById('modalBody');
    const btnsEl  = document.getElementById('modalBtns');

    titleEl.textContent = `🏠 건설 — ${sq.name}`;

    const showOptions = () => {
      bodyEl.innerHTML = `<div class="bo-current">현재: <strong>${labels[cell.buildLevel] || '공터'}</strong> &nbsp;|&nbsp; 잔액: <strong>${W(player.money)}</strong></div>`;

      const list = document.createElement('div');
      list.className = 'build-option-list';

      options.forEach(opt => {
        const canAfford = player.money >= opt.cost;
        const btn = document.createElement('button');
        btn.className = 'build-option-btn' + (canAfford ? '' : ' bo-disabled');
        btn.disabled = !canAfford;
        btn.innerHTML =
          `<span class="bo-icon">${opt.icon}</span>` +
          `<span class="bo-label">${opt.label}</span>` +
          `<span class="bo-cost">${W(opt.cost)}</span>`;
        btn.addEventListener('click', () => showConfirm(opt), { once: true });
        list.appendChild(btn);
      });

      bodyEl.appendChild(list);

      btnsEl.innerHTML = '';
      const skipBtn = document.createElement('button');
      skipBtn.className = 'btn-secondary';
      skipBtn.textContent = '나중에';
      skipBtn.style.cssText = 'flex:1;height:48px';
      skipBtn.addEventListener('click', () => { closeModal(); resolve(); }, { once: true });
      btnsEl.appendChild(skipBtn);
    };

    const showConfirm = (opt) => {
      bodyEl.innerHTML =
        `<div class="bo-confirm-wrap">` +
          `<div class="bo-confirm-icon">${opt.icon}</div>` +
          `<div class="bo-confirm-name">${opt.label} 건설</div>` +
          `<div class="bo-confirm-cost">${W(opt.cost)}</div>` +
          `<div class="bo-confirm-balance">건설 후 잔액: ${W(player.money - opt.cost)}</div>` +
        `</div>`;

      btnsEl.innerHTML = '';

      const buildBtn = document.createElement('button');
      buildBtn.className = 'btn-primary';
      buildBtn.textContent = '건설하기';
      buildBtn.style.cssText = 'flex:1;height:48px';
      buildBtn.addEventListener('click', () => {
        closeModal();
        player.money    -= opt.cost;
        cell.buildLevel  = opt.level;
        if (opt.level === 4) {
          cell.isLandmark       = true;
          cell.landmarkEligible = false;
        }
        updateCell(cell.id);
        renderPlayerPanels();
        resolve();
      }, { once: true });

      const backBtn = document.createElement('button');
      backBtn.className = 'btn-secondary';
      backBtn.textContent = '← 뒤로';
      backBtn.style.cssText = 'flex:1;height:48px';
      backBtn.addEventListener('click', () => { showOptions(); }, { once: true });

      btnsEl.appendChild(buildBtn);
      btnsEl.appendChild(backBtn);
    };

    showOptions();
    document.getElementById('modalBackdrop').classList.add('open');
  });
}
