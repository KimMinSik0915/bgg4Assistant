/**
 * @Author : 김민식
 * normalizeCharacterData : 업로드된 JSON/TXT(중첩 구조)를 시트 렌더링용
 * 평탄화 구조로 변환한다. 원본 HTML/CSS 프로토타입의 로직을 그대로 이식하고,
 * 서로 다른 여러 JSON 스키마를 자동 감지해서 처리한다.
 *  1) 평탄화 구조 (name + stats) - 그대로 사용
 *  2) 중첩 구조 v2 (characterInfo / abilityScores / combat.hitPoints ...)
 *  3) 서술형 홈브루 구조 (character / ability_scores ...) - 하위 필드 이름/모양이
 *     제각각이라(예: 능력치가 {score,mod}거나 {base,final,mod}, 내성굴림이 배열이거나
 *     {mod,proficient} 객체이거나, 기술이 문자열 배열이거나 객체 배열이거나) 최대한
 *     유연하게 여러 형태를 다 시도해보고 값을 채운다.
 */

export const parseDiceFromDamage = (dmgStr) => {
    if (!dmgStr) return 20;
    const match = String(dmgStr).match(/d(\d+)/);
    return match ? parseInt(match[1], 10) : 20;
}

// "6 + CON mod = 6 + 2 = 8", "... = 35 ft.", "2 + 2 = +4" 같은
// 계산식/서술형 문자열에서 마지막에 등장하는 숫자만 뽑아낸다. 숫자가 그냥 와도 그대로 반환.
export const extractLastNumber = (str, fallback = 0) => {
    if (typeof str === 'number') return str;
    if (!str) return fallback;
    const matches = String(str).match(/[-+]?\d+/g);
    if (!matches || matches.length === 0) return fallback;
    return parseInt(matches[matches.length - 1], 10);
}

// "1d6 (Priest)" -> "1d6" 처럼 주사위 표기만 추출
export const extractDiceNotation = (str, fallback = '1d6') => {
    if (!str) return fallback;
    const match = String(str).match(/\d+d\d+/i);
    return match ? match[0] : fallback;
}

