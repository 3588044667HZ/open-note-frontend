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
    _darkMode: isSystemDarkMode(),
  }),

  getters: {
    currentSkin(state) {
      return getEffectiveSkin(state.currentSkinId)
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

    applyCurrentSkin() {
      const skin = this.currentSkin
      const vars = computeCSSVariables(skin)
      applyToRoot(vars)
    },

    initSkin() {
      this.applyCurrentSkin()
      if (!darkModeMediaQuery) {
        darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        darkModeMediaQuery.addEventListener('change', (e) => {
          this._darkMode = e.matches
          this.applyCurrentSkin()
        })
      }
    },
  },
})
