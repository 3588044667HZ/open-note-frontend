<template>
  <div class="left-panel">
    <div class="panel-toolbar">
      <div class="nb-select-row">
        <select v-model="store.currentNotebookId" class="nb-dropdown">
          <option :value="null">All Notes</option>
          <option v-for="nb in store.notebooks" :key="nb.id" :value="nb.id">{{ nb.name }}</option>
        </select>
        <button class="nb-add-btn" @click.stop="showAddNBPopup = true" title="New Notebook">+</button>
      </div>
      <div class="search-row">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/>
          <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        <input
          v-model="store.searchKeyword"
          type="text"
          placeholder="Search..."
          class="search-input"
        />
      </div>
      <div class="sort-row">
        <svg class="sort-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 2v8M1 4l2-2 2 2M9 10V2M11 8L9 10l-2-2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <select v-model="store.sortBy" class="sort-select">
          <option value="updatedAt">Last modified</option>
          <option value="createdAt">Created time</option>
        </select>
      </div>
      <button class="new-note-btn" @click="handleNewNote">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        New Note
      </button>
    </div>

    <div class="note-list" v-if="store.loading">
      <div class="loading">Loading...</div>
    </div>
    <div class="note-list" v-else-if="store.filteredNotes.length === 0">
      <div class="empty">No notes</div>
    </div>
    <div class="note-list" v-else>
      <div
        v-for="note in store.filteredNotes"
        :key="note.id"
        class="note-item"
        :class="{ active: currentLocalNote?.id === note.id }"
        @click="selectNote(note)"
      >
        <span class="color-bar" :style="{ backgroundColor: colorHex(note.color) }"></span>
        <div class="note-item-body">
          <div class="note-item-title">{{ note.title || 'Untitled' }}</div>
          <div class="note-item-preview">{{ stripMD(note.content)?.slice(0, 10) || '' }}</div>
        </div>
        <span v-if="note.isPinned" class="pin-icon" title="Pinned">📌</span>
      </div>
    </div>

    <div class="panel-footer">
      <button class="trash-link" @click="$emit('openTrash')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 4h8M5 4V3a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          <rect x="3.5" y="4" width="7" height="7.5" rx="1" stroke="currentColor" stroke-width="1.2"/>
        </svg>
        Recently Deleted
      </button>
      <span class="note-count">{{ store.filteredNotes.length }} notes</span>
    </div>

    <div v-if="showAddNBPopup" class="popup-mask" @click.self="showAddNBPopup = false">
      <div class="popup-box">
        <input
          v-model="newNBName"
          class="popup-input"
          placeholder="Notebook name"
          @keydown.enter="handleAddNotebook"
          ref="nbInputRef"
        />
        <div class="popup-btns">
          <button class="btn-cancel" @click="showAddNBPopup = false">Cancel</button>
          <button class="btn-ok" @click="handleAddNotebook">Create</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useNoteStore } from '../stores/note'

const emit = defineEmits(['openTrash', 'selectNote'])
const store = useNoteStore()
const currentLocalNote = ref(null)
const showAddNBPopup = ref(false)
const newNBName = ref('')
const nbInputRef = ref(null)

const colorMap = {
  blue: '#4A90D9', green: '#7EC050', yellow: '#F5C842',
  orange: '#F5A623', red: '#E05050', gray: '#9B9B9B',
}
function colorHex(c) { return colorMap[c] || '#4A90D9' }

function stripMD(content) {
  if (!content) return ''
  return content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)]\(.+?\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^- /gm, '')
    .replace(/^\d+\. /gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^---\s*$/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
}

function selectNote(note) {
  currentLocalNote.value = note
  emit('selectNote', note)
}

async function handleNewNote() {
  const note = await store.addNote({ title: '', content: '', color: 'blue' })
  currentLocalNote.value = note
  emit('selectNote', note)
}

async function handleAddNotebook() {
  if (!newNBName.value.trim()) return
  await store.addNotebook({ name: newNBName.value.trim() })
  newNBName.value = ''
  showAddNBPopup.value = false
}
</script>

