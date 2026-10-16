import { useState, useEffect, useMemo } from 'react';
import { SearchIcon, ChevronDownIcon, ChevronUpIcon, ChevronRightIcon } from 'lucide-react';

const APPROACH_ICO = '/assets/icons/ebr/approach';
const ASPECT_LABEL = { FIT: '체력', FOC: '집중력', AWA: '인지력', SPI: '정신력' };
const ASPECT_COLOR = { FIT: '#ef4444', FOC: '#3b82f6', AWA: '#10b981', SPI: '#f59e0b' };
const TYPE_LABEL = { moment: '모먼트', gear: '장비', attribute: '속성', attachment: '부착물', role: '역할', being: '존재', feature: '특성' };
const SET_LABEL = {
    traveler: '여행자', artisan: '장인', shepherd: '목동', forager: '채집가',
    explorer: '탐험가', shaper: '형상술사', personality: '성격', reward: '보상', malady: '질병',
    conciliator: '중재자', spirit_speaker: '정령 소통사', artificer: '제작술사', talespinner: '이야기꾼',
};
const PACK_LABEL = { core: '코어', sotv: '밸리의 관리자들', loa: '조상의 유산', itm: '길 위의 순간들', sos: '남쪽의 노래', sib: '기반' };
const PACK_ORDER = ['core', 'sotv', 'loa', 'itm', 'sos', 'sib'];
const PACK_GROUPS = [
    { label: '기본', packs: ['core'] },
    { label: '확장', packs: ['sib', 'sotv', 'loa', 'itm', 'sos'] },
];

const PACK_CATEGORIES = {
    core: {
        categories: {
            '전문분야': ['artificer', 'explorer', 'conciliator', 'shaper'],
            '배경': ['artisan', 'forager', 'shepherd', 'traveler'],
        },
        order: ['전문분야', '배경', '보상', '성격', '질병'],
        standalone: { reward: '보상', personality: '성격', malady: '질병' },
    },
    sotv: {
        categories: {
            '전문분야': ['artificer', 'explorer', 'conciliator', 'shaper', 'spirit_speaker'],
            '배경': ['artisan', 'forager', 'shepherd', 'traveler', 'talespinner'],
        },
        order: ['전문분야', '배경', '보상', '성격'],
        standalone: { reward: '보상', personality: '성격' },
    },
};

const STORAGE_KEY = 'ebr_card_translations';

