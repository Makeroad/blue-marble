// ===== アニメーション関数 =====
// Promise を返し、game.js で await して使用する

// ===== サイコロアニメーション =====
// 600ms間、80ms間隔でランダム数字を表示 → 最終値確定
async function animateDice(finalVal1, finalVal2) {
  const d1 = document.getElementById('die1');
  const d2 = document.getElementById('die2');
  if (d1) d1.classList.add('rolling');
  if (d2) d2.classList.add('rolling');

  return new Promise(resolve => {
    const duration = 600;
    const interval = 80;
    let elapsed = 0;

    const timer = setInterval(() => {
      const r1 = Math.ceil(Math.random() * 6);
      const r2 = Math.ceil(Math.random() * 6);
      if (d1) d1.textContent = r1;
      if (d2) d2.textContent = r2;
      elapsed += interval;

      if (elapsed >= duration) {
        clearInterval(timer);
        if (d1) { d1.textContent = finalVal1; d1.classList.remove('rolling'); }
        if (d2) { d2.textContent = finalVal2; d2.classList.remove('rolling'); }
        resolve();
      }
    }, interval);
  });
}

// ===== トークン移動アニメーション (1マスずつ) =====
// 1マス150ms、bounceアニメーション付き
// passedStartCallback: 出発通過時に呼ばれる関数
async function animateTokenMove(player, steps, passedStartCallback) {
  for (let i = 0; i < steps; i++) {
    // 現在のトークンをbounce状態に
    const tokOld = document.getElementById('token-' + player.id);
    if (tokOld) tokOld.classList.add('moving');

    const oldPos = player.position;
    const newPos = (player.position + 1) % 40;

    // 出発点(0)を通過したかチェック
    if (newPos === 0 && oldPos === 39) {
      if (passedStartCallback) passedStartCallback(player);
    }

    player.position = newPos;
    renderTokens();
    renderPlayerPanels();

    await sleep(150);
  }

  // 移動終了後、bounceクラス削除
  const tokEnd = document.getElementById('token-' + player.id);
  if (tokEnd) tokEnd.classList.remove('moving');
}

// ===== 교도소/무인도 직행 (テレポート) =====
async function animateDirectMove(player, targetPos) {
  const tok = document.getElementById('token-' + player.id);
  if (tok) {
    tok.style.transition = 'opacity 0.2s';
    tok.style.opacity = '0';
  }
  await sleep(200);
  player.position = targetPos;
  renderTokens();
  const tokNew = document.getElementById('token-' + player.id);
  if (tokNew) {
    tokNew.style.opacity = '0';
    tokNew.style.transition = 'opacity 0.3s';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tokNew.style.opacity = '1';
      });
    });
  }
  await sleep(300);
}
