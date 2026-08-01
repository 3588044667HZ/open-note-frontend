import { defineStore } from 'pinia'
import {
  SKINS,
  SKIN_IDS,
  COLOR_SKIN_LIST,
  computeCSSVariables,
  getEffectiveSkin,
  isSystemDarkMode,
} from '../config/skins'

function applyToRoot(vars) {
  const root = document.documentElement
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

let darkModeMediaQuery = null

export const useSkinStore = defineStore('skin', {
  state: () => ({
    currentSkinId: localStorage.getItem('current_skin_id') || SKIN_IDS.WHITE,
    darkModeOverride: localStorage.getItem('dark_mode_override') || 'system',
  }),

  getters: {
    currentSkin(state) {
      return getEffectiveSkin(state.currentSkinId, state.darkModeOverride)
    },
    isDarkMode(state) {
      if (state.darkModeOverride === 'dark') return true
      if (state.darkModeOverride === 'light') return false
      return isSystemDarkMode()
    },
    isEyeProtectionMode(state) {
      return state.currentSkinId === SKIN_IDS.YELLOW
    },
    allSkins() {
      return COLOR_SKIN_LIST.map((id) => getEffectiveSkin(id)).filter(Boolean)
    },
  },

  actions: {
    selectSkin(skinId) {
      if (!SKINS[skinId]) return
      this.currentSkinId = skinId
      localStorage.setItem('current_skin_id', skinId)
      this.applyCurrentSkin()
    },

    applyEyeProtectionSkin() {
      this.selectSkin(SKIN_IDS.YELLOW)
    },

    resetToDefault() {
      this.selectSkin(SKIN_IDS.WHITE)
    },

    toggleEyeProtection() {
      if (this.isEyeProtectionMode) {
        this.resetToDefault()
      } else {
        this.applyEyeProtectionSkin()
      }
    },

    toggleDarkMode() {
      const cycle = { system: 'dark', dark: 'light', light: 'system' }
      this.darkModeOverride = cycle[this.darkModeOverride] || 'system'
      localStorage.setItem('dark_mode_override', this.darkModeOverride)
      this.applyCurrentSkin()
    },

    applyCurrentSkin() {
      const skin = this.currentSkin
      const vars = computeCSSVariables(skin)
      applyToRoot(vars)
    },

    initSkin() {
      this.applyCurrentSkin()
      if (!darkModeMediaQuery) {
        darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        darkModeMediaQuery.addEventListener('change', () => {
          if (this.darkModeOverride === 'system') {
            this.applyCurrentSkin()
          }
        })
      }
    },
  },
})
