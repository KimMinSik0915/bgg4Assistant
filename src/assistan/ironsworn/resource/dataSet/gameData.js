/**
 * gameData : Ironsworn TRPG 게임 상수, 무브 정의, 오라클 테이블
 */

// ──────────────────────────── 스탯 ────────────────────────────
export const STATS = [
    { key: 'edge',   label: '날렵(Edge)',   desc: '속도, 민첩, 기교' }
  , { key: 'heart',  label: '심장(Heart)',  desc: '용기, 공감, 소통' }
  , { key: 'iron',   label: '강철(Iron)',   desc: '힘, 인내, 공격' }
  , { key: 'shadow', label: '그림자(Shadow)', desc: '은밀, 기만, 교활' }
  , { key: 'wits',   label: '지혜(Wits)',   desc: '전문지식, 관찰, 통찰' }
];

// ──────────────────────────── 상태 트랙 ────────────────────────
export const STATUS_TRACKS = [
    { key: 'health', label: '체력(Health)', min: 0, max: 5, color: '#ef4444' }
  , { key: 'spirit', label: '정신(Spirit)', min: 0, max: 5, color: '#8b5cf6' }
  , { key: 'supply', label: '보급(Supply)', min: 0, max: 5, color: '#f59e0b' }
];

export const MOMENTUM = { min: -6, max: 10, resetDefault: 2, maxDefault: 10 };

// ──────────────────────────── 진행도 등급 ──────────────────────
export const PROGRESS_RANKS = [
    { key: 'troublesome', label: '성가신(Troublesome)', ticksPerMark: 12 }
  , { key: 'dangerous',   label: '위험한(Dangerous)',   ticksPerMark: 8 }
  , { key: 'formidable',  label: '막강한(Formidable)',  ticksPerMark: 4 }
  , { key: 'extreme',     label: '극한의(Extreme)',     ticksPerMark: 2 }
  , { key: 'epic',        label: '전설적(Epic)',        ticksPerMark: 1 }
];

export const TICKS_PER_BOX = 4;
export const PROGRESS_BOXES = 10;

// ──────────────────────────── 무브 카테고리 ────────────────────
export const MOVE_CATEGORIES = [
    { key: 'adventure',    label: '모험' }
  , { key: 'relationship', label: '관계' }
  , { key: 'combat',       label: '전투' }
  , { key: 'suffer',       label: '고난' }
  , { key: 'quest',        label: '서약' }
  , { key: 'fate',         label: '운명' }
];

