/**
 * HTML → DOCX 转换器 (ES module)
 * 基于 html2doc 参考实现，映射规则与 Kotlin 版一致
 */

const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

const HEADING_LEVELS = { H1: '2', H2: '3', H3: '4', H4: '5' }

export function htmlToWordML(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="${NS_W}" xmlns:r="${NS_R}"><w:body>` +
    captureBody(doc.body) +
    `</w:body></w:document>`
}

function captureBody(el) {
  let xml = ''
  for (const child of el.childNodes) xml += nodeToXML(child)
  return xml
}

function nodeToXML(node) {
  if (node.nodeType === 3) {
    const t = node.textContent || ''
    if (!t.trim()) return ''
    return `<w:r><w:t xml:space="preserve">${xmlEscape(t)}</w:t></w:r>`
  }
  if (node.nodeType !== 1) return ''

  const tag = node.tagName.toLowerCase()

  switch (tag) {
    case 'h1': case 'h2': case 'h3': case 'h4':
      return paragraph(node, HEADING_LEVELS[node.tagName] || '1')

    case 'p': case 'div':
      return paragraph(node)

    case 'br':
      return '<w:p/>'

    case 'b': case 'strong':
      return `<w:r><w:rPr><w:b/></w:rPr>${childrenXML(node)}</w:r>`

    case 'i': case 'em':
      return `<w:r><w:rPr><w:i/></w:rPr>${childrenXML(node)}</w:r>`

    case 'u':
      return `<w:r><w:rPr><w:u w:val="single"/></w:rPr>${childrenXML(node)}</w:r>`

    case 's': case 'del':
      return `<w:r><w:rPr><w:strike/></w:rPr>${childrenXML(node)}</w:r>`

    case 'span':
      return spanToRun(node)

    case 'a':
      return linkToRun(node)

    case 'img':
      return imageToDrawing(node)

    case 'table':
      return `<w:tbl><w:tblPr><w:tblLayout w:val="fixed"/></w:tblPr>${childrenXML(node)}</w:tbl>`

    case 'tr':
      return `<w:tr>${childrenXML(node)}</w:tr>`

    case 'td': case 'th':
      return `<w:tc>${childrenXML(node)}</w:tc>`

    case 'ul': case 'ol':
      return childrenXML(node)

    case 'li':
      return `<w:p><w:pPr><w:numPr/></w:pPr>${childrenXML(node)}</w:p>`

    default:
      return childrenXML(node)
  }
}

function childrenXML(node) {
  let xml = ''
  for (const child of node.childNodes) xml += nodeToXML(child)
  return xml
}

function paragraph(node, headingLevel) {
  let pPr = ''
  if (headingLevel) pPr += `<w:pStyle w:val="${headingLevel}"/>`
  const style = (node.getAttribute && node.getAttribute('style')) || ''
  if (style.includes('text-align:center')) pPr += '<w:jc w:val="center"/>'
  else if (style.includes('text-align:right')) pPr += '<w:jc w:val="end"/>'
  const align = node.getAttribute && node.getAttribute('align')
  if (align === 'center') pPr += '<w:jc w:val="center"/>'
  if (align === 'right') pPr += '<w:jc w:val="end"/>'
  if (pPr) pPr = `<w:pPr>${pPr}</w:pPr>`
  return `<w:p>${pPr}${childrenXML(node)}</w:p>`
}

const HIGHLIGHT_MAP = {
  yellow: 'yellow', red: 'red', blue: 'blue', green: 'green',
  'rgba(247,198,0': 'yellow', 'rgba(255,173,190': 'red',
  'rgba(85,184,241': 'blue', 'rgba(104,209,121': 'green',
}

function spanToRun(node) {
  let rPr = ''
  const style = (node.getAttribute && node.getAttribute('style')) || ''
  const cls = (node.getAttribute && node.getAttribute('class')) || ''

  // 文字颜色：class 中 color_xxx 或 style 中 color
  const colorMatch = style.match(/color\s*:\s*([^;]+)/)
  if (colorMatch) {
    const hex = cssColorToHex(colorMatch[1].trim())
    if (hex) rPr += `<w:color w:val="${hex}"/>`
  }
  const clsColor = cls.match(/\bcolor_(\w+)/)
  if (clsColor && !rPr.includes('<w:color')) {
    const hex = CSS_VAR_HEX[clsColor[1]] || ''
    if (hex) rPr += `<w:color w:val="${hex}"/>`
  }

  // 高亮：class 中 highlight_xxx 或 style 中 background
  const bgMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/)
  if (bgMatch) {
    const val = HIGHLIGHT_MAP[Object.keys(HIGHLIGHT_MAP).find(k => bgMatch[1].includes(k))] ||
      highlightFromColor(bgMatch[1].trim())
    if (val) rPr += `<w:highlight w:val="${val}"/>`
  }
  const clsHl = cls.match(/\bhighlight_(\w+)/)
  if (clsHl && !rPr.includes('<w:highlight')) {
    rPr += `<w:highlight w:val="${clsHl[1]}"/>`
  }

  if (style.includes('font-weight:bold') || style.includes('font-weight:700'))
    rPr += '<w:b/>'
  if (style.includes('text-decoration:underline') || cls.includes('underline_solid'))
    rPr += '<w:u w:val="single"/>'
  if (style.includes('text-decoration:line-through'))
    rPr += '<w:strike/>'

  if (rPr) rPr = `<w:rPr>${rPr}</w:rPr>`
  return `<w:r>${rPr}${childrenXML(node)}</w:r>`
}

const CSS_VAR_HEX = {
  red: 'D54933', orange: 'E18413', yellow: 'DB9A00',
  green: '2C8848', blue: '3258C5', gray: '424242', default: '000000',
}

function highlightFromColor(color) {
  const hex = cssColorToHex(color)
  const near = {
    'F7C600': 'yellow', 'FFADBE': 'red', '55B8F1': 'blue', '68D179': 'green',
  }
  for (const [h, name] of Object.entries(near)) {
    if (hex.startsWith(h.slice(0, 4))) return name
  }
  return null
}

function linkToRun(node) {
  const href = node.getAttribute('href') || ''
  return `<w:hyperlink r:id="${xmlEscape(href)}">` +
    `<w:r><w:rPr><w:color w:val="1A73E8"/><w:u w:val="single"/></w:rPr>` +
    `${childrenXML(node)}</w:r></w:hyperlink>`
}

let imgCounter = 0
function imageToDrawing(node) {
  imgCounter++
  const rid = `rIdImg${imgCounter}`
  const w = parseInt(node.getAttribute('width')) || 500
  const h = parseInt(node.getAttribute('height')) || 375
  const emuW = w * 9525
  const emuH = h * 9525
  return `<w:p><w:r><w:drawing><wp:inline>` +
    `<wp:extent cx="${emuW}" cy="${emuH}"/>` +
    `<wp:docPr id="${imgCounter}" name="${rid}"/>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic><pic:nvPicPr/><pic:blipFill><a:blip r:embed="${rid}"/></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:ext cx="${emuW}" cy="${emuH}"/></a:xfrm></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
}

