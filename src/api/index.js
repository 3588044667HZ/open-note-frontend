import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null

async function tryRefresh() {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return false
  if (refreshPromise) {
    await refreshPromise
    return true
  }
  refreshPromise = (async () => {
    try {
      const res = await axios.post('/api/auth/refresh', { refreshToken })
      localStorage.setItem('token', res.data.data.token)
      localStorage.setItem('refreshToken', res.data.data.refreshToken)
      return true
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      window.location.reload()
      return false
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retried) {
      err.config._retried = true
      const ok = await tryRefresh()
      if (ok) {
        const token = localStorage.getItem('token')
        err.config.headers.Authorization = `Bearer ${token}`
        return api(err.config)
      }
    }
    return Promise.reject(err)
  }
)

export default api

export function login(username, password) {
  return api.post('/auth/login', { username, password })
}

export function register(username, password) {
  return api.post('/auth/register', { username, password })
}

export function refreshToken(refreshToken) {
  return api.post('/auth/refresh', { refreshToken })
}

export function getMe() {
  return api.get('/auth/me')
}

export function logout() {
  return api.post('/auth/logout')
}

export function getNotebooks() {
  return api.get('/notebooks')
}

export function createNotebook(data) {
  return api.post('/notebooks', data)
}

export function updateNotebook(id, data) {
  return api.put(`/notebooks/${id}`, data)
}

export function deleteNotebook(id) {
  return api.delete(`/notebooks/${id}`)
}

export function getNotes(params) {
  return api.get('/notes', { params })
}

export function getNote(id) {
  return api.get(`/notes/${id}`)
}

export function createNote(data) {
  return api.post('/notes', data)
}

export function updateNote(id, data, ifMatch) {
  const config = {}
  if (ifMatch) {
    config.headers = { 'If-Match': ifMatch }
  }
  return api.put(`/notes/${id}`, data, config)
}

export function deleteNote(id) {
  return api.delete(`/notes/${id}`)
}

export function pinNote(id) {
  return api.put(`/notes/${id}/pin`)
}

export function getTrashNotes() {
  return api.get('/notes/trash')
}

export function recoverNote(id) {
  return api.put(`/notes/${id}/recover`)
}

export function permanentlyDeleteNote(id) {
  return api.delete(`/notes/${id}/permanent`)
}

export function syncNotes(since) {
  return api.get('/notes/sync', { params: { since } })
}
