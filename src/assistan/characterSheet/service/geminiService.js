/**
 * @Author : 김민식
 * geminiService : Google Gemini REST API(generateContent) 호출 래퍼
 *  - 참고 문서 : https://ai.google.dev/gemini-api/docs/function-calling
 *  - Google 쪽 API 스펙(특히 functionResponse의 role 값 등)은 종종 바뀌므로,
 *    401/400 에러가 발생하면 최신 문서를 다시 확인해보는 것을 권장한다.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const endpoint = (model, apiKey) => `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

/**
 * Gemini generateContent 호출 (429 Quota 제한 발생 시 자동 대기 후 재시도 지원)
 * @param {string} apiKey
 * @param {string} model      예: 'gemini-3.6-flash'
 * @param {string} systemInstruction  GM 역할/성격을 지정하는 시스템 프롬프트
 * @param {Array}  contents   [{ role: 'user'|'model'|'function', parts: [...] }, ...]
 * @param {Array}  tools      gmTools.js의 gmTools
 * @param {Function} onRetryNotice (선택) 재시도 시 UI에 대기 시간을 알릴 콜백 함수
 * @param {number} retries   최대 재시도 횟수 (기본값: 3회)
 */
export const callGemini = async (
    { apiKey, model, systemInstruction, contents },
    onRetryNotice = null,
    retries = 3
) => {
    const res = await fetch(endpoint(model, apiKey), {
        method : 'POST'
      , headers : { 'Content-Type' : 'application/json' }
      , body : JSON.stringify({
            systemInstruction : systemInstruction ? { parts : [{ text : systemInstruction }] } : undefined
          , contents
        })
    });

    const data = await res.json();

    if (!res.ok) {
        const message = data?.error?.message || `Gemini API 오류 (HTTP ${res.status})`;

        // 🛑 429 Rate Limit / Quota Exceeded 발생 시 자동 재전송 로직
        if (res.status === 429 && retries > 0) {
            // 오류 메시지에서 대기 시간(예: "Please retry in 18.434787838s") 추출
            let retrySeconds = 20; // 기본값 20초
            const match = message.match(/retry in ([0-9.]+)s/i);
            if (match && match[1]) {
                retrySeconds = Math.ceil(parseFloat(match[1])) + 1; // 안전을 위해 올림 후 1초 추가
            }

            // 재시도 상태를 UI(컴포넌트)로 전달
            if (typeof onRetryNotice === 'function') {
                onRetryNotice(retrySeconds);
            }

            // 대기 시간만큼 지연
            await new Promise(resolve => setTimeout(resolve, retrySeconds * 1000));

            // 대기 완료 후 재귀적으로 재호출 (retries 횟수 차감)
            return callGemini(
                { apiKey, model, systemInstruction, contents },
                onRetryNotice,
                retries - 1
            );
        }

        throw new Error(message);
    }

    return data;
};

// 응답 후보(candidate)의 parts를 텍스트 조각과 functionCall 조각으로 분리
export const splitResponseParts = (data) => {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.filter(p => p.text).map(p => p.text).join('\n').trim();
    const functionCalls = parts.filter(p => p.functionCall).map(p => p.functionCall);
    return { text, functionCalls, modelContent : data?.candidates?.[0]?.content };
};

export const userTextPart = (text) => ({ role : 'user', parts : [{ text }] });

// 텍스트 + 첨부파일(이미지/PDF, 0개 이상)을 함께 담은 user turn 생성
// files: { mimeType, base64 } 객체 하나 또는 배열 (base64는 'data:...;base64,' 접두어 제거된 순수 base64)
export const userContent = (text, files) => {
    const fileList = Array.isArray(files) ? files : (files ? [files] : []);
    const parts = [];
    if (text) parts.push({ text });
    fileList.forEach(f => parts.push({ inlineData : { mimeType : f.mimeType, data : f.base64 } }));
    return { role : 'user', parts };
};

// 함수 실행 결과를 다시 모델에게 돌려줄 때 사용하는 turn
export const functionResponsePart = (name, response) => ({
    role : 'function'
  , parts : [{ functionResponse : { name, response } }]
});