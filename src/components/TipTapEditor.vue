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
      <button class="tt-btn" @click="triggerImageUpload" :disabled="isUploading" :title="uploadTitle">
        <svg v-if="!isUploading" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
          <rect x="1" y="3" width="14" height="10" rx="1.5"/>
          <circle cx="5" cy="6" r="1.5"/>
          <path d="M1 11l4-3 3 2 2-2 5 4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span v-else class="tt-spinner"></span>
        <span v-if="pendingUploadCount > 1" class="tt-upload-badge">{{ pendingUploadCount }}</span>
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
        <div class="tt-preview markdown-body" v-html="renderedHTML" @click="onPreviewClick" />
      </div>
    </div>
  </div>
  <ImagePreviewModal
    v-if="preview"
    :attach-id="preview.attachId"
    :thumb-src="preview.thumbSrc"
    :file-name="preview.fileName"
    @close="preview = null"
  />
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
import { enqueueUpload, pendingUploadCount, isUploading, onUploadSuccess, onUploadFallback } from '../composables/useAttachmentUpload'
import { getAttachmentThumbUrl } from '../api'
import ImagePreviewModal from './ImagePreviewModal.vue'
import FormatIcon from './FormatIcon.vue'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true, sanitize: false })

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Write something...' },
  noteId: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const store = useEditorStore()
const mode = ref('edit')
const showColorPicker = ref(false)
const fileInput = ref(null)
const preview = ref(null)

const uploadTitle = computed(() => {
  if (pendingUploadCount.value === 0) return 'Insert image'
  return `${pendingUploadCount.value} attachment(s) pending upload`
})

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
    // 双击正文图片 → 打开全屏预览（"查看原图"交互；单击保留节点选中语义）
    handleDoubleClick: (_view, _pos, event) => {
      const target = event.target
      if (target instanceof HTMLElement && target.tagName === 'IMG') {
        return tryOpenPreview(target) || false
      }
      return false
    },
  },
  onUpdate: ({ editor }) => {
    // 上传完成后的强制刷新会给 src 追加 &t= 时间戳，保存时清洗掉，content 保持规范 URL
    console.log('[tiptap] onUpdate → getHTML:', editor.getHTML())
    emit('update:modelValue', stripRefreshParam(editor.getHTML()))
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

// 清洗强制刷新参数：?t=123 / &t=123（仅本应用为绕过占位图缓存追加，不入库）
function stripRefreshParam(html) {
  return html.replace(/[?&]t=\d+/g, '')
}

// 从 IMG 元素解析附件 id 并打开预览；返回是否已处理
function tryOpenPreview(target) {
  const src = target.getAttribute('src') || ''
  const m = src.match(/attachments\/([^/?]+)\/download/)
  if (!m) return false
  preview.value = {
    attachId: m[1],
    thumbSrc: src,
    fileName: target.getAttribute('alt') || '',
  }
  return true
}

function onPreviewClick(e) {
  const target = e.target
  if (target instanceof HTMLElement && target.tagName === 'IMG') {
    tryOpenPreview(target)
  }
}

// 上传完成：给正文/预览中该附件的图片 src 追加时间戳，强制绕过占位图缓存加载真图
function refreshAttachmentImages() {
  const ed = editor.value
  if (!ed) return
  const ts = Date.now()
  let changed = false
  const tr = ed.state.tr
  ed.state.doc.descendants((node, pos) => {
    if (node.type.name === 'image' && /\/api\/attachments\//.test(node.attrs.src || '')) {
      const base = stripRefreshParam(node.attrs.src)
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        src: `${base}${base.includes('?') ? '&' : '?'}t=${ts}`,
      })
      changed = true
    }
  })
  if (changed) ed.view.dispatch(tr)
}

// 旧接口回退（后端未升级）：把 doc 中该附件的 src 替换为旧一步式接口返回的 URL
function replaceAttachmentSrc(attachId, newUrl) {
  const ed = editor.value
  if (!ed) return
  const base = getAttachmentThumbUrl(attachId).split('?')[0]
  let changed = false
  const tr = ed.state.tr
  ed.state.doc.descendants((node, pos) => {
    if (node.type.name === 'image' && (node.attrs.src || '').split('?')[0] === base) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: newUrl })
      changed = true
    }
  })
  if (changed) ed.view.dispatch(tr)
}

onUploadSuccess(refreshAttachmentImages)
onUploadFallback(replaceAttachmentSrc)

watch(() => props.modelValue, (html) => {
  const ed = editor.value
  const normalized = normalizeLegacyColors(html)
  const current = ed ? stripRefreshParam(ed.getHTML()) : ''
  if (ed && normalized !== current) {
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
  if (!file.type.startsWith('image/')) {
    console.warn('non-image file ignored:', file.type)
    if (fileInput.value) fileInput.value.value = ''
    return
  }
  if (fileInput.value) fileInput.value.value = ''
  try {
    // 两阶段：注册（attachId=客户端 UUID）→ content 立即写压缩图 URL → 后台补传文件内容
    // 上传完成后服务端压缩图就绪，refreshAttachmentImages 强制刷新为真图
    await enqueueUpload({
      file,
      noteId: props.noteId,
      fileName: file.name,
      onInsert: (attachId) => {
        editor.value?.chain().focus().setImage({ src: getAttachmentThumbUrl(attachId), alt: file.name }).run()
      },
    })
  } catch (err) {
    console.error('enqueue upload failed:', err)
  }
}

defineExpose({ focus: () => editor.value?.commands.focus() })
</script>
