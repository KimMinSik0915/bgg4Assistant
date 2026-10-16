/**
 * @Author : 김민식
 * gameData : 어스본레인져스 게임 상수 데이터
 */

export const ASPECTS = {
    FITNESS   : { key: 'fitness',   label: '체력',   en: 'Fitness',   test: '이동 (Traverse)',  color: '#ef4444' },
    FOCUS     : { key: 'focus',     label: '집중력', en: 'Focus',     test: '기억 (Remember)',  color: '#3b82f6' },
    AWARENESS : { key: 'awareness', label: '인지력', en: 'Awareness', test: '회피 (Avoid)',     color: '#10b981' },
    SPIRIT    : { key: 'spirit',    label: '정신력', en: 'Spirit',    test: '연결 (Connect)',   color: '#f59e0b' },
};

export const ASPECT_CARDS = [
    { id: 1,  fitness: 3, focus: 2, awareness: 2, spirit: 1 },
    { id: 2,  fitness: 3, focus: 2, awareness: 1, spirit: 2 },
    { id: 3,  fitness: 3, focus: 1, awareness: 2, spirit: 2 },
    { id: 4,  fitness: 2, focus: 3, awareness: 2, spirit: 1 },
    { id: 5,  fitness: 2, focus: 3, awareness: 1, spirit: 2 },
    { id: 6,  fitness: 1, focus: 3, awareness: 2, spirit: 2 },
    { id: 7,  fitness: 2, focus: 2, awareness: 3, spirit: 1 },
    { id: 8,  fitness: 2, focus: 1, awareness: 3, spirit: 2 },
    { id: 9,  fitness: 1, focus: 2, awareness: 3, spirit: 2 },
    { id: 10, fitness: 2, focus: 2, awareness: 1, spirit: 3 },
    { id: 11, fitness: 2, focus: 1, awareness: 2, spirit: 3 },
    { id: 12, fitness: 1, focus: 2, awareness: 2, spirit: 3 },
];

export const BACKGROUNDS = [
    { key: 'artisan',     label: '장인',       en: 'Artisan',     poolSize: 9, pickCount: 5, desc: '물건을 만들고 고치는 장인' },
    { key: 'shepherd',    label: '목동',       en: 'Shepherd',    poolSize: 9, pickCount: 5, desc: '생물을 돌보고 키우는 목동' },
    { key: 'traveler',    label: '여행자',     en: 'Traveler',    poolSize: 9, pickCount: 5, desc: '먼 곳을 다니며 견문을 넓히는 여행자' },
    { key: 'forager',     label: '채집가',     en: 'Forager',     poolSize: 9, pickCount: 5, desc: '자연에서 필요한 것을 찾아내는 채집가' },
    { key: 'talespinner', label: '이야기꾼',   en: 'Talespinner', poolSize: 9, pickCount: 5, desc: '이야기를 전하는 이야기꾼' },
];

export const SPECIALTIES = [
    { key: 'explorer',       label: '탐험가',      en: 'Explorer',       poolSize: 12, pickCount: 5, roles: 2, desc: '미지의 영역을 탐사하는 전문가' },
    { key: 'artificer',      label: '제작술사',    en: 'Artificer',      poolSize: 12, pickCount: 5, roles: 2, desc: '도구와 장치를 만드는 전문가' },
    { key: 'conciliator',    label: '중재자',      en: 'Conciliator',    poolSize: 12, pickCount: 5, roles: 2, desc: '갈등을 중재하고 화합을 이끄는 전문가' },
    { key: 'shaper',         label: '형상술사',    en: 'Shaper',         poolSize: 12, pickCount: 5, roles: 2, desc: '환경을 형성하고 변화시키는 전문가' },
    { key: 'spirit_speaker', label: '정령 소통사', en: 'Spirit Speaker', poolSize: 12, pickCount: 5, roles: 2, desc: '정령과 소통하는 전문가' },
];

export const CARD_TYPES = [
    { key: 'gear',       label: '장비',   en: 'Gear' },
    { key: 'moment',     label: '모먼트', en: 'Moment' },
    { key: 'companion',  label: '동반자', en: 'Companion' },
    { key: 'attachment', label: '부착물', en: 'Attachment' },
    { key: 'expert',     label: '전문가', en: 'Expert' },
];

