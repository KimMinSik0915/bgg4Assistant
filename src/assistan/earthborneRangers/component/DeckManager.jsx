import { useState, useEffect, useMemo } from 'react';
import { PlusIcon, XIcon, InfoIcon, ChevronUpIcon, ChevronDownIcon, CheckIcon, PencilIcon, RefreshCwIcon, ArrowRightLeftIcon } from 'lucide-react';
import { ASPECTS, BACKGROUNDS, SPECIALTIES, DECK_TARGET, DECK_COMPOSITION, PACK_LABEL, PACK_ORDER } from '../resource/dataSet/gameData';

const ASPECT_MAP = { FIT: 'fitness', FOC: 'focus', AWA: 'awareness', SPI: 'spirit' };
const ASPECT_LABEL = { FIT: '체력', FOC: '집중력', AWA: '인지력', SPI: '정신력' };
const ASPECT_COLOR = { FIT: '#ef4444', FOC: '#3b82f6', AWA: '#10b981', SPI: '#f59e0b' };
const TYPE_LABEL = { moment: '모먼트', gear: '장비', attribute: '속성', attachment: '부착물', role: '역할', being: '존재', feature: '특성' };
const APPROACH_ICO = '/assets/icons/ebr/approach';
const ROLE_ICO = '/assets/icons/ebr/role';

const ASPECT_ORDER = ['awareness', 'spirit', 'fitness', 'focus'];
const SPECIALTY_SETS = ['explorer', 'artificer', 'conciliator', 'shaper', 'spirit_speaker'];
const SPECIALTY_LABEL = { explorer: '탐험가', artificer: '제작술사', conciliator: '중재자', shaper: '형상술사', spirit_speaker: '정령 소통사' };
const BACKGROUND_SETS = ['artisan', 'shepherd', 'traveler', 'forager', 'talespinner'];
const BACKGROUND_LABEL = { artisan: '장인', shepherd: '목동', traveler: '여행자', forager: '채집가', talespinner: '이야기꾼' };

/**
 * @Author : 김민식
 * DeckManager : 어스본레인져스 덱 구성 관리
 */
const CARD_TABS = [
    { key: 'personality', label: '성격' },
    { key: 'specialty', label: '전문분야' },
    { key: 'background', label: '배경' },
    { key: 'outside', label: '외부 관심사' },
];

const getRoleThumb = (nameEn) => nameEn ? nameEn.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/ +/g, '_') : '';

const cardName = (card) => card ? (card.name_ko || card.name_en) : '';

const EFFECT_ICO = '/assets/icons/ebr/effect';
const TOKEN_TEXT = { FIT: '체력', FOC: '집중력', AWA: '인지력', SPI: '정신력' };
const TOKEN_ICONS = ['harm', 'progress', 'conflict', 'connection', 'exploration', 'reason', 'ranger'];
const formatCardText = (html) => {
    if (!html) return html;
    let result = html;
    Object.entries(TOKEN_TEXT).forEach(([token, label]) => {
        result = result.replace(new RegExp(`\\[${token}\\]`, 'g'),
            `<span style="font-weight:700;color:${ASPECT_COLOR[token] || 'var(--text-main)'}">${label}</span>`);
    });
    TOKEN_ICONS.forEach(token => {
        result = result.replace(new RegExp(`\\[${token}\\]`, 'g'),
            `<img src="${EFFECT_ICO}/${token}.png" alt="${token}" style="display:inline-block;width:1em;height:1em;vertical-align:-0.15em;filter:invert(1) brightness(2)" />`);
    });
    result = result.replace(/\n/g, '<br/>');
    return result;
};

