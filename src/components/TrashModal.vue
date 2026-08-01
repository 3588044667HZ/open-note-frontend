<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="trash-modal">
      <div class="trash-header">
        <h2>Recently Deleted</h2>
        <button class="close-btn" @click="$emit('close')">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="5.5" y1="5.5" x2="14.5" y2="14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="14.5" y1="5.5" x2="5.5" y2="14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="trash-body">
        <p class="trash-tip">Notes are kept here for 30 days before being permanently deleted.</p>
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else-if="store.trashNotes.length === 0" class="empty">
          No deleted notes
        </div>
        <div v-else class="trash-list">
          <div v-for="note in store.trashNotes" :key="note.id" class="trash-item">
            <div class="trash-item-info">
              <span class="trash-item-title">{{ note.title || 'Untitled' }}</span>
              <span class="trash-item-content">{{ note.content?.slice(0, 80) }}</span>
              <span class="trash-item-time">Deleted {{ formatTime(note.deletedAt) }}</span>
            </div>
            <div class="trash-item-actions">
              <button class="btn-recover" @click="handleRecover(note.id)">Recover</button>
              <button class="btn-delete" @click="handlePermanentDelete(note.id)">Delete forever</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useNoteStore } from '../stores/note'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const emit = defineEmits(['close'])
const store = useNoteStore()
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  await store.fetchTrashNotes()
  loading.value = false
})

function formatTime(time) {
  return dayjs(time).fromNow()
}

async function handleRecover(id) {
  await store.recoverNoteFromTrash(id)
}

async function handlePermanentDelete(id) {
  await store.permanentlyDelete(id)
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.trash-modal {
  background: var(--sk-popup-bg, #fafafa);
  border-radius: 16px;
  width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.trash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--sk-border, rgba(0, 0, 0, 0.06));
  transition: border-color 0.3s ease;
}

.trash-header h2 {
  font-size: 18px;
  font-weight: 700;
  color: var(--sk-title, #000);
  transition: color 0.3s ease;
}

.close-btn {
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
.close-btn:hover {
  background: var(--sk-hover-bg, rgba(0, 0, 0, 0.06));
}

.trash-body {
  flex: 1;
  padding: 16px 24px 24px;
  overflow-y: auto;
}

.trash-tip {
  font-size: 13px;
  color: var(--sk-text-secondary, rgba(0, 0, 0, 0.45));
  margin-bottom: 16px;
}

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: var(--sk-text-muted, rgba(0, 0, 0, 0.35));
}

.trash-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trash-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--sk-card-bg, #fff);
  border: 1px solid var(--sk-border, rgba(235, 236, 240, 0.6));
  border-radius: 10px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.trash-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  overflow: hidden;
}

.trash-item-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--sk-title, #000);
  transition: color 0.3s ease;
}

.trash-item-content {
  font-size: 12px;
  color: var(--sk-text-secondary, rgba(0, 0, 0, 0.45));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trash-item-time {
  font-size: 11px;
  color: var(--sk-text-muted, rgba(0, 0, 0, 0.25));
}

.trash-item-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 16px;
}

.btn-recover {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  background: var(--sk-active-bg, rgba(0, 106, 255, 0.1));
  color: var(--sk-accent, #006aff);
  transition: background-color 0.3s ease, color 0.3s ease;
}
.btn-recover:hover {
  background: rgba(0, 106, 255, 0.18);
}

.btn-delete {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  background: rgba(224, 80, 80, 0.1);
  color: #e05050;
}
.btn-delete:hover {
  background: rgba(224, 80, 80, 0.18);
}
</style>
