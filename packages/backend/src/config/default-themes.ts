import type { ITheme } from 'xterm';

// 默认 xterm 主题
// (与 backend/src/config/default-themes.ts 中的定义保持一致)
export const defaultXtermTheme: ITheme = {
  background: '#111411',
  foreground: '#d8e6d2',
  cursor: '#8ff7a7',
  selectionBackground: '#21462b',
  black: '#111411',
  red: '#d96c5f',
  green: '#59d971',
  yellow: '#d8ba52',
  blue: '#4ca89f',
  magenta: '#6f8f8a',
  cyan: '#4ec9b0',
  white: '#d8e6d2',
  brightBlack: '#5d685b',
  brightRed: '#f07d6c',
  brightGreen: '#7df79b',
  brightYellow: '#ead17a',
  brightBlue: '#76d0c8',
  brightMagenta: '#92b8b2',
  brightCyan: '#7ae7d6',
  brightWhite: '#f3fff0'
};

// 默认 UI 主题 (CSS 变量)
// (与 backend/src/config/default-themes.ts 中的定义保持一致)
export const defaultUiTheme: Record<string, string> = {
  '--app-bg-color': '#ffffff',
  '--text-color': '#333333',
  '--text-color-secondary': '#666666',
  '--border-color': '#cccccc',
  '--link-color': '#8E44AD',
  '--link-hover-color': '#B180E0', 
  '--link-active-color': '#A06CD5',
  '--link-active-bg-color': '#F3EBFB', 
  '--nav-item-active-bg-color': 'var(--link-active-bg-color)',
  '--header-bg-color': '#f0f0f0',
  '--footer-bg-color': '#f0f0f0',
  '--button-bg-color': '#A06CD5', 
  '--button-text-color': '#ffffff',
  '--button-hover-bg-color': '#8E44AD', 
  '--icon-color': 'var(--text-color-secondary)',
  '--icon-hover-color': 'var(--link-hover-color)', 
  '--split-line-color': 'var(--border-color)',
  '--split-line-hover-color': 'var(--border-color)',
  '--input-focus-border-color': 'var(--link-active-color)', 
  '--input-focus-glow': 'var(--link-active-color)',
  '--overlay-bg-color': 'rgba(0, 0, 0, 0.6)',
  '--font-family-sans-serif': 'sans-serif',
  '--base-padding': '1rem',
  '--base-margin': '0.5rem',
};
