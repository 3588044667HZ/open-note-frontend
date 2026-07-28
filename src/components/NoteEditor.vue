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
            <button class="hdr-btn" @click="handlePin" :title="form.isPinned ? 'Unpin' : 'Pin'">
              <svg width="15" height="15" viewBox="0 0 15 15" :fill="form.isPinned ? '#006aff' : 'none'" stroke="currentColor" stroke-width="1.2">
                <path d="M9.5 2.5L12 5M3 11l2.5-5.5L1 3l3-1.5L7.5 5l5-1.5L14 5l-4 4-3.5 5.5L3 11z" stroke-linejoin="round"/>
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
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'
import { useNoteStore } from '../stores/note'
import MdEditor from './MdEditor.vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const props = defineProps({
  note: { type: Object, default: null },
})
const emit = defineEmits(['updated', 'deleted'])
const store = useNoteStore()

const colors = [
  { value: 'blue', hex: '#4A90D9' },
  { value: 'green', hex: '#7EC050' },
  { value: 'yellow', hex: '#F5C842' },
  { value: 'orange', hex: '#F5A623' },
  { value: 'red', hex: '#E05050' },
  { value: 'gray', hex: '#9B9B9B' },
]

const form = reactive({
  title: '', content: '', notebookId: null, color: 'blue', isPinned: false,
})
const dirty = ref(false)
let saveTimer = null
let lastSavedVersion = null
let hasConflict = ref(false)

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
}, { immediate: true })

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
    const updated = await store.editNote(props.note.id, data, lastSavedVersion)
    lastSavedVersion = updated.updatedAt
    dirty.value = false
    emit('updated', updated)
  } catch (e) {
    if (e?.response?.status === 409) {
      hasConflict.value = true
      await store.fetchNotes()
      dirty.value = false
    }
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
  background: #fafafa;
  overflow: hidden;
  position: relative;
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
  color: rgba(0, 0, 0, 0.25);
  font-weight: 500;
}

.editor-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.header-row-1 {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-input {
  flex: 1;
  font-size: 20px;
  font-weight: 700;
  color: #000;
  background: transparent;
  padding: 0;
  border: none;
  outline: none;
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
  color: rgba(0, 0, 0, 0.3);
  background: transparent;
}
.hdr-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.6);
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
  background: #fff;
  color: rgba(0, 0, 0, 0.55);
  outline: none;
  cursor: pointer;
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
  color: rgba(0, 0, 0, 0.25);
  margin-left: auto;
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.char-hint {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.2);
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
</style>