// ──────────────────────────── 무브 목록 ───────────────────────
export const MOVES = [
    // === 모험 ===
    { id: 'face_danger', cat: 'adventure', name: '위험에 맞서기', nameEn: 'Face Danger'
    , stat: 'choice', desc: '위험한 시도를 하거나 급박한 위협에 대응할 때. 상황에 맞는 스탯으로 판정.' }
  , { id: 'secure_advantage', cat: 'adventure', name: '이점 확보', nameEn: 'Secure an Advantage'
    , stat: 'choice', desc: '상황을 평가하거나 준비하거나 우위를 점하려 할 때.' }
  , { id: 'gather_info', cat: 'adventure', name: '정보 수집', nameEn: 'Gather Information'
    , stat: 'wits', desc: '영역을 탐색하거나 질문하거나 조사할 때.' }
  , { id: 'heal', cat: 'adventure', name: '치료', nameEn: 'Heal'
    , stat: 'wits', desc: '부상이나 질병을 치료할 때.' }
  , { id: 'resupply', cat: 'adventure', name: '재보급', nameEn: 'Resupply'
    , stat: 'wits', desc: '사냥하거나 채집하거나 물자를 모을 때.' }
  , { id: 'make_camp', cat: 'adventure', name: '야영', nameEn: 'Make Camp'
    , stat: 'supply', desc: '야생에서 몇 시간 쉬며 회복할 때. 보급 수치로 판정.' }
  , { id: 'undertake_journey', cat: 'adventure', name: '여정', nameEn: 'Undertake a Journey'
    , stat: 'wits', desc: '위험하거나 낯선 땅을 여행할 때. 진행도 트랙 사용.' }
  , { id: 'reach_destination', cat: 'adventure', name: '목적지 도착', nameEn: 'Reach Your Destination'
    , stat: 'progress', desc: '여정의 진행도가 충분하면 목적지에 도착 시도.' }
    // === 관계 ===
  , { id: 'compel', cat: 'relationship', name: '설득/강요', nameEn: 'Compel'
    , stat: 'choice', desc: '누군가에게 무언가를 하도록 설득하거나 강요할 때.' }
  , { id: 'sojourn', cat: 'relationship', name: '체류', nameEn: 'Sojourn'
    , stat: 'heart', desc: '공동체에서 시간을 보내며 도움을 구할 때.' }
  , { id: 'draw_circle', cat: 'relationship', name: '결투 선언', nameEn: 'Draw the Circle'
    , stat: 'heart', desc: '공식 결투를 신청할 때.' }
  , { id: 'forge_bond', cat: 'relationship', name: '유대 맺기', nameEn: 'Forge a Bond'
    , stat: 'heart', desc: '서약을 완수했거나 충성을 증명했을 때.' }
  , { id: 'test_bond', cat: 'relationship', name: '유대 시험', nameEn: 'Test Your Bond'
    , stat: 'heart', desc: '갈등, 배신, 또는 상황으로 유대가 시험받을 때.' }
  , { id: 'aid_ally', cat: 'relationship', name: '동료 지원', nameEn: 'Aid Your Ally'
    , stat: 'choice', desc: '동료를 직접 돕는 행동을 할 때.' }
  , { id: 'write_epilogue', cat: 'relationship', name: '마무리 짓기', nameEn: 'Write Your Epilogue'
    , stat: 'progress', desc: '철의 서약자로서의 삶에서 은퇴할 때. 유대 진행도 판정.' }
    // === 전투 ===
  , { id: 'enter_fray', cat: 'combat', name: '전투 돌입', nameEn: 'Enter the Fray'
    , stat: 'choice', desc: '전투를 시작할 때. 상황에 따라 스탯 선택.' }
  , { id: 'strike', cat: 'combat', name: '공격', nameEn: 'Strike'
    , stat: 'choice', desc: '주도권이 있을 때 근접 또는 원거리 공격.' }
  , { id: 'clash', cat: 'combat', name: '격돌', nameEn: 'Clash'
    , stat: 'choice', desc: '적이 주도권을 잡고 있을 때 반격.' }
  , { id: 'turn_tide', cat: 'combat', name: '전세 역전', nameEn: 'Turn the Tide'
    , stat: 'none', desc: '전투당 한 번, 모멘텀을 소비해 유리한 위치 확보.' }
  , { id: 'end_fight', cat: 'combat', name: '전투 종결', nameEn: 'End the Fight'
    , stat: 'progress', desc: '결정적 행동으로 전투를 끝내려 할 때. 진행도 판정.' }
  , { id: 'battle', cat: 'combat', name: '전면전', nameEn: 'Battle'
    , stat: 'choice', desc: '전투가 순식간에 벌어질 때. 한 번의 판정으로 처리.' }
    // === 고난 ===
  , { id: 'endure_harm', cat: 'suffer', name: '피해 감수', nameEn: 'Endure Harm'
    , stat: 'health_or_iron', desc: '체력 피해를 입을 때.' }
  , { id: 'face_death', cat: 'suffer', name: '죽음에 직면', nameEn: 'Face Death'
    , stat: 'heart', desc: '죽음의 문턱에 이르렀을 때.' }
  , { id: 'endure_stress', cat: 'suffer', name: '스트레스 감수', nameEn: 'Endure Stress'
    , stat: 'spirit_or_heart', desc: '정신적 충격이나 절망에 직면할 때.' }
  , { id: 'face_desolation', cat: 'suffer', name: '절망에 직면', nameEn: 'Face Desolation'
    , stat: 'heart', desc: '절망의 끝에 이르렀을 때.' }
  , { id: 'out_of_supply', cat: 'suffer', name: '보급 소진', nameEn: 'Out of Supply'
    , stat: 'none', desc: '보급이 0이 되었을 때.' }
  , { id: 'face_setback', cat: 'suffer', name: '좌절', nameEn: 'Face a Setback'
    , stat: 'none', desc: '모멘텀이 최저치일 때.' }
    // === 서약 ===
  , { id: 'swear_vow', cat: 'quest', name: '철의 서약', nameEn: 'Swear an Iron Vow'
    , stat: 'heart', desc: '철에 맹세하며 퀘스트를 시작할 때.' }
  , { id: 'reach_milestone', cat: 'quest', name: '이정표 달성', nameEn: 'Reach a Milestone'
    , stat: 'none', desc: '서약을 향해 의미 있는 진전을 이룰 때.' }
  , { id: 'fulfill_vow', cat: 'quest', name: '서약 완수', nameEn: 'Fulfill Your Vow'
    , stat: 'progress', desc: '서약의 목표를 달성했다고 판단될 때.' }
  , { id: 'forsake_vow', cat: 'quest', name: '서약 포기', nameEn: 'Forsake Your Vow'
    , stat: 'none', desc: '퀘스트를 포기할 때. 정신 피해.' }
  , { id: 'advance', cat: 'quest', name: '성장', nameEn: 'Advance'
    , stat: 'none', desc: '기술에 집중하거나 훈련받거나 영감을 얻을 때. 경험치 소비.' }
    // === 운명 ===
  , { id: 'pay_price', cat: 'fate', name: '대가 치르기', nameEn: 'Pay the Price'
    , stat: 'none', desc: '무브의 실패 결과를 받아들일 때.' }
  , { id: 'ask_oracle', cat: 'fate', name: '오라클에게 묻기', nameEn: 'Ask the Oracle'
    , stat: 'none', desc: '질문을 해결하거나 세부사항을 밝힐 때.' }
];

