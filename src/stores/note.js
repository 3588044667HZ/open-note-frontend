import { defineStore } from 'pinia'
import * as api from '../api'
import { ref, computed } from 'vue'

export const useNoteStore = defineStore('note', () => {
  const notebooks = ref([])
  const notes = ref([])
  const trashNotes = ref([])
  const currentNotebookId = ref(null)
  const currentNote = ref(null)
  const loading = ref(false)
  const searchKeyword = ref('')
  const filterColor = ref(null)
  const sortBy = ref('updatedAt')
  const selectedNotes = ref(new Set())

  const filteredNotes = computed(() => {
    let result = notes.value
    if (currentNotebookId.value) {
      result = result.filter(n => n.notebookId === currentNotebookId.value)
    }
    if (searchKeyword.value) {
      const kw = searchKeyword.value.toLowerCase()
      result = result.filter(n =>
        n.title.toLowerCase().includes(kw) ||
        n.content.toLowerCase().includes(kw)
      )
    }
    if (filterColor.value) {
      result = result.filter(n => n.color === filterColor.value)
    }
    const sorted = [...result].sort((a, b) => {
      const va = a[sortBy.value] || ''
      const vb = b[sortBy.value] || ''
      return vb.localeCompare(va)
    })
    const pinned = sorted.filter(n => n.isPinned)
    const unpinned = sorted.filter(n => !n.isPinned)
    return [...pinned, ...unpinned]
  })

  const pinnedNotes = computed(() => [])
  const unpinnedNotes = computed(() => [])

  async function fetchNotebooks() {
    const res = await api.getNotebooks()
    notebooks.value = res.data
  }

  async function fetchNotes() {
    loading.value = true
    try {
      const res = await api.getNotes({ sortBy: sortBy.value, size: 100 })
      notes.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function fetchTrashNotes() {
    const res = await api.getTrashNotes()
    trashNotes.value = res.data
  }

  async function addNote(data) {
    const res = await api.createNote(data)
    notes.value.unshift(res.data)
    return res.data
  }

  async function editNote(id, data, ifMatch) {
    const res = await api.updateNote(id, data, ifMatch)
    const idx = notes.value.findIndex(n => n.id === id)
    if (idx !== -1) notes.value[idx] = res.data
    return res.data
  }

  async function removeNote(id) {
    await api.deleteNote(id)
    notes.value = notes.value.filter(n => n.id !== id)
  }

  async function togglePin(id) {
    const res = await api.pinNote(id)
    const idx = notes.value.findIndex(n => n.id === id)
    if (idx !== -1) notes.value[idx] = res.data
  }

  async function addNotebook(data) {
    const res = await api.createNotebook(data)
    notebooks.value.push(res.data)
    return res.data
  }

  async function editNotebook(id, data) {
    const res = await api.updateNotebook(id, data)
    const idx = notebooks.value.findIndex(nb => nb.id === id)
    if (idx !== -1) notebooks.value[idx] = res.data
  }

  async function removeNotebook(id) {
    await api.deleteNotebook(id)
    notebooks.value = notebooks.value.filter(nb => nb.id !== id)
  }

  async function recoverNoteFromTrash(id) {
    const res = await api.recoverNote(id)
    trashNotes.value = trashNotes.value.filter(n => n.id !== id)
    notes.value.unshift(res.data)
  }

  async function permanentlyDelete(id) {
    await api.permanentlyDeleteNote(id)
    trashNotes.value = trashNotes.value.filter(n => n.id !== id)
  }

  function selectNote(id) {
    const s = new Set(selectedNotes.value)
    if (s.has(id)) s.delete(id); else s.add(id)
    selectedNotes.value = s
  }

  function clearSelection() {
    selectedNotes.value = new Set()
  }

  return {
    notebooks, notes, trashNotes, currentNotebookId, currentNote,
    loading, searchKeyword, filterColor, sortBy, selectedNotes,
    filteredNotes, pinnedNotes, unpinnedNotes,
    fetchNotebooks, fetchNotes, fetchTrashNotes,
    addNote, editNote, removeNote, togglePin,
    addNotebook, editNotebook, removeNotebook,
    recoverNoteFromTrash, permanentlyDelete,
    selectNote, clearSelection,
  }
})
