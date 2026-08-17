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
    return refreshPromise
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

export function getShareSettingsAPI() {
  return api.get('/settings/share')
}

export function updateShareSettingsAPI(data) {
  return api.put('/settings/share', data)
}

export function uploadFile(file, noteId) {
  const formData = new FormData()
  formData.append('file', file)
  if (noteId) formData.append('noteId', noteId)
  return api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}

// ---- 两阶段上传（ATTACHMENT_TWO_PHASE_UPLOAD_SPEC）----

// 4.1 注册附件位置（attachId 客户端 UUID，幂等键）
export function registerAttachment(data) {
  return api.post('/attachments', data)
}

// 4.2 凭回执补传文件内容（二进制流，幂等可覆盖）
export function uploadAttachmentFile(attachId, file, onProgress) {
  return api.put(`/attachments/${attachId}/file`, file, {
    headers: { 'Content-Type': 'application/octet-stream' },
    timeout: 60000,
    onUploadProgress: onProgress,
  })
}

// 压缩图下载地址：content 一律写这个（相对路径，浏览器/客户端各自补 host）
export function getAttachmentThumbUrl(attachId) {
  return `/api/attachments/${attachId}/download?size=thumb`
}

// 原图下载地址：仅"查看原图"按需请求，不写入 content
export function getAttachmentOriginalUrl(attachId) {
  return `/api/attachments/${attachId}/download`
}

// 带鉴权 + 进度的原图下载（fetch 直连，可读 X-Attachment-State 响应头）
// onProgress: (loaded, total) => void；返回 { blob, state }
export async function downloadAttachmentWithProgress(url, onProgress) {
  const token = localStorage.getItem('token')
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`download failed: ${res.status}`)
  const total = Number(res.headers.get('Content-Length') || 0)
  const state = res.headers.get('X-Attachment-State') || 'ready'
  if (!res.body) {
    const blob = await res.blob()
    onProgress?.(blob.size, total || blob.size)
    return { blob, state }
  }
  const reader = res.body.getReader()
  const chunks = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onProgress?.(loaded, total)
  }
  return { blob: new Blob(chunks, { type: res.headers.get('Content-Type') || 'image/webp' }), state }
}

export function getAttachmentDownloadUrl(attachId) {
  return `/api/attachments/${attachId}/download`
}

export function getNoteAttachments(noteId) {
  return api.get(`/notes/${noteId}/attachments`)
}

export function deleteAttachment(attachId) {
  return api.delete(`/attachments/${attachId}`)
}

export function updateAttachment(attachId, data) {
  return api.put(`/attachments/${attachId}`, data)
}
