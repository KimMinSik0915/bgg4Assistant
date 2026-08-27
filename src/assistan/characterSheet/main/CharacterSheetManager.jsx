import { Component } from "react";
import withNavigate from "../../utils/withNavigate";
import { normalizeCharacterData } from "../util/normalizeCharacterData";
import { THEME_KEYS, themeToCssVars } from "../resource/dataSet/themes";
import SheetLoader from "../component/SheetLoader";
import CharacterHeaderCard from "../component/CharacterHeaderCard";
import HpCard from "../component/HpCard";
import AbilitiesCard from "../component/AbilitiesCard";
import SpellsAndFeaturesCard from "../component/SpellsAndFeaturesCard";
import SkillsCard from "../component/SkillsCard";
import EquipmentCard from "../component/EquipmentCard";
import TraitsAndInventoryCard from "../component/TraitsAndInventoryCard";
import DicePanel from "../component/DicePanel";
import "../resource/CSS/characterSheet.css";

/**
 * @Author : 김민식
 * CharacterSheetManager : D&D 5e 동적 캐릭터 시트
 *  - 최신 HTML/CSS 프로토타입(주문 슬롯/캔트립/준비된 주문 포함)의 렌더링 구조를 이식
 *  - 파일 업로드 및 주사위 굴림 로직은 기존 React 구현을 그대로 유지
 *  - 색상은 클래식(원본 다크 테마) / 앱(React 소스 라이트 테마) 두 가지로 전환 가능
 */
class CharacterSheetManager extends Component {

    state = {
        rawInput : ''
      , charData : null
      , themeKey : THEME_KEYS.CLASSIC
      , inspiration : false
      , usedFeatures : {}
      , usedSpellSlots : {}
      , selectedSides : 20
      , diceValue : 20
      , isRolling : false
      , resultText : '파일을 업로드하여 시작하세요!'
      , hitEffectKey : 0
    }

    constructor(props) {
        super(props);
    }

    rollTimer = null;

    componentWillUnmount() {
        if (this.rollTimer) clearInterval(this.rollTimer);
    }

