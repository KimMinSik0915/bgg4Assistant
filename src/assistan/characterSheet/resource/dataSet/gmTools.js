/**
 * @Author : 김민식
 * gmTools : Gemini Function Calling에 등록할 "시트 조작 도구" 선언
 *  - AI GM이 대화 중 실제로 캐릭터 시트(HP, 휴식, 주사위)를 조작할 수 있도록
 *    기존 CharacterSheetManager의 handler들과 1:1로 매핑되는 함수만 노출한다.
 *  - 새 기능을 추가하려면 여기에 선언을 추가하고, CharacterSheetManager의
 *    handler.runGmTool 안에 케이스 하나만 추가하면 된다.
 */

export const gmFunctionDeclarations = [

];

export const gmTools = [{ functionDeclarations : gmFunctionDeclarations }];