export const WEATHER_TYPES = {
    perfect:    { key: 'perfect',    label: '완벽한 하루',     en: 'A Perfect Day',      icon: '☀️' },
    downpour:   { key: 'downpour',   label: '폭우',          en: 'Downpour',            icon: '⛈️' },
    howling:    { key: 'howling',     label: '울부짖는 바람',   en: 'Howling Winds',       icon: '🌬️' },
    enveloping: { key: 'enveloping', label: '감싸는 정적',    en: 'Enveloping Silence',  icon: '🌫️' },
    glitterain: { key: 'glitterain', label: '글리터레인',     en: 'Glitterain',          icon: '✨' },
    shimmering: { key: 'shimmering', label: '쉬머링',        en: 'Shimmering',          icon: '🌟' },
    runoff:     { key: 'runoff',     label: '런오프',         en: 'Runoff',              icon: '💧' },
    electric:   { key: 'electric',  label: '전기 안개',      en: 'Electric Fog',        icon: '⚡' },
    none:       { key: 'none',       label: '-',             en: '-',                   icon: '' },
};

export const getMoonInfo = (pct) => {
    const abs = Math.abs(pct);
    const waning = pct < 0;
    if (pct === 0)   return { icon: '🌑', label: '새달' };
    if (pct === 100) return { icon: '🌕', label: '보름달' };
    if (!waning) {
        if (abs <= 30) return { icon: '🌒', label: '초승달' };
        if (abs <= 50) return { icon: '🌓', label: '상현달' };
        return { icon: '🌔', label: '상현망간달' };
    }
    if (abs <= 30) return { icon: '🌘', label: '그믐달' };
    if (abs <= 50) return { icon: '🌗', label: '하현달' };
    return { icon: '🌖', label: '하현망간달' };
};

export const CAMPAIGNS = {
    lure: {
        key: 'lure',
        label: '골짜기의 유혹',
        en: 'Lure of the Valley',
        totalDays: 30,
        guideRef: '94.1',
        startRef: '1.04',
        weather: [
            'none','none','none','perfect','none','none','downpour',
            'none','perfect','downpour','howling','none','downpour',
            'none','none','howling','perfect','none','none','downpour',
            'none','howling','perfect','none','none','downpour','none',
            'howling','none','perfect',
        ],
        moon: [
         // 1:새달  2     3     4:초승  5     6:상현  7     8     9:망간  10
               0,    5,   15,   20,   35,   50,   55,   65,   70,   80,
         // 11    12     13:보름 14:보름 15:하망 16    17    18    19    20:하현
              85,   95,  100,  100,  -70,  -65,  -60,  -60,  -55,  -50,
         // 21    22     23:그믐 24    25    26    27    28:새달 29:새달 30
             -40,  -30,  -20,  -15,  -10,  -10,   -5,    0,    0,    5,
        ],
        weatherRanges: [
            { start: 1,  end: 3,  weather: 'perfect' },
            { start: 4,  end: 7,  weather: 'downpour' },
            { start: 8,  end: 9,  weather: 'perfect' },
            { start: 10, end: 12, weather: 'downpour' },
            { start: 13, end: 14, weather: 'howling' },
            { start: 15, end: 17, weather: 'downpour' },
            { start: 18, end: 20, weather: 'howling' },
            { start: 21, end: 22, weather: 'perfect' },
            { start: 23, end: 25, weather: 'downpour' },
            { start: 26, end: 28, weather: 'howling' },
            { start: 29, end: 30, weather: 'perfect' },
        ],
        storyRefs: {
            1: '1', 3: '94.1', 4: '1.04',
        },
    },
    legacy: {
        key: 'legacy',
        label: '선조의 유산',
        en: 'Legacy of the Ancestors',
        totalDays: 30,
        guideRef: '199.2',
        startRef: '',
        weather: [
            'downpour','none','none','perfect','howling','downpour',
            'none','none','enveloping','none','glitterain','shimmering',
            'none','glitterain','runoff','perfect','howling','downpour',
            'none','none','enveloping','none','glitterain','shimmering',
            'none','glitterain','runoff','downpour','none','perfect',
        ],
        moon: [
         // 1:새달  2     3     4:초승  5     6:상현  7     8     9:망간  10
               0,    5,   15,   20,   35,   50,   55,   65,   70,   80,
         // 11    12     13:보름 14:보름 15:하망 16    17    18    19    20:하현
              85,   95,  100,  100,  -70,  -65,  -60,  -60,  -55,  -50,
         // 21    22     23:그믐 24    25    26    27    28:새달 29:새달 30
             -40,  -30,  -20,  -15,  -10,  -10,   -5,    0,    0,    5,
        ],
        storyRefs: {
            1: '199.2',
        },
    },
};