<style scoped>
.left-panel {
  width: 280px;
  background: var(--sk-card-bg, #fff);
  border-right: 1px solid var(--sk-border, rgba(0, 0, 0, 0.06));
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.panel-toolbar {
  padding: 12px;
  border-bottom: 1px solid var(--sk-border, rgba(0, 0, 0, 0.06));
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.3s ease;
}

.nb-select-row {
  display: flex;
  gap: 6px;
}

.nb-dropdown {
  flex: 1;
  height: 30px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  padding: 0 8px;
  font-size: 13px;
  background: var(--sk-card-bg, #fff);
  color: var(--sk-text, #000);
  outline: none;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
}
.nb-dropdown:focus {
  border-color: var(--sk-accent, #006aff);
}

.nb-add-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  font-size: 18px;
  font-weight: 600;
  color: var(--sk-icon-color, rgba(0, 0, 0, 0.45));
  background: var(--sk-input-bg, rgba(0, 0, 0, 0.04));
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s ease, color 0.3s ease;
}
.nb-add-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: var(--sk-icon-hover, #000);
}

.search-row {
  display: flex;
  align-items: center;
  background: var(--sk-input-bg, rgba(0, 0, 0, 0.04));
  border-radius: 6px;
  padding: 5px 10px;
  gap: 6px;
  transition: background-color 0.3s ease;
}
.search-row:focus-within {
  background: rgba(0, 0, 0, 0.06);
}

.search-icon {
  flex-shrink: 0;
  color: var(--sk-icon-color, rgba(0, 0, 0, 0.35));
}

.search-input {
  flex: 1;
  background: transparent;
  font-size: 13px;
  color: var(--sk-text, #000);
  border: none;
  outline: none;
  transition: color 0.3s ease;
}
.search-input::placeholder {
  color: var(--sk-text-muted, rgba(0, 0, 0, 0.3));
}

.sort-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-icon {
  flex-shrink: 0;
  margin-left: 2px;
  color: var(--sk-icon-color, rgba(0, 0, 0, 0.35));
}

.sort-select {
  flex: 1;
  height: 24px;
  border: none;
  background: transparent;
  font-size: 11px;
  color: var(--sk-text-secondary, rgba(0, 0, 0, 0.4));
  outline: none;
  cursor: pointer;
  padding: 0;
  -webkit-appearance: none;
  appearance: none;
}

.new-note-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  background: var(--sk-accent, #006aff);
  color: #fff;
  transition: background-color 0.3s ease;
}
.new-note-btn:hover {
  background: linear-gradient(0deg, rgba(0,0,0,0.12), rgba(0,0,0,0.12)), var(--sk-accent, #006aff);
}

.note-list {
  flex: 1;
  overflow-y: auto;
}

.loading, .empty {
  padding: 40px 0;
  text-align: center;
  font-size: 13px;
  color: var(--sk-text-muted, rgba(0, 0, 0, 0.3));
}

.note-item {
  display: flex;
  align-items: stretch;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--sk-border-light, rgba(0, 0, 0, 0.04));
  transition: background 0.12s;
  gap: 10px;
}
.note-item:hover {
  background: var(--sk-hover-bg, rgba(0, 0, 0, 0.02));
}
.note-item.active {
  background: var(--sk-active-bg, rgba(0, 106, 255, 0.06));
}

.color-bar {
  width: 3px;
  border-radius: 2px;
  flex-shrink: 0;
}

.note-item-body {
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.note-item-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--sk-title, #000);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.3s ease;
}

.note-item-preview {
  font-size: 12px;
  color: var(--sk-text-muted, rgba(0, 0, 0, 0.35));
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.pin-icon {
  font-size: 11px;
  flex-shrink: 0;
  align-self: center;
}

.panel-footer {
  padding: 10px 12px;
  border-top: 1px solid var(--sk-border, rgba(0, 0, 0, 0.06));
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: border-color 0.3s ease;
}

.trash-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--sk-text-secondary, rgba(0, 0, 0, 0.4));
  background: none;
  padding: 4px 0;
}
.trash-link:hover {
  color: var(--sk-icon-hover, rgba(0, 0, 0, 0.7));
}

.note-count {
  font-size: 11px;
  color: var(--sk-text-muted, rgba(0, 0, 0, 0.25));
}

.popup-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
}

.popup-box {
  background: var(--sk-popup-bg, #fafafa);
  border-radius: 12px;
  padding: 20px;
  width: 260px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease;
}

.popup-input {
  width: 100%;
  height: 36px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  padding: 0 10px;
  font-size: 14px;
  margin-bottom: 14px;
  outline: none;
  background: var(--sk-card-bg, #fff);
  color: var(--sk-text, #000);
  transition: background-color 0.3s ease, color 0.3s ease;
}
.popup-input:focus {
  border-color: var(--sk-accent, #006aff);
}

.popup-btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.06);
  color: var(--sk-text-secondary, rgba(0, 0, 0, 0.6));
}
.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.1);
}

.btn-ok {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  background: var(--sk-accent, #006aff);
  color: #fff;
  transition: background-color 0.3s ease;
}
.btn-ok:hover {
  background: linear-gradient(0deg, rgba(0,0,0,0.12), rgba(0,0,0,0.12)), var(--sk-accent, #006aff);
}
</style>
