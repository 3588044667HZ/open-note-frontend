<template>
  <div class="tiptap-editor">
    <div class="tt-toolbar">
      <button class="tt-btn" @click="editor.chain().focus().toggleBold().run()" :class="{ active: editor?.isActive('bold') }" title="Bold"><b>B</b></button>
      <button class="tt-btn" @click="editor.chain().focus().toggleItalic().run()" :class="{ active: editor?.isActive('italic') }" title="Italic"><i>I</i></button>
      <button class="tt-btn" @click="editor.chain().focus().toggleStrike().run()" :class="{ active: editor?.isActive('strike') }" title="Strikethrough"><s>S</s></button>
      <span class="tt-spacer" />
      <button class="tt-btn" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ active: editor?.isActive('heading', { level: 1 }) }">H1</button>
      <button class="tt-btn" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ active: editor?.isActive('heading', { level: 2 }) }">H2</button>
      <button class="tt-btn" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" :class="{ active: editor?.isActive('heading', { level: 3 }) }">H3</button>
      <span class="tt-spacer" />
      <button class="tt-btn" @click="editor.chain().focus().toggleBulletList().run()" :class="{ active: editor?.isActive('bulletList') }" title="Unordered list">ul</button>
      <button class="tt-btn" @click="editor.chain().focus().toggleOrderedList().run()" :class="{ active: editor?.isActive('orderedList') }" title="Ordered list">ol</button>
      <button class="tt-btn" @click="editor.chain().focus().toggleBlockquote().run()" :class="{ active: editor?.isActive('blockquote') }" title="Blockquote">&quot;</button>
      <button class="tt-btn" @click="editor.chain().focus().toggleCode().run()" :class="{ active: editor?.isActive('code') }" title="Inline code">&lt;/&gt;</button>
      <button class="tt-btn" @click="editor.chain().focus().toggleCodeBlock().run()" :class="{ active: editor?.isActive('codeBlock') }" title="Code block">{}</button>
      <span class="tt-spacer" />
      <button class="tt-btn" @click="insertLink" title="Link">&#128279;</button>
      <button class="tt-btn" @click="editor.chain().focus().setHorizontalRule().run()" title="Horizontal rule">&mdash;</button>
      <span class="tt-spacer" />

      <div class="tt-dropdown">
        <button class="tt-btn" @click="showColorPicker = !showColorPicker" :class="{ active: showColorPicker }" title="Text formatting">
          <FormatIcon :type="store.activeTab" :color="formatIconColor" :size="20" />
        </button>
        <div v-if="showColorPicker" class="tt-color-menu" @click.stop>
          <div class="color-tabs">
            <button v-for="tab in colorTabs" :key="tab.key"
              class="color-tab" :class="{ active: store.activeTab === tab.key }"
              @click="store.activeTab = tab.key" :title="tab.label">
              <FormatIcon :type="tab.key" :color="tab.key === 'text' ? formatIconColor : null" :size="18" />
            </button>
          </div>
          <div class="color-options">
            <button v-for="opt in currentOptions" :key="opt.className"
              class="color-item" :class="{ active: opt.isNone ? !store.activeFormat : store.activeFormat === opt.className }"
              @click="store.applyFormat(opt.className, store.activeTab); showColorPicker = false">
              <span v-if="opt.isNone" class="color-dot none-dot"></span>
              <span v-else class="color-dot" :style="opt.style" />
              <span class="color-label">{{ opt.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <span class="tt-spacer" />
      <button class="tt-btn" @click="triggerImageUpload" :disabled="uploading" title="Insert image">
        <svg v-if="!uploading" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
          <rect x="1" y="3" width="14" height="10" rx="1.5"/>
          <circle cx="5" cy="6" r="1.5"/>
          <path d="M1 11l4-3 3 2 2-2 5 4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span v-else class="tt-spinner"></span>
      </button>
      <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden @change="onFileSelected" />

      <div class="mode-toggle">
        <button class="mode-btn" :class="{ active: mode === 'edit' }" @click="mode = 'edit'">Edit</button>
        <button class="mode-btn" :class="{ active: mode === 'split' }" @click="mode = 'split'">Both</button>
        <button class="mode-btn" :class="{ active: mode === 'preview' }" @click="mode = 'preview'">Preview</button>
      </div>
    </div>

    <div class="tt-body" :class="'mode-' + mode">
      <div v-show="mode !== 'preview'" class="tt-edit-pane">
        <EditorContent :editor="editor" class="tt-content" />
      </div>
      <div v-show="mode !== 'edit'" class="tt-preview-pane">
        <div class="tt-preview markdown-body" v-html="renderedHTML" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { TextStyleWithClass } from '../extensions/textStyle'
import { ColoredUnderline } from '../extensions/underline'
import { FormatCommands } from '../extensions/formatCommands'
import { useEditorStore, TEXT_COLOR_MAP, HIGHLIGHT_COLOR_MAP } from '../composables/useEditorStore'
import FormatIcon from './FormatIcon.vue'
import { uploadFile } from '../api'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true, sanitize: false })

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Write something...' },
})
const emit = defineEmits(['update:modelValue'])

const store = useEditorStore()
const mode = ref('edit')
const showColorPicker = ref(false)
const fileInput = ref(null)
const uploading = ref(false)