const DeckManager = ({ deck, onUpdate, isNew }) => {
    const [cardTab, setCardTab] = useState('personality');
    const [allCards, setAllCards] = useState([]);
    const [deckCollapsed, setDeckCollapsed] = useState(true);
    const [deckCatCollapsed, setDeckCatCollapsed] = useState({});
    const [roleOpen, setRoleOpen] = useState(false);
    const [outsideCollapsed, setOutsideCollapsed] = useState({});
    const [editing, setEditing] = useState(isNew);
    const [swapMode, setSwapMode] = useState(false);
    const [swapTarget, setSwapTarget] = useState(null);
    const [rewardCardName, setRewardCardName] = useState('');
    const [swapGroupCollapsed, setSwapGroupCollapsed] = useState({});
    const [swapSearch, setSwapSearch] = useState('');

    useEffect(() => {
        fetch('/assets/data/ranger_cards_full.json')
            .then(r => r.json())
            .then(setAllCards)
            .catch(() => {});
    }, []);

    const updateField = (field, value) => onUpdate({ ...deck, [field]: value });
    const findCard = (id) => allCards.find(c => c.id === id);
    const cardNameById = (id) => { const c = findCard(id); return c ? cardName(c) : id; };

    const av = deck.aspectValues || { fitness: 2, focus: 2, awareness: 2, spirit: 2 };
    const avTotal = av.fitness + av.focus + av.awareness + av.spirit;
    const avOnes = Object.values(av).filter(v => v === 1).length;
    const avHighCount = Object.values(av).filter(v => v >= 3).length;
    const avValid = avTotal === 8 && avOnes >= 1 && avHighCount <= 1;

    const updateAspect = (key, dir) => {
        const val = av[key];
        const next = dir === 'up' ? val + 1 : val - 1;
        if (next < 1 || next > 4) return;
        updateField('aspectValues', { ...av, [key]: next });
    };

    const ownedPacks = deck.ownedPacks || ['core'];

    const personalityCards = useMemo(() => {
        return allCards
            .filter(c => c.set === 'personality' && !c.taboo && ownedPacks.includes(c.pack))
            .filter(c => {
                const aspectKey = ASPECT_MAP[c.aspect];
                return aspectKey && c.level <= (av[aspectKey] || 0);
            });
    }, [allCards, ownedPacks, av]);

    const availableSpecialties = useMemo(() =>
        SPECIALTY_SETS.filter(s => allCards.some(c => c.set === s && ownedPacks.includes(c.pack)))
    , [allCards, ownedPacks]);

    const roleCards = useMemo(() => {
        if (!deck.specialty) return [];
        return allCards.filter(c => c.set === deck.specialty && c.type === 'role' && !c.taboo && ownedPacks.includes(c.pack));
    }, [allCards, deck.specialty, ownedPacks]);

    const specialtyNonRoleCards = useMemo(() => {
        if (!deck.specialty) return [];
        return allCards.filter(c => c.set === deck.specialty && c.type !== 'role' && !c.taboo && ownedPacks.includes(c.pack))
            .filter(c => {
                if (!c.aspect || !c.level) return true;
                const aspectKey = ASPECT_MAP[c.aspect];
                return aspectKey && c.level <= (av[aspectKey] || 0);
            });
    }, [allCards, deck.specialty, ownedPacks, av]);

    const availableBackgrounds = useMemo(() =>
        BACKGROUND_SETS.filter(s => allCards.some(c => c.set === s && ownedPacks.includes(c.pack)))
    , [allCards, ownedPacks]);

    const backgroundCards = useMemo(() => {
        if (!deck.background) return [];
        return allCards.filter(c => c.set === deck.background && !c.taboo && ownedPacks.includes(c.pack))
            .filter(c => {
                if (!c.aspect || !c.level) return true;
                const aspectKey = ASPECT_MAP[c.aspect];
                return aspectKey && c.level <= (av[aspectKey] || 0);
            });
    }, [allCards, deck.background, ownedPacks, av]);

    const outsideCards = useMemo(() => {
        const otherSets = [
            ...SPECIALTY_SETS.filter(s => s !== deck.specialty),
            ...BACKGROUND_SETS.filter(s => s !== deck.background),
        ];
        return allCards
            .filter(c => otherSets.includes(c.set) && c.type !== 'role' && !c.taboo && ownedPacks.includes(c.pack))
            .filter(c => {
                if (!c.aspect || !c.level) return true;
                const aspectKey = ASPECT_MAP[c.aspect];
                return aspectKey && c.level <= (av[aspectKey] || 0);
            });
    }, [allCards, deck.specialty, deck.background, ownedPacks, av]);

    const outsideGrouped = useMemo(() => {
        const groups = {};
        outsideCards.forEach(c => {
            if (!groups[c.set]) groups[c.set] = [];
            groups[c.set].push(c);
        });
        return groups;
    }, [outsideCards]);

    const APPROACH_LABEL = { exploration: '탐험', connection: '교감', reason: '이성', conflict: '투쟁' };
    const APPROACH_COLOR = { exploration: '#22c55e', connection: '#a855f7', reason: '#3b82f6', conflict: '#ef4444' };
    const APPROACH_ORDER = ['exploration', 'connection', 'reason', 'conflict'];

    const currentCount = calculateDeckCount(deck);
    const hasName = deck.rangerName && deck.rangerName.trim();
    const hasSpecialty = !!deck.specialty;
    const hasRole = !!deck.specialtyRole;
    const canSelectRole = hasName && hasSpecialty;
    const canSelectBackground = canSelectRole && hasRole;
    const setupComplete = canSelectBackground && !!deck.background;

    const selectedRoleCard = roleCards.find(c => c.id === deck.specialtyRole);

    const snapshot = deck.initialDeckSnapshot;
    const cardSwaps = deck.cardSwaps || [];

    const getStartingIds = () => {
        if (!snapshot) return [];
        const ids = [];
        Object.values(snapshot.personalityCards || {}).forEach(id => { if (id && id.trim()) ids.push(id); });
        (snapshot.specialtyCards || []).forEach(id => ids.push(id));
        (snapshot.backgroundCards || []).forEach(id => ids.push(id));
        if (snapshot.outsideInterest) ids.push(snapshot.outsideInterest);
        return ids;
    };

    const isStartingCard = (cardId) => {
        const startingIds = getStartingIds();
        if (startingIds.includes(cardId)) return true;
        const addedAsReward = cardSwaps.some(s => s.added === cardId && s.addedIsReward);
        if (addedAsReward) return false;
        return !snapshot;
    };

    const CAT_LABEL = { personality: '성격', specialty: '전문분야', background: '배경', outside: '외부 관심사', reward: '보상' };

    const deckWithCounts = useMemo(() => {
        const base = snapshot || {
            personalityCards: deck.personalityCards,
            specialtyCards: deck.specialtyCards || [],
            backgroundCards: deck.backgroundCards || [],
            outsideInterest: deck.outsideInterest,
        };
        const counts = {};
        const meta = {};

        Object.entries(base.personalityCards).forEach(([key, id]) => {
            if (!id || !id.trim()) return;
            counts[id] = (counts[id] || 0) + 2;
            const aspCode = Object.entries(ASPECT_MAP).find(([, v]) => v === key)?.[0];
            meta[id] = { category: 'personality', aspCode };
        });
        (base.specialtyCards).forEach(id => { counts[id] = (counts[id] || 0) + 2; meta[id] = { category: 'specialty' }; });
        (base.backgroundCards).forEach(id => { counts[id] = (counts[id] || 0) + 2; meta[id] = { category: 'background' }; });
        if (base.outsideInterest) { counts[base.outsideInterest] = (counts[base.outsideInterest] || 0) + 2; meta[base.outsideInterest] = { category: 'outside' }; }

        cardSwaps.forEach(s => {
            counts[s.removed] = (counts[s.removed] || 0) - 1;
            if (counts[s.removed] <= 0) delete counts[s.removed];
            counts[s.added] = (counts[s.added] || 0) + 1;
            if (!meta[s.added]) {
                const card = allCards.find(c => c.id === s.added);
                let cat = 'reward';
                if (card) {
                    if (card.set === 'personality') cat = 'personality';
                    else if (card.set === deck.specialty) cat = 'specialty';
                    else if (card.set === deck.background) cat = 'background';
                    else if (SPECIALTY_SETS.includes(card.set) || BACKGROUND_SETS.includes(card.set)) cat = 'outside';
                }
                meta[s.added] = { category: cat, isReward: s.addedIsReward };
            }
        });

        const order = { personality: 0, specialty: 1, background: 2, outside: 3, reward: 4 };
        return Object.entries(counts)
            .map(([id, count]) => ({
                id, count,
                name: cardNameById(id),
                category: meta[id]?.category || 'reward',
                aspCode: meta[id]?.aspCode,
                isReward: meta[id]?.isReward || false,
                matched: allCards.find(c => c.id === id),
            }))
            .sort((a, b) => (order[a.category] ?? 5) - (order[b.category] ?? 5));
    }, [snapshot, deck.personalityCards, deck.specialtyCards, deck.backgroundCards, deck.outsideInterest, cardSwaps, allCards]);

    const deckStats = useMemo(() => {
        const getCardCost = (c) => {
            if (!c.approach || typeof c.approach !== 'object') return 0;
            return Object.values(c.approach).reduce((a, b) => a + b, 0);
        };

        const aspectStats = {};
        ['AWA', 'SPI', 'FIT', 'FOC'].forEach(key => {
            let count = 0;
            let totalCost = 0;
            deckWithCounts.filter(e => e.matched?.aspect === key).forEach(e => {
                count += e.count;
                totalCost += getCardCost(e.matched) * e.count;
            });
            aspectStats[key] = { cards: count, avg: count > 0 ? (totalCost / count).toFixed(2) : '0', total: totalCost };
        });

        const approachStats = {};
        ['exploration', 'connection', 'reason', 'conflict'].forEach(key => {
            let count = 0;
            let total = 0;
            deckWithCounts.forEach(e => {
                if (e.matched?.approach && typeof e.matched.approach === 'object' && e.matched.approach[key]) {
                    count += e.count;
                    total += e.matched.approach[key] * e.count;
                }
            });
            approachStats[key] = { cards: count, avg: count > 0 ? (total / count).toFixed(2) : '0', total };
        });

        return { aspectStats, approachStats };
    }, [deckWithCounts]);

    const rewardAvailableCards = useMemo(() => {
        const currentIds = deckWithCounts.map(c => c.id);

        return allCards
            .filter(c => c.type !== 'role' && !c.taboo && ownedPacks.includes(c.pack))
            .filter(c => !currentIds.includes(c.id))
            .filter(c => {
                if (!c.aspect || !c.level) return true;
                const aspectKey = ASPECT_MAP[c.aspect];
                return aspectKey && c.level <= (av[aspectKey] || 0);
            });
    }, [allCards, ownedPacks, av, deckWithCounts]);

    const rewardGrouped = useMemo(() => {
        const groups = {};
        rewardAvailableCards.forEach(c => {
            if (!groups[c.set]) groups[c.set] = [];
            groups[c.set].push(c);
        });
        return groups;
    }, [rewardAvailableCards]);

    const getAllCurrentIds = () => deckWithCounts.map(c => c.id);

    const removedCards = useMemo(() => {
        const startingIds = getStartingIds();
        return cardSwaps.filter(s => startingIds.includes(s.removed));
    }, [cardSwaps, snapshot]);

    const permanentlyRemoved = useMemo(() => {
        const startingIds = getStartingIds();
        return cardSwaps.filter(s => !startingIds.includes(s.removed));
    }, [cardSwaps, snapshot]);

    const executeSwap = (removedId, addedId, addedIsReward) => {
        const snap = deck.initialDeckSnapshot || {
            personalityCards: { ...deck.personalityCards },
            specialtyCards: [...(deck.specialtyCards || [])],
            backgroundCards: [...(deck.backgroundCards || [])],
            outsideInterest: deck.outsideInterest,
        };
        const newSwaps = [...cardSwaps, { removed: removedId, added: addedId, addedIsReward, timestamp: new Date().toISOString() }];
        onUpdate({ ...deck, initialDeckSnapshot: snap, cardSwaps: newSwaps });
        setSwapTarget(null);
        setSwapMode(false);
        setSwapSearch('');
    };

    const resetDeck = () => {
        if (!snapshot) return;
        onUpdate({ ...deck, cardSwaps: [] });
        setSwapMode(false);
        setSwapTarget(null);
    };

    const cardStyle = { background: 'var(--card-bg)', borderColor: 'var(--border-color)' };
    const inputStyle = { background: 'var(--input-bg)', color: 'var(--input-text)', borderColor: 'var(--border-color)' };
    const labelStyle = { color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' };

    const renderCardItem = (card, { isSelected, onToggle, accentColor }) => (
        <div key={card.id} className="border-b rounded-lg mb-1" style={{
            borderColor: isSelected ? accentColor : 'var(--border-color)',
            borderWidth: isSelected ? '2px' : '1px',
        }}>
            <button
                onClick={onToggle}
                className="w-full text-left py-2 flex items-center gap-3 hover:bg-white/5 transition-colors px-2"
                style={{
                    background: isSelected ? accentColor + '30' : 'transparent',
                    boxShadow: isSelected ? `0 0 8px ${accentColor}40` : 'none',
                }}
            >
                {card.aspect && <span className="shrink-0 rounded-full" style={{
                    background: ASPECT_COLOR[card.aspect],
                    width: isSelected ? '0.625rem' : '0.5rem',
                    height: '1.75rem',
                }} />}
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{card.name_ko || card.name_en}</span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>
                            {TYPE_LABEL[card.type] || card.type}
                        </span>
                        {card.level && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>Lv.{card.level}</span>}
                        {card.aspect && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: ASPECT_COLOR[card.aspect] + '22', color: ASPECT_COLOR[card.aspect] }}>{ASPECT_LABEL[card.aspect]}</span>}
                        {card.approach && typeof card.approach === 'object' && (
                            <span className="flex items-center gap-0.5">
                                {Object.entries(card.approach).flatMap(([key, val]) =>
                                    [...Array(val)].map((_, i) => (
                                        <img key={`${key}_${i}`} src={`${APPROACH_ICO}/${key}.png`} alt={key} className="h-4 w-4" />
                                    ))
                                )}
                            </span>
                        )}
                    </div>
                    {card.text_kr && (
                        <p className="text-xs mt-1 leading-relaxed ebr-card-text" style={{ color: 'var(--text-muted)' }} dangerouslySetInnerHTML={{ __html: formatCardText(card.text_kr) }} />
                    )}
                </div>
                {isSelected && <CheckIcon className="h-4 w-4 shrink-0" style={{ color: accentColor }} />}
            </button>
        </div>
    );

    const renderDeckContents = () => {
        const grouped = deckWithCounts.reduce((groups, card) => {
            const cat = card.category;
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(card);
            return groups;
        }, {});
        const totalCards = deckWithCounts.reduce((sum, c) => sum + c.count, 0);
        return (
            <div className="mt-3 flex flex-col gap-2">
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{
                        width: `${Math.min(100, (totalCards / DECK_TARGET) * 100)}%`,
                        background: totalCards === DECK_TARGET ? 'var(--clickable)' : totalCards > DECK_TARGET ? 'var(--danger)' : 'var(--accent-color)',
                    }} />
                </div>
                {deck.specialtyRole && (
                    <DeckCatSection title="역할" catKey="role" collapsed={deckCatCollapsed} setCollapsed={setDeckCatCollapsed}>
                        <div className="border-b py-2 px-2 flex items-center gap-3" style={{ borderColor: 'var(--border-color)' }}>
                            <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{cardNameById(deck.specialtyRole)}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>{SPECIALTY_LABEL[deck.specialty]}</span>
                        </div>
                    </DeckCatSection>
                )}
                {Object.entries(grouped).map(([cat, cards]) => (
                    <DeckCatSection key={cat} title={CAT_LABEL[cat] || cat} count={cards.length} catKey={cat} collapsed={deckCatCollapsed} setCollapsed={setDeckCatCollapsed}>
                        {cards.map((card, idx) => {
                            const color = card.matched?.aspect ? ASPECT_COLOR[card.matched.aspect] : null;
                            return (
                                <div key={`${card.name}_${idx}`} className="border-b py-1.5 px-2 flex items-center gap-2" style={{ borderColor: 'var(--border-color)' }}>
                                    {color && <span className="shrink-0 w-1.5 h-5 rounded-full" style={{ background: color }} />}
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{card.name}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                            {card.matched && <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>{TYPE_LABEL[card.matched.type] || card.matched.type}</span>}
                                            {card.matched?.aspect && <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: ASPECT_COLOR[card.matched.aspect] + '22', color: ASPECT_COLOR[card.matched.aspect] }}>{ASPECT_LABEL[card.matched.aspect]}</span>}
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>×{card.count}</span>
                                    {card.isReward && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: '#f59e0b22', color: '#f59e0b' }}>보상</span>}
                                </div>
                            );
                        })}
                    </DeckCatSection>
                ))}
            </div>
        );
    };

    const renderDeckSummary = () => (
        <section className="rounded-xl border p-4 shadow-md flex flex-col gap-4" style={cardStyle}>
            <div>
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--highlight)' }}>덱 구성 요약</h3>
                <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold tracking-wider block mb-1.5 text-center" style={{ color: 'var(--text-muted)' }}>ASPECT</span>
                        <table className="w-full text-[11px]" style={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                                    <th className="text-left font-bold py-1 px-1"></th>
                                    <th className="text-center font-bold py-1">N</th>
                                    <th className="text-center font-bold py-1">AVG</th>
                                    <th className="text-center font-bold py-1">SUM</th>
                                </tr>
                            </thead>
                            <tbody>
                                {['AWA', 'SPI', 'FIT', 'FOC'].map(key => {
                                    const s = deckStats.aspectStats[key];
                                    return (
                                        <tr key={key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td className="py-1.5 px-1 font-bold" style={{ color: ASPECT_COLOR[key] }}>{ASPECT_LABEL[key]}</td>
                                            <td className="py-1.5 text-center" style={{ color: 'var(--text-main)' }}>{s.cards}</td>
                                            <td className="py-1.5 text-center" style={{ color: 'var(--text-main)' }}>{s.avg}</td>
                                            <td className="py-1.5 text-center font-bold" style={{ color: 'var(--text-main)' }}>{s.total}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold tracking-wider block mb-1.5 text-center" style={{ color: 'var(--text-muted)' }}>APPROACH</span>
                        <table className="w-full text-[11px]" style={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                                    <th className="text-left font-bold py-1 px-1"></th>
                                    <th className="text-center font-bold py-1">N</th>
                                    <th className="text-center font-bold py-1">AVG</th>
                                    <th className="text-center font-bold py-1">SUM</th>
                                </tr>
                            </thead>
                            <tbody>
                                {APPROACH_ORDER.map(key => {
                                    const s = deckStats.approachStats[key];
                                    return (
                                        <tr key={key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td className="py-1.5 px-1">
                                                <span className="flex items-center gap-1.5">
                                                    <img src={`${APPROACH_ICO}/${key}.png`} alt={key} className="h-4 w-4" />
                                                    <span className="font-bold" style={{ color: APPROACH_COLOR[key] }}>{APPROACH_LABEL[key]}</span>
                                                </span>
                                            </td>
                                            <td className="py-1.5 text-center" style={{ color: 'var(--text-main)' }}>{s.cards}</td>
                                            <td className="py-1.5 text-center" style={{ color: 'var(--text-main)' }}>{s.avg}</td>
                                            <td className="py-1.5 text-center font-bold" style={{ color: 'var(--text-main)' }}>{s.total}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div>
                <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--highlight)' }}>메모</h3>
                <textarea
                    value={deck.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="덱에 대한 메모를 자유롭게 작성하세요..."
                    rows={2}
                    className="w-full text-sm px-3 py-2 rounded-lg border outline-none focus:ring-1 resize-y"
                    style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                />
            </div>
        </section>
    );

    return (
        <div className="flex flex-col gap-3 ebr-fade-in">

            {/* ── 읽기 전용 뷰 ── */}
            {!editing && (
            <>
            <section className="rounded-xl border p-4 shadow-md flex flex-col gap-3" style={cardStyle}>
                <div className="flex items-center gap-3">
                    {selectedRoleCard && (
                        <img
                            src={`${ROLE_ICO}/${getRoleThumb(selectedRoleCard.name_en)}.png`}
                            alt={deck.specialtyRole}
                            className="shrink-0 w-14 h-14 rounded-lg object-cover"
                            style={{ border: '2px solid var(--accent-color)' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>{deck.rangerName || '이름 없음'}</h2>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {deck.specialty && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>{SPECIALTY_LABEL[deck.specialty]}</span>}
                            {deck.specialtyRole && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-color)22', color: 'var(--accent-color)' }}>{cardNameById(deck.specialtyRole)}</span>}
                            {deck.background && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>{BACKGROUND_LABEL[deck.background]}</span>}
                        </div>
                    </div>
                    <button
                        onClick={() => setEditing(true)}
                        className="shrink-0 p-2 rounded-lg border hover:opacity-80 transition-opacity"
                        style={{ borderColor: 'var(--border-color)', color: 'var(--accent-color)' }}
                    >
                        <PencilIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* 역량 읽기 전용 */}
                {setupComplete && (
                    <div className="grid grid-cols-4 gap-1.5">
                        {ASPECT_ORDER.map(key => {
                            const asp = Object.values(ASPECTS).find(a => a.key === key);
                            return (
                                <div key={key} className="rounded-lg flex flex-col items-center py-1.5 px-1" style={{ background: asp.color }}>
                                    <span className="text-lg font-bold text-white leading-none">{av[key]}</span>
                                    <span className="text-[9px] font-bold text-white/90 mt-0.5">{asp.label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 보유 확장 */}
                <div className="flex flex-wrap gap-1 mt-0.5">
                    {ownedPacks.map(pack => (
                        <span key={pack} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>{PACK_LABEL[pack]}</span>
                    ))}
                </div>
            </section>

            {/* 현재 덱 (읽기) */}
            {setupComplete && (
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                {(() => {
                    const total = deckWithCounts.reduce((sum, c) => sum + c.count, 0);
                    return (
                        <button
                            onClick={() => setDeckCollapsed(prev => !prev)}
                            className="flex items-center gap-1.5 text-left hover:opacity-80 transition-opacity w-full"
                        >
                            <h3 className="text-sm font-bold" style={{ color: 'var(--highlight)' }}>현재 덱</h3>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                                background: total === DECK_TARGET ? 'var(--clickable)' : total > DECK_TARGET ? 'var(--danger)' : 'rgba(255,255,255,0.1)',
                                color: '#fff',
                            }}>
                                {total}/{DECK_TARGET}
                            </span>
                            {deckCollapsed
                                ? <ChevronDownIcon className="h-5 w-5 ml-auto" style={{ color: 'var(--accent-color)' }} />
                                : <ChevronUpIcon className="h-5 w-5 ml-auto" style={{ color: 'var(--accent-color)' }} />
                            }
                        </button>
                    );
                })()}
                {!deckCollapsed && renderDeckContents()}
            </section>
            )}

            {/* 카드 교체 */}
            {setupComplete && !isNew && (
            <section className="rounded-xl border p-4 shadow-md flex flex-col gap-3" style={cardStyle}>
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--highlight)' }}>카드 교체</h3>
                    <div className="flex items-center gap-2">
                        {snapshot && (
                            <button
                                onClick={resetDeck}
                                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border font-medium hover:opacity-80 transition-opacity"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--danger)' }}
                            >
                                <RefreshCwIcon className="h-3 w-3" />초기화
                            </button>
                        )}
                        <button
                            onClick={() => { setSwapMode(prev => !prev); setSwapTarget(null); }}
                            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border font-medium hover:opacity-80 transition-opacity"
                            style={{
                                borderColor: swapMode ? 'var(--accent-color)' : 'var(--border-color)',
                                color: swapMode ? 'var(--accent-color)' : 'var(--text-muted)',
                                background: swapMode ? 'var(--accent-color)22' : 'transparent',
                            }}
                        >
                            <ArrowRightLeftIcon className="h-3 w-3" />{swapMode ? '취소' : '교체'}
                        </button>
                    </div>
                </div>

                {swapMode && !swapTarget && (
                    <div>
                        <span className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>교체할 카드를 선택하세요</span>
                        {Object.entries(
                            deckWithCounts.reduce((groups, card) => {
                                const cat = card.category;
                                if (!groups[cat]) groups[cat] = [];
                                groups[cat].push(card);
                                return groups;
                            }, {})
                        ).map(([cat, cards]) => (
                            <div key={cat} className="mb-2">
                                <div className="flex items-center gap-1.5 mb-1 pb-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                    <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{CAT_LABEL[cat] || cat}</span>
                                </div>
                                {cards.map((card, idx) => {
                                    const color = card.matched?.aspect ? ASPECT_COLOR[card.matched.aspect] : null;
                                    return (
                                        <button
                                            key={`${card.id}_${idx}`}
                                            onClick={() => setSwapTarget(card.id)}
                                            className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                                        >
                                            {color && <span className="shrink-0 w-1.5 h-5 rounded-full" style={{ background: color }} />}
                                            <span className="text-xs font-bold flex-1" style={{ color: 'var(--text-main)' }}>{card.name}</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>×{card.count}</span>
                                            {card.isReward && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: '#f59e0b22', color: '#f59e0b' }}>보상</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}

                {swapMode && swapTarget && (
                    <div>
                        {(() => {
                            const targetCard = deckWithCounts.find(c => c.id === swapTarget);
                            const targetCount = targetCard?.count || 0;
                            return (
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>제거:</span>
                                    <span className="text-xs font-bold" style={{ color: 'var(--danger)' }}>{cardNameById(swapTarget)}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>×{targetCount}</span>
                                    <span className="text-[9px] px-1 py-0.5 rounded" style={{
                                        background: isStartingCard(swapTarget) ? 'var(--tag-bg)' : '#f59e0b22',
                                        color: isStartingCard(swapTarget) ? 'var(--text-muted)' : '#f59e0b',
                                    }}>
                                        {isStartingCard(swapTarget) ? '시작' : '보상'}
                                    </span>
                                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>→ ×{targetCount - 1}</span>
                                    <button onClick={() => setSwapTarget(null)} className="ml-auto">
                                        <XIcon className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                    </button>
                                </div>
                            );
                        })()}
                        <span className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>대체할 보상 카드를 선택하세요</span>
                        <input
                            type="text"
                            value={swapSearch}
                            onChange={(e) => setSwapSearch(e.target.value)}
                            placeholder="카드 이름 검색..."
                            className="w-full text-xs px-3 py-1.5 rounded-lg border outline-none focus:ring-1 mb-2"
                            style={{ background: 'var(--input-bg)', color: 'var(--input-text)', borderColor: 'var(--border-color)', '--tw-ring-color': 'var(--accent-color)' }}
                        />
                        {Object.entries(rewardGrouped).map(([setKey, rawCards]) => {
                            const cards = swapSearch.trim()
                                ? rawCards.filter(c => (c.name_ko || c.name_en || '').includes(swapSearch.trim()))
                                : rawCards;
                            if (cards.length === 0) return null;
                            const SET_EXTRA = { personality: '성격', reward: '보상', malady: '질병' };
                            const setLabel = SPECIALTY_LABEL[setKey] || BACKGROUND_LABEL[setKey] || SET_EXTRA[setKey] || setKey;
                            const isSpec = SPECIALTY_SETS.includes(setKey);
                            const isBg = BACKGROUND_SETS.includes(setKey);
                            const catTag = isSpec ? '전문' : isBg ? '배경' : SET_EXTRA[setKey] || setKey;
                            const isClosed = swapGroupCollapsed[setKey];
                            return (
                                <div key={setKey} className="mb-2">
                                    <button
                                        onClick={() => setSwapGroupCollapsed(prev => ({ ...prev, [setKey]: !prev[setKey] }))}
                                        className="flex items-center gap-1.5 mb-1 pb-1 border-b hover:opacity-80 transition-opacity w-full"
                                        style={{ borderColor: 'var(--border-color)' }}
                                    >
                                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>{catTag}</span>
                                        <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{setLabel}</span>
                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({cards.length})</span>
                                        {isClosed
                                            ? <ChevronDownIcon className="h-4 w-4 ml-auto" style={{ color: 'var(--text-muted)' }} />
                                            : <ChevronUpIcon className="h-4 w-4 ml-auto" style={{ color: 'var(--text-muted)' }} />
                                        }
                                    </button>
                                    {!isClosed && (
                                        <div className="flex flex-col">
                                            {cards.map(card => renderCardItem(card, {
                                                isSelected: false,
                                                onToggle: () => executeSwap(swapTarget, card.id, true),
                                                accentColor: card.aspect ? ASPECT_COLOR[card.aspect] : 'var(--accent-color)',
                                            }))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {rewardAvailableCards.length === 0 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>선택 가능한 카드가 없습니다</span>}
                        {(() => {
                            const startingIds = getStartingIds();
                            const currentIds = getAllCurrentIds();
                            const availableStarting = startingIds.filter(id => !currentIds.includes(id));
                            if (availableStarting.length === 0) return null;
                            return (
                                <div className="mt-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                    <span className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>또는 시작 카드로 교체</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {availableStarting.map(id => (
                                            <button
                                                key={id}
                                                onClick={() => executeSwap(swapTarget, id, false)}
                                                className="text-[11px] px-2 py-1 rounded-md border font-medium hover:opacity-80 transition-opacity"
                                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                                            >
                                                {cardNameById(id)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* 제거된 카드 */}
                {removedCards.length > 0 && (
                    <div className="mt-1">
                        <span className="text-[10px] font-bold tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>제거된 카드</span>
                        <div className="flex flex-wrap gap-1">
                            {[...new Set(removedCards.map(s => s.removed))].map(id => (
                                <span key={id} className="text-[11px] px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)' }}>{cardNameById(id)}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 영구 제거 */}
                {permanentlyRemoved.length > 0 && (
                    <div className="mt-1">
                        <span className="text-[10px] font-bold tracking-wider block mb-1" style={{ color: 'var(--danger)' }}>영구 제거</span>
                        <div className="flex flex-wrap gap-1">
                            {[...new Set(permanentlyRemoved.map(s => s.removed))].map(id => (
                                <span key={id} className="text-[11px] px-2 py-1 rounded-md" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}>{cardNameById(id)}</span>
                            ))}
                        </div>
                    </div>
                )}
            </section>
            )}

            {/* 덱 구성 요약 + 메모 (읽기) */}
            {renderDeckSummary()}
            </>
            )}

            {/* ── 편집 모드 ── */}
            {editing && (
            <>
            {/* ── 1. 레인저 설정 ── */}
            <section className="rounded-xl border p-4 shadow-md flex flex-col gap-4" style={cardStyle}>

                {/* 편집 모드 헤더 */}
                {!isNew && (
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: 'var(--accent-color)' }}>편집 중</span>
                        <button
                            onClick={() => setEditing(false)}
                            className="text-xs px-3 py-1 rounded-md border font-medium hover:opacity-80 transition-opacity"
                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                        >
                            완료
                        </button>
                    </div>
                )}

                {/* 이름 + 역할 썸네일 */}
                <div className="flex items-center gap-3">
                    {selectedRoleCard && (
                        <img
                            src={`${ROLE_ICO}/${getRoleThumb(selectedRoleCard.name_en)}.png`}
                            alt={deck.specialtyRole}
                            className="shrink-0 w-14 h-14 rounded-lg object-cover"
                            style={{ border: '2px solid var(--accent-color)' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    )}
                    <input
                        type="text"
                        value={deck.rangerName}
                        onChange={(e) => updateField('rangerName', e.target.value)}
                        placeholder="레인저 이름"
                        className="flex-1 text-lg font-bold px-3 py-2 rounded-lg border outline-none focus:ring-1"
                        style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                    />
                </div>

                {/* 보유 확장 */}
                <div>
                    <span style={labelStyle}>보유 확장</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {PACK_ORDER.map(pack => {
                            const owned = ownedPacks.includes(pack);
                            const isCore = pack === 'core';
                            return (
                                <button
                                    key={pack}
                                    onClick={() => {
                                        if (isCore) return;
                                        updateField('ownedPacks', owned ? ownedPacks.filter(p => p !== pack) : [...ownedPacks, pack]);
                                    }}
                                    className="text-[11px] px-2.5 py-1.5 rounded-md border font-medium transition-all"
                                    style={{
                                        background: owned ? 'var(--accent-color)' : 'var(--input-bg)',
                                        color: owned ? '#fff' : 'var(--text-muted)',
                                        borderColor: owned ? 'var(--accent-color)' : 'var(--border-color)',
                                        opacity: isCore ? 0.7 : 1,
                                        cursor: isCore ? 'default' : 'pointer',
                                    }}
                                >
                                    {PACK_LABEL[pack]}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 전문분야 + 배경 (가로 배치) */}
                {hasName && (
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <span style={labelStyle}>전문분야</span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {availableSpecialties.map(setKey => (
                                    <button
                                        key={setKey}
                                        onClick={() => {
                                            if (deck.specialty === setKey) return;
                                            onUpdate({ ...deck, specialty: setKey, specialtyCards: [], specialtyRole: '' });
                                            setRoleOpen(true);
                                        }}
                                        className="text-[11px] px-2.5 py-1.5 rounded-md border font-medium transition-all"
                                        style={{
                                            background: deck.specialty === setKey ? 'var(--accent-color)' : 'var(--input-bg)',
                                            color: deck.specialty === setKey ? '#fff' : 'var(--text-main)',
                                            borderColor: deck.specialty === setKey ? 'var(--accent-color)' : 'var(--border-color)',
                                        }}
                                    >
                                        {SPECIALTY_LABEL[setKey]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {canSelectBackground && (
                            <div className="flex-1">
                                <span style={labelStyle}>배경</span>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {availableBackgrounds.map(setKey => (
                                        <button
                                            key={setKey}
                                            onClick={() => {
                                                if (deck.background === setKey) return;
                                                onUpdate({ ...deck, background: setKey, backgroundCards: [] });
                                            }}
                                            className="text-[11px] px-2.5 py-1.5 rounded-md border font-medium transition-all"
                                            style={{
                                                background: deck.background === setKey ? 'var(--accent-color)' : 'var(--input-bg)',
                                                color: deck.background === setKey ? '#fff' : 'var(--text-main)',
                                                borderColor: deck.background === setKey ? 'var(--accent-color)' : 'var(--border-color)',
                                            }}
                                        >
                                            {BACKGROUND_LABEL[setKey]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 역할 선택 (접기/펼치기) */}
                {canSelectRole && (
                    <div>
                        <button
                            onClick={() => setRoleOpen(prev => !prev)}
                            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        >
                            <span style={labelStyle}>역할</span>
                            {deck.specialtyRole && <span className="text-[11px] font-bold" style={{ color: 'var(--accent-color)' }}>{cardNameById(deck.specialtyRole)}</span>}
                            {roleOpen
                                ? <ChevronUpIcon className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                                : <ChevronDownIcon className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                            }
                        </button>
                        {roleOpen && (
                            <div className="mt-1.5 flex flex-col">
                                {roleCards.map(card => {
                                    const isSelected = deck.specialtyRole === card.id;
                                    const accentColor = card.aspect ? ASPECT_COLOR[card.aspect] : 'var(--accent-color)';
                                    return (
                                        <div key={card.id} className="border-b rounded-lg mb-1" style={{
                                            borderColor: isSelected ? accentColor : 'var(--border-color)',
                                            borderWidth: isSelected ? '2px' : '1px',
                                        }}>
                                            <button
                                                onClick={() => {
                                                    updateField('specialtyRole', isSelected ? '' : card.id);
                                                    if (!isSelected) setRoleOpen(false);
                                                }}
                                                className="w-full text-left py-2 flex items-center gap-3 hover:bg-white/5 transition-colors px-2"
                                                style={{
                                                    background: isSelected ? accentColor + '30' : 'transparent',
                                                    boxShadow: isSelected ? `0 0 8px ${accentColor}40` : 'none',
                                                }}
                                            >
                                                <img
                                                    src={`${ROLE_ICO}/${getRoleThumb(card.name_en)}.png`}
                                                    alt={card.name_en}
                                                    className="shrink-0 w-10 h-10 rounded-lg object-cover"
                                                    style={{ border: `2px solid ${accentColor}44` }}
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{card.name_ko || card.name_en}</span>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        {card.aspect && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: ASPECT_COLOR[card.aspect] + '22', color: ASPECT_COLOR[card.aspect] }}>{ASPECT_LABEL[card.aspect]}</span>}
                                                        {card.approach && typeof card.approach === 'object' && (
                                                            <span className="flex items-center gap-0.5">
                                                                {Object.entries(card.approach).flatMap(([key, val]) =>
                                                                    [...Array(val)].map((_, i) => (
                                                                        <img key={`${key}_${i}`} src={`${APPROACH_ICO}/${key}.png`} alt={key} className="h-4 w-4" />
                                                                    ))
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {card.text_kr && (
                                                        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }} dangerouslySetInnerHTML={{ __html: formatCardText(card.text_kr) }} />
                                                    )}
                                                </div>
                                                {isSelected && <CheckIcon className="h-4 w-4 shrink-0" style={{ color: accentColor }} />}
                                            </button>
                                        </div>
                                    );
                                })}
                                {roleCards.length === 0 && (
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>해당 전문분야의 역할 카드가 없습니다</span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 역량 */}
                {setupComplete && (
                    <div>
                        <span style={labelStyle}>역량</span>
                        <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                            {ASPECT_ORDER.map(key => {
                                const asp = Object.values(ASPECTS).find(a => a.key === key);
                                const val = av[key];
                                return (
                                    <div key={key} className="rounded-lg flex flex-col items-center py-2 px-1" style={{ background: asp.color }}>
                                        <button onClick={() => updateAspect(key, 'up')} className="p-0.5" style={{ opacity: val < 4 ? 1 : 0.3 }}>
                                            <ChevronUpIcon className="h-3.5 w-3.5 text-white" />
                                        </button>
                                        <span className="text-xl font-bold text-white leading-none my-0.5">{val}</span>
                                        <button onClick={() => updateAspect(key, 'down')} className="p-0.5" style={{ opacity: val > 1 ? 1 : 0.3 }}>
                                            <ChevronDownIcon className="h-3.5 w-3.5 text-white" />
                                        </button>
                                        <span className="text-[9px] font-bold text-white/90 mt-0.5">{asp.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {!avValid && (
                            <div className="mt-1.5 text-xs px-3 py-2 rounded-lg font-medium flex flex-col gap-0.5" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}>
                                {avTotal !== 8 && <span>역량의 총합은 8이어야 합니다. (현재 {avTotal})</span>}
                                {avHighCount > 1 && <span>한개의 역량만 3 또는 4로 설정할 수 있습니다.</span>}
                                {avOnes < 1 && <span>반드시 1개의 역량은 1로 설정해야 합니다.</span>}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ── 2. 현재 덱 ── */}
            {setupComplete && (
            <section className="rounded-xl border p-4 shadow-md" style={cardStyle}>
                <button
                    onClick={() => setDeckCollapsed(prev => !prev)}
                    className="flex items-center gap-1.5 text-left hover:opacity-80 transition-opacity w-full"
                >
                    <h3 className="text-sm font-bold" style={{ color: 'var(--highlight)' }}>현재 덱</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                        background: currentCount === DECK_TARGET ? 'var(--clickable)' : currentCount > DECK_TARGET ? 'var(--danger)' : 'rgba(255,255,255,0.1)',
                        color: '#fff',
                    }}>
                        {currentCount}/{DECK_TARGET}
                    </span>
                    {deckCollapsed
                        ? <ChevronDownIcon className="h-5 w-5 ml-auto" style={{ color: 'var(--accent-color)' }} />
                        : <ChevronUpIcon className="h-5 w-5 ml-auto" style={{ color: 'var(--accent-color)' }} />
                    }
                </button>
                {!deckCollapsed && renderDeckContents()}
            </section>
            )}

            {/* ── 3. 카드 선택 탭 ── */}
            {setupComplete && (
            <section className="rounded-xl border shadow-md overflow-hidden" style={cardStyle}>
                <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
                    {CARD_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setCardTab(tab.key)}
                            className="flex-1 py-2.5 text-xs font-bold transition-all"
                            style={{
                                background: cardTab === tab.key ? 'var(--accent-color)' : 'transparent',
                                color: cardTab === tab.key ? '#fff' : 'var(--text-muted)',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="p-4">
                    {cardTab === 'personality' && (
                        <div>
                            <span className="text-xs block mb-3" style={{ color: 'var(--text-muted)' }}>각 역량당 1종 선택 (× 2장) [{Object.values(deck.personalityCards).filter(v => v && v.trim()).length}/4]</span>
                            {['AWA', 'SPI', 'FIT', 'FOC'].map(aspKey => {
                                const aspectField = ASPECT_MAP[aspKey];
                                const aspCards = personalityCards.filter(c => c.aspect === aspKey);
                                const selected = deck.personalityCards[aspectField] || '';
                                return (
                                    <div key={aspKey} className="mb-3">
                                        <div className="flex items-center gap-1.5 mb-1 pb-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                            <span className="w-2 h-2 rounded-full" style={{ background: ASPECT_COLOR[aspKey] }} />
                                            <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{ASPECT_LABEL[aspKey]}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            {aspCards.map(card => renderCardItem(card, {
                                                isSelected: selected === card.id,
                                                onToggle: () => updateField('personalityCards', {
                                                    ...deck.personalityCards,
                                                    [aspectField]: selected === card.id ? '' : card.id,
                                                }),
                                                accentColor: ASPECT_COLOR[aspKey],
                                            }))}
                                        </div>
                                        {aspCards.length === 0 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>해당 레벨의 카드가 없습니다</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {cardTab === 'specialty' && (
                        <div>
                            {deck.specialty ? (
                                <>
                                    <span className="text-xs block mb-3" style={{ color: 'var(--text-muted)' }}>{SPECIALTY_LABEL[deck.specialty]} — 5종 선택 (× 2장) [{(deck.specialtyCards || []).length}/5]</span>
                                    <div className="flex flex-col">
                                        {specialtyNonRoleCards.map(card => {
                                            const cur = deck.specialtyCards || [];
                                            const isSelected = cur.includes(card.id);
                                            const isFull = cur.length >= 5 && !isSelected;
                                            return renderCardItem(card, {
                                                isSelected,
                                                onToggle: () => {
                                                    if (isFull) return;
                                                    updateField('specialtyCards', isSelected ? cur.filter(c => c !== card.id) : [...cur, card.id]);
                                                },
                                                accentColor: card.aspect ? ASPECT_COLOR[card.aspect] : 'var(--accent-color)',
                                            });
                                        })}
                                    </div>
                                </>
                            ) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>상단에서 전문분야를 먼저 선택하세요</span>}
                        </div>
                    )}
                    {cardTab === 'background' && (
                        <div>
                            {deck.background ? (
                                <>
                                    <span className="text-xs block mb-3" style={{ color: 'var(--text-muted)' }}>{BACKGROUND_LABEL[deck.background]} — 5종 선택 (× 2장) [{(deck.backgroundCards || []).length}/5]</span>
                                    <div className="flex flex-col">
                                        {backgroundCards.map(card => {
                                            const cur = deck.backgroundCards || [];
                                            const isSelected = cur.includes(card.id);
                                            const isFull = cur.length >= 5 && !isSelected;
                                            return renderCardItem(card, {
                                                isSelected,
                                                onToggle: () => {
                                                    if (isFull) return;
                                                    updateField('backgroundCards', isSelected ? cur.filter(c => c !== card.id) : [...cur, card.id]);
                                                },
                                                accentColor: card.aspect ? ASPECT_COLOR[card.aspect] : 'var(--accent-color)',
                                            });
                                        })}
                                    </div>
                                </>
                            ) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>상단에서 배경을 먼저 선택하세요</span>}
                        </div>
                    )}
                    {cardTab === 'outside' && (
                        <div>
                            <span className="text-xs block mb-3" style={{ color: 'var(--text-muted)' }}>다른 전문분야/배경에서 1장 선택</span>
                            {Object.entries(outsideGrouped).map(([setKey, cards]) => {
                                const setLabel = SPECIALTY_LABEL[setKey] || BACKGROUND_LABEL[setKey] || setKey;
                                const isSpec = SPECIALTY_SETS.includes(setKey);
                                const isClosed = outsideCollapsed[setKey];
                                return (
                                    <div key={setKey} className="mb-3">
                                        <button
                                            onClick={() => setOutsideCollapsed(prev => ({ ...prev, [setKey]: !prev[setKey] }))}
                                            className="flex items-center gap-1.5 mb-1 pb-1 border-b hover:opacity-80 transition-opacity w-full"
                                            style={{ borderColor: 'var(--border-color)' }}
                                        >
                                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>{isSpec ? '전문' : '배경'}</span>
                                            <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{setLabel}</span>
                                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({cards.length})</span>
                                            {isClosed
                                                ? <ChevronDownIcon className="h-4 w-4 ml-auto" style={{ color: 'var(--text-muted)' }} />
                                                : <ChevronUpIcon className="h-4 w-4 ml-auto" style={{ color: 'var(--text-muted)' }} />
                                            }
                                        </button>
                                        {!isClosed && (
                                            <div className="flex flex-col">
                                                {cards.map(card => renderCardItem(card, {
                                                    isSelected: deck.outsideInterest === card.id,
                                                    onToggle: () => {
                                                        updateField('outsideInterest', deck.outsideInterest === card.id ? '' : card.id);
                                                    },
                                                    accentColor: card.aspect ? ASPECT_COLOR[card.aspect] : 'var(--accent-color)',
                                                }))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {outsideCards.length === 0 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>선택 가능한 카드가 없습니다</span>}
                        </div>
                    )}
                </div>
            </section>
            )}

            {/* ── 4. 덱 구성 요약 + 메모 (편집 모드) ── */}
            {!isNew && renderDeckSummary()}
            </>
            )}
        </div>
    );
};

const DeckCatSection = ({ title, count, catKey, collapsed, setCollapsed, children }) => (
    <div>
        <button
            onClick={() => setCollapsed(prev => ({ ...prev, [catKey]: !prev[catKey] }))}
            className="flex items-center gap-1.5 pb-1 border-b hover:opacity-80 transition-opacity w-full"
            style={{ borderColor: 'var(--border-color)' }}
        >
            <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{title}</span>
            {count != null && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({count})</span>}
            {collapsed[catKey]
                ? <ChevronDownIcon className="h-3.5 w-3.5 ml-auto" style={{ color: 'var(--text-muted)' }} />
                : <ChevronUpIcon className="h-3.5 w-3.5 ml-auto" style={{ color: 'var(--text-muted)' }} />
            }
        </button>
        {!collapsed[catKey] && children}
    </div>
);

const DeckCardRow = ({ name, color, matched, aspCode }) => (
    <div className="border-b py-1.5 px-2 flex items-center gap-2" style={{ borderColor: 'var(--border-color)' }}>
        {color && <span className="shrink-0 w-1.5 h-5 rounded-full" style={{ background: color }} />}
        <div className="flex-1 min-w-0">
            <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{name}</span>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {matched && <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>{TYPE_LABEL[matched.type] || matched.type}</span>}
                {aspCode && <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: (color || 'var(--accent-color)') + '22', color: color || 'var(--accent-color)' }}>{ASPECT_LABEL[aspCode]}</span>}
                {matched?.aspect && !aspCode && <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: ASPECT_COLOR[matched.aspect] + '22', color: ASPECT_COLOR[matched.aspect] }}>{ASPECT_LABEL[matched.aspect]}</span>}
            </div>
        </div>
    </div>
);

function calculateDeckCount(deck) {
    let count = 0;
    count += Object.values(deck.personalityCards).filter(v => v && v.trim()).length * 2;
    count += (deck.specialtyCards || []).length * 2;
    count += (deck.backgroundCards || []).length * 2;
    count += deck.outsideInterest ? 2 : 0;
    return count;
}

function getActualCount(deck, key) {
    switch (key) {
        case 'personality': return Object.values(deck.personalityCards).filter(v => v && v.trim()).length;
        case 'specialty':    return (deck.specialtyCards || []).length;
        case 'background':  return (deck.backgroundCards || []).length;
        case 'outside':      return deck.outsideInterest ? 1 : 0;
        default:             return 0;
    }
}

export default DeckManager;
