/**
 * @Author : 김민식
 * gmTools : Gemini Function Calling에 등록할 "시트 조작 도구" 선언
 *  - AI GM이 대화 중 실제로 캐릭터 시트(HP, 휴식, 주사위)를 조작할 수 있도록
 *    기존 CharacterSheetManager의 handler들과 1:1로 매핑되는 함수만 노출한다.
 *  - 새 기능을 추가하려면 여기에 선언을 추가하고, CharacterSheetManager의
 *    handler.runGmTool 안에 케이스 하나만 추가하면 된다.
 */

export const gmFunctionDeclarations = [
    {
        name : 'apply_damage'
      , description : '플레이어 캐릭터가 피해를 입었을 때 HP를 감소시킨다.'
      , parameters : {
            type : 'OBJECT'
          , properties : { amount : { type : 'NUMBER', description : '입은 피해량 (양수)' } }
          , required : ['amount']
        }
    }
  , {
        name : 'heal_hp'
      , description : '포션, 회복 주문 등으로 HP를 회복시킨다 (긴 휴식/짧은 휴식이 아닌 즉시 회복).'
      , parameters : {
            type : 'OBJECT'
          , properties : { amount : { type : 'NUMBER', description : '회복량 (양수)' } }
          , required : ['amount']
        }
    }
  , {
        name : 'short_rest'
      , description : '짧은 휴식을 진행한다. 히트다이스(1d6) + 건강 수정치만큼 HP가 자동으로 회복된다.'
      , parameters : { type : 'OBJECT', properties : {} }
    }
  , {
        name : 'long_rest'
      , description : '긴 휴식을 진행한다. HP가 최대치로 회복되고 주문 슬롯/특성 사용 여부가 초기화된다.'
      , parameters : { type : 'OBJECT', properties : {} }
    }
  , {
        name : 'roll_dice'
      , description : '판정/피해 주사위를 굴린다. 능력 판정, 내성굴림, 공격, 주문 피해 등 모든 굴림에 사용.'
      , parameters : {
            type : 'OBJECT'
          , properties : {
                label : { type : 'STRING', description : '굴림의 이름 (예: "민첩 내성", "메이스 피해")' }
              , sides : { type : 'NUMBER', description : '주사위 면 수 (4, 6, 8, 10, 12, 20 중 하나)' }
              , modifier : { type : 'NUMBER', description : '더할 수정치 (없으면 0)' }
            }
          , required : ['label', 'sides']
        }
    }
];

export const gmTools = [{ functionDeclarations : gmFunctionDeclarations }];