// ──────────────────────────── 오라클: 행동 (d100) ─────────────
export const ORACLE_ACTION = [
    '찾다','전달하다','탈출하다','돌격하다','창조하다','탐험하다','도전하다','조사하다','모으다','버리다'
  , '저주하다','배신하다','위협하다','제거하다','이동하다','혼란스럽게 하다','유혹하다','상기시키다','고치다','약탈하다'
  , '싸우다','집중하다','관통하다','돌보다','습격하다','몰래 움직이다','강탈하다','포위하다','관찰하다','숨기다'
  , '발견하다','뒤쫓다','지휘하다','방어하다','대항하다','보존하다','소통하다','섬기다','목격하다','사냥하다'
  , '파괴하다','부정하다','잃다','갈망하다','추구하다','변형시키다','구출하다','포기하다','탐색하다','복종하다'
  , '인도하다','도약하다','조종하다','도발하다','정복하다','기만하다','달성하다','공격하다','두려워하다','분쇄하다'
  , '무역하다','물러나다','해치다','지배하다','약속하다','위험에 빠뜨리다','계획하다','보호하다','강화하다','격려하다'
  , '내버려두다','제한하다','여행하다','취하다','탐사하다','설립하다','진군하다','맹세하다','기다리다','유혹하다'
  , '맡기다','무기력하게 하다','시작하다','분열시키다','견디다','간청하다','부수다','연합하다','붙잡다','경고하다'
  , '분리하다','소환하다','잊다','포위하다','대치하다','포획하다','준비하다','공표하다','전쟁하다','저항하다'
];

// ──────────────────────────── 오라클: 주제 (d100) ─────────────
export const ORACLE_THEME = [
    '고대','국경','종교','평원','전쟁','독','장벽','부족','서약','요새'
  , '수수께끼','불명예','심연','보물','갑옷','예언','미로','위험','혈통','무법'
  , '그림자','폐허','야생','짐승','정의','공포','용기','동굴','동맹','원한'
  , '강','길','숲','노래','피','권력','꿈','계절','황무지','명예'
  , '비밀','재앙','기억','모험','치유','과거','사냥','저주','미래','시련'
  , '여정','불꽃','바다','유산','봉기','바람','무역','수확','서리','전조'
  , '고향','죽음','추방','고통','번영','망령','배움','유혹','집결','관문'
  , '산','칼날','분노','변화','속임수','돌','방랑','생존','발견','폭풍'
  , '자유','제물','망명','운명','신앙','전쟁','맹세','빛','시작','위기'
  , '침묵','약속','성벽','계약','수호','열쇠','여명','위협','유적','사슬'
];