const colorTabs = [
  { key: 'text', label: 'Text' },
  { key: 'highlight', label: 'Hl' },
  { key: 'underline', label: 'U' },
  { key: 'wavy', label: 'W' },
]

const NONE_OPTION = { className: 'none', label: 'None', isNone: true }

const currentOptions = computed(() => {
  switch (store.activeTab) {
    case 'text':
      return [NONE_OPTION, ...Object.entries(TEXT_COLOR_MAP).map(([cls, color]) => ({
        className: cls, label: cls.replace('color_', ''), style: { backgroundColor: color },
      }))]
    case 'highlight':
      return [NONE_OPTION, ...Object.entries(HIGHLIGHT_COLOR_MAP).map(([cls, color]) => ({
        className: `highlight_${cls.replace('color_', '')}`, label: cls.replace('color_', ''),
        style: { backgroundColor: color },
      }))]
    case 'underline':
      return [NONE_OPTION, ...Object.entries(TEXT_COLOR_MAP).map(([cls, color]) => ({
        className: `underline_solid_${cls}`, label: cls.replace('color_', ''),
        style: { borderBottom: `2px solid ${color}`, width: '16px', height: '12px' },
      }))]
    case 'wavy':
      return [NONE_OPTION, ...Object.entries(TEXT_COLOR_MAP).map(([cls, color]) => ({
        className: `underline_wavy_${cls}`, label: cls.replace('color_', ''),
        style: { borderBottom: `2px solid ${color}`, width: '16px', height: '12px' },
      }))]
    default: return []
  }
})

const formatIconColor = computed(() => {
  if (!store.activeFormat) return undefined
  if (store.activeFormat.startsWith('color_') && !store.activeFormat.includes('highlight'))
    return TEXT_COLOR_MAP[store.activeFormat]
  if (store.activeFormat.startsWith('highlight_'))
    return HIGHLIGHT_COLOR_MAP[`color_${store.activeFormat.replace('highlight_', '')}`]
  return undefined
})

const LEGACY_COLOR_MAP = {
  orange: 'orange', red: 'red', green: 'green',
  blue: 'blue', yellow: 'yellow', gray: 'gray',
}

/**
 * 旧版数据归一化：<span style="color: var(--orangeColor)"> → <span class="color_orange">
 * 旧系统颜色存 style 属性，新系统存 class；统一为 class 后清除/换色逻辑行为一致
 */
function normalizeLegacyColors(html) {
  if (!html?.includes('var(--')) return html
  // 先处理带 class 的（合并颜色）
  let out = html.replace(
    /<span\s+class="([^"]*)"\s+style="color:\s*var\(--(\w+)Color\)[^"]*">/g,
    (m, cls, c) => {
      const name = LEGACY_COLOR_MAP[c.toLowerCase()]
      if (!name) return m
      const newCls = cls.replace(/\bcolor_\w+/g, `color_${name}`) || `color_${name}`
      return `<span class="${newCls}">`
    }
  )
  // 再处理纯 style 的
  out = out.replace(
    /<span\s+style="color:\s*var\(--(\w+)Color\)[^"]*">/g,
    (m, c) => {
      const name = LEGACY_COLOR_MAP[c.toLowerCase()]
      return name ? `<span class="color_${name}">` : m
    }
  )
  return out
}

const initialContent = props.modelValue?.includes('<')
  ? normalizeLegacyColors(props.modelValue)
  : marked.parse(props.modelValue || '')

const editor = useEditor({
  content: initialContent,
  extensions: [
    StarterKit,
    Placeholder.configure({ placeholder: props.placeholder }),
    TextStyleWithClass,
    Link.configure({ openOnClick: false }),
    Image,
    ColoredUnderline,
    FormatCommands,
  ],
  editorProps: {
    attributes: {
      class: 'tiptap-content markdown-body',
    },
  },
  onUpdate: ({ editor }) => {
    console.log('[tiptap] onUpdate → getHTML:', editor.getHTML())
    emit('update:modelValue', editor.getHTML())
  },
  onSelectionUpdate: () => {
    store.updateMarkStatus()
  },
  onCreate: ({ editor }) => {
    store.bind(editor)
    store.updateMarkStatus()
  },
})

store.bind(editor.value)
watch(() => editor.value, (ed) => { if (ed) store.bind(ed) })

watch(() => props.modelValue, (html) => {
  const ed = editor.value
  const normalized = normalizeLegacyColors(html)
  if (ed && normalized !== ed.getHTML()) {
    console.log('[tiptap] modelValue watch → setContent (REWRITE):', normalized)
    console.log('[tiptap]   current getHTML:', ed.getHTML())
    ed.commands.setContent(normalized || '', { emitUpdate: false })
  }
})

const renderedHTML = computed(() => {
  try {
    return marked.parse(editor.value?.getHTML() || '')
  } catch { return '' }
})

function insertLink() {
  const ed = editor.value
  if (!ed) return
  const url = window.prompt('Link URL:')
  if (url) {
    ed.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
}

function triggerImageUpload() { fileInput.value?.click() }

async function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const res = await uploadFile(file, null)
    const url = res.data?.url || `/api/attachments/${res.data?.fileId}/download`
    editor.value?.chain().focus().setImage({ src: url, alt: file.name }).run()
  } catch (err) {
    console.error('upload failed:', err)
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

defineExpose({ focus: () => editor.value?.commands.focus() })
</script>
