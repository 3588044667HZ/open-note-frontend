<template>
  <div class="editor-pane">
    <template v-if="!note">
      <div class="editor-empty">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <rect x="8" y="6" width="40" height="44" rx="4" stroke="rgba(0,0,0,0.08)" stroke-width="1.5"/>
          <line x1="18" y1="20" x2="38" y2="20" stroke="rgba(0,0,0,0.08)" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="18" y1="28" x2="38" y2="28" stroke="rgba(0,0,0,0.08)" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="18" y1="36" x2="28" y2="36" stroke="rgba(0,0,0,0.08)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="empty-text">Select a note or create a new one</span>
      </div>
    </template>
    <template v-else>
      <div class="color-accent" :style="{ backgroundColor: currentColorHex }"></div>
      <div class="editor-header">
        <div class="header-row-1">
          <input
              v-model="form.title"
              type="text"
              class="title-input"
              placeholder="Title"
              maxlength="100"
              @input="dirty = true"
          />
          <div class="header-btns">
            <button class="hdr-btn" @click="handleShare" :disabled="sharing" title="Share as image">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                   class="bi bi-box-arrow-up-right" viewBox="0 0 16 16">
                <path fill-rule="evenodd"
                      d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"/>
                <path fill-rule="evenodd"
                      d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"/>
              </svg>
            </button>
            <button class="hdr-btn" @click="handlePin" :title="form.isPinned ? 'Unpin' : 'Pin'">
              <svg width="15" height="15" viewBox="0 0 15 15" :fill="form.isPinned ? '#006aff' : 'none'"
                   stroke="currentColor" stroke-width="1.2">
                <path d="M9.5 2.5L12 5M3 11l2.5-5.5L1 3l3-1.5L7.5 5l5-1.5L14 5l-4 4-3.5 5.5L3 11z"
                      stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="hdr-btn" @click="handleDelete" title="Delete">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2">
                <path d="M3 4h8M5 4V3a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1" stroke-linecap="round"/>
                <rect x="3.5" y="4" width="7" height="7.5" rx="1"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="header-row-2">
          <select v-model="form.notebookId" class="meta-select" @change="dirty = true">
            <option :value="null">No notebook</option>
            <option v-for="nb in store.notebooks" :key="nb.id" :value="nb.id">{{ nb.name }}</option>
          </select>
          <div class="color-dots">
            <button
                v-for="c in colors"
                :key="c.value"
                class="cd"
                :class="{ active: form.color === c.value }"
                :style="{ backgroundColor: c.hex }"
                @click="form.color = c.value; dirty = true"
            ></button>
          </div>
          <span class="time-label">{{ timeLabel }}</span>
        </div>
      </div>
      <MdEditor
          v-model="form.content"
          placeholder="Start writing in Markdown..."
          @update:model-value="dirty = true"
      />
      <div v-if="hasConflict" class="conflict-banner">
        This note was modified on another device. Refresh the list to get the latest version.
      </div>
      <div class="editor-footer">
        <span class="char-hint" v-if="props.note">v{{ props.note.version }} · {{ form.content.length }}/10000</span>
        <span class="char-hint" v-else>{{ form.content.length }}/10000</span>
        <span v-if="dirty" class="unsaved">Unsaved</span>
      </div>
    </template>
    <div v-if="sharing" class="share-loading">
      <div class="share-loading-box">
        <div class="share-spinner"></div>
        <span>Generating image...</span>
      </div>
    </div>
    <ShareImageModal
        :blob="shareBlob"
        :filename="shareFilename"
        @close="shareBlob = null"
    />
  </div>
</template>

<script setup>
import {ref, reactive, watch, computed, onMounted, onUnmounted} from 'vue'
import {useNoteStore} from '../stores/note'
import {marked} from 'marked'
import {renderToImage, getColorsFromCSS} from '../utils/share-image-renderer'
import MdEditor from './MdEditor.vue'
import ShareImageModal from './ShareImageModal.vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const props = defineProps({
  note: {type: Object, default: null},
})
const emit = defineEmits(['updated', 'deleted'])
const store = useNoteStore()

const colors = [
  {value: 'blue', hex: '#4A90D9'},
  {value: 'green', hex: '#7EC050'},
  {value: 'yellow', hex: '#F5C842'},
  {value: 'orange', hex: '#F5A623'},
  {value: 'red', hex: '#E05050'},
  {value: 'gray', hex: '#9B9B9B'},
]

const form = reactive({
  title: '', content: '', notebookId: null, color: 'blue', isPinned: false,
})
const dirty = ref(false)
let saveTimer = null
let lastSavedVersion = null
let hasConflict = ref(false)
const sharing = ref(false)
const shareBlob = ref(null)
const shareFilename = computed(() => `${form.title || 'Untitled'}_${Date.now()}.png`)

const timeLabel = computed(() => {
  if (!props.note?.updatedAt) return ''
  return dayjs(props.note.updatedAt).format('YYYY/MM/DD HH:mm')
})

const colorHexMap = {
  blue: '#4A90D9', green: '#7EC050', yellow: '#F5C842',
  orange: '#F5A623', red: '#E05050', gray: '#9B9B9B',
}
const currentColorHex = computed(() => colorHexMap[form.color] || '#4A90D9')

watch(() => props.note, (n) => {
  form.title = n?.title || ''
  form.content = n?.content || ''
  form.notebookId = n?.notebookId || null
  form.color = n?.color || 'blue'
  form.isPinned = n?.isPinned || false
  dirty.value = false
  hasConflict.value = false
  lastSavedVersion = n?.updatedAt || null
}, {immediate: true})

