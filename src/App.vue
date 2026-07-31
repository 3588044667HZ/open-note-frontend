<template>
  <LoginPage v-if="!authStore.isLoggedIn" @logged-in="onLoggedIn" />

  <div v-else class="app-container">
    <div class="header">
      <div class="header-left">
        <div class="app-logo">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="2" width="14" height="16" rx="2" fill="currentColor" opacity="0.2"/>
            <rect x="4" y="3" width="12" height="14" rx="1" fill="currentColor"/>
            <line x1="7" y1="7" x2="13" y2="7" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="7" y1="10" x2="13" y2="10" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="7" y1="13" x2="10" y2="13" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="app-title">Open Note</span>
      </div>
      <div class="header-right">
        <button
          class="eye-protect-btn"
          :class="{ active: skinStore.isEyeProtectionMode }"
          @click="skinStore.toggleEyeProtection()"
          :title="skinStore.isEyeProtectionMode ? 'Disable eye protection' : 'Enable eye protection'"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.2"/>
            <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
            <path d="M1 8c2-3.5 4-5.5 7-5.5s5 2 7 5.5c-2 3.5-4 5.5-7 5.5s-5-2-7-5.5z" stroke="currentColor" stroke-width="1.2" fill="none"/>
          </svg>
        </button>
        <span class="user-name">{{ authStore.user?.username || 'User' }}</span>
        <button class="logout-btn" @click="handleLogout" title="Logout">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3V2.5a.5.5 0 01.5-.5h7a.5.5 0 01.5.5v11a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5V13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M1 8h7.5M5.5 5l3 3-3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="main-layout">
      <LeftPanel
        @open-trash="showTrash = true"
        @select-note="onSelectNote"
      />
      <NoteEditor
        :note="currentNote"
        @updated="onNoteUpdated"
        @deleted="onNoteDeleted"
      />
    </div>
    <TrashModal v-if="showTrash" @close="showTrash = false" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useNoteStore } from './stores/note'
import { useAuthStore } from './stores/auth'
import { useSkinStore } from './stores/skin'
import LoginPage from './components/LoginPage.vue'
import LeftPanel from './components/LeftPanel.vue'
import NoteEditor from './components/NoteEditor.vue'
import TrashModal from './components/TrashModal.vue'

const store = useNoteStore()
const authStore = useAuthStore()
const skinStore = useSkinStore()
const currentNote = ref(null)
const showTrash = ref(false)

function onSelectNote(note) {
  currentNote.value = note
}

function onNoteUpdated(updated) {
  const idx = store.filteredNotes.findIndex(n => n.id === updated.id)
  if (idx !== -1) store.filteredNotes[idx] = updated
}

function onNoteDeleted(id) {
  store.notes = store.notes.filter(n => n.id !== id)
  if (currentNote.value?.id === id) currentNote.value = null
}

async function onLoggedIn() {
  await authStore.fetchMe()
  await Promise.all([
    store.fetchNotebooks(),
    store.fetchNotes(),
  ])
}

async function handleLogout() {
  await authStore.logout()
}

onMounted(async () => {
  skinStore.initSkin()
  if (authStore.isLoggedIn) {
    await onLoggedIn()
  }
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-width: 800px;
  overflow: hidden;
}

.header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background-color: var(--sk-header-bg, #fff);
  border-bottom: 1px solid var(--sk-border, rgba(0, 0, 0, 0.06));
  flex-shrink: 0;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-logo {
  color: #006aff;
  display: flex;
}

.app-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--sk-title, #000);
  transition: color 0.3s ease;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.eye-protect-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: rgba(0, 0, 0, 0.35);
  background: transparent;
  transition: all 0.2s ease;
}
.eye-protect-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.55);
}
.eye-protect-btn.active {
  color: var(--sk-accent, #B8956E);
  background: rgba(184, 149, 110, 0.1);
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
}

.logout-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: rgba(0, 0, 0, 0.35);
  background: transparent;
}
.logout-btn:hover {
  background: rgba(224, 80, 80, 0.08);
  color: #e05050;
}

.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}
</style>
