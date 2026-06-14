import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export default function LanguageFlagSwitch({ variant = 'floating', style = {} }) {
  const { lang, setLang } = useContext(AppContext);
  const currentLang = lang === 'zh' ? 'zh' : 'en';
  const nextLang = currentLang === 'zh' ? 'en' : 'zh';
  const flag = currentLang === 'zh' ? '🇬🇧' : '🇨🇳';
  const label = currentLang === 'zh' ? 'Switch to English' : '切换为中文';

  const baseStyle = {
    width: variant === 'mobile' ? 44 : 52,
    height: variant === 'mobile' ? 38 : 52,
    borderRadius: variant === 'mobile' ? 14 : '50%',
    border: '1px solid rgba(255,255,255,0.35)',
    background: '#fff',
    color: '#22150b',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: variant === 'mobile' ? 21 : 25,
    lineHeight: 1,
    boxShadow: variant === 'floating' ? '0 16px 40px rgba(0,0,0,0.18)' : '0 10px 24px rgba(0,0,0,0.14)',
    zIndex: 1200,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ...style
  };

  if (variant === 'floating') {
    baseStyle.position = 'fixed';
    baseStyle.top = 24;
    baseStyle.right = 28;
  }

  return (
    <button
      type="button"
      data-no-public-translate
      onClick={() => setLang?.(nextLang)}
      aria-label={label}
      title={label}
      style={baseStyle}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px) scale(1.04)';
        e.currentTarget.style.boxShadow = '0 20px 46px rgba(0,0,0,0.22)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = baseStyle.boxShadow;
      }}
    >
      <span aria-hidden="true">{flag}</span>
    </button>
  );
}