function cssColorToHex(color) {
  if (color.startsWith('#') && color.length === 7) return color.substring(1).toUpperCase()
  const named = {
    red: 'EA4335', blue: '1A73E8', green: '34A853',
    yellow: 'F9AB00', orange: 'FB9600', purple: 'A142F4',
    black: '000000', white: 'FFFFFF', gray: '5F6368',
  }
  if (named[color.toLowerCase()]) return named[color.toLowerCase()]
  if (color.startsWith('var(')) {
    const varName = color.match(/--[\w-]+/)?.[0] || ''
    const key = varName.replace('--color-', '').replace('--', '')
    return CSS_VAR_HEX[key] || '000000'
  }
  const rgbMatch = color.match(/[\d.]+/g)
  if (rgbMatch && rgbMatch.length >= 3) {
    return [rgbMatch[0], rgbMatch[1], rgbMatch[2]]
      .map(n => parseInt(n).toString(16).padStart(2, '0')).join('').toUpperCase()
  }
  return '000000'
}

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ──── DOCX ZIP 打包 ────

async function htmlToDocx(html, images = []) {
  const documentXml = htmlToWordML(html)
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  let imageTypes = images.map((img, i) =>
    `<Override PartName="/word/media/image${i + 1}.${img.ext}" ContentType="${mimeType(img.ext)}"/>`
  ).join('')
  zip.file('[Content_Types].xml',
    `<?xml version="1.0"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    imageTypes + `</Types>`
  )

  zip.file('_rels/.rels',
    `<?xml version="1.0"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`
  )

  zip.file('word/document.xml', documentXml)

  let rels = `<?xml version="1.0"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
  for (let i = 0; i < images.length; i++) {
    const name = `image${i + 1}.${images[i].ext}`
    rels += `<Relationship Id="rIdImg${i + 1}" ` +
      `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" ` +
      `Target="media/${name}"/>`
    zip.file(`word/media/${name}`, images[i].blob)
  }
  rels += `</Relationships>`
  zip.file('word/_rels/document.xml.rels', rels)

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

function mimeType(ext) {
  const map = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp',
  }
  return map[ext.toLowerCase()] || 'image/png'
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'document.docx'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 从 HTML 字符串提取 <img> 并抓取为 Blob
 * @param {string} html
 * @returns {Promise<Array<{ext: string, blob: Blob}>>}
 */
export async function collectImages(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const imgs = doc.querySelectorAll('img')
  const images = []
  for (const img of imgs) {
    try {
      const resp = await fetch(img.src)
      const blob = await resp.blob()
      const ext = (img.src.match(/\.(\w+)(\?|$)/) || [])[1] || 'png'
      images.push({ ext, blob })
    } catch (e) {
      console.warn('图片加载失败:', img.src, e)
    }
  }
  return images
}

/**
 * 导出 DOCX（含图片抓取）
 * @param {string} html 标题+内容 HTML
 * @param {string} filename
 */
export async function exportDocx(html, filename = 'document.docx') {
  const images = await collectImages(html)
  const blob = await htmlToDocx(html, images)
  downloadBlob(blob, filename)
}
