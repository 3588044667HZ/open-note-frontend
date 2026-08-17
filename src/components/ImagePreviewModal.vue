<template>
  <Teleport to="body">
    <div class="ipv-overlay" @click.self="close">
      <div class="ipv-stage">
        <img
          v-show="!originalBlobUrl && !originalLoading"
          :src="thumbSrc"
          class="ipv-img"
          :style="imgStyle"
          @wheel.prevent="onWheel"
          @dblclick="zoom = 1"
          :alt="fileName"
        />
        <img
          v-show="originalBlobUrl"
          :src="originalBlobUrl"
          class="ipv-img"
          :style="imgStyle"
          @wheel.prevent="onWheel"
          @dblclick="zoom = 1"
          :alt="fileName"
        />
        <div v-if="originalLoading" class="ipv-loading">
          <div class="ipv-spinner"></div>
          <div class="ipv-progress-bar">
            <div class="ipv-progress-fill" :style="{ width: progressPct + '%' }"></div>
          </div>
          <span class="ipv-progress-text">{{ progressText }}</span>
        </div>
        <div v-if="errorMsg" class="ipv-error">{{ errorMsg }}</div>
      </div>
      <div class="ipv-bar">
        <span class="ipv-name">{{ fileName || 'Image' }}</span>
        <span class="ipv-hint">Double-click to reset zoom</span>
        <div class="ipv-actions">
          <button class="ipv-btn" @click="toggleZoom" title="Zoom toggle">&#128269;</button>
          <button class="ipv-btn" @click="loadOriginal" :disabled="originalLoading" title="View original image">
            {{ originalLoading ? 'Loading...' : 'View original' }}
          </button>
          <button class="ipv-btn" @click="downloadOriginal" :disabled="!canDownload" title="Download original">&#8681;</button>
        </div>
        <button class="ipv-close" @click="close" title="Close">&times;</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue'
import { getOriginal } from '../utils/attachmentStore'
import { getAttachmentOriginalUrl, downloadAttachmentWithProgress } from '../api'

const props = defineProps({
  attachId: { type: String, default: '' },
  thumbSrc: { type: String, default: '' },
  fileName: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const zoom = ref(1)
const originalLoading = ref(false)
const originalBlobUrl = ref('')
const progress = ref(0)
const total = ref(0)
const errorMsg = ref('')

const progressPct = computed(() => (total.value > 0 ? Math.min(100, Math.round((progress.value / total.value) * 100)) : 0))
const progressText = computed(() => total.value > 0 ? `${progressPct.value}%` : '')
const canDownload = computed(() => !!originalBlobUrl.value)

const imgStyle = computed(() => ({
  transform: `scale(${zoom.value})`,
  cursor: zoom.value > 1 ? 'zoom-out' : 'zoom-in',
}))

function toggleZoom() { zoom.value = zoom.value > 1 ? 1 : 2 }
function onWheel(e) {
  zoom.value = Math.min(4, Math.max(1, zoom.value + (e.deltaY > 0 ? -0.1 : 0.1)))
}

async function loadOriginal() {
  if (originalLoading.value) return
  errorMsg.value = ''
  // 同设备优化：插入时本地已保存原图副本 → 直接读取，零网络
  if (!originalBlobUrl.value && props.attachId) {
    const local = await getOriginal(props.attachId)
    if (local) {
      originalBlobUrl.value = URL.createObjectURL(local)
      return
    }
  }
  originalLoading.value = true
  progress.value = 0
  total.value = 0
  try {
    const url = getAttachmentOriginalUrl(props.attachId)
    const { blob, state } = await downloadAttachmentWithProgress(url, (loaded, t) => {
      progress.value = loaded
      total.value = t
    })
    if (state !== 'ready') {
      errorMsg.value = state === 'pending'
        ? 'Original not uploaded yet, try again later.'
        : 'Original file no longer exists on server.'
      return
    }
    originalBlobUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    console.error('load original failed:', e)
    errorMsg.value = 'Failed to load original image.'
  } finally {
    originalLoading.value = false
  }
}

function downloadOriginal() {
  if (!originalBlobUrl.value) return
  const a = document.createElement('a')
  a.href = originalBlobUrl.value
  a.download = props.fileName || `${props.attachId || 'image'}.jpg`
  a.click()
}

function close() {
  emit('close')
}

watch(() => props.attachId, () => {
  zoom.value = 1
  progress.value = 0
  total.value = 0
  errorMsg.value = ''
  if (originalBlobUrl.value) { URL.revokeObjectURL(originalBlobUrl.value); originalBlobUrl.value = '' }
})

onUnmounted(() => {
  if (originalBlobUrl.value) URL.revokeObjectURL(originalBlobUrl.value)
})
</script>

<style scoped>
.ipv-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ipv-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  position: relative;
}

.ipv-img {
  max-width: calc(100vw - 48px);
  max-height: calc(100vh - 100px);
  object-fit: contain;
  user-select: none;
  transition: transform 0.1s ease;
  background: repeating-conic-gradient(rgba(255,255,255,0.05) 0 25%, transparent 0 50%) 50% / 20px 20px;
}

.ipv-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
}

.ipv-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ipv-spin 0.7s linear infinite;
}

.ipv-progress-bar {
  width: 220px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.15);
  overflow: hidden;
}

.ipv-progress-fill {
  height: 100%;
  background: #fff;
  border-radius: 2px;
  transition: width 0.2s ease;
}

.ipv-error {
  color: #ffb4a0;
  font-size: 13px;
  padding: 10px 16px;
  border: 1px solid rgba(255, 140, 110, 0.4);
  border-radius: 8px;
  background: rgba(255, 80, 60, 0.12);
}

.ipv-bar {
  width: 100%;
  height: 52px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 20px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
}

.ipv-name {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ipv-hint {
  flex: 1;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
}

.ipv-actions {
  display: flex;
  gap: 8px;
}

.ipv-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.ipv-btn:hover { background: rgba(255, 255, 255, 0.12); }
.ipv-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.ipv-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s ease;
}

.ipv-close:hover { background: rgba(255, 255, 255, 0.15); }

@keyframes ipv-spin {
  to { transform: rotate(360deg); }
}
</style>
