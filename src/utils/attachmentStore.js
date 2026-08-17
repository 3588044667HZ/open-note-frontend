// 附件本地存储（IndexedDB）：
// - pending-uploads：两阶段上传的待传队列（attachId → { meta, blob }），重启后恢复
// - originals：插入时保存的原图副本（attachId → blob），"查看原图"同设备零网络
// IndexedDB 不可用（隐私模式等）时降级为内存 Map，仅当前会话有效
const DB_NAME = 'open-note-attachments'
const DB_VERSION = 1
const STORE_PENDING = 'pending-uploads'
const STORE_ORIGINALS = 'originals'

let dbPromise = null
const memoryFallback = { pending: new Map(), originals: new Map() }

function openDb() {
  if (dbPromise) return dbPromise
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('indexedDB unavailable'))
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_PENDING)) db.createObjectStore(STORE_PENDING)
      if (!db.objectStoreNames.contains(STORE_ORIGINALS)) db.createObjectStore(STORE_ORIGINALS)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  dbPromise.catch(() => { dbPromise = null })
  return dbPromise
}

function storeTx(storeName, mode, fn) {
  return openDb().then(
    (db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode)
      const store = tx.objectStore(storeName)
      const req = fn(store)
      tx.oncomplete = () => resolve(req && req.result)
      tx.onerror = () => reject(tx.error)
    }),
    () => { throw new Error('idb-unavailable') }
  )
}

// ---- 待传队列 ----
export function savePendingUpload(attachId, entry) {
  return storeTx(STORE_PENDING, 'readwrite', (s) => s.put(entry, attachId))
    .catch(() => { memoryFallback.pending.set(attachId, entry) })
}

export function deletePendingUpload(attachId) {
  memoryFallback.pending.delete(attachId)
  return storeTx(STORE_PENDING, 'readwrite', (s) => s.delete(attachId)).catch(() => {})
}

export async function getAllPendingUploads() {
  try {
    const entries = await storeTx(STORE_PENDING, 'readonly', (s) => s.getAll())
    return Object.fromEntries(entries.map((e) => [e.attachId, e]))
  } catch {
    return Object.fromEntries(memoryFallback.pending)
  }
}

// ---- 原图本地副本 ----
export function saveOriginal(attachId, blob) {
  return storeTx(STORE_ORIGINALS, 'readwrite', (s) => s.put(blob, attachId))
    .catch(() => { memoryFallback.originals.set(attachId, blob) })
}

export function getOriginal(attachId) {
  return storeTx(STORE_ORIGINALS, 'readonly', (s) => s.get(attachId))
    .catch(() => memoryFallback.originals.get(attachId) || null)
}

export function deleteOriginal(attachId) {
  memoryFallback.originals.delete(attachId)
  return storeTx(STORE_ORIGINALS, 'readwrite', (s) => s.delete(attachId)).catch(() => {})
}
