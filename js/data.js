// ===== 静的データ定義 =====
// boardData, gameConfig, ruleBook, PLAYER_TEMPLATES を定義する

// ===== プレイヤーテンプレート =====
const PLAYER_TEMPLATES = [
  { id:'player', name:'YOU',  isAI:false, color:'#2196F3', emoji:'🔵' },
  { id:'ai1',    name:'철수', isAI:true,  color:'#F44336', emoji:'🔴' },
  { id:'ai2',    name:'영희', isAI:true,  color:'#FFA000', emoji:'🟡' },
  { id:'ai3',    name:'민준', isAI:true,  color:'#4CAF50', emoji:'🟢' },
];

// ===== ボードデータ (40マス) =====
// rent配列: [基本, レベル1, レベル2, レベル3, レベル4, レベル5]
// 부루마블: 인덱스 0-3 사용 (나대지, 별장, 빌딩, 호텔)
// 모노폴리: 인덱스 0-5 사용 (나대지, 집1-4, 호텔)
// 모두의마블: 인덱스 0-4 사용 (빈땅, 깃발, 빌라, 빌딩, 랜드마크)
const boardData = [
  { id:0,  name:'출발',    type:'start' },
  { id:1,  name:'제주도',  type:'property', group:'A', color:'#8B4513',
    price:60000,   buildCost:50000,
    rent:[2000,  10000,  30000,  90000,  160000, 250000] },
  { id:2,  name:'찬스',    type:'chance' },
  { id:3,  name:'부산',    type:'property', group:'A', color:'#8B4513',
    price:80000,   buildCost:50000,
    rent:[4000,  20000,  60000,  180000, 320000, 450000] },
  { id:4,  name:'세금',    type:'tax', amount:20000 },
  { id:5,  name:'인천공항',type:'airport', price:200000,
    airportRents:[25000,50000,100000,200000] },
  { id:6,  name:'서울',    type:'property', group:'B', color:'#87CEEB',
    price:100000,  buildCost:50000,
    rent:[6000,  30000,  90000,  270000, 400000, 550000] },
  { id:7,  name:'찬스',    type:'chance' },
  { id:8,  name:'대전',    type:'property', group:'B', color:'#87CEEB',
    price:100000,  buildCost:50000,
    rent:[6000,  30000,  90000,  270000, 400000, 550000] },
  { id:9,  name:'광주',    type:'property', group:'B', color:'#87CEEB',
    price:120000,  buildCost:50000,
    rent:[8000,  40000,  100000, 300000, 450000, 600000] },
  { id:10, name:'교도소\n방문', type:'jail_visit' },
  { id:11, name:'로마',    type:'property', group:'C', color:'#FF69B4',
    price:140000,  buildCost:100000,
    rent:[10000, 50000,  150000, 450000, 625000, 750000] },
  { id:12, name:'전력회사',type:'utility',  price:150000,
    airportRents:null },
  { id:13, name:'베니스',  type:'property', group:'C', color:'#FF69B4',
    price:140000,  buildCost:100000,
    rent:[10000, 50000,  150000, 450000, 625000, 750000] },
  { id:14, name:'베를린',  type:'property', group:'C', color:'#FF69B4',
    price:160000,  buildCost:100000,
    rent:[12000, 60000,  180000, 500000, 700000, 900000] },
  { id:15, name:'런던공항',type:'airport',  price:200000,
    airportRents:[25000,50000,100000,200000] },
  { id:16, name:'마드리드',type:'property', group:'D', color:'#FFA500',
    price:180000,  buildCost:100000,
    rent:[14000, 70000,  200000, 550000, 750000, 950000] },
  { id:17, name:'찬스',    type:'chance' },
  { id:18, name:'파리',    type:'property', group:'D', color:'#FFA500',
    price:180000,  buildCost:100000,
    rent:[14000, 70000,  200000, 550000, 750000, 950000] },
  { id:19, name:'뮌헨',    type:'property', group:'D', color:'#FFA500',
    price:200000,  buildCost:100000,
    rent:[16000, 80000,  220000, 600000, 800000, 1000000] },
  { id:20, name:'무료\n주차', type:'free_parking' },
  { id:21, name:'뉴욕',    type:'property', group:'E', color:'#FF4444',
    price:220000,  buildCost:150000,
    rent:[18000, 90000,  250000, 700000, 875000, 1050000] },
  { id:22, name:'찬스',    type:'chance' },
  { id:23, name:'워싱턴',  type:'property', group:'E', color:'#FF4444',
    price:220000,  buildCost:150000,
    rent:[18000, 90000,  250000, 700000, 875000, 1050000] },
  { id:24, name:'보스턴',  type:'property', group:'E', color:'#FF4444',
    price:240000,  buildCost:150000,
    rent:[20000, 100000, 300000, 750000, 925000, 1100000] },
  { id:25, name:'뉴욕공항',type:'airport',  price:200000,
    airportRents:[25000,50000,100000,200000] },
  { id:26, name:'시드니',  type:'property', group:'F', color:'#FFD700',
    price:260000,  buildCost:150000,
    rent:[22000, 110000, 330000, 800000, 975000, 1150000] },
  { id:27, name:'도쿄',    type:'property', group:'F', color:'#FFD700',
    price:260000,  buildCost:150000,
    rent:[22000, 110000, 330000, 800000, 975000, 1150000] },
  { id:28, name:'수도세',  type:'tax', amount:20000 },
  { id:29, name:'홍콩',    type:'property', group:'F', color:'#FFD700',
    price:280000,  buildCost:150000,
    rent:[24000, 120000, 360000, 850000, 1025000, 1200000] },
  { id:30, name:'교도소\n행', type:'go_to_jail' },
  { id:31, name:'모스크바',type:'property', group:'G', color:'#00AA00',
    price:300000,  buildCost:200000,
    rent:[26000, 130000, 390000, 900000, 1100000, 1275000] },
  { id:32, name:'스톡홀름',type:'property', group:'G', color:'#00AA00',
    price:300000,  buildCost:200000,
    rent:[26000, 130000, 390000, 900000, 1100000, 1275000] },
  { id:33, name:'찬스',    type:'chance' },
  { id:34, name:'상파울루',type:'property', group:'G', color:'#00AA00',
    price:320000,  buildCost:200000,
    rent:[28000, 150000, 450000, 1000000, 1200000, 1400000] },
  { id:35, name:'카이로\n공항', type:'airport', price:200000,
    airportRents:[25000,50000,100000,200000] },
  { id:36, name:'찬스',    type:'chance' },
  { id:37, name:'LA',      type:'property', group:'H', color:'#00008B',
    price:350000,  buildCost:200000,
    rent:[35000, 175000, 500000, 1100000, 1300000, 1500000] },
  { id:38, name:'세금',    type:'tax', amount:100000 },
  { id:39, name:'두바이',  type:'property', group:'H', color:'#00008B',
    price:400000,  buildCost:200000,
    rent:[50000, 200000, 600000, 1400000, 1700000, 2000000] },
];

