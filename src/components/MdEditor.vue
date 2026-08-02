<template>
  <div class="md-editor">
    <div class="md-toolbar">
      <button class="tb-btn" @click="wrapText('**', '**')" title="Bold (Ctrl+B)"><b>B</b></button>
      <button class="tb-btn" @click="wrapText('*', '*')" title="Italic (Ctrl+I)"><i>I</i></button>
      <button class="tb-btn" @click="wrapText('~~', '~~')" title="Strikethrough"><s>S</s></button>
      <span class="tb-spacer"></span>
      <button class="tb-btn" @click="wrapLine('# ')" title="Heading 1">H1</button>
      <button class="tb-btn" @click="wrapLine('## ')" title="Heading 2">H2</button>
      <button class="tb-btn" @click="wrapLine('### ')" title="Heading 3">H3</button>
      <span class="tb-spacer"></span>
      <button class="tb-btn" @click="wrapLine('- ')" title="Unordered list">ul</button>
      <button class="tb-btn" @click="wrapLine('1. ')" title="Ordered list">ol</button>
      <button class="tb-btn" @click="wrapLine('> ')" title="Blockquote">"</button>
      <button class="tb-btn" @click="wrapText('`', '`')" title="Inline code">&lt;/&gt;</button>
      <button class="tb-btn" @click="wrapLine('```\n', '\n```')" title="Code block">{}</button>
      <span class="tb-spacer"></span>
      <button class="tb-btn" @click="insertLink" title="Link">🔗</button>
      <button class="tb-btn" @click="wrapLine('---\n')" title="Horizontal rule">—</button>
      <span class="tb-spacer"></span>
      <div class="mode-toggle">
        <button class="mode-btn" :class="{ active: mode === 'edit' }" @click="setMode('edit')">Edit</button>
        <button class="mode-btn" :class="{ active: mode === 'split' }" @click="setMode('split')">Both</button>
        <button class="mode-btn" :class="{ active: mode === 'preview' }" @click="setMode('preview')">Preview</button>
      </div>
    </div>
    <div class="md-body" :class="'mode-' + mode">
      <div v-show="mode !== 'preview'" class="md-edit-pane">
        <textarea
          ref="textareaRef"
          v-model="localContent"
          class="md-textarea"
          :placeholder="placeholder"
          @scroll="syncScroll"
        ></textarea>
      </div>
      <div v-show="mode !== 'edit'" class="md-preview-pane">
        <div
          class="md-preview markdown-body"
          ref="previewRef"
          v-html="renderedHTML"
          @scroll="syncScroll"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { marked } from 'marked'

marked.setOptions({
  breaks: true,
  gfm: true,
})

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Write in Markdown...' },
})

const emit = defineEmits(['update:modelValue'])

const mode = ref('edit')
const textareaRef = ref(null)
const previewRef = ref(null)

const localContent = ref(props.modelValue)

watch(() => props.modelValue, (v) => {
  if (v !== localContent.value) {
    localContent.value = v
  }
})

watch(localContent, (v, oldV) => {
  if (v !== props.modelValue) {
    emit('update:modelValue', v)
  }
  if (mode.value === 'split' && v.length > (oldV ?? '').length) {
    nextTick(() => {
      const ta = textareaRef.value
      if (ta && ta.selectionStart === v.length) {
        scrollPreviewToBottom()
      }
    })
  }
})

watch(mode, (m) => {
  if (m === 'edit' || m === 'split') {
    nextTick(() => textareaRef.value?.focus())
  }
})

const renderedHTML = computed(() => {
  try {
    return marked.parse(localContent.value || '')
  } catch {
    return ''
  }
})

let syncing = false

function scrollPreviewToBottom() {
  const pv = previewRef.value
  if (pv) {
    pv.scrollTop = pv.scrollHeight
  }
}

function syncScroll(e) {
  if (syncing) return
  syncing = true
  const src = e.target
  const isEdit = src === textareaRef.value
  const from = isEdit ? textareaRef.value : previewRef.value
  const to = isEdit ? previewRef.value : textareaRef.value
  if (!from || !to) { syncing = false; return }
  const pct = from.scrollTop / Math.max(from.scrollHeight - from.clientHeight, 1)
  to.scrollTop = pct * Math.max(to.scrollHeight - to.clientHeight, 1)
  requestAnimationFrame(() => { syncing = false })
}

