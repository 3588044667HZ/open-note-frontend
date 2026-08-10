import { applyColorTokens } from './colorTokens'

const DEFAULT_TEXT_COLOR = '#E6000000'

function parseARGB(argb) {
  if (!argb || argb.length !== 9 || argb[0] !== '#') return argb
  const a = parseInt(argb.slice(1, 3), 16) / 255
  const r = parseInt(argb.slice(3, 5), 16)
  const g = parseInt(argb.slice(5, 7), 16)
  const b = parseInt(argb.slice(7, 9), 16)
  return `rgba(${r},${g},${b},${a.toFixed(2)})`
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex)
  const lr = Math.min(255, r + amount)
  const lg = Math.min(255, g + amount)
  const lb = Math.min(255, b + amount)
  return `rgb(${lr},${lg},${lb})`
}

function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex)
  const dr = Math.max(0, r - amount)
  const dg = Math.max(0, g - amount)
  const db = Math.max(0, b - amount)
  return `rgb(${dr},${dg},${db})`
}

function isLightColor(hex) {
  const { r, g, b } = hexToRgb(hex)
  const luma = 0.299 * r + 0.587 * g + 0.114 * b
  return luma > 150
}

function borderColor(bgHex) {
  return isLightColor(bgHex)
    ? `rgba(0,0,0,0.06)`
    : `rgba(255,255,255,0.08)`
}

function hoverBg(bgHex) {
  return isLightColor(bgHex)
    ? `rgba(0,0,0,0.03)`
    : `rgba(255,255,255,0.04)`
}

function inputBg(bgHex) {
  return isLightColor(bgHex)
    ? `rgba(0,0,0,0.03)`
    : `rgba(255,255,255,0.05)`
}

function accentColor(skinId, textColor) {
  if (skinId === SKIN_IDS.YELLOW) return '#B8956E'
  return '#006aff'
}

export const SKIN_IDS = {
  WHITE: 'color_skin_white',
  YELLOW: 'color_skin_yellow',
  CYAN: 'color_skin_cyan',
  BLUE: 'color_skin_blue',
  GREEN: 'color_skin_green',
  RED: 'color_skin_red',
  GREY: 'color_skin_grey',
  BLACK: 'color_skin_black',
}

export const COLOR_SKIN_LIST = [
  SKIN_IDS.WHITE,
  SKIN_IDS.YELLOW,
  SKIN_IDS.CYAN,
  SKIN_IDS.BLUE,
  SKIN_IDS.GREEN,
  SKIN_IDS.RED,
  SKIN_IDS.GREY,
]

export const SKINS = {
  [SKIN_IDS.WHITE]: {
    id: SKIN_IDS.WHITE,
    contentBackground: '#FFFFFFFF',
    backCloth: '#FAFAFA',
    textColor: DEFAULT_TEXT_COLOR,
    titleColor: DEFAULT_TEXT_COLOR,
    cardBackground: '#FFFFFF',
    timeColor: '#99000000',
    darkModeOverride: {
      contentBackground: '#000000',
      backCloth: '#2E2E2E',
      textColor: '#FFFFFF',
      titleColor: '#FFFFFF',
      cardBackground: '#1B1B1B',
      timeColor: '#8CFFFFFF',
    },
  },
  [SKIN_IDS.YELLOW]: {
    id: SKIN_IDS.YELLOW,
    contentBackground: '#FEF7E2',
    backCloth: '#EFE8D4',
    textColor: '#96826C',
    titleColor: '#96826C',
    cardBackground: '#FBF7E8',
    timeColor: '#5F4A33',
  },
  [SKIN_IDS.CYAN]: {
    id: SKIN_IDS.CYAN,
    contentBackground: '#EFF7F0',
    backCloth: '#E1E8E2',
    textColor: '#747D76',
    titleColor: '#747D76',
    cardBackground: '#EDF5EE',
    timeColor: '#515D54',
  },
  [SKIN_IDS.BLUE]: {
    id: SKIN_IDS.BLUE,
    contentBackground: '#EAF4F3',
    backCloth: '#DCE5E4',
    textColor: '#607474',
    titleColor: '#607474',
    cardBackground: '#EEF3F3',
    timeColor: '#3B5050',
  },
  [SKIN_IDS.GREEN]: {
    id: SKIN_IDS.GREEN,
    contentBackground: '#EAF3F8',
    backCloth: '#DCE4E9',
    textColor: '#5A656C',
    titleColor: '#5A656C',
    cardBackground: '#EBF2F6',
    timeColor: '#4E5960',
  },
  [SKIN_IDS.RED]: {
    id: SKIN_IDS.RED,
    contentBackground: '#F8F1E9',
    backCloth: '#E9E3DB',
    textColor: '#9F7660',
    titleColor: '#9F7660',
    cardBackground: '#F4EFEA',
    timeColor: '#795C4C',
  },
  [SKIN_IDS.GREY]: {
    id: SKIN_IDS.GREY,
    contentBackground: '#F4F4F4',
    backCloth: '#E5E5E5',
    textColor: '#5F5F5F',
    titleColor: '#5F5F5F',
    cardBackground: '#F2F2F2',
    timeColor: '#474747',
  },
  [SKIN_IDS.BLACK]: {
    id: SKIN_IDS.BLACK,
    contentBackground: '#000000',
    backCloth: '#2E2E2E',
    textColor: '#FFFFFFFF',
    titleColor: '#FFFFFFFF',
    cardBackground: '#1B1B1B',
    timeColor: '#FFFFFFFF',
  },
}