// 공항 칸 인덱스
const AIRPORT_IDS = [5, 15, 25, 35];

// ===== モード別設定 =====
const gameConfig = {
  bluemarble: {
    name: '부루마블',
    startMoney: 1500000,
    salaryOnPass: 200000,
    maxConsecutiveDoubles: Infinity,
    jailName: '교도소',
    islandName: '무인도',
    requireMonopoly: false,    // 독점 없이 건설 가능
    requireLap: true,           // 1바퀴 후 건설 가능
    evenBuild: false,           // 균등 건설 원칙 없음
    canAcquire: false,
    canMortgage: false,
    canTrade: false,
    canAuction: false,
    loanEnabled: false,
    winByMonopoly: false,
    bankruptMode: 'immediate',  // 즉시 파산
    maxBuildLevel: 3,           // 0=나대지, 1=별장, 2=빌딩, 3=호텔
    buildLabels: ['나대지', '별장', '빌딩', '호텔'],
    buildIcons:  ['', '🏕', '🏢', '🏨'],
  },
  monopoly: {
    name: '모노폴리',
    startMoney: 1500000,
    salaryOnPass: 200000,
    maxConsecutiveDoubles: 3,
    jailName: '교도소',
    islandName: '무인도',
    requireMonopoly: true,
    requireLap: false,
    evenBuild: true,            // 균등 건설 원칙 적용
    canAcquire: false,
    canMortgage: true,
    canTrade: true,
    canAuction: true,
    loanEnabled: false,
    winByMonopoly: false,
    bankruptMode: 'liquidate',  // 자산 정리 후 파산
    maxBuildLevel: 5,           // 0=나대지, 1-4=집, 5=호텔
    buildLabels: ['나대지', '집 1채', '집 2채', '집 3채', '집 4채', '호텔'],
    buildIcons:  ['', '🏠', '🏠🏠', '🏠🏠🏠', '🏠🏠🏠🏠', '🏨'],
  },
  marblemoa: {
    name: '모두의마블',
    startMoney: 2000000,
    salaryOnPass: 200000,
    maxConsecutiveDoubles: 3,
    jailName: '무인도',
    islandName: '무인도',
    requireMonopoly: false,
    requireLap: false,
    evenBuild: false,
    canAcquire: true,
    canMortgage: false,
    canTrade: false,
    canAuction: false,
    loanEnabled: true,
    winByMonopoly: true,
    bankruptMode: 'forced_acquisition',
    maxBuildLevel: 4,           // 0=빈땅, 1=깃발, 2=빌라, 3=빌딩, 4=랜드마크
    buildLabels: ['빈 땅', '깃발', '빌라', '빌딩', '랜드마크'],
    buildIcons:  ['', '🚩', '🏡', '🏢', '⭐'],
  },
};

