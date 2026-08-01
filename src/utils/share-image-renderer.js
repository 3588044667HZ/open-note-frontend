export const ShareColors = {
  WHITE:  { contentBg:"#FFFFFF", backcloth:"#FAFAFA", textColor:"#1A1A1A", titleColor:"#000000", timeColor:"#999999", borderColor:"#0000001F" },
  YELLOW: { contentBg:"#FEF7E2", backcloth:"#EFE8D4", textColor:"#96826C", titleColor:"#96826C", timeColor:"#5F4A33", borderColor:"#5F4A3322" },
  CYAN:   { contentBg:"#EFF7F0", backcloth:"#E1E8E2", textColor:"#747D76", titleColor:"#747D76", timeColor:"#515D54", borderColor:"#3B505022" },
  BLUE:   { contentBg:"#EAF4F3", backcloth:"#DCE5E4", textColor:"#607474", titleColor:"#607474", timeColor:"#3B5050", borderColor:"#3B505022" },
  GREEN:  { contentBg:"#EAF3F8", backcloth:"#DCE4E9", textColor:"#5A656C", titleColor:"#5A656C", timeColor:"#4E5960", borderColor:"#4E596022" },
  RED:    { contentBg:"#F8F1E9", backcloth:"#E9E3DB", textColor:"#9F7660", titleColor:"#9F7660", timeColor:"#795C4C", borderColor:"#795C4C22" },
  GREY:   { contentBg:"#F4F4F4", backcloth:"#E5E5E5", textColor:"#5F5F5F", titleColor:"#5F5F5F", timeColor:"#474747", borderColor:"#47474722" },
  BLACK:  { contentBg:"#000000", backcloth:"#2E2E2E", textColor:"#FFFFFF", titleColor:"#FFFFFF", timeColor:"#8CFFFFFF", borderColor:"#FFFFFF33" },
}

export function getColorsFromCSS() {
  const styles = getComputedStyle(document.documentElement)
  return {
    contentBg:  styles.getPropertyValue('--sk-content-bg').trim() || '#FFFFFF',
    backcloth:  styles.getPropertyValue('--sk-backcloth').trim() || '#FAFAFA',
    textColor:  styles.getPropertyValue('--sk-text').trim() || '#1A1A1A',
    titleColor: styles.getPropertyValue('--sk-title').trim() || '#000000',
    timeColor:  styles.getPropertyValue('--sk-time').trim() || '#999999',
    borderColor: styles.getPropertyValue('--sk-border').trim() || '#0000001F',
  }
}

const RENDER_ID = '__share_render_layer'

export async function renderToImage(title, html, colors, opts = {}) {
  const { watermark = '备忘录', logoText = '分享来自 Open Note', width = 750, scale = 2 } = opts

  const layer = buildLayer(title, html, colors, { watermark, logoText, width })
  document.body.appendChild(layer)
  await delay(200)

  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(layer, { scale, useCORS: true, backgroundColor: null, logging: false, width })
  document.body.removeChild(layer)

  return new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('export failed')), 'image/png', 1.0)
  )
}

function buildLayer(title, html, c, opts) {
  const div = document.createElement('div')
  div.id = RENDER_ID
  div.style.cssText = `position:absolute;left:-9999px;top:0;z-index:-1;width:${opts.width}px;`
  div.innerHTML = `<div style="background:${c.backcloth};padding:24px;">
    <div style="background:${c.contentBg};border-radius:12px;padding:16px 24px 24px;
      color:${c.textColor};font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;
      border:1px solid ${c.borderColor};">
      <h2 style="color:${c.titleColor};font-size:24px;font-weight:650;line-height:1.1;
        padding:0 0 14px;margin:0;border-bottom:1px solid ${c.borderColor};">${title || 'Untitled'}</h2>
      <div style="font-size:16px;line-height:calc(1em + 8px);word-break:break-word;">${html}</div>
      <div style="height:1px;background:${c.borderColor};margin:24px 0 16px;"></div>
      <div style="text-align:center;font-size:12px;color:${c.timeColor};">
        <div>${opts.logoText}</div>
        <div style="opacity:0.7;margin-top:4px;">${opts.watermark}</div>
      </div>
    </div>
  </div>`
  div.querySelectorAll('img').forEach(img => { img.style.maxWidth = '100%'; img.style.height = 'auto' })
  return div
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

export function downloadImage(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `note_${Date.now()}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function shareImage(blob, title) {
  if (!navigator.share) { downloadImage(blob); return }
  const file = new File([blob], `note_${Date.now()}.png`, { type: 'image/png' })
  try {
    await navigator.share({ title: title || 'Share Note', files: [file] })
  } catch (e) {
    if (e.name !== 'AbortError') downloadImage(blob)
  }
}