watch(dirty, (val) => {
  if (val) {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(autoSave, 2000)
  }
})

async function autoSave(force = false) {
  if (!props.note) return
  if (!force && !dirty.value) return
  hasConflict.value = false
  const data = {
    title: form.title.trim(),
    content: form.content,
    notebookId: form.notebookId,
    color: form.color,
    isPinned: form.isPinned,
  }
  try {
    const updated = await store.editNote(props.note.id, data, force ? lastSavedVersion : null)
    lastSavedVersion = updated.updatedAt
    dirty.value = false
    emit('updated', updated)
  } catch (e) {
    if (e?.response?.status === 409) {
      hasConflict.value = true
      await store.fetchNotes()
      if (force) {
        const latest = store.notes.find(n => n.id === props.note.id)
        if (latest) {
          form.title = latest.title || ''
          form.content = latest.content || ''
          form.color = latest.color || 'blue'
          form.notebookId = latest.notebookId || null
          form.isPinned = latest.isPinned || false
          lastSavedVersion = latest.updatedAt
          hasConflict.value = false
        }
      }
      dirty.value = false
    }
  }
}

async function handleShare() {
  if (!props.note) return
  sharing.value = true
  try {
    const html = marked.parse(form.content || '')
    const colors = getColorsFromCSS()
    const blob = await renderToImage(form.title, html, colors, {
      width: 750, scale: 2,
      watermark: '备忘录',
      logoText: '分享来自 Open Note',
    })
    shareBlob.value = blob
  } catch (e) {
    console.error('share image failed:', e)
  } finally {
    sharing.value = false
  }
}

async function handlePin() {
  if (!props.note) return
  const updated = await store.togglePin(props.note.id)
  form.isPinned = updated.isPinned
  dirty.value = false
  emit('updated', updated)
}

async function handleDelete() {
  if (!props.note) return
  await store.removeNote(props.note.id)
  emit('deleted', props.note.id)
}

async function forceSave() {
  if (!props.note) return
  clearTimeout(saveTimer)
  await autoSave(true)
}

function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    forceSave()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--sk-content-bg, #fafafa);
  overflow: hidden;
  position: relative;
  transition: background-color 0.3s ease;
}

.color-accent {
  height: 3px;
  flex-shrink: 0;
  transition: background-color 0.3s;
}

.editor-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.empty-text {
  font-size: 15px;
  color: var(--sk-text-muted, rgba(0, 0, 0, 0.25));
  font-weight: 500;
}

.editor-header {
  padding: 16px 24px 14px;
  border-bottom: 1px solid var(--sk-border, rgba(0, 0, 0, 0.05));
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.3s ease;
}

.header-row-1 {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-input {
  flex: 1;
  font-size: var(--sk-title-font-size, 24px);
  font-weight: 650;
  line-height: 1.1;
  color: var(--sk-title, rgba(0, 0, 0, 0.9));
  background: transparent;
  padding: 0;
  border: none;
  outline: none;
  transition: color 0.3s ease;
}

.title-input::placeholder {
  color: rgba(0, 0, 0, 0.2);
}

.header-btns {
  display: flex;
  gap: 4px;
}

.hdr-btn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--sk-icon-color, rgba(0, 0, 0, 0.3));
  background: transparent;
  transition: all 0.2s ease;
}

.hdr-btn:hover {
  background: var(--sk-hover-bg, rgba(0, 0, 0, 0.06));
  color: var(--sk-icon-hover, rgba(0, 0, 0, 0.6));
}

.hdr-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.header-row-2 {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-select {
  height: 26px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 5px;
  padding: 0 6px;
  font-size: 12px;
  background: var(--sk-card-bg, #fff);
  color: var(--sk-text, rgba(0, 0, 0, 0.55));
  outline: none;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.color-dots {
  display: flex;
  gap: 5px;
}

.cd {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: all 0.15s;
  cursor: pointer;
}

.cd:hover {
  transform: scale(1.2);
}

.cd.active {
  border-color: currentColor;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 20%, transparent);
  transform: scale(1.1);
}

.time-label {
  font-size: 11px;
  color: var(--sk-time, rgba(0, 0, 0, 0.25));
  margin-left: auto;
  transition: color 0.3s ease;
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px;
  border-top: 1px solid var(--sk-border-light, rgba(0, 0, 0, 0.04));
  transition: border-color 0.3s ease;
}

.char-hint {
  font-size: 11px;
  color: var(--sk-text-muted, rgba(0, 0, 0, 0.2));
}

.conflict-banner {
  padding: 8px 20px;
  font-size: 12px;
  color: #e05050;
  background: rgba(224, 80, 80, 0.06);
  border-top: 1px solid rgba(224, 80, 80, 0.15);
  border-bottom: 1px solid rgba(224, 80, 80, 0.15);
}

.unsaved {
  font-size: 11px;
  color: #F5A623;
  font-weight: 500;
}

.share-loading {
  position: fixed;
  inset: 0;
  z-index: 1999;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-loading-box {
  background: var(--sk-popup-bg, #fff);
  border-radius: 12px;
  padding: 24px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--sk-text-secondary, rgba(0, 0, 0, 0.6));
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.share-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--sk-border, #eee);
  border-top-color: var(--sk-accent, #333);
  border-radius: 50%;
  animation: share-spin 0.8s linear infinite;
}

@keyframes share-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