// ===== チャンスカードデッキ =====
// 모드별 카드 필터링은 game.js에서 처리
const chanceDeck = [
  { id:1,  text:'출발점으로 이동 (₩200,000 수령)',             action:'moveToStart',            modes:['bluemarble','monopoly','marblemoa'] },
  { id:2,  text:'가장 가까운 공항으로 이동',                   action:'moveToNearestAirport',   modes:['bluemarble','monopoly','marblemoa'] },
  { id:3,  text:'교도소/무인도 직행',                          action:'goToJail',               modes:['bluemarble','monopoly','marblemoa'] },
  { id:4,  text:'교도소 탈출권 획득 🃏',                       action:'getJailCard',            modes:['monopoly'] },
  { id:5,  text:'은행에서 ₩50,000 수령',                      action:'bankReceive', amount:50000,  modes:['bluemarble','monopoly','marblemoa'] },
  { id:6,  text:'은행에서 ₩150,000 수령',                     action:'bankReceive', amount:150000, modes:['bluemarble','monopoly','marblemoa'] },
  { id:7,  text:'은행에 ₩50,000 납부',                        action:'bankPay',     amount:50000,  modes:['bluemarble','monopoly','marblemoa'] },
  { id:8,  text:'수리비: 집 1채당 ₩40,000, 호텔 1개당 ₩115,000', action:'repairFee',          modes:['monopoly'] },
  { id:9,  text:'뒤로 3칸 이동',                              action:'moveBack',    steps:3,       modes:['bluemarble','monopoly','marblemoa'] },
  { id:10, text:'각 플레이어에게 ₩50,000 지급',               action:'payEachPlayer',  amount:50000,  modes:['bluemarble','monopoly','marblemoa'] },
  { id:11, text:'각 플레이어에게 ₩50,000 수령',               action:'receiveFromEach',amount:50000,  modes:['bluemarble','monopoly','marblemoa'] },
  { id:12, text:'앞으로 2칸 이동',                             action:'moveForward', steps:2,       modes:['bluemarble','monopoly','marblemoa'] },
  { id:13, text:'은행에서 ₩100,000 수령',                     action:'bankReceive', amount:100000, modes:['bluemarble','monopoly','marblemoa'] },
  { id:14, text:'은행에 ₩100,000 납부',                       action:'bankPay',     amount:100000, modes:['bluemarble','monopoly','marblemoa'] },
  { id:15, text:'랜드마크 면역권 획득 ✨',                     action:'getLandmarkImmune',      modes:['marblemoa'] },
  { id:16, text:'트리플 독점 포기권 획득',                     action:'getMonopolySkip',        modes:['marblemoa'] },
];