    handler = {
        changeRawInput : (value) => {
            this.setState({ rawInput : value });
        }
      , changeTheme : (themeKey) => {
            this.setState({ themeKey });
        }
      , renderFromInput : () => {
            try {
                const parsed = JSON.parse(this.state.rawInput);
                this.applyCharData(parsed);
            } catch (e) {
                alert('데이터 파싱 오류: 올바른 JSON/TXT 형식인지 확인해주세요.');
            }
        }
      , uploadFile : (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result.trim();
                try {
                    const parsed = JSON.parse(content);
                    this.setState({ rawInput : JSON.stringify(parsed, null, 2) });
                    this.applyCharData(parsed);
                } catch (err) {
                    // "playerName": 겨울향눈꽃" 같은 오타 자동 교정 로직
                    try {
                        const fixedContent = content.replace(/("playerName"\s*:\s*)([^"\s,{][^,}]*)"/g, '$1"$2"');
                        const parsed = JSON.parse(fixedContent);
                        this.setState({ rawInput : JSON.stringify(parsed, null, 2) });
                        this.applyCharData(parsed);
                    } catch (e2) {
                        alert('.txt 파일 내부에 올바른 JSON 구문 구조가 없습니다.');
                    }
                }
            };
            reader.readAsText(file, 'UTF-8');
            event.target.value = '';
        }
      , toggleInspiration : () => {
            this.setState(prev => ({ inspiration : !prev.inspiration }));
        }
      , toggleUsedFeature : (index) => {
            this.setState(prev => ({
                usedFeatures : { ...prev.usedFeatures, [index] : !prev.usedFeatures[index] }
            }));
        }
      , toggleSpellSlot : (index) => {
            this.setState(prev => ({
                usedSpellSlots : { ...prev.usedSpellSlots, [index] : !prev.usedSpellSlots[index] }
            }));
        }
      , changeHp : (amount) => {
            this.setState(prev => {
                if (!prev.charData?.hp) return null;
                const { current, max } = prev.charData.hp;
                const nextCurrent = Math.max(0, Math.min(max, current + amount));
                return {
                    charData : { ...prev.charData, hp : { ...prev.charData.hp, current : nextCurrent } }
                  , resultText : nextCurrent <= 0 ? '💀 체력이 0이 되었습니다! (의식 불명 상태)' : prev.resultText
                };
            });
        }
      , takeDamagePrompt : () => {
            const input = window.prompt('입은 피해량을 입력하세요:', '3');
            if (input !== null && !isNaN(input) && input.trim() !== '') {
                const damage = parseInt(input, 10);
                if (damage > 0) {
                    this.handler.changeHp(-damage);
                    this.setState(prev => ({
                        hitEffectKey : prev.hitEffectKey + 1
                      , resultText : `💥 ${damage}의 피해를 입었습니다!`
                    }));
                }
            }
        }
      , shortRest : () => {
            if (!this.state.charData?.hp) return;
            const dieRoll = Math.floor(Math.random() * 6) + 1;
            const conMod = this.state.charData.hp.conMod || 0;
            const healAmount = dieRoll + conMod;
            this.handler.changeHp(healAmount);
            // 원본 HTML에서 "사용함"/"주문 슬롯" 체크박스가 같은 CSS 클래스(spell-slot-label)를 공유해
            // 짧은 휴식 시 함께 초기화되던 동작을 그대로 재현
            this.setState({
                usedFeatures : {}
              , usedSpellSlots : {}
              , selectedSides : 6
              , diceValue : healAmount
              , resultText : `☕ 짧은 휴식: 1d6(${dieRoll}) + 건강(${conMod}) = ${healAmount} HP 회복!`
            });
        }
      , longRest : () => {
            this.setState(prev => {
                if (!prev.charData?.hp) return null;
                return {
                    charData : { ...prev.charData, hp : { ...prev.charData.hp, current : prev.charData.hp.max } }
                  , inspiration : false
                  , usedFeatures : {}
                  , usedSpellSlots : {}
                  , resultText : '⛺ 긴 휴식 완료: HP, 주문 슬롯 및 특성이 모두 회복되었습니다!'
                };
            });
        }
      , selectDice : (sides) => {
            this.setState({ selectedSides : sides, diceValue : sides, resultText : `d${sides} 선택됨` });
        }
      , rollDice : () => {
            this.executeRoll(`d${this.state.selectedSides} 굴림`, this.state.selectedSides, 0);
        }
      , rollCheck : (label, sides, mod) => {
            this.setState({ selectedSides : sides, diceValue : sides });
            this.executeRoll(label, sides, mod);
        }
      , rollWeaponDamage : (item) => {
            this.handler.rollCheck(`${item.name} 피해`, item.dice, 0);
        }
      , rollSpell : (name, dice) => {
            this.handler.rollCheck(name, dice || 20, 0);
        }
      , showEquipInfo : (slotName, item) => {
            this.setState({ resultText : `[${slotName}] ${item.name}: ${item.desc}` });
        }
    }

    fnc = {

    }

    applyCharData = (parsed) => {
        const charData = normalizeCharacterData(parsed);
        this.setState({
            charData
          , inspiration : false
          , usedFeatures : {}
          , usedSpellSlots : {}
          , resultText : `${charData.name || '캐릭터'} 시트 렌더링 완료!`
        });
    }

    executeRoll = (label, sides, mod) => {
        if (this.rollTimer) clearInterval(this.rollTimer);
        this.setState({ isRolling : true, resultText : '굴리는 중...' });

        let counter = 0;
        this.rollTimer = setInterval(() => {
            this.setState({ diceValue : Math.floor(Math.random() * sides) + 1 });
            counter++;
            if (counter > 10) {
                clearInterval(this.rollTimer);
                const rawRoll = Math.floor(Math.random() * sides) + 1;
                const total = rawRoll + mod;
                const modStr = mod > 0 ? ` (+${mod})` : (mod < 0 ? ` (${mod})` : '');

                let resultText;
                if (sides === 20 && rawRoll === 20) {
                    resultText = `🎉 ${label}: 20! (대성공!)`;
                } else if (sides === 20 && rawRoll === 1) {
                    resultText = `💀 ${label}: 1... (대실패!)`;
                } else {
                    resultText = `${label}: ${total} [주사위 ${rawRoll}${modStr}]`;
                }

                this.setState({ diceValue : total, isRolling : false, resultText });
            }
        }, 50);
    }

    render() {
        const { rawInput, charData, themeKey, inspiration, usedFeatures, usedSpellSlots, selectedSides, diceValue, isRolling, resultText, hitEffectKey } = this.state;
        const themeVars = themeToCssVars(themeKey);

        return (
            <div
                key={`hit-${hitEffectKey}`}
                className={`min-h-screen p-3 pb-36 bg-[var(--bg-color)] ${hitEffectKey > 0 ? 'cs-hit-effect' : ''}`}
                style={themeVars}
            >
                <div className="max-w-[600px] mx-auto flex flex-col gap-3">
                    <SheetLoader
                        rawInput={rawInput}
                        onChangeRawInput={this.handler.changeRawInput}
                        onRender={this.handler.renderFromInput}
                        onFileUpload={this.handler.uploadFile}
                        themeKey={themeKey}
                        onChangeTheme={this.handler.changeTheme}
                    />

                    {charData && (
                        <>
                            <CharacterHeaderCard
                                charData={charData}
                                inspiration={inspiration}
                                onToggleInspiration={this.handler.toggleInspiration}
                            />
                            <HpCard
                                hp={charData.hp}
                                onChangeHp={this.handler.changeHp}
                                onTakeDamage={this.handler.takeDamagePrompt}
                                onShortRest={this.handler.shortRest}
                                onLongRest={this.handler.longRest}
                            />
                            <AbilitiesCard
                                stats={charData.stats}
                                proficiencyBonus={charData.proficiencyBonus}
                                spellDC={charData.spellDC}
                                spellAttackBonus={charData.spellAttackBonus}
                                onRollCheck={this.handler.rollCheck}
                            />
                            <SpellsAndFeaturesCard
                                specialFeatures={charData.specialFeatures}
                                usedFeatures={usedFeatures}
                                onToggleUsed={this.handler.toggleUsedFeature}
                                spellSlots={charData.spellSlots}
                                usedSpellSlots={usedSpellSlots}
                                onToggleSpellSlot={this.handler.toggleSpellSlot}
                                cantrips={charData.cantrips}
                                preparedSpells={charData.preparedSpells}
                                onRollSpell={this.handler.rollSpell}
                            />
                            <SkillsCard
                                skills={charData.skills}
                                onRollCheck={this.handler.rollCheck}
                            />
                            <EquipmentCard
                                equipmentSlots={charData.equipmentSlots}
                                onRollDamage={this.handler.rollWeaponDamage}
                                onShowInfo={this.handler.showEquipInfo}
                            />
                            <TraitsAndInventoryCard
                                traits={charData.traits}
                                languages={charData.languages}
                                inventory={charData.inventory}
                                flaw={charData.flaw}
                            />
                        </>
                    )}
                </div>

                <DicePanel
                    selectedSides={selectedSides}
                    diceValue={diceValue}
                    isRolling={isRolling}
                    resultText={resultText}
                    onSelectDice={this.handler.selectDice}
                    onRoll={this.handler.rollDice}
                />
            </div>
        );
    }
}

export default withNavigate(CharacterSheetManager);