// ──────────────────────────── 오라클: 지역 ────────────────────
export const ORACLE_REGION = [
    '배리어 섬(Barrier Islands)','무법 해안(Ragged Coast)','깊은 황무지(Deep Wilds)'
  , '홍수림(Flooded Lands)','가시덤불(Havens)','아리아돌(Hinterlands)'
  , '장벽산맥(Tempest Hills)','부서진 해안(Shattered Wastes)','서리 경계(Veiled Mountains)'
];

// ──────────────────────────── 오라클: 장소 ────────────────────
export const ORACLE_LOCATION = [
    '절벽 위 폐허','숨겨진 동굴','마을 시장','버려진 농장','강 건널목','울창한 숲속 공터'
  , '고대 석조 원형 건물','순례자의 경로','바위 해안','끝없는 평원','폭포 뒤편','산 정상 성채'
  , '묘지','오래된 광산','교차로의 여관','약초밭','감시탑','습지대','성벽 마을','고목 숲'
];

// ──────────────────────────── 오라클: 캐릭터 ─────────────────
export const ORACLE_CHAR_ROLE = [
    '대장장이','치료사','사냥꾼','모험가','현자','광부','정찰병','상인','전사','음유시인'
  , '순례자','사제','농부','선원','이방인','추방자','전령','도적','귀족','밀수업자'
];
export const ORACLE_CHAR_GOAL = [
    '복수','보호','발견','부','권력','명예','사랑','자유','구원','지식'
  , '평화','정의','생존','치유','귀환','모험','탈출','신뢰','속죄','유산'
];
export const ORACLE_CHAR_DESC = [
    '상처투성이','조용한','과묵한','쾌활한','교활한','비밀스러운','야심찬','경건한','거친','현명한'
  , '외로운','명예로운','의심많은','자비로운','무모한','인내하는','집요한','노련한','순진한','두려움을 모르는'
];

// ──────────────────────────── 오라클: 전투 행동 ──────────────
export const ORACLE_COMBAT_ACTION = [
    '기습 공격','측면 우회','전투함성','무기 교환','방어 자세','급소 조준'
  , '동료 호출','환경 이용','위협 포효','함정 유인','후퇴 후 재공격','결사적 돌진'
  , '기만적 행동','장거리 투척','빈틈 노리기','힘으로 밀어붙이기','재빠른 회피','연속 공격'
  , '약점 탐색','최후의 수단'
];

// ──────────────────────────── 오라클: 대가 ────────────────────
export const ORACLE_PAY_THE_PRICE = [
    '원하지 않는 관심을 끈다'
  , '적이 유리한 위치를 잡는다'
  , '동료나 자원이 위험에 처한다'
  , '예상치 못한 대가를 치러야 한다'
  , '새로운 위험이 나타난다'
  , '소중한 것을 잃는다'
  , '상황이 더 악화된다'
  , '피해를 입는다(체력 -1)'
  , '스트레스를 받는다(정신 -1)'
  , '보급품이 줄어든다(보급 -1)'
];

// ──────────────────────────── 초기 상태 ──────────────────────
export const INITIAL_CHARACTER = {
    name: ''
  , edge: 2, heart: 2, iron: 2, shadow: 1, wits: 3
  , health: 5, spirit: 5, supply: 5
  , momentum: 2, momentumMax: 10, momentumReset: 2
  , xpEarned: 0, xpSpent: 0
  , bonds: 0
};

export const INITIAL_VOW = {
    title: ''
  , rank: 'dangerous'
  , ticks: 0
  , type: 'vow'
};

// ──────────────────────────── 저장소 키 ──────────────────────
export const STORAGE_KEY = 'ironsworn_data';
export const STORAGE_KEY_GM = 'ironsworn_gm_data';
