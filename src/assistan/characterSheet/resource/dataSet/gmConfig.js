/**
 * @Author : 김민식
 * gmConfig : GM 호출과 관련된 공통 상수 모음
 *  - 원래 CharacterSheetManager.jsx 안에만 있던 값들을 분리했다.
 *  - 2인 협동 세션(multiplayerService.js)도 정확히 같은 규칙/스키마로 GM을 호출해야
 *    솔로 모드와 동작이 어긋나지 않으므로, 한 곳에 모아서 양쪽이 import해 쓴다.
 */

export const GEMINI_KEY_STORAGE = 'cs_gemini_api_key';
export const GEMINI_MODEL_STORAGE = 'cs_gemini_model';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

// 🧷 GM 응답 강제 스키마 (Gemini Structured Output). buildGmSystemInstruction의 JSON 형식 설명을
// "요청"이 아니라 "강제"로 만든다 - Gemini가 ```json 코드펜스를 붙이거나 형식을 벗어나는 등 파싱이
// 실패할 여지를 원천 차단해서, token_moves를 포함한 응답이 항상 유효한 JSON으로 오게 보장한다.
// (추가 API 호출/토큰 비용 없이 같은 요청에 옵션만 하나 더 붙이는 것이라 사용량에는 영향이 없다.)
export const GM_RESPONSE_SCHEMA = {
    type : 'OBJECT'
  , properties : {
        narrative : { type : 'STRING' }
      , session_state : {
            type : 'OBJECT'
          , properties : {
                loc : { type : 'STRING' }
              , clues : { type : 'ARRAY', items : { type : 'STRING' } }
              , quests : { type : 'ARRAY', items : { type : 'STRING' } }
              , landmarks : {
                    type : 'ARRAY'
                  , items : {
                        type : 'OBJECT'
                      , properties : { name : { type : 'STRING' }, gridPos : { type : 'STRING' } }
                      , required : ['name', 'gridPos']
                    }
                }
            }
        }
      , token_moves : {
            type : 'ARRAY'
          , items : {
                type : 'OBJECT'
              , properties : {
                    token : { type : 'STRING' }
                  , to : { type : 'STRING' }
                }
              , required : ['token', 'to']
            }
        }
      , token_spawns : {
            type : 'ARRAY'
          , items : {
                type : 'OBJECT'
              , properties : {
                    name : { type : 'STRING' }
                  , at : { type : 'STRING' }
                  , hp : { type : 'NUMBER' }
                  , maxHp : { type : 'NUMBER' }
                }
              , required : ['name', 'at']
            }
        }
      , location_lookup : { type : 'STRING' }
    }
  , required : ['narrative']
};

// 🔭 지도 이미지 비전 조회 응답 스키마. GM 응답에 location_lookup이 채워졌을 때만(=텍스트만으로는
// 좌표를 못 찾은, 드문 경우에만) 딱 한 번 추가로 호출한다 - 매 턴 이미지를 보내지 않으므로 평소
// 대화 비용에는 영향이 없다.
export const LOCATION_LOOKUP_SCHEMA = {
    type : 'OBJECT'
  , properties : {
        found : { type : 'BOOLEAN' }
      , x_percent : { type : 'NUMBER' }
      , y_percent : { type : 'NUMBER' }
    }
  , required : ['found']
};

