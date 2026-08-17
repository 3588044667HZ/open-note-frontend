// 附件两阶段上传队列（ATTACHMENT_TWO_PHASE_UPLOAD_SPEC 七）：
// 插图即注册（POST /attachments，attachId=客户端 UUID），content 立即写压缩图 URL；
// 文件内容异步补传（PUT /attachments/:id/file），失败持久化到 IndexedDB 待重试；
// 槽位被服务端回收（404）时重新注册后重试；后端未升级（注册 404）时回退旧一步式接口。
import { ref, computed } from 'vue'
import { registerAttachment, uploadAttachmentFile, uploadFile } from '../api'
import {
  savePendingUpload, deletePendingUpload, getAllPendingUploads, saveOriginal,
} from '../utils/attachmentStore'
import { uuid } from '../utils/uuid'

const queue = ref([]) // { attachId, fileName, size, state: 'pending'|'uploading'|'failed', meta, blob }
let processing = false
let retryTimer = null
const successCallbacks = new Set() // (attachId) => void，上传完成通知（刷新图片等）
const fallbackCallbacks = new Set() // (attachId, oldUrl) => void，旧接口回退通知（替换 src）

export const pendingUploadCount = computed(() => queue.value.length)
export const isUploading = computed(() => queue.value.some((q) => q.state === 'uploading'))

// 从文件中读取图片尺寸（createImageBitmap 失败时忽略）
async function readImageSize(file) {
  try {
    const bmp = await createImageBitmap(file)
    const size = { width: bmp.width, height: bmp.height }
    bmp.close()
    return size
  } catch {
    return {}
  }
}

function markState(attachId, state) {
  const item = queue.value.find((q) => q.attachId === attachId)
  if (item) item.state = state
}

async function completeItem(attachId) {
  const item = queue.value.find((q) => q.attachId === attachId)
  if (!item) return
  queue.value = queue.value.filter((q) => q.attachId !== attachId)
  await deletePendingUpload(attachId)
  successCallbacks.forEach((cb) => cb(attachId))
}

// 后端未适配两阶段接口（注册 404）：回退旧一步式上传，成功后通知替换 content 中的 src
async function fallbackToLegacy(item) {
  try {
    const res = await uploadFile(item.blob, item.meta.noteId)
    const url = res.data?.url || `/api/attachments/${res.data?.fileId}/download`
    await completeItem(item.attachId)
    fallbackCallbacks.forEach((cb) => cb(item.attachId, url))
  } catch (e) {
    console.error('[upload] legacy fallback failed:', e)
    markState(item.attachId, 'failed')
  }
}

async function uploadOne(item) {
  markState(item.attachId, 'uploading')
  try {
    let res
    try {
      res = await registerAttachment(item.meta)
    } catch (e) {
      if (e?.response?.status === 404) {
        await fallbackToLegacy(item)
        return
      }
      throw e
    }
    if (res.data?.data?.state === 'ready') {
      await completeItem(item.attachId)
      return
    }
    try {
      await uploadAttachmentFile(item.attachId, item.blob)
    } catch (e) {
      if (e?.response?.status === 404) {
        // 槽位被服务端回收：重新注册（幂等）后重试一次
        await registerAttachment(item.meta)
        await uploadAttachmentFile(item.attachId, item.blob)
      } else {
        throw e
      }
    }
    await completeItem(item.attachId)
  } catch (e) {
    console.error('[upload] failed, will retry:', item.attachId, e?.message || e)
    markState(item.attachId, 'failed')
  }
}

export async function processUploadQueue() {
  if (processing) return
  processing = true
  try {
    // 逐个顺序处理，避免并发竞态；失败的保留在队列中，由下次调用重试
    for (const item of queue.value.filter((q) => q.state !== 'uploading')) {
      await uploadOne(item)
    }
  } finally {
    processing = false
    if (queue.value.length > 0) scheduleRetry()
  }
}

function scheduleRetry() {
  clearTimeout(retryTimer)
  retryTimer = setTimeout(() => {
    if (queue.value.length > 0) processUploadQueue()
  }, 30000)
}

// 入队一个待传附件：保存原图副本（同设备查看原图零网络）→ 持久化待传队列 → 立即尝试补传
export async function enqueueUpload({ file, noteId, fileName, size, onInsert }) {
  const attachId = uuid()
  const dims = await readImageSize(file)
  const meta = {
    attachId,
    noteId: noteId || '',
    type: 0,
    width: dims.width || 0,
    height: dims.height || 0,
    fileName: fileName || file.name,
    size: size || file.size,
    md5: '',
  }
  saveOriginal(attachId, file).catch(() => {})
  const entry = { attachId, blob: file, meta }
  queue.value.push({ attachId, fileName: meta.fileName, size: meta.size, state: 'pending', meta, blob: file })
  await savePendingUpload(attachId, entry)
  onInsert?.(attachId, meta)
  processUploadQueue()
  return attachId
}

// 应用启动/登录后：从 IndexedDB 恢复上次未传完的队列
export async function restoreUploadQueue() {
  try {
    const entries = await getAllPendingUploads()
    const items = Object.values(entries)
    if (items.length === 0) return
    queue.value = items.map((e) => ({
      attachId: e.attachId, fileName: e.meta?.fileName || '', size: e.meta?.size || 0,
      state: 'pending', meta: e.meta, blob: e.blob,
    }))
    await processUploadQueue()
  } catch (e) {
    console.error('[upload] restore queue failed:', e)
  }
}

export function onUploadSuccess(cb) { successCallbacks.add(cb) }
export function onUploadFallback(cb) { fallbackCallbacks.add(cb) }
