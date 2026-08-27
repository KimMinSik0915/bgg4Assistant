/**
 * @Author : 김민식
 * normalizeCharacterData : 업로드된 JSON/TXT(중첩 구조)를 시트 렌더링용
 * 평탄화 구조로 변환한다. 원본 HTML/CSS 프로토타입의 로직을 그대로 이식하고,
 * 서로 다른 3가지 스키마를 자동 감지해서 처리한다.
 *  1) 평탄화 구조 (name + stats) - 그대로 사용 (현재 시트 렌더러가 기대하는 최종 형태)
 *  2) 중첩 구조 v2 (characterInfo / abilityScores / combat.hitPoints ...)
 *  3) 서술형 홈브루 구조 (character / ability_scores / combat.hit_dice ...)
 *     - 값이 "6 + CON mod = 6 + 2 = 8" 처럼 계산식 텍스트로 들어오는 경우가 많아
 *       마지막 숫자만 추출해서 사용한다.
 */

export const parseDiceFromDamage = (dmgStr) => {
    if (!dmgStr) return 20;
    const match = dmgStr.match(/d(\d+)/);
    return match ? parseInt(match[1], 10) : 20;
}

// "6 + CON mod = 6 + 2 = 8", "... = 35 ft.", "2 + 2 = +4" 같은
// 계산식/서술형 문자열에서 마지막에 등장하는 숫자만 뽑아낸다.
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

// 표준 5e 기술 -> 능력치 매핑 (서술형 스키마는 기술별 수정치를 직접 안 주는 경우가 많아
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

const buildStatsFromFinal = (abilityScores, savingThrowList = []) => {
    const saveKeys = savingThrowList.map(toAbilityKey).filter(Boolean);
    const build = (key) => ({
        score : abilityScores?.[key]?.final ?? abilityScores?.[key]?.base ?? 10
      , mod : abilityScores?.[key]?.mod ?? 0
      , save : saveKeys.includes(key)
    });
    return {
        strength : build('strength')
      , dexterity : build('dexterity')
      , constitution : build('constitution')
      , intelligence : build('intelligence')
      , wisdom : build('wisdom')
      , charisma : build('charisma')
    };
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
          , desc : `${f.description || ''} ${f.uses ? `[사용: ${f.uses}]` : ''}`
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

// 스키마 3) 서술형 홈브루 구조 (character / ability_scores / combat.hit_dice ...)
const normalizeDescriptiveSchema = (raw) => {
    const character = raw.character || {};
    const abilityScores = raw.ability_scores || {};
    const combat = raw.combat || {};
    const classFeatures = raw.class_features_priest || raw.class_features || {};
    const proficiencies = classFeatures.proficiencies || {};
    const spellcasting = classFeatures.spellcasting || {};
    const skillsSummary = raw.skills_summary || {};
    const equipment = raw.equipment || {};
    const roleplay = raw.roleplay || {};

    const proficiencyBonus = extractLastNumber(combat.proficiency_bonus, 2);

    // 종족/부족 특성 중 "Languages"는 별도 필드로 분리하고, 나머지는 특성 목록으로
    const raceTraits = raw.race_traits_night_elf || raw.race_traits || [];
    const subraceTraits = raw.subrace_traits_darnassus || raw.subrace_traits || [];
    const languageTrait = [...raceTraits, ...subraceTraits].find(t => /language/i.test(t.name || ''));
    const traits = [...raceTraits, ...subraceTraits]
        .filter(t => t !== languageTrait)
        .map(t => ({ title : t.name, desc : t.description }));

    const background = raw.background_sage || raw.background || null;
    if (background?.feature) {
        traits.push({ title : `${background.name || '배경'} - ${background.feature.name}`, desc : background.feature.description });
    }

    // 레벨1 클래스 특성만 "주문 & 직업 특성" 카드 상단에 노출, 캔트립/상시 준비 주문은 각각 전용 섹션으로 분리
    const specialFeatures = (classFeatures.level_1_features || []).map(f => ({ name : f.name, desc : f.description }));

    const cantrips = (spellcasting.cantrips_chosen || []).map(sp => ({
        name : sp.name
      , desc : sp.effect || ''
      , dice : extractSpellDice(sp.effect)
    }));

    const preparedSpells = (spellcasting.always_prepared_free || []).map(sp => ({
        name : sp.name
      , desc : sp.effect || ''
      , type : buildSpellTypeLabel(sp.level, sp.duration)
      , dice : extractSpellDice(sp.effect)
    }));

    const totalSkills = skillsSummary.total_proficient_skills
        || [...(proficiencies.skills_chosen || []), ...(background?.skill_proficiencies || [])];
    const skills = totalSkills.map(label => {
        const abilityKey = SKILL_ABILITY_MAP[toSkillKey(label)];
        const abilityMod = abilityKey ? (abilityScores[abilityKey]?.mod ?? 0) : 0;
        return { name : label.split('(')[0].trim(), mod : abilityMod + proficiencyBonus };
    });

    const inventoryParts = [
        ...Object.values(equipment.class_starting_equipment || {})
      , ...(equipment.background_equipment_sage || equipment.background_equipment || [])
    ];

    const equipmentSlots = { head : null, neck : null, armor : null, hands : null, feet : null, trinket : null, mainHand : null, offHand : null };
    if (equipment.class_starting_equipment?.weapon_choice) {
        equipmentSlots.mainHand = { name : equipment.class_starting_equipment.weapon_choice, desc : '시작 무기 (피해 정보 없음)', icon : '⚔️' };
    }
    if (equipment.class_starting_equipment?.holy_symbol) {
        equipmentSlots.neck = { name : equipment.class_starting_equipment.holy_symbol, desc : '신성한 상징', icon : '📿' };
    }

    return {
        name : character.name || '이름 없음'
      , englishName : character.system || ''
      , level : character.level || 1
      , class : character.class || '직업 미정'
      , background : character.background || ''
      , race : [character.race, character.subrace].filter(Boolean).join(' · ')
      , speed : `${extractLastNumber(combat.speed, 30)} ft.`
      , vision : ''
      , hp : {
            current : extractLastNumber(combat.max_hp_at_level_1, 10)
          , max : extractLastNumber(combat.max_hp_at_level_1, 10)
          , hitDice : extractDiceNotation(combat.hit_dice)
          , conMod : abilityScores.constitution?.mod ?? 0
        }
      , stats : buildStatsFromFinal(abilityScores, proficiencies.saving_throws)
      , proficiencyBonus
      , spellDC : spellcasting.spell_save_dc ? extractLastNumber(spellcasting.spell_save_dc) : '-'
      , spellAttackBonus : extractLastNumber(spellcasting.spell_attack_modifier, 0)
      , spellSlots : extractLastNumber(spellcasting.spell_slots_level_1, 0)
      , specialFeatures
      , cantrips
      , preparedSpells
      , skills
      , equipmentSlots
      , traits
      , languages : languageTrait?.description || ''
      , inventory : inventoryParts.join(', ')
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