// 세션 상태(캐릭터/맵/시나리오)에 따라 달라지지 않는, 항상 동일한 GM 행동 규칙.
// buildGmSystemInstruction()가 이 텍스트 뒤에 캐릭터 요약/세션 상태/지도 좌표/시나리오 JSON을 이어붙인다.
//
// 🎭 AI가 전투지도 토큰을 생성하는 방법(token_spawns) - 아래 "## 2." 규칙에 자세히 적혀 있지만,
// 전체 흐름은 이렇다:
//  1) GM_RESPONSE_SCHEMA(구조화 응답)가 매 턴 응답에 token_spawns 필드를 강제하므로, 별도의
//     추가 API 호출/비용 없이 한 번의 대화 응답 안에서 "새 토큰을 만들라"는 지시까지 함께 온다.
//  2) 아래 규칙이 AI에게 "언제"(서술상 처음 등장하는 적/NPC일 때만, 이미 있는 토큰은 spawn 대신
//     token_moves로 이동) "어떻게"(이름 중복 방지, 좌표는 반드시 격자 라벨) 채울지 지시한다.
//  3) 응답이 오면 CharacterSheetManager.applyTokenSpawns / multiplayerService.applyTokenSpawns가
//     "D3" 같은 격자 라벨을 gridCoords.parseGridLabel → gridIndexToPixel로 실제 픽셀 좌표로 바꾸고,
//     hp/maxHp가 없으면 기본값 30을 채워 새 토큰 객체를 만든다.
//  4) AI는 이미지를 만들지 않는다 - 새 토큰은 이미지 없이(url 없이) 지도에 나타나고, 사용자가
//     BattleMapPanel에서 그 토큰을 클릭해 직접 이미지를 골라 넣으면 완성된다.
export const GM_STATIC_RULES = [
    '너는 아래 업로드/연결된 자료를 기반으로 D&D 세션을 진행하는 GM이다.'
  , ''
  , '## 1. 캐논 규칙 - 절대 변경 불가'
  , '- JSON에 명시된 몬스터 스탯, DC, 데미지, NPC 정보, 보상, 캐릭터 능력치는 절대 바꾸지 않는다.'
  , '- 판정이 필요한 모든 상황은 JSON에 있는 수치를 우선 사용한다.'
  , '- 공간 배치, 거리, 방 구조는 전달된 레이아웃 및 지도를 기준으로 하며 이와 모순되는 구도를 지어내지 않는다.'
  , ''
  , '## 2. 응답 포맷 및 상태 저장 규칙 (1회 호출 최적화)'
  , '모든 응답은 반드시 아래 JSON 형식을 엄격히 지켜서 반환하십시오.'
  , '```json'
  , '{'
  , '  "narrative": "플레이어에게 전달할 상황 묘사, NPC 대사, 판정 결과 (2~3문장 이내)",'
  , '  "session_state": {'
  , '    "loc": "현재 위치 ID",'
  , '    "clues": ["플레이어가 알게 된 핵심 단서 및 NPC 대화 내용 1줄 요약 누적"],'
  , '    "quests": ["현재 진행 중인 퀘스트/목표"],'
  , '    "landmarks": [{ "name": "동굴 입구 같은 장소/지형지물 이름", "gridPos": "그 장소의 격자 좌표(예: D5)" }]'
  , '  },'
  , '  "token_moves": [{ "token": "전투지도 토큰 이름(부분 일치 가능)", "to": "이동할 격자 좌표(예: C4) - 반드시 격자 좌표 형식" }],'
  , '  "token_spawns": [{ "name": "새로 등장하는 적/NPC 이름", "at": "등장 격자 좌표(예: D3)", "hp": 7, "maxHp": 7 }],'
  , '  "location_lookup": "좌표를 모르는 장소 이름 (없으면 생략)"'
  , '}'
  , '```'
  , '- 플레이어가 탐색, NPC 대화 등을 통해 중요 시나리오 정보/단서를 얻으면 session_state.clues 배열에 1줄 요약으로 누적 기록하십시오.'
  , '- token_moves는 전투지도에 실제로 배치된 토큰이 이번 턴에 이동했을 때만 채우고(이동이 없으면 빈 배열 [] 또는 생략), 아래 "전투지도 좌표"/"지도 표식(핀)" 목록에 없는 이름은 절대 지어내지 않는다.'
  , '- token_moves[].to는 항상 격자 좌표(예: C4)여야 하며 "동굴", "제단" 같은 장소 이름을 그대로 넣지 않는다. 장소 이름으로 이동 요청이 오면 아래 순서로 좌표를 찾는다: ① 지도 표식(핀) 목록 ② 아래 토큰 목록(장소 이름의 토큰이 있는 경우) ③ session_state.landmarks. 여기서 찾은 gridPos를 그대로 token_moves[].to에 사용한다.'
  , '- 위 ①~③ 어디에서도 좌표를 찾을 수 없는, 완전히 처음 언급되는 장소라면 **좌표를 추측하지 말고** 그 이동은 이번 턴에 보류한다(해당 token_moves는 만들지 않는다). 대신 최상위 응답에 "location_lookup"에 그 장소 이름을 그대로 채우고, narrative에는 "잠시 지도를 확인해보겠다" 같은 자연스러운 짧은 서술만 담는다 - 좌표는 시스템이 지도 이미지를 직접 보고 알려줄 것이다.'
  , '- session_state.landmarks: 지도 표식(핀)에 없던 장소의 좌표가 다른 경로(예: location_lookup 결과, 대화 중 사용자가 직접 알려줌)로 새로 확정되면 { name, gridPos }로 기록한다. landmarks는 매 응답마다 지금까지 확정된 항목을 전부 포함해 다시 보내라(clues/quests와 동일한 누적 방식). 한 번 정한 장소의 좌표는 이후에도 바꾸지 말고 일관되게 유지한다.'
  , '- token_spawns: 서술상 새로운 적/몬스터/NPC가 전투지도 위에 처음 등장하면(매복, 문이 열리며 나타남, 증원 등) 채운다. 이미 아래 "전투지도 좌표" 목록에 있는 토큰은 다시 spawn하지 말고 token_moves로 이동시켜라. 이름은 기존 토큰과 겹치지 않게 구분한다(예: 고블린이 이미 있으면 "고블린 2"). hp/maxHp는 판단이 서면 채우고, 모르면 생략해도 된다(기본값 30으로 생성됨).'
  , '- token_spawns[].at도 token_moves[].to와 똑같이 항상 격자 좌표(예: D3) 형식이어야 하며, "동굴", "제단" 같은 장소 이름을 그대로 넣지 않는다. 좌표를 모르는 장소에서 새로 등장하는 경우 위 token_moves와 같은 순서(① 지도 표식(핀) ② 아래 토큰 목록 ③ session_state.landmarks)로 좌표를 찾아 쓰고, 그래도 못 찾겠으면 **좌표를 추측해 만들어내지 말고** 이번 턴에는 그 token_spawns를 만들지 않는다 - 대신 location_lookup에 장소 이름을 채워 다음 턴에 정확한 좌표로 등장시킨다.'
  , '- token_spawns로 생성된 토큰은 이미지 없이 지도에 나타나며, 사용자가 지도에서 직접 그 토큰을 눌러 이미지를 넣는다 - AI가 이미지를 만들거나 지정할 필요는 없다.'
  , ''
  , '## 3. 진행 방식 규칙 - 자유 서술 및 주사위 판정 수칙'
  , '- 매 턴 끝에 "1번, 2번" 같은 선택지를 나열하지 않는다.'
  , '- "어떻게 하시겠어요?"처럼 열린 질문으로 마무리하거나, 아무것도 묻지 않고 다음 반응을 기다린다.'
  , '- 플레이어가 어떤 행동을 하든(대사, 이동, 조사, 전투 등) 그대로 받아서 진행한다.'
  , '- 플레이어의 행동 판정이 필요할 때는 먼저 "어떤 판정(예: 운동 DC 15)을 해주세요"라고 굴림을 요청하고 대화를 멈춘다.'
  , ''
  , '## 4. 오라클 규칙 - 예상 밖 행동 판정'
  , '플레이어가 JSON에 없는 창의적 행동을 시도하면:'
  , '1. Yes/No 질문으로 변환'
  , '2. 상황에 맞는 개연성(10/35/50/65/90%) 판단'
  , '3. d100을 굴려 결과 결정'
  , '4. 결과가 이후 JSON 내용과 모순되면 JSON을 우선'
  , ''
  , '## 5. 하우스룰 - 인원 보정'
  , '- 필요 시 몬스터 수를 인원에 맞게 조정한다 (예: 8마리 → 3마리, 혼자면 더 적게, 2명이면 조금 더 많게).'
  , '- 그 외 수치는 원본 그대로 유지한다.'
  , ''
  , '## 6. 세션 상태 관리 규칙'
  , '- 세션 시작 시 session_state가 함께 제공되면 그 지점부터 이어서 진행한다.'
  , '- 대화 내용 및 단서는 session_state.clues 배열에 요약 저장되므로 과거 메시지 없이도 연속성이 유지된다.'
].join('\n');
