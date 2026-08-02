<template>
  <div v-if="blob" class="share-overlay" @click.self="$emit('close')">
    <div class="share-modal">
      <div class="share-header">
        <h3>Preview</h3>
        <div class="share-header-actions">
          <button class="icon-btn" @click="showSettings = !showSettings" :title="showSettings ? 'Hide settings' : 'Customize footer'">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
              <circle cx="8" cy="8" r="2.5"/>
              <path d="M8 1.5v2M8 12.5v2M2.5 8h2M11.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="icon-btn" @click="$emit('close')">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <line x1="5.5" y1="5.5" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="14.5" y1="5.5" x2="5.5" y2="14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="share-body">
        <img :src="imageUrl" alt="Preview" class="share-preview" />
      </div>
      <div v-if="showSettings" class="share-settings">
        <label class="setting-row">
          <span>Attribution</span>
          <input v-model="form.logoText" class="setting-input" placeholder="分享来自..." @input="onSettingChange" />
        </label>
        <label class="setting-row">
          <span>Watermark</span>
          <input v-model="form.watermark" class="setting-input" placeholder="备忘录" @input="onSettingChange" />
        </label>
        <p class="setting-hint">Changes apply to the next share image.</p>
      </div>
      <div class="share-footer">
        <button class="btn-download" @click="handleDownload">Download</button>
        <button class="btn-cancel" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { downloadImage } from '../utils/share-image-renderer'
import { getShareSettings, getShareSettingsCached, saveShareSettings } from '../config/shareSettings'

const props = defineProps({
  blob: { type: Object, default: null },
  filename: { type: String, default: '' },
})
defineEmits(['close'])

const showSettings = ref(false)
const form = reactive({ logoText: '', watermark: '' })

onMounted(async () => {
  const s = getShareSettingsCached()
  form.logoText = s.logoText
  form.watermark = s.watermark
  const remote = await getShareSettings()
  form.logoText = remote.logoText
  form.watermark = remote.watermark
})

async function onSettingChange() {
  await saveShareSettings({
    logoText: form.logoText,
    watermark: form.watermark,
  })
}

const imageUrl = computed(() => {
  if (!props.blob) return ''
  return URL.createObjectURL(props.blob)
})

function handleDownload() {
  if (props.blob) {
    downloadImage(props.blob, props.filename)
  }
}
</script>

<style scoped>
.share-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}

.share-modal {
  background: var(--sk-popup-bg, #fff);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--sk-border, rgba(0, 0, 0, 0.06));
}

.share-header h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--sk-title, #000);
}

.share-header-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--sk-icon-color, rgba(0, 0, 0, 0.45));
  background: transparent;
  transition: all 0.2s ease;
}
.icon-btn:hover {
  background: var(--sk-hover-bg, rgba(0, 0, 0, 0.06));
  color: var(--sk-icon-hover, rgba(0, 0, 0, 0.55));
}

.share-body {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  justify-content: center;
}

.share-preview {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.share-settings {
  padding: 12px 20px;
  border-top: 1px solid var(--sk-border, rgba(0, 0, 0, 0.06));
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.3s ease;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-row span {
  font-size: 13px;
  font-weight: 500;
  color: var(--sk-text-secondary, rgba(0, 0, 0, 0.45));
  white-space: nowrap;
  min-width: 70px;
}

.setting-input {
  flex: 1;
  height: 32px;
  border: 1px solid var(--sk-border, rgba(0, 0, 0, 0.12));
  border-radius: 6px;
  padding: 0 10px;
  font-size: 13px;
  background: var(--sk-card-bg, #fff);
  color: var(--sk-text, #000);
  outline: none;
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
.setting-input:focus {
  border-color: var(--sk-accent, #006aff);
}

.setting-hint {
  font-size: 11px;
  color: var(--sk-text-muted, rgba(0, 0, 0, 0.25));
  margin: 0;
}

.share-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--sk-border, rgba(0, 0, 0, 0.06));
}

.btn-download {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  background: var(--sk-accent, #006aff);
  color: #fff;
  transition: opacity 0.15s;
}
.btn-download:hover {
  opacity: 0.9;
}

.btn-cancel {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  background: var(--sk-input-bg, rgba(0, 0, 0, 0.06));
  color: var(--sk-text, rgba(0, 0, 0, 0.6));
}
.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.1);
}
</style>