export const DECK_TARGET = 30;

export const DECK_COMPOSITION = {
    personality : { label: '성격',       en: 'Personality',      count: 4, desc: '각 역량당 1종 × 2장' },
    specialty   : { label: '전문 카드',  en: 'Specialty Cards',  count: 5, desc: '5종 × 2장' },
    background  : { label: '배경 카드',  en: 'Background Cards', count: 5, desc: '5종 × 2장' },
    outside     : { label: '외부 관심사', en: 'Outside Interest', count: 1, desc: '1종 × 2장' },
};

export const INITIAL_CAMPAIGN_STATE = {
    campaignName: '',
    campaignType: 'lure',
    currentDay: 1,
    rangers: [''],
    location: '한그루 기지',
    pathTerrain: '숲',
    missions: [],
    notableEvents: [],
    rewards: [],
    removedCards: [],
    memos: [],
    dayNotes: {},
    locationHistory: [],
    _undoStack: [],
};

export const PACK_LABEL = {
    core: '코어', sib: '기반', sotv: '밸리의 관리자들',
    loa: '조상의 유산', itm: '길 위의 순간들', sos: '남쪽의 노래',
};
export const PACK_ORDER = ['core', 'sotv', 'loa', 'itm', 'sos', 'sib'];

export const INITIAL_DECK_STATE = {
    rangerName: '',
    aspectValues: { fitness: 2, focus: 2, awareness: 2, spirit: 2 },
    ownedPacks: ['core'],
    background: null,
    specialty: null,
    personalityCards: { fitness: '', focus: '', awareness: '', spirit: '' },
    backgroundCards: [],
    specialtyRole: '',
    specialtyCards: [],
    outsideInterest: '',
    notes: '',
    initialDeckSnapshot: null,
    cardSwaps: [],
};