// ===== ルールブックテキスト =====
const ruleBook = {
  bluemarble: {
    title: '부루마블',
    subtitle: '추억의 클래식 보드게임',
    sections: [
      {
        title: '🎯 게임 목표',
        content: '상대방을 파산시키거나, 제한 시간/바퀴 수 종료 후 가장 많은 자산을 가진 플레이어가 승리합니다.',
      },
      {
        title: '🎲 이동 규칙',
        content: '주사위 2개를 굴려 나온 합만큼 이동합니다.\n• 더블(같은 숫자)이 나오면 한 번 더 굴릴 수 있습니다.\n• 연속 더블 횟수 제한은 없습니다.\n• 출발점 통과 시 ₩200,000을 받습니다.',
      },
      {
        title: '🏗️ 건설 규칙',
        content: '• 첫 바퀴(출발점 통과 전)에는 땅만 구매 가능, 건물 건설 불가\n• 출발점을 통과한 이후부터 내 땅에 자유롭게 건설 가능\n• 독점 조건 없음 — 어떤 땅이든 건설 가능\n• 별장 → 빌딩 → 호텔 순서로 건설 (동시 여러 부지 건설 가능)',
      },
      {
        title: '💸 자금 부족 시',
        content: '통행료를 납부하지 못하면 즉시 파산합니다.\n건물 매각이나 저당 제도는 없습니다.\n파산 시 보유 자산 전부가 통행료를 받아야 할 상대방에게 귀속됩니다.',
      },
      {
        title: '🏆 승리 조건',
        content: '모든 상대방을 파산시키면 승리합니다.',
      },
      {
        title: '⚡ 특수 규칙',
        content: '• 교도소: 더블 굴리기(최대 3턴) 또는 ₩50,000 납부로 탈출\n• 공항: 소유자 있을 때 통과 시 통행료 납부\n• 찬스 카드: 랜덤 이벤트 발생\n• 전력회사/수도세: 소유자 있을 때 주사위 합×4 납부',
      },
    ],
  },
  monopoly: {
    title: '모노폴리',
    subtitle: '전략적 부동산 게임의 정석',
    sections: [
      {
        title: '🎯 게임 목표',
        content: '나를 제외한 모든 플레이어를 파산시키는 것이 목표입니다.',
      },
      {
        title: '🎲 이동 규칙',
        content: '• 더블 시 한 번 더 굴릴 수 있습니다.\n• 3연속 더블 시 즉시 교도소로 이동합니다.\n• 출발점 통과 시 ₩200,000 수령',
      },
      {
        title: '🏗️ 건설 규칙',
        content: '• 같은 색 그룹을 모두 독점해야만 건물 건설 가능\n• 독점만 해도 건물 없이 통행료 2배\n• 균등 건설 원칙: 그룹 내 도시들의 집 수 차이는 최대 1채\n  (A도시 집 2채면 B도시도 최소 1채 있어야 A도시에 3채째 건설 가능)\n• 집 4채 → 호텔로 업그레이드 (균등 원칙 동일 적용)',
      },
      {
        title: '💸 자금 부족 시',
        content: '• 건물 반값 매각: 건설비의 50% 환급 (균등 철거 원칙 적용)\n• 저당: 건물 없는 토지를 토지가의 50%에 저당 가능. 저당 중엔 통행료 없음\n  해제 시 원금 + 10% 이자 필요\n• 그래도 납부 불가 시 파산',
      },
      {
        title: '🏆 승리 조건',
        content: '나를 제외한 모든 플레이어 파산 시 승리.',
      },
      {
        title: '⚡ 특수 규칙',
        content: '• 트레이드: 언제든지 플레이어 간 토지/현금 자유 거래 가능\n• 경매: 땅 구매 거절 시 자동 경매 발동\n• 교도소 탈출권: 찬스 카드로 획득, 보관했다가 사용 가능\n• 공항 임대료: 소유 수에 따라 ₩25K→50K→100K→200K\n• 유틸리티: 1개 소유 시 주사위합×4, 2개 모두 소유 시 주사위합×10',
      },
    ],
  },
  marblemoa: {
    title: '모두의마블',
    subtitle: '빠르고 짜릿한 모바일 스타일',
    sections: [
      {
        title: '🎯 게임 목표',
        content: '독점 승리(트리플/라인/관광지) 달성 또는 모든 상대방 파산 시 승리.',
      },
      {
        title: '🎲 이동 규칙',
        content: '• 더블 시 한 번 더 굴립니다.\n• 3연속 더블 시 무인도로 이동합니다.\n• 출발점 통과 시 ₩200,000 수령',
      },
      {
        title: '🏗️ 건설 규칙',
        content: '• 독점 조건 없음. 바퀴 수 제한 없음.\n• 도착 즉시 자금만 있으면 깃발→빌라→빌딩 동시 건설 가능\n• 랜드마크: 빌딩이 있는 내 땅에 다시 도착하면 건설 가능\n  → 랜드마크가 완성된 땅은 절대 인수 불가, 영구 소유',
      },
      {
        title: '💸 자금 부족 시',
        content: '• 대출: 게임당 1회, 시작 자금만큼 즉시 수령 가능\n• 강제 인수: 대출도 불가 시, 보유 토지 중 통행료에 해당하는 땅을 상대방에게 강제로 양도\n• 가진 땅이 모두 없어지면 파산',
      },
      {
        title: '🏆 승리 조건',
        content: '다음 중 하나 달성 시 즉시 승리:\n• 트리플 독점: 같은 색 그룹 3개 도시 전부 소유\n• 라인 독점: 보드 한 면의 모든 부동산 소유\n• 관광지 독점: 공항 4곳 전부 소유\n• 또는 모든 상대방 파산',
      },
      {
        title: '⚡ 특수 규칙',
        content: '• 인수: 상대 땅 착지 시 통행료 대신 땅값+건물비 지불하고 소유권 빼앗기 가능\n  (단, 랜드마크 땅은 인수 불가)\n• 무인도: 무인도 탈출은 더블 굴리기(최대 3턴) 또는 요금 납부',
      },
    ],
  },
};

