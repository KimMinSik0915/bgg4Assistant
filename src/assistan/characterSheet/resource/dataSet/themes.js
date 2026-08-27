/**
 * @Author : 김민식
 * themes : 캐릭터 시트 색상 테마 정의
 *  - classic : 원본 HTML/CSS 시트에서 사용하던 보라빛 다크 테마
 *  - app     : bgg4Assistant(React 소스) 전역에서 쓰는 라벤더/인디고 라이트 테마
 * 각 값은 CSS 커스텀 프로퍼티(--xxx)로 매핑되어 컴포넌트 전역에서
 * className="bg-[var(--card-bg)]" 형태로 참조된다.
 */

export const THEME_KEYS = {
    CLASSIC : 'classic'
  , APP : 'app'
}

export const themes = {
    [THEME_KEYS.CLASSIC] : {
        label : '클래식 (다크)'
      , bgColor : '#0f111a'
      , cardBg : '#1a1d2e'
      , accentColor : '#8b5cf6'
      , textMain : '#e2e8f0'
      , textMuted : '#94a3b8'
      , borderColor : '#2e344e'
      , highlight : '#ec4899'
      , clickable : '#10b981'
      , danger : '#ef4444'
      , headerFrom : '#2e1065'
      , headerTo : '#1e1b4b'
      , inputBg : '#0f111a'
      , inputText : '#a7f3d0'
      , diceBg : '#131625'
      , panelBg : '#131625'
      , hitEffectFrom : '#7f1d1d'
      , hitEffectTo : '#450a0a'
      , tagBg : '#334155'
    }
  , [THEME_KEYS.APP] : {
        label : '앱 (라이트)'
      , bgColor : '#d9d9f2'
      , cardBg : '#ffffff'
      , accentColor : '#4f46e5'
      , textMain : '#1e293b'
      , textMuted : '#64748b'
      , borderColor : '#c7d2fe'
      , highlight : '#2563eb'
      , clickable : '#16a34a'
      , danger : '#dc2626'
      , headerFrom : '#4338ca'
      , headerTo : '#2563eb'
      , inputBg : '#f1f5f9'
      , inputText : '#1e293b'
      , diceBg : '#eef2ff'
      , panelBg : '#ffffff'
      , hitEffectFrom : '#fecaca'
      , hitEffectTo : '#fca5a5'
      , tagBg : '#e2e8f0'
    }
}

export const themeToCssVars = (themeKey) => {
    const t = themes[themeKey] || themes[THEME_KEYS.CLASSIC];
    return {
        '--bg-color' : t.bgColor
      , '--card-bg' : t.cardBg
      , '--accent-color' : t.accentColor
      , '--text-main' : t.textMain
      , '--text-muted' : t.textMuted
      , '--border-color' : t.borderColor
      , '--highlight' : t.highlight
      , '--clickable' : t.clickable
      , '--danger' : t.danger
      , '--header-from' : t.headerFrom
      , '--header-to' : t.headerTo
      , '--input-bg' : t.inputBg
      , '--input-text' : t.inputText
      , '--dice-bg' : t.diceBg
      , '--panel-bg' : t.panelBg
      , '--hit-from' : t.hitEffectFrom
      , '--hit-to' : t.hitEffectTo
      , '--tag-bg' : t.tagBg
    };
}
