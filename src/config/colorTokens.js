export const TEXT_COLOR_MAP = {
  color_default: 'rgba(0, 0, 0, 0.8)',
  color_gray:    'rgba(0, 0, 0, 0.26)',
  color_red:     'rgba(213, 73, 51, 1)',
  color_orange:  'rgba(225, 132, 19, 1)',
  color_yellow:  'rgba(219, 154, 0, 1)',
  color_green:   'rgba(44, 136, 72, 1)',
  color_blue:    'rgba(50, 88, 197, 1)',
}

export const HIGHLIGHT_COLOR_MAP = {
  color_yellow: 'rgba(247, 198, 0, 1)',
  color_red:    'rgba(255, 173, 190, 1)',
  color_blue:   'rgba(85, 184, 241, 1)',
  color_green:  'rgba(104, 209, 121, 1)',
}

const COLOR_TOKENS_LIGHT = {
  '--color-red':    'rgba(213, 73, 51, 1)',
  '--color-orange': 'rgba(225, 132, 19, 1)',
  '--color-yellow': 'rgba(219, 154, 0, 1)',
  '--color-green':  'rgba(44, 136, 72, 1)',
  '--color-blue':   'rgba(50, 88, 197, 1)',
  '--color-gray':   'rgba(0, 0, 0, 0.26)',
  '--highlight-yellow': 'rgba(247, 198, 0, 0.3)',
  '--highlight-red':    'rgba(255, 173, 190, 0.3)',
  '--highlight-blue':   'rgba(85, 184, 241, 0.3)',
  '--highlight-green':  'rgba(104, 209, 121, 0.3)',
}

const COLOR_TOKENS_DARK = {
  '--color-red':    'rgba(255, 173, 190, 1)',
  '--color-orange': 'rgba(255, 198, 98, 1)',
  '--color-yellow': 'rgba(255, 219, 88, 1)',
  '--color-green':  'rgba(129, 201, 149, 1)',
  '--color-blue':   'rgba(138, 180, 248, 1)',
  '--color-gray':   'rgba(255, 255, 255, 0.26)',
  '--highlight-yellow': 'rgba(247, 198, 0, 0.2)',
  '--highlight-red':    'rgba(255, 173, 190, 0.2)',
  '--highlight-blue':   'rgba(85, 184, 241, 0.2)',
  '--highlight-green':  'rgba(104, 209, 121, 0.2)',
}

export function applyColorTokens(isDark) {
  const tokens = isDark ? COLOR_TOKENS_DARK : COLOR_TOKENS_LIGHT
  const root = document.documentElement
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}