export function computeCSSVariables(skin) {
  const contentBg = skin.contentBackground
  const cloth = skin.backCloth
  const text = skin.textColor
  const title = skin.titleColor
  const cardBg = skin.cardBackground
  const timeCol = skin.timeColor

  applyColorTokens(!isLightColor(contentBg))

  return {
    '--sk-content-bg': contentBg,
    '--sk-backcloth': cloth,
    '--sk-text': parseARGB(text),
    '--sk-title': parseARGB(title),
    '--sk-card-bg': cardBg,
    '--sk-time': parseARGB(timeCol),
    '--sk-border': borderColor(contentBg),
    '--sk-border-light': isLightColor(contentBg) ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
    '--sk-input-bg': inputBg(contentBg),
    '--sk-hover-bg': hoverBg(contentBg),
    '--sk-icon-color': isLightColor(contentBg) ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.45)',
    '--sk-icon-hover': isLightColor(contentBg) ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)',
    '--sk-text-secondary': isLightColor(contentBg) ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.5)',
    '--sk-text-muted': isLightColor(contentBg) ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.3)',
    '--sk-accent': accentColor(skin.id, text),
    '--sk-blockquote-bg': isLightColor(contentBg) ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
    '--sk-code-bg': isLightColor(contentBg) ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
    '--sk-accent-bg': isLightColor(contentBg)
      ? `rgba(0,106,255,0.03)`
      : `rgba(255,255,255,0.03)`,
    '--sk-active-bg': isLightColor(contentBg)
      ? `rgba(0,106,255,0.06)`
      : `rgba(255,255,255,0.06)`,
    '--sk-toolbar-bg': isLightColor(contentBg) ? darken(contentBg, 8) : '#1C1C1E',
    '--sk-header-bg': contentBg,
    '--sk-popup-bg': cardBg,
    '--sk-scrollbar-track': isLightColor(contentBg)
      ? 'rgba(0,0,0,0.08)'
      : 'rgba(255,255,255,0.08)',
    '--sk-scrollbar-thumb': isLightColor(contentBg)
      ? 'rgba(0,0,0,0.15)'
      : 'rgba(255,255,255,0.15)',
    '--sk-link-color': isLightColor(contentBg) ? '#1A73E8' : '#8AB4F8',
    '--sk-table-border': isLightColor(contentBg) ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.4)',
    '--sk-table-header-bg': isLightColor(contentBg) ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
    '--sk-selection-bg': isLightColor(contentBg) ? '#1A73E8' : '#8AB4F8',
    '--sk-bold-weight': '750',
    '--sk-title-font-size': '24px',
    '--sk-content-font-size': '16px',
  }
}

export function isSystemDarkMode() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getEffectiveSkin(skinId, darkModeOverride = 'system') {
  let skin = SKINS[skinId] || SKINS[SKIN_IDS.WHITE]
  if (darkModeOverride === 'dark') {
    return SKINS[SKIN_IDS.BLACK]
  }
  if (darkModeOverride === 'light') {
    return SKINS[SKIN_IDS.WHITE]
  }
  if (skin.id === SKIN_IDS.WHITE && isSystemDarkMode()) {
    return SKINS[SKIN_IDS.BLACK]
  }
  return skin
}
