/**
 * @Author : 김민식
 * gameData : 어스본레인져스 게임 상수 데이터
 */

export const ASPECTS = {
    FITNESS   : { key: 'fitness',   label: '체력',  en: 'Fitness',   test: '이동 (Traverse)',  color: '#ef4444' },
    FOCUS     : { key: 'focus',     label: '집중',  en: 'Focus',     test: '기억 (Remember)',  color: '#3b82f6' },
    AWARENESS : { key: 'awareness', label: '인지',  en: 'Awareness', test: '회피 (Avoid)',     color: '#f59e0b' },
    SPIRIT    : { key: 'spirit',    label: '정신',  en: 'Spirit',    test: '연결 (Connect)',   color: '#10b981' },
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
    { key: 'artisan',   label: '장인',   en: 'Artisan',   poolSize: 9, pickCount: 5, desc: '물건을 만들고 고치는 장인' },
    { key: 'shepherd',  label: '목자',   en: 'Shepherd',  poolSize: 9, pickCount: 5, desc: '생물을 돌보고 키우는 목자' },
    { key: 'traveler',  label: '여행자', en: 'Traveler',  poolSize: 9, pickCount: 5, desc: '먼 곳을 다니며 견문을 넓히는 여행자' },
    { key: 'forager',   label: '채집가', en: 'Forager',   poolSize: 9, pickCount: 5, desc: '자연에서 필요한 것을 찾아내는 채집가' },
];

export const SPECIALTIES = [
    { key: 'explorer', label: '탐험가', en: 'Explorer', poolSize: 12, pickCount: 5, roles: 2, desc: '미지의 영역을 탐사하는 전문가' },
    { key: 'shaper',   label: '형성자', en: 'Shaper',   poolSize: 12, pickCount: 5, roles: 2, desc: '환경을 형성하고 변화시키는 전문가' },
];

export const CARD_TYPES = [
    { key: 'gear',       label: '장비',   en: 'Gear' },
    { key: 'moment',     label: '순간',   en: 'Moment' },
    { key: 'companion',  label: '동반자', en: 'Companion' },
    { key: 'attachment', label: '부착물', en: 'Attachment' },
    { key: 'expert',     label: '전문가', en: 'Expert' },
];

export const WEATHER_TYPES = {
    perfect:    { key: 'perfect',    label: '완벽한 날',      en: 'A Perfect Day',      icon: '☀️' },
    downpour:   { key: 'downpour',   label: '폭우',          en: 'Downpour',            icon: '⛈️' },
    howling:    { key: 'howling',     label: '윙윙거리는 바람', en: 'Howling Winds',       icon: '🌬️' },
    enveloping: { key: 'enveloping', label: '감싸는 정적',    en: 'Enveloping Silence',  icon: '🌫️' },
    glitterain: { key: 'glitterain', label: '글리터레인',     en: 'Glitterain',          icon: '✨' },
    shimmering: { key: 'shimmering', label: '쉬머링',        en: 'Shimmering',          icon: '🌟' },
    runoff:     { key: 'runoff',     label: '런오프',         en: 'Runoff',              icon: '💧' },
    none:       { key: 'none',       label: '-',             en: '-',                   icon: '' },
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
        storyRefs: {
            1: '199.2',
        },
    },
};

export const DECK_TARGET = 30;

export const DECK_COMPOSITION = {
    personality : { label: '성격',       en: 'Personality',      count: 8, desc: '각 애스펙트당 1종 x 2장 = 8장' },
    background  : { label: '배경 카드',  en: 'Background Cards', count: 5, desc: '배경 풀 9장 중 5장 선택' },
    role        : { label: '역할',       en: 'Role',             count: 1, desc: '전문 역할 카드 1장' },
    specialty   : { label: '전문 카드',  en: 'Specialty Cards',  count: 5, desc: '전문 풀 12장 중 5장 선택' },
    outside     : { label: '외부 관심사', en: 'Outside Interest', count: 1, desc: '다른 전문/배경에서 1장 선택' },
};

export const INITIAL_CAMPAIGN_STATE = {
    campaignName: '',
    campaignType: 'lure',
    currentDay: 1,
    rangers: [''],
    location: '',
    pathTerrain: '',
    missions: [],
    notableEvents: [],
    rewards: [],
    removedCards: [],
    dayNotes: {},
    locationHistory: [],
    _undoStack: [],
};

export const INITIAL_DECK_STATE = {
    rangerName: '',
    aspectCardId: null,
    background: null,
    specialty: null,
    personalityCards: { fitness: '', focus: '', awareness: '', spirit: '' },
    backgroundCards: [],
    specialtyRole: '',
    specialtyCards: [],
    outsideInterest: '',
    notes: '',
};

export const STORAGE_KEY_CAMPAIGN = 'ebr_campaign_data';
export const STORAGE_KEY_DECK = 'ebr_deck_data';