// ===== モード説明テキスト =====
const modeDescriptions = {
  bluemarble: '추억의 클래식 보드게임. 한 바퀴 돌고 나면 어디든 건설 시작!',
  monopoly:   '전략적 독점 게임. 독점 완성 후 균등 건설로 임대료 극대화!',
  marblemoa:  '즉시 건설, 인수, 랜드마크! 빠르고 화끈한 독점 전략게임.',
};

// ===== ユーティリティ関数 =====
// 금액을 한국식으로 포맷
function W(n) {
  return '₩' + Math.abs(Math.floor(n)).toLocaleString('ko-KR');
}

// 정수 난수 생성
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 배열 셔플 (피셔-예이츠)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// sleep関数 (Promise)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// プロパティのグループに属するマスIDリスト
function getGroupIds(group) {
  return boardData
    .filter(sq => sq.type === 'property' && sq.group === group)
    .map(sq => sq.id);
}

// ===== モード別ライン独占定義 (모두의마블용) =====
// 各辺のプロパティインデックス (四辺)
const LINE_PROPERTIES = {
  bottom: [1, 3, 6, 8, 9],         // 칸 0-10 (부동산만)
  left:   [11, 13, 14, 16, 18, 19], // 칸 10-20
  top:    [21, 23, 24, 26, 27, 29], // 칸 20-30
  right:  [31, 32, 34, 37, 39],     // 칸 30-40
};