export const VALLEY_NODES = [
    { name: '한그루 기지', en: 'Lone Tree Station', region: '북부', pivotal: true, paths: [
        { terrain: '고목림', to: '아트룩스 산' }, { terrain: '고목림', to: '조상의 숲' },
        { terrain: '숲', to: '바위밭' }, { terrain: '호숫가', to: '화이트 스카이' },
    ]},
    { name: '북부 전초기지', en: 'Northern Outpost', region: '북부', pivotal: true, paths: [
        { terrain: '숲', to: '아트룩스 산' }, { terrain: '숲', to: '황금 강변' }, { terrain: '산길', to: '님 산' },
    ]},
    { name: '아트룩스 산', en: 'Atrox Mountain', region: '북부', paths: [
        { terrain: '고목림', to: '한그루 기지' }, { terrain: '숲', to: '북부 전초기지' }, { terrain: '호숫가', to: '황금 강변' },
    ]},
    { name: '황금 강변', en: 'Golden Shore', region: '북부', paths: [
        { terrain: '호숫가', to: '아트룩스 산' }, { terrain: '숲', to: '북부 전초기지' }, { terrain: '호숫가', to: '님 산' },
    ]},
    { name: '님 산', en: 'Mount Nim', region: '북부', paths: [
        { terrain: '호숫가', to: '황금 강변' }, { terrain: '산길', to: '북부 전초기지' },
        { terrain: '산길', to: '화이트 스카이' }, { terrain: '산길', to: '갈라진 장벽' },
    ]},
    { name: '화이트 스카이', en: 'White Sky', region: '북부', pivotal: true, paths: [
        { terrain: '호숫가', to: '한그루 기지' }, { terrain: '숲', to: '바위밭' },
        { terrain: '산길', to: '님 산' }, { terrain: '강', to: '스파이어' },
    ]},
    { name: '바위밭', en: 'Boulder Field', region: '서부', paths: [
        { terrain: '숲', to: '한그루 기지' }, { terrain: '숲', to: '화이트 스카이' },
        { terrain: '숲', to: '조상의 숲' }, { terrain: '풀밭', to: '코보 상점' },
    ]},
    { name: '조상의 숲', en: "Ancestor's Grove", region: '서부', paths: [
        { terrain: '고목림', to: '한그루 기지' }, { terrain: '숲', to: '바위밭' },
        { terrain: '산길', to: '코보 상점' }, { terrain: '산길', to: '낙하 절벽' },
    ]},
    { name: '코보 상점', en: "Kobo's Market", region: '서부', paths: [
        { terrain: '산길', to: '조상의 숲' }, { terrain: '풀밭', to: '바위밭' }, { terrain: '호숫가', to: '스파이어' },
    ]},
    { name: '원류 기지', en: 'Headwaters Station', region: '서부', paths: [
        { terrain: '강', to: '조화의 지구라트' },
    ]},
    { name: '낙하 절벽', en: 'The Plummet', region: '서부', paths: [
        { terrain: '산길', to: '조상의 숲' }, { terrain: '협곡', to: '조화의 지구라트' },
    ]},
    { name: '스파이어', en: 'Spire', region: '중앙', pivotal: true, paths: [
        { terrain: '강', to: '화이트 스카이' }, { terrain: '호숫가', to: '코보 상점' },
        { terrain: '숲', to: '푸른덤불 둔덕' }, { terrain: '풀밭', to: '교차로 기지' },
        { terrain: '고목림', to: '철학자의 정원' },
    ]},
    { name: '푸른덤불 둔덕', en: 'Greenbriar Knoll', region: '중앙', paths: [
        { terrain: '숲', to: '스파이어' }, { terrain: '풀밭', to: '메도우' }, { terrain: '협곡', to: '엮인돌의 다리' },
    ]},
    { name: '교차로 기지', en: 'Crossroads Station', region: '중앙', paths: [
        { terrain: '풀밭', to: '스파이어' }, { terrain: '고목림', to: '브랜치' }, { terrain: '고목림', to: '생물학 전초기지' },
    ]},
    { name: '브랜치', en: 'Branch', region: '중앙', pivotal: true, paths: [
        { terrain: '고목림', to: '철학자의 정원' }, { terrain: '고목림', to: '교차로 기지' }, { terrain: '고목림', to: '하늘 분지' },
    ]},
    { name: '철학자의 정원', en: "The Philosopher's Garden", region: '동부', paths: [
        { terrain: '고목림', to: '스파이어' }, { terrain: '고목림', to: '브랜치' }, { terrain: '숲', to: '갈라진 장벽' },
    ]},
    { name: '갈라진 장벽', en: 'The Fractured Wall', region: '동부', pivotal: true, paths: [
        { terrain: '산길', to: '님 산' }, { terrain: '숲', to: '철학자의 정원' },
        { terrain: '호숫가', to: '하늘 분지' }, { terrain: '산길', to: '깊은 고랑' },
    ]},
    { name: '하늘 분지', en: 'The High Basin', region: '동부', paths: [
        { terrain: '고목림', to: '브랜치' }, { terrain: '호숫가', to: '갈라진 장벽' }, { terrain: '호숫가', to: '깊은 고랑' },
    ]},
    { name: '깊은 고랑', en: 'The Furrow', region: '동부', paths: [
        { terrain: '산길', to: '갈라진 장벽' }, { terrain: '호숫가', to: '하늘 분지' }, { terrain: '협곡', to: '테라보어' },
    ]},
    { name: '테라보어', en: 'Terravore', region: '동부', paths: [
        { terrain: '협곡', to: '깊은 고랑' }, { terrain: '고목림', to: '항해자의 고분' },
    ]},
    { name: '생물학 전초기지', en: 'Biological Outpost', region: '동부', paths: [
        { terrain: '고목림', to: '교차로 기지' }, { terrain: '숲', to: '항해자의 고분' },
    ]},
    { name: '메도우', en: 'Meadow', region: '중남부', pivotal: true, paths: [
        { terrain: '풀밭', to: '푸른덤불 둔덕' }, { terrain: '풀밭', to: '조화의 지구라트' },
        { terrain: '풀밭', to: '엮인돌의 다리' }, { terrain: '협곡', to: '달의 고리' },
    ]},
    { name: '엮인돌의 다리', en: 'Stoneweaver Bridge', region: '중남부', paths: [
        { terrain: '풀밭', to: '메도우' }, { terrain: '협곡', to: '푸른덤불 둔덕' },
        { terrain: '협곡', to: '항해자의 고분' }, { terrain: '강', to: '충적 유적지' },
    ]},
    { name: '조화의 지구라트', en: 'The Concordant Ziggurats', region: '중남부', paths: [
        { terrain: '풀밭', to: '메도우' }, { terrain: '풀밭', to: '고고학 전초기지' },
        { terrain: '협곡', to: '낙하 절벽' }, { terrain: '강', to: '달의 고리' }, { terrain: '강', to: '원류 기지' },
    ]},
    { name: '달의 고리', en: 'Rings of the Moon', region: '중남부', paths: [
        { terrain: '협곡', to: '메도우' }, { terrain: '협곡', to: '고고학 전초기지' },
        { terrain: '강', to: '충적 유적지' }, { terrain: '강', to: '조화의 지구라트' },
    ]},
    { name: '고고학 전초기지', en: 'Archaeological Outpost', region: '남부', paths: [
        { terrain: '풀밭', to: '조화의 지구라트' }, { terrain: '협곡', to: '달의 고리' },
        { terrain: '산길', to: '충적 유적지' }, { terrain: '협곡', to: '감시자의 바위' },
    ]},
    { name: '충적 유적지', en: 'Alluvial Ruins', region: '남부', paths: [
        { terrain: '강', to: '달의 고리' }, { terrain: '강', to: '엮인돌의 다리' },
        { terrain: '강', to: '텀블다운' }, { terrain: '산길', to: '고고학 전초기지' },
        { terrain: '협곡', to: '찡그린 문' }, { terrain: '협곡', to: '태양의 그릇' },
    ]},
    { name: '태양의 그릇', en: 'Bowl of the Sun', region: '남부', paths: [
        { terrain: '협곡', to: '충적 유적지' }, { terrain: '산길', to: '찡그린 문' }, { terrain: '산길', to: '텀블다운' },
    ]},
    { name: '텀블다운', en: 'Tumbledown', region: '남부', pivotal: true, paths: [
        { terrain: '산길', to: '태양의 그릇' }, { terrain: '산길', to: '감시자의 바위' }, { terrain: '강', to: '충적 유적지' },
    ]},
    { name: '감시자의 바위', en: "Watcher's Rock", region: '남부', paths: [
        { terrain: '산길', to: '텀블다운' }, { terrain: '협곡', to: '고고학 전초기지' },
    ]},
    { name: '항해자의 고분', en: 'Mound of the Navigator', region: '늪지대', paths: [
        { terrain: '숲', to: '생물학 전초기지' }, { terrain: '고목림', to: '테라보어' },
        { terrain: '협곡', to: '엮인돌의 다리' }, { terrain: '늪지', to: '푸른 다리' },
    ]},
    { name: '푸른 다리', en: 'The Greenbridge', region: '늪지대', paths: [
        { terrain: '늪지', to: '항해자의 고분' }, { terrain: '늪지', to: '가라앉은 전초기지' },
    ]},
    { name: '가라앉은 전초기지', en: 'Sunken Outpost', region: '늪지대', paths: [
        { terrain: '늪지', to: '푸른 다리' }, { terrain: '늪지', to: '찡그린 문' }, { terrain: '늪지', to: '미카엘의 수렁' },
    ]},
    { name: '미카엘의 수렁', en: "Michael's Bog", region: '늪지대', paths: [
        { terrain: '늪지', to: '가라앉은 전초기지' }, { terrain: '늪지', to: '찡그린 문' }, { terrain: '늪지', to: '사이프러스 성채' },
    ]},
    { name: '사이프러스 성채', en: 'The Cypress Citadel', region: '늪지대', paths: [
        { terrain: '늪지', to: '미카엘의 수렁' },
    ]},
    { name: '찡그린 문', en: 'The Frowning Gate', region: '늪지대', paths: [
        { terrain: '늪지', to: '가라앉은 전초기지' }, { terrain: '늪지', to: '미카엘의 수렁' },
        { terrain: '산길', to: '태양의 그릇' }, { terrain: '협곡', to: '충적 유적지' },
    ]},
];

export const VALLEY_REGIONS = ['북부', '서부', '중앙', '동부', '중남부', '남부', '늪지대'];

const ICO = '/assets/icons/ebr';

export const LOCATION_ICON = Object.fromEntries(
    VALLEY_NODES.map(n => [n.name, `${ICO}/location/${n.name.replace(/\s/g, '')}.png`])
);

export const TERRAIN_ICON = {
    '고목림': `${ICO}/terrain/고목림.png`,
    '산길':   `${ICO}/terrain/산길.png`,
    '숲':     `${ICO}/terrain/숲.png`,
    '호숫가': `${ICO}/terrain/호숫가.png`,
    '풀밭':   `${ICO}/terrain/풀밭.png`,
    '협곡':   `${ICO}/terrain/협곡.png`,
    '늪지':   `${ICO}/terrain/늪지.png`,
    '강':     `${ICO}/terrain/강.png`,
};

export const STORAGE_KEY_CAMPAIGN = 'ebr_campaign_data';
export const STORAGE_KEY_DECK = 'ebr_deck_data';