function setMode(m) {
  mode.value = m
}

function getTextarea() { return textareaRef.value }
function getSelection() {
  const ta = getTextarea()
  return { el: ta, start: ta?.selectionStart ?? 0, end: ta?.selectionEnd ?? 0, value: localContent.value }
}

function commit(val, cursorStart, cursorEnd) {
  localContent.value = val
  nextTick(() => {
    const ta = getTextarea()
    if (ta) {
      ta.focus()
      ta.setSelectionRange(cursorStart ?? val.length, cursorEnd ?? val.length)
    }
    autoScrollCursor(ta)
  })
}

function wrapText(before, after) {
  const { start, end, value } = getSelection()
  const sel = value.slice(start, end)
  const nv = value.slice(0, start) + before + sel + after + value.slice(end)
  commit(nv, start + before.length, start + before.length + sel.length)
}

function wrapLine(before, after) {
  const { start, value } = getSelection()
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const sel = value.slice(lineStart, start)
  const nv = value.slice(0, lineStart) + before + sel + (after || '') + value.slice(start)
  commit(nv)
}

function insertLink() {
  const { start, end, value } = getSelection()
  const sel = value.slice(start, end)
  const txt = sel || 'link text'
  const nv = value.slice(0, start) + `[${txt}](url)` + value.slice(end)
  commit(nv, start + txt.length + 3, start + txt.length + 6)
}

function autoScrollCursor(ta) {
  if (!ta) return
  const lineH = parseFloat(getComputedStyle(ta).lineHeight) || 24
  const cursorPos = ta.selectionStart
  const textBefore = ta.value.slice(0, cursorPos)
  const lines = textBefore.split('\n')
  const currentLine = lines.length
  const cursorTop = currentLine * lineH
  const viewTop = ta.scrollTop
  const viewBottom = viewTop + ta.clientHeight
  const margin = lineH * 4
  if (cursorTop < viewTop + margin) {
    ta.scrollTop = Math.max(0, cursorTop - margin)
  } else if (cursorTop + lineH > viewBottom - margin) {
    ta.scrollTop = cursorTop - ta.clientHeight + margin + lineH
  }
}

defineExpose({
  focus() {
    nextTick(() => textareaRef.value?.focus())
  },
})
</script>

