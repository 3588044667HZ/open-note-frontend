import * as api from '../api'

const STORAGE_KEY = 'share_settings'
const DEFAULTS = {
  logoText: '分享来自 Open Note',
  watermark: '备忘录',
}

function cacheLocal(settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch {}
}

export async function getShareSettings() {
  try {
    const res = await api.getShareSettingsAPI()
    const data = res.data || {}
    const settings = { ...DEFAULTS, ...data }
    cacheLocal(settings)
    return settings
  } catch {
    return getShareSettingsCached()
  }
}

export function getShareSettingsCached() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULTS }
}

export async function saveShareSettings(partial) {
  const merged = { ...getShareSettingsCached(), ...partial }
  cacheLocal(merged)
  try {
    const res = await api.updateShareSettingsAPI(partial)
    const data = res.data || {}
    const updated = { ...merged, ...data }
    cacheLocal(updated)
    return updated
  } catch {
    return merged
  }
}