const CardList = () => {
    const [cards, setCards] = useState([]);
    const [search, setSearch] = useState('');
    const [filterPack, setFilterPack] = useState('');
    const [filterTaboo, setFilterTaboo] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [expandedPacks, setExpandedPacks] = useState({});
    const [expandedCategories, setExpandedCategories] = useState({});
    const [expandedSets, setExpandedSets] = useState({});
    const [translations, setTranslations] = useState({});

    useEffect(() => {
        fetch('/assets/data/ranger_cards_full.json')
            .then(r => r.json())
            .then(data => setCards(data))
            .catch(e => console.error('카드 데이터 로드 실패:', e));

        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved) setTranslations(JSON.parse(saved));
        } catch {}
    }, []);

    const saveTranslation = (id, field, value) => {
        setTranslations(prev => {
            const next = { ...prev, [id]: { ...(prev[id] || {}), [field]: value } };
            try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    };

    const getKo = (card, field) => {
        if (translations[card.id]?.[field] !== undefined) return translations[card.id][field];
        if (field === 'name_ko') return card.name_ko || '';
        if (field === 'text_ko') return card.text_kr || '';
        return '';
    };

    const packs = useMemo(() => PACK_ORDER.filter(p => cards.some(c => c.pack === p)), [cards]);

    const grouped = useMemo(() => {
        const q = search.toLowerCase();
        const filtered = cards.filter(c => {
            if (filterPack && c.pack !== filterPack) return false;
            if (filterTaboo === 'yes' && !c.taboo) return false;
            if (filterTaboo === 'no' && c.taboo) return false;
            if (!q) return true;
            const nameKo = getKo(c, 'name_ko');
            return c.name_en.toLowerCase().includes(q) || nameKo.toLowerCase().includes(q);
        });

        const byPack = {};
        filtered.forEach(card => {
            const pack = card.pack || 'unknown';
            const set = card.set || 'unknown';
            if (!byPack[pack]) byPack[pack] = {};
            if (!byPack[pack][set]) byPack[pack][set] = [];
            byPack[pack][set].push(card);
        });

        return byPack;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cards, search, filterPack, filterTaboo, translations]);

    const togglePack = (pack) => {
        setExpandedPacks(prev => ({ ...prev, [pack]: !prev[pack] }));
    };

    const toggleCategory = (key) => {
        setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleSet = (key) => {
        setExpandedSets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const totalFiltered = useMemo(() => {
        let count = 0;
        Object.values(grouped).forEach(sets => Object.values(sets).forEach(arr => count += arr.length));
        return count;
    }, [grouped]);

    const inputStyle = { background: 'var(--bg-color)', borderColor: 'var(--border-color)', color: 'var(--text-main)' };
    const cardStyle = { background: 'var(--card-bg)', borderColor: 'var(--border-color)' };

    const sortedPacks = PACK_ORDER.filter(p => grouped[p]);
    Object.keys(grouped).forEach(p => { if (!sortedPacks.includes(p)) sortedPacks.push(p); });

    const renderCardItem = (card, indentPx) => {
        const expanded = expandedId === card.id;
        const nameKo = getKo(card, 'name_ko');
        const textKo = getKo(card, 'text_ko');
        return (
            <div key={card.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <button
                    onClick={() => setExpandedId(expanded ? null : card.id)}
                    className="w-full text-left py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors"
                    style={{ paddingLeft: indentPx, paddingRight: '1rem' }}
                >
                    {card.aspect && (
                        <span className="shrink-0 w-2 h-7 rounded-full" style={{ background: ASPECT_COLOR[card.aspect] }} />
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{card.name_en}</span>
                            <span className="text-sm" style={{ color: 'var(--accent-color)' }}>{nameKo}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>
                                {TYPE_LABEL[card.type] || card.type}
                            </span>
                            {card.cost !== undefined && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>비용 {card.cost}</span>}
                            {card.level && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--text-muted)' }}>Lv.{card.level}</span>}
                            {card.aspect && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: ASPECT_COLOR[card.aspect] + '22', color: ASPECT_COLOR[card.aspect] }}>{ASPECT_LABEL[card.aspect]}</span>}
                            {card.approach && typeof card.approach === 'object' && (
                                <span className="flex items-center gap-0.5">
                                    {Object.entries(card.approach).flatMap(([key, val]) =>
                                        [...Array(val)].map((_, i) => (
                                            <img key={`${key}_${i}`} src={`${APPROACH_ICO}/${key}.png`} alt={key} className="h-4 w-4" title={key} />
                                        ))
                                    )}
                                </span>
                            )}
                        </div>
                    </div>
                    {expanded
                        ? <ChevronUpIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                        : <ChevronDownIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    }
                </button>
                {expanded && (
                    <div className="pb-4 border-t" style={{ borderColor: 'var(--border-color)', paddingLeft: indentPx, paddingRight: '1rem' }}>
                        {card.approach && typeof card.approach === 'object' && (
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="flex items-center gap-0.5">
                                    {Object.entries(card.approach).flatMap(([key, val]) =>
                                        [...Array(val)].map((_, i) => (
                                            <img key={`${key}_${i}`} src={`${APPROACH_ICO}/${key}.png`} alt={key} className="h-5 w-5" title={key} />
                                        ))
                                    )}
                                </span>
                            </div>
                        )}
                        {(card.equip || card.token_count || card.taboo) && (
                            <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                {card.equip && (
                                    <span className="flex items-center gap-1.5">
                                        <b>장착</b>
                                        <span className="flex items-center gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className="inline-block w-3.5 h-3.5 rounded-sm border" style={{
                                                    borderColor: 'var(--text-muted)',
                                                    background: i < card.equip ? 'var(--accent-color)' : 'transparent',
                                                }} />
                                            ))}
                                        </span>
                                    </span>
                                )}
                                {card.token_count && (
                                    <span className="flex items-center gap-1.5">
                                        <b>{card.token_kr || card.token}</b>
                                        <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{card.token_count}</span>
                                    </span>
                                )}
                                {card.taboo && <span style={{ color: '#ef4444' }}><b>금기(Taboo)</b></span>}
                            </div>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                            <div>
                                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Card Name (EN)</label>
                                <div className="px-3 py-2 rounded-lg border text-sm" style={{ ...inputStyle, opacity: 0.7 }}>
                                    {card.name_en}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>카드 이름 (KO)</label>
                                <input
                                    type="text"
                                    value={nameKo}
                                    onChange={(e) => saveTranslation(card.id, 'name_ko', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border outline-none focus:ring-1 text-sm"
                                    style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
                            <div>
                                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Card Text (EN)</label>
                                <div className="px-3 py-2 rounded-lg border text-sm whitespace-pre-wrap leading-relaxed" style={{ ...inputStyle, opacity: 0.7 }}
                                    dangerouslySetInnerHTML={{ __html: card.text_en || '-' }} />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>카드 텍스트 (KO)</label>
                                <textarea
                                    value={textKo}
                                    onChange={(e) => saveTranslation(card.id, 'text_ko', e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 rounded-lg border outline-none focus:ring-1 text-sm resize-y leading-relaxed"
                                    style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSetGroup = (set, setCards, pack, indentPx) => {
        const setKey = `${pack}__${set}`;
        const setOpen = expandedSets[setKey];
        const setLabel = SET_LABEL[set] || set;
        return (
            <div key={set}>
                <button
                    onClick={() => toggleSet(setKey)}
                    className="w-full text-left py-2.5 flex items-center gap-2 hover:bg-white/5 transition-colors border-b"
                    style={{ borderColor: 'var(--border-color)', paddingLeft: indentPx, paddingRight: '1rem' }}
                >
                    {setOpen
                        ? <ChevronDownIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-color)' }} />
                        : <ChevronRightIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    }
                    <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{setLabel}</span>
                    <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{setCards.length}장</span>
                </button>
                {setOpen && (
                    <div className="flex flex-col">
                        {setCards.map(card => renderCardItem(card, `${parseFloat(indentPx) + 1.5}rem`))}
                    </div>
                )}
            </div>
        );
    };

    const renderSetList = (sets, pack) => {
        const sortedSets = Object.keys(sets).sort();
        return sortedSets.map(set => renderSetGroup(set, sets[set], pack, '1.5rem'));
    };

    const renderCategorizedContent = (sets, pack) => {
        const config = PACK_CATEGORIES[pack];
        return config.order.map(catName => {
            const catSets = config.categories[catName];
            if (catSets) {
                const availableSets = catSets.filter(s => sets[s]);
                if (availableSets.length === 0) return null;
                const catKey = `${pack}__cat__${catName}`;
                const catOpen = expandedCategories[catKey];
                const catCount = availableSets.reduce((sum, s) => sum + sets[s].length, 0);
                return (
                    <div key={catName}>
                        <button
                            onClick={() => toggleCategory(catKey)}
                            className="w-full text-left py-2.5 flex items-center gap-2 hover:bg-white/5 transition-colors border-b"
                            style={{ borderColor: 'var(--border-color)', paddingLeft: '1.5rem', paddingRight: '1rem' }}
                        >
                            {catOpen
                                ? <ChevronDownIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-color)' }} />
                                : <ChevronRightIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                            }
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{catName}</span>
                            <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{catCount}장</span>
                        </button>
                        {catOpen && (
                            <div>
                                {availableSets.map(set => renderSetGroup(set, sets[set], pack, '2.5rem'))}
                            </div>
                        )}
                    </div>
                );
            }
            const standaloneKey = Object.keys(config.standalone).find(k => config.standalone[k] === catName);
            if (!standaloneKey || !sets[standaloneKey]) return null;
            return renderSetGroup(standaloneKey, sets[standaloneKey], pack, '1.5rem');
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="카드 검색 (영문/한국어)"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border outline-none focus:ring-1 text-sm"
                    style={{ ...inputStyle, '--tw-ring-color': 'var(--accent-color)' }}
                />
            </div>

            <div className="flex items-center gap-2">
                <select value={filterPack} onChange={e => setFilterPack(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border text-xs outline-none" style={inputStyle}>
                    <option value="">세트 전체</option>
                    {packs.map(p => <option key={p} value={p}>{PACK_LABEL[p] || p}</option>)}
                </select>
                <select value={filterTaboo} onChange={e => setFilterTaboo(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border text-xs outline-none" style={inputStyle}>
                    <option value="">금기 전체</option>
                    <option value="yes">금기만</option>
                    <option value="no">금기 제외</option>
                </select>
            </div>

            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {totalFiltered}장 / 전체 {cards.length}장
            </div>

            <div className="flex flex-col gap-4">
                {PACK_GROUPS.map(group => {
                    const groupPacks = group.packs.filter(p => grouped[p]);
                    if (groupPacks.length === 0) return null;
                    return (
                        <div key={group.label}>
                            <div className="text-xs font-bold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                                {group.label}
                            </div>
                            <div className="flex flex-col gap-2">
                                {groupPacks.map(pack => {
                                    const sets = grouped[pack];
                                    const packOpen = expandedPacks[pack];
                                    const packLabel = PACK_LABEL[pack] || pack;
                                    const packCount = Object.values(sets).reduce((sum, arr) => sum + arr.length, 0);

                                    return (
                                        <div key={pack} className="rounded-xl border overflow-hidden" style={cardStyle}>
                                            <button
                                                onClick={() => togglePack(pack)}
                                                className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-white/5 transition-colors"
                                            >
                                                {packOpen
                                                    ? <ChevronDownIcon className="h-5 w-5 shrink-0" style={{ color: 'var(--accent-color)' }} />
                                                    : <ChevronRightIcon className="h-5 w-5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                                                }
                                                <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{packLabel}</span>
                                                <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{packCount}장</span>
                                            </button>

                                            {packOpen && (
                                                <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                                                    {PACK_CATEGORIES[pack] ? renderCategorizedContent(sets, pack) : renderSetList(sets, pack)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CardList;