<style scoped>
.md-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.md-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  border-bottom: 1px solid var(--sk-border, rgba(0, 0, 0, 0.06));
  flex-shrink: 0;
  flex-wrap: wrap;
  background: var(--sk-toolbar-bg, #F8F9FA);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.tb-btn {
  height: 28px;
  min-width: 28px;
  padding: 0 6px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--sk-text-secondary, rgba(0, 0, 0, 0.55));
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.tb-btn:hover {
  background: var(--sk-hover-bg, rgba(0, 0, 0, 0.06));
  color: var(--sk-icon-hover, #000);
}

.tb-spacer {
  width: 1px;
  height: 18px;
  background: var(--sk-border, rgba(0, 0, 0, 0.08));
  margin: 0 4px;
  transition: background-color 0.3s ease;
}

.mode-toggle {
  display: flex;
  margin-left: auto;
  gap: 2px;
  background: var(--sk-input-bg, rgba(0, 0, 0, 0.04));
  border-radius: 6px;
  padding: 2px;
  transition: background-color 0.3s ease;
}

.mode-btn {
  height: 24px;
  padding: 0 10px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--sk-text-secondary, rgba(0, 0, 0, 0.4));
  background: transparent;
  transition: all 0.2s ease;
}
.mode-btn.active {
  background: var(--sk-card-bg, #fff);
  color: var(--sk-text, #000);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.md-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.md-body.mode-edit .md-edit-pane { flex: 1; }
.md-body.mode-edit .md-preview-pane { display: none; }

.md-body.mode-preview .md-edit-pane { display: none; }
.md-body.mode-preview .md-preview-pane { flex: 1; }

.md-body.mode-split .md-edit-pane { flex: 1; border-right: 1px solid var(--sk-border, rgba(0, 0, 0, 0.06)); }
.md-body.mode-split .md-preview-pane { flex: 1; }

.md-edit-pane {
  display: flex;
  overflow: hidden;
}

.md-textarea {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  padding: 0 24px;
  font-size: var(--sk-content-font-size, 16px);
  line-height: calc(1em + 8px);
  color: var(--sk-text, rgba(0, 0, 0, 0.85));
  font-family: 'SF Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
  background: transparent;
  tab-size: 2;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-all;
  overflow-x: hidden;
  overflow-y: auto;
  transition: color 0.3s ease;
}
.md-textarea::placeholder {
  color: rgba(0, 0, 0, 0.15);
}

.md-preview-pane {
  overflow-y: auto;
  padding: 0 24px;
}

.markdown-body {
  color: var(--sk-text, rgba(0, 0, 0, 0.85));
  font-size: var(--sk-content-font-size, 16px);
  line-height: calc(1em + 8px);
  transition: color 0.3s ease;
}

.markdown-body :deep(h1) { font-size: 1.6em; font-weight: var(--sk-bold-weight, 750); margin: 0.6em 0 0.3em; border-bottom: 1px solid var(--sk-border, rgba(0,0,0,0.1)); padding-bottom: 0.2em; color: var(--sk-title, rgba(0,0,0,0.9)); transition: border-color 0.3s ease, color 0.3s ease; }
.markdown-body :deep(h2) { font-size: 1.35em; font-weight: var(--sk-bold-weight, 750); margin: 0.6em 0 0.3em; color: var(--sk-title, rgba(0,0,0,0.9)); transition: color 0.3s ease; }
.markdown-body :deep(h3) { font-size: 1.15em; font-weight: var(--sk-bold-weight, 750); margin: 0.5em 0 0.2em; color: var(--sk-title, rgba(0,0,0,0.9)); transition: color 0.3s ease; }
.markdown-body :deep(p) { margin: 0; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 1.5em; margin: 0.3em 0; }
.markdown-body :deep(li) { margin: 0.15em 0; }
.markdown-body :deep(b), .markdown-body :deep(strong) { font-weight: var(--sk-bold-weight, 750); }
.markdown-body :deep(blockquote) { border-left: 3px solid var(--sk-accent, #006aff); padding: 0.2em 0.8em; margin: 0.5em 0; color: var(--sk-text, rgba(0,0,0,0.6)); background: var(--sk-accent-bg, rgba(0,106,255,0.03)); border-radius: 0 4px 4px 0; transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease; }
.markdown-body :deep(code) { background: var(--sk-code-bg, rgba(0,0,0,0.05)); padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.88em; font-family: 'SF Mono', 'Fira Code', 'Consolas', 'Monaco', monospace; color: var(--sk-text, inherit); transition: background-color 0.3s ease, color 0.3s ease; }
.markdown-body :deep(pre) { background: var(--sk-code-bg, rgba(0,0,0,0.03)); padding: 12px 16px; border-radius: 8px; overflow-x: auto; margin: 0.5em 0; transition: background-color 0.3s ease; }
.markdown-body :deep(pre code) { background: none; padding: 0; }
.markdown-body :deep(hr) { border: none; border-top: 1px solid var(--sk-border, rgba(0,0,0,0.1)); margin: 1em 0; transition: border-color 0.3s ease; }
.markdown-body :deep(a) { color: var(--sk-link-color, #1A73E8); transition: color 0.3s ease; }
.markdown-body :deep(table) { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.markdown-body :deep(th), .markdown-body :deep(td) { border: 1px solid var(--sk-table-border, rgba(0,0,0,0.12)); padding: 8px 12px; text-align: left; font-size: 0.9em; transition: border-color 0.3s ease; }
.markdown-body :deep(th) { background: var(--sk-table-header-bg, rgba(0,0,0,0.03)); font-weight: var(--sk-bold-weight, 750); transition: background-color 0.3s ease; }
.markdown-body :deep(img) { max-width: 100%; border-radius: 6px; }
.markdown-body :deep(input[type="checkbox"]) { margin-right: 6px; }
</style>
