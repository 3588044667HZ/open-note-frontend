import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '../api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(null)
  const loading = ref(false)
  const error = ref('')

  const isLoggedIn = computed(() => !!token.value)

  async function login(username, password) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.login(username, password)
      token.value = res.data.token
      user.value = res.data.user
      localStorage.setItem('token', token.value)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      return true
    } catch (e) {
      error.value = e?.response?.data?.msg || e?.message || 'Login failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(username, password) {
    loading.value = true
    error.value = ''
    try {
      const res = await api.register(username, password)
      return true
    } catch (e) {
      error.value = e?.response?.data?.msg || e?.message || 'Register failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    try {
      const res = await api.getMe()
      user.value = res.data
    } catch {
      logout()
    }
  }

  async function logout() {
    try {
      await api.logout()
    } catch {}
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  }

  return { token, user, loading, error, isLoggedIn, login, register, fetchMe, logout }
})
