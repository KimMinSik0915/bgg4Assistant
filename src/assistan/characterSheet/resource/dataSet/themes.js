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
      , bgColor : '#020617'
      , cardBg : 'rgba(15, 23, 42, 0.7)'
      , accentColor : '#22d3ee'
      , textMain : '#f1f5f9'
      , textMuted : '#94a3b8'
      , borderColor : 'rgba(255, 255, 255, 0.1)'
      , highlight : '#818cf8'
      , clickable : '#34d399'
      , danger : '#fb7185'
      , headerFrom : '#0e7490'
      , headerTo : '#3730a3'
      , inputBg : 'rgba(255, 255, 255, 0.05)'
      , inputText : '#a7f3d0'
      , diceBg : '#0f172a'
      , panelBg : 'rgba(15, 23, 42, 0.7)'
      , hitEffectFrom : '#7f1d1d'
      , hitEffectTo : '#450a0a'
      , tagBg : 'rgba(255, 255, 255, 0.08)'
    }
  , [THEME_KEYS.APP] : {
        label : '라벤더 (라이트)'
      , bgColor : '#eef2ff'
      , cardBg : '#ffffff'
      , accentColor : '#4f46e5'
      , textMain : '#1e293b'
      , textMuted : '#64748b'
      , borderColor : '#dde3fb'
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