// 주문 설명 텍스트 속 "1d8", "d4" 같은 표기에서 주사위 면 수만 추출 (없으면 undefined)
export const extractSpellDice = (str) => {
    if (!str) return undefined;
    const match = String(str).match(/d(\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
}

// 주문 레벨/지속시간 텍스트에서 "1레벨 / 집중" 같은 짧은 뱃지 라벨 생성
export const buildSpellTypeLabel = (levelText, durationText) => {
    const levelMatch = String(levelText || '').match(/(\d+)\s*레벨/);
    const levelLabel = levelMatch ? `${levelMatch[1]}레벨` : '';
    const isConcentration = /집중/.test(durationText || '');
    return [levelLabel, isConcentration ? '집중' : null].filter(Boolean).join(' / ');
}

export const mapEquipment = (items = [], attacks = []) => {
    const slots = { head : null, neck : null, armor : null, hands : null, feet : null, trinket : null, mainHand : null, offHand : null };

    if (attacks.length > 0) {
        slots.mainHand = {
            name : attacks[0].name
          , desc : `피해: ${attacks[0].damage} (${attacks[0].damageType || ''})`
          , icon : '⚔️'
          , dice : parseDiceFromDamage(attacks[0].damage)
        };
    }

    items.forEach(item => {
        const name = (item.name || '').toLowerCase();
        if (name.includes('shield')) {
            slots.offHand = { name : item.name, desc : '방패 (+2 AC)', icon : '🛡️' };
        } else if (name.includes('mail') || name.includes('armor') || name.includes('robe')) {
            slots.armor = { name : item.name, desc : '갑옷 착용 중', icon : '👘' };
        } else if (name.includes('amulet') || name.includes('symbol')) {
            slots.neck = { name : item.name, desc : '성물 / 목걸이', icon : '📿' };
        }
    });

    return slots;
}

// 표준 5e 기술 -> 능력치 매핑 (기술별 수정치를 직접 안 주는 서술형 스키마에서
// 이 매핑 + 숙련 보너스로 계산해서 채워 넣는다)
const SKILL_ABILITY_MAP = {
    'acrobatics' : 'dexterity'
  , 'animal handling' : 'wisdom'
  , 'arcana' : 'intelligence'
  , 'athletics' : 'strength'
  , 'deception' : 'charisma'
  , 'history' : 'intelligence'
  , 'insight' : 'wisdom'
  , 'intimidation' : 'charisma'
  , 'investigation' : 'intelligence'
  , 'medicine' : 'wisdom'
  , 'nature' : 'intelligence'
  , 'perception' : 'wisdom'
  , 'performance' : 'charisma'
  , 'persuasion' : 'charisma'
  , 'religion' : 'intelligence'
  , 'sleight of hand' : 'dexterity'
  , 'stealth' : 'dexterity'
  , 'survival' : 'wisdom'
}

const ABILITY_NAME_MAP = {
    'strength' : 'strength'
  , 'dexterity' : 'dexterity'
  , 'constitution' : 'constitution'
  , 'intelligence' : 'intelligence'
  , 'wisdom' : 'wisdom'
  , 'charisma' : 'charisma'
}

// "Religion (종교)" -> "religion" 처럼 영문 키만 추출
const toSkillKey = (label = '') => label.split('(')[0].trim().toLowerCase();
const toAbilityKey = (label = '') => ABILITY_NAME_MAP[label.split('(')[0].trim().toLowerCase()];

// 능력치 6종 { score, mod, save } 형태로 통일해서 반환
// - abilityScores 값 모양이 {score,mod}거나 {base,racial_bonus,final,mod}거나 상관없이 처리
// - 내성굴림 숙련 여부는 (a) savingThrowsRaw 객체의 개별 {mod,proficient} 형태 또는
//   (b) savingThrowNamesList 같은 능력치 영문명 배열, 둘 중 있는 쪽으로 판단
const buildStats = (abilityScores = {}, savingThrowsRaw, savingThrowNamesList = []) => {
    const proficientFromList = new Set(savingThrowNamesList.map(toAbilityKey).filter(Boolean));
    const keys = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const build = (key) => {
        const entry = abilityScores?.[key] || {};
        const score = entry.score ?? entry.final ?? entry.base ?? 10;
        const mod = entry.mod ?? 0;
        let save = proficientFromList.has(key);
        const stEntry = savingThrowsRaw?.[key];
        if (stEntry && typeof stEntry === 'object' && 'proficient' in stEntry) {
            save = !!stEntry.proficient;
        }
        return { score, mod, save };
    };
    return keys.reduce((acc, k) => { acc[k] = build(k); return acc; }, {});
}

// 숙련 기술 목록을 { name, mod }[] 형태로 통일 - 아래 모양들을 순서대로 시도
//  A) skills_summary.total_proficient_skills (문자열 배열, 능력치 매핑으로 보정치 역산)
//  B) skills.proficient (수정치가 이미 붙은 "운동 (Athletics) +5" 같은 문자열 배열)
//  C) skills 자체가 { name, modifier, proficient }[] 배열
const buildSkills = (raw, abilityScores, proficiencyBonus, proficiencies, backgroundObj) => {
    if (raw.skills && Array.isArray(raw.skills.proficient)) {
        return raw.skills.proficient.map(str => {
            const m = String(str).match(/^(.*?)\s*([+-]?\d+)\s*$/);
            if (m) return { name : m[1].trim(), mod : parseInt(m[2], 10) };
            return { name : String(str).trim(), mod : 0 };
        });
    }
    if (Array.isArray(raw.skills)) {
        return raw.skills.filter(s => s.proficient).map(s => ({ name : s.name, mod : s.modifier }));
    }
    const totalSkills = raw.skills_summary?.total_proficient_skills
        || [...(proficiencies?.skills_chosen || []), ...(backgroundObj?.skill_proficiencies || [])];
    return (totalSkills || []).map(label => {
        const abilityKey = SKILL_ABILITY_MAP[toSkillKey(label)];
        const abilityMod = abilityKey ? (abilityScores?.[abilityKey]?.mod ?? 0) : 0;
        return { name : label.split('(')[0].trim(), mod : abilityMod + proficiencyBonus };
    });
}

// 장비 8슬롯 - weapon_attacks/attacksAndCantrips 류 배열과 equipment 객체(모양 제각각)를 받아 통일
const buildEquipmentSlots = (equipment = {}, weaponAttacksList = []) => {
    const slots = { head : null, neck : null, armor : null, hands : null, feet : null, trinket : null, mainHand : null, offHand : null };

    if (weaponAttacksList.length > 0) {
        const w = weaponAttacksList[0];
        slots.mainHand = {
            name : w.name
          , desc : `명중 ${w.to_hit ?? w.hit ?? '-'} / 피해 ${w.damage}`
          , icon : '⚔️'
          , dice : parseDiceFromDamage(w.damage)
        };
    } else if (equipment.class_starting_equipment?.weapon_choice) {
        slots.mainHand = { name : equipment.class_starting_equipment.weapon_choice, desc : '시작 무기 (피해 정보 없음)', icon : '⚔️' };
    }

    if (equipment.class_starting_equipment?.holy_symbol) {
        slots.neck = { name : equipment.class_starting_equipment.holy_symbol, desc : '신성한 상징', icon : '📿' };
    }

    const itemNames = Array.isArray(equipment.items)
        ? equipment.items.map(it => (typeof it === 'string' ? it : (it.name || it.item || ''))).filter(Boolean)
        : [];

    itemNames.forEach(nameStr => {
        const lower = nameStr.toLowerCase();
        if (!slots.offHand && lower.includes('shield')) {
            slots.offHand = { name : nameStr, desc : '방패 (+2 AC)', icon : '🛡️' };
        } else if (!slots.armor && (lower.includes('mail') || lower.includes('armor') || lower.includes('robe'))) {
            slots.armor = { name : nameStr, desc : '갑옷 착용 중', icon : '👘' };
        } else if (!slots.neck && (lower.includes('amulet') || lower.includes('symbol'))) {
            slots.neck = { name : nameStr, desc : '성물 / 목걸이', icon : '📿' };
        }
    });

    return slots;
}

// 소지품 텍스트 - class_starting_equipment(객체)/background_equipment_*(문자열 배열)/
// items(이름 필드가 name이든 item이든) 등 여러 모양을 모두 합쳐서 하나의 문자열로
const buildInventoryText = (equipment = {}) => {
    const parts = [];
    if (equipment.class_starting_equipment) parts.push(...Object.values(equipment.class_starting_equipment));
    if (Array.isArray(equipment.background_equipment_sage)) parts.push(...equipment.background_equipment_sage);
    if (Array.isArray(equipment.background_equipment)) parts.push(...equipment.background_equipment);
    if (Array.isArray(equipment.items)) {
        equipment.items.forEach(it => {
            if (typeof it === 'string') { parts.push(it); return; }
            const nm = it.name || it.item;
            const qty = it.quantity ?? it.qty;
            if (!nm) return;
            parts.push(qty && qty !== 1 ? `${nm} (x${qty})` : nm);
        });
    }
    return parts.join(', ');
}

// 스키마 2) 중첩 구조 (characterInfo / abilityScores / combat.hitPoints ...)
const normalizeNestedV2 = (raw) => {
    const info = raw.characterInfo || {};
    const abilities = raw.abilityScores || {};
    const combat = raw.combat || {};
    const hpInfo = combat.hitPoints || {};

    return {
        name : info.characterName || '이름 없음'
      , englishName : info.playerName ? `Player: ${info.playerName}` : ''
      , level : info.level || 1
      , class : info.class || '직업 미정'
      , background : info.background || ''
      , race : info.species || ''
      , speed : combat.speed ? `${combat.speed.walking || 30} ${combat.speed.unit || 'ft'}` : '30 ft.'
      , vision : raw.senses?.darkvision ? `암시야 ${raw.senses.darkvision}` : ''
      , hp : {
            current : hpInfo.current !== null && hpInfo.current !== undefined ? hpInfo.current : (hpInfo.max || 10)
          , max : hpInfo.max || 10
          , hitDice : combat.hitDice?.total || '1d10'
          , conMod : abilities.constitution?.modifier || 0
        }
      , stats : {
            strength : { score : abilities.strength?.score || 10, mod : abilities.strength?.modifier || 0, save : raw.savingThrows?.strength?.proficient || false }
          , dexterity : { score : abilities.dexterity?.score || 10, mod : abilities.dexterity?.modifier || 0, save : raw.savingThrows?.dexterity?.proficient || false }
          , constitution : { score : abilities.constitution?.score || 10, mod : abilities.constitution?.modifier || 0, save : raw.savingThrows?.constitution?.proficient || false }
          , intelligence : { score : abilities.intelligence?.score || 10, mod : abilities.intelligence?.modifier || 0, save : raw.savingThrows?.intelligence?.proficient || false }
          , wisdom : { score : abilities.wisdom?.score || 10, mod : abilities.wisdom?.modifier || 0, save : raw.savingThrows?.wisdom?.proficient || false }
          , charisma : { score : abilities.charisma?.score || 10, mod : abilities.charisma?.modifier || 0, save : raw.savingThrows?.charisma?.proficient || false }
        }
      , proficiencyBonus : combat.proficiencyBonus || 2
      , spellDC : combat.abilitySaveDC || '-'
      , spellAttackBonus : 0
      , spellSlots : 0
      , specialFeatures : (raw.actions?.features || []).map(f => ({
            name : f.name
          , desc : `${f.description || ''}${(f.uses || f.pool) ? ` [사용: ${f.uses || f.pool}]` : ''}`
        }))
      , cantrips : []
      , preparedSpells : []
      , skills : (raw.skills || []).filter(s => s.proficient).map(s => ({ name : s.name, mod : s.modifier }))
      , equipmentSlots : mapEquipment(raw.equipment?.items, raw.attacksAndCantrips)
      , traits : (raw.featuresAndTraits?.speciesTraits?.traits || []).map(t => ({ title : t.name, desc : t.description }))
      , languages : (raw.proficienciesAndTraining?.languages || []).join(', ')
      , inventory : (raw.equipment?.items || []).map(i => `${i.name} (x${i.quantity})`).join(', ')
      , flaw : ''
    };
}

// 스키마 3) 서술형 홈브루 구조 (character / ability_scores ...) - 하위 필드 모양이
// 시트마다 제각각이라 buildStats/buildSkills/buildEquipmentSlots 등으로 유연하게 처리
const normalizeDescriptiveSchema = (raw) => {
    const character = raw.character || {};
    const abilityScores = raw.ability_scores || {};
    const combat = raw.combat || {};
    const equipment = raw.equipment || {};
    const roleplay = raw.roleplay || {};

    // priest류 : class_features_priest 객체 안에 proficiencies/spellcasting/level_1_features가 중첩
    // gamja류  : proficiencies/spellcasting/class_features/saving_throws가 전부 최상위에 분리되어 있음
    const classFeaturesContainer = raw.class_features_priest || null;
    const proficiencies = classFeaturesContainer?.proficiencies || raw.proficiencies || {};
    const spellcasting = classFeaturesContainer?.spellcasting || raw.spellcasting || {};
    const savingThrowsRaw = (raw.saving_throws && typeof raw.saving_throws === 'object') ? raw.saving_throws : null;

    const proficiencyBonus = extractLastNumber(combat.proficiency_bonus, 2);

    // 종족/부족/종 특성 중 "Languages"는 별도 필드로 분리하고, 나머지는 특성 목록으로 (+ feat 통합)
    const raceTraits = raw.race_traits_night_elf || raw.race_traits || raw.species_traits || [];
    const subraceTraits = raw.subrace_traits_darnassus || raw.subrace_traits || [];
    const languageTrait = [...raceTraits, ...subraceTraits].find(t => /language/i.test(t.name || ''));
    const traits = [...raceTraits, ...subraceTraits]
        .filter(t => t !== languageTrait)
        .map(t => ({ title : t.name, desc : `${t.description || ''}${t.uses ? ` [사용: ${t.uses}]` : ''}` }));

    if (Array.isArray(raw.feats)) {
        raw.feats.forEach(f => traits.push({ title : f.name, desc : f.description || '' }));
    }

    const background = raw.background_sage || null;
    if (background?.feature) {
        traits.push({ title : `${background.name || '배경'} - ${background.feature.name}`, desc : background.feature.description });
    }

    // 레벨1 클래스 특성 (priest: level_1_features / gamja류: 최상위 class_features 배열)
    let specialFeatures = [];
    if (Array.isArray(classFeaturesContainer?.level_1_features)) {
        specialFeatures = classFeaturesContainer.level_1_features.map(f => ({ name : f.name, desc : f.description || '' }));
    } else if (Array.isArray(raw.class_features)) {
        specialFeatures = raw.class_features
            .filter(f => f.description) // 설명 없이 출처만 적힌 헤더성 항목은 제외
            .map(f => ({
                name : f.name
              , desc : `${f.description}${(f.pool || f.uses) ? ` [${f.pool ? '풀' : '사용'}: ${f.pool || f.uses}]` : ''}`
            }));
    }

    const cantrips = (spellcasting.cantrips_chosen || []).map(sp => ({
        name : sp.name, desc : sp.effect || '', dice : extractSpellDice(sp.effect)
    }));

    const preparedFromAlwaysFree = (spellcasting.always_prepared_free || []).map(sp => ({
        name : sp.name, desc : sp.effect || '', type : buildSpellTypeLabel(sp.level, sp.duration), dice : extractSpellDice(sp.effect)
    }));

    const preparedFromLevelList = (spellcasting.level_1_spells || []).map(sp => {
        const meta = [sp.range, sp.duration, sp.save ? `내성 ${sp.save}` : null].filter(Boolean).join(' / ');
        return {
            name : sp.name
          , desc : sp.effect ? `${sp.effect}${meta ? ` (${meta})` : ''}` : meta
          , type : `1레벨${sp.casting_time ? ` / ${sp.casting_time}` : ''}`
          , dice : extractSpellDice(sp.damage || sp.effect || '')
        };
    });

    const preparedSpells = [...preparedFromAlwaysFree, ...preparedFromLevelList];

    const skills = buildSkills(raw, abilityScores, proficiencyBonus, proficiencies, background);
    const equipmentSlots = buildEquipmentSlots(equipment, raw.weapon_attacks || []);
    const inventory = buildInventoryText(equipment);

    const maxHp = extractLastNumber(combat.max_hp_at_level_1 ?? combat.max_hp, 10);
    const currentHp = combat.current_hp !== undefined ? extractLastNumber(combat.current_hp, maxHp) : maxHp;

    return {
        name : character.name || '이름 없음'
      , englishName : character.system || (character.player_name ? `Player: ${character.player_name}` : '')
      , level : character.level || 1
      , class : character.class || '직업 미정'
      , background : character.background || ''
      , race : [character.race || character.species, character.subrace].filter(Boolean).join(' · ')
      , speed : `${extractLastNumber(combat.speed ?? combat.speed_ft, 30)} ft.`
      , vision : combat.darkvision_ft ? `암시야 ${combat.darkvision_ft}ft` : ''
      , hp : {
            current : currentHp
          , max : maxHp
          , hitDice : extractDiceNotation(combat.hit_dice)
          , conMod : abilityScores.constitution?.mod ?? 0
        }
      , stats : buildStats(abilityScores, savingThrowsRaw, proficiencies.saving_throws)
      , proficiencyBonus
      , spellDC : (spellcasting.spell_save_dc !== undefined && spellcasting.spell_save_dc !== null) ? extractLastNumber(spellcasting.spell_save_dc) : '-'
      , spellAttackBonus : extractLastNumber(spellcasting.spell_attack_modifier ?? spellcasting.spell_attack_bonus, 0)
      , spellSlots : extractLastNumber(spellcasting.spell_slots_level_1 ?? spellcasting.level_1_spell_slots, 0)
      , specialFeatures
      , cantrips
      , preparedSpells
      , skills
      , equipmentSlots
      , traits
      , languages : languageTrait?.description || ''
      , inventory
      , flaw : roleplay.flaws || ''
    };
}

// 안전한 기본값 (스키마 1의 평탄화 JSON에 일부 필드가 빠져 있어도 렌더러가 죽지 않도록 보강)
const FLAT_DEFAULTS = {
    specialFeatures : []
  , cantrips : []
  , preparedSpells : []
  , skills : []
  , traits : []
  , equipmentSlots : { head : null, neck : null, armor : null, hands : null, feet : null, trinket : null, mainHand : null, offHand : null }
  , spellSlots : 0
}

export const normalizeCharacterData = (raw) => {
    if (raw.name && raw.stats) return { ...FLAT_DEFAULTS, ...raw }; // 1) 기존 평탄화 구조 그대로 사용
    if (raw.character && raw.ability_scores) return normalizeDescriptiveSchema(raw); // 3) 서술형 홈브루 구조
    return normalizeNestedV2(raw); // 2) 중첩 구조 v2 (기본 폴백)
}