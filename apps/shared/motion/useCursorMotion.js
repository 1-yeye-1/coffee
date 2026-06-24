import { onBeforeUnmount, onMounted } from 'vue'

export const CURSOR_STORAGE_KEY = 'coffeebook_cursor_theme'
export const CURSOR_ENABLED_KEY = 'coffeebook_cursor_enabled'
export const CURSOR_EVENT = 'coffeebook:cursor-change'

export const CURSOR_THEMES = [
  { value: 'system', label: '默认系统鼠标' },
  { value: 'halo', label: '咖啡光环鼠标' },
  { value: 'capsule', label: '奶油胶囊鼠标' },
  { value: 'reader', label: '阅读书页鼠标' },
  { value: 'trail', label: '琥珀拖尾鼠标' },
  { value: 'minimal', label: '极简圆点鼠标' },
]

const LABELS = { read: '阅读', view: '查看', buy: '购买', join: '参加', book: '预约', drag: '拖动', close: '关闭', disabled: '不可用', action: '操作' }
const DESKTOP_QUERY = '(hover: hover) and (pointer: fine)'
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
const INTERACTIVE_SELECTOR = '[data-cursor], a[href], button, [role="button"], [role="link"], [draggable="true"], [data-draggable="true"]'
const NATIVE_SELECTOR = 'input, textarea, select, option, [contenteditable="true"], [contenteditable=""], .base-modal, .base-modal *, .base-drawer, .base-drawer *, .notification-drawer, .notification-drawer *'
const SEAT_DRAG_SELECTOR = '.admin-seat-map, .floor-map, .map-seat'

function isElement(value) {
  return value instanceof HTMLElement || value?.nodeType === 1
}

export function readCursorPreferences() {
  if (typeof window === 'undefined') return { theme: 'system', enabled: false }
  const stored = localStorage.getItem(CURSOR_STORAGE_KEY)
  const theme = CURSOR_THEMES.some((item) => item.value === stored) ? stored : 'system'
  return { theme, enabled: localStorage.getItem(CURSOR_ENABLED_KEY) === 'true' }
}

export function saveCursorPreferences(theme, enabled) {
  localStorage.setItem(CURSOR_STORAGE_KEY, theme)
  localStorage.setItem(CURSOR_ENABLED_KEY, String(enabled))
  window.dispatchEvent(new CustomEvent(CURSOR_EVENT, { detail: { theme, enabled } }))
}

export function useCursorMotion({ root, dot, ring, label, trail = [] }) {
  let frame = 0
  let running = false
  let visible = false
  let targetX = -100
  let targetY = -100
  let dotX = -100
  let dotY = -100
  let ringX = -100
  let ringY = -100
  let trailPoints = []
  const desktop = typeof window !== 'undefined' ? matchMedia(DESKTOP_QUERY) : null
  const reduced = typeof window !== 'undefined' ? matchMedia(REDUCED_QUERY) : null
  const elementOf = (value) => value?.value || value
  const safeElementOf = (value) => {
    const element = elementOf(value)
    return isElement(element) ? element : null
  }
  const trailElements = () => {
    const nodes = elementOf(trail) || []
    return Array.isArray(nodes) ? nodes.map(safeElementOf).filter(Boolean) : []
  }

  function render() {
    if (!running) return
    dotX += (targetX - dotX) * 0.72
    dotY += (targetY - dotY) * 0.72
    ringX += (targetX - ringX) * 0.2
    ringY += (targetY - ringY) * 0.2
    const dotElement = safeElementOf(dot)
    const ringElement = safeElementOf(ring)
    if (dotElement) dotElement.style.transform = `translate3d(${dotX}px,${dotY}px,0) translate(-50%,-50%)`
    if (ringElement) ringElement.style.transform = `translate3d(${ringX}px,${ringY}px,0) translate(-50%,-50%)`
    const nodes = trailElements()
    if (nodes.length) {
      trailPoints[0] = { x: ringX, y: ringY }
      for (let i = 1; i < nodes.length; i += 1) {
        const previous = trailPoints[i - 1]
        const point = trailPoints[i] || previous
        point.x += (previous.x - point.x) * 0.34
        point.y += (previous.y - point.y) * 0.34
        trailPoints[i] = point
      }
      nodes.forEach((node, index) => { node.style.transform = `translate3d(${trailPoints[index].x}px,${trailPoints[index].y}px,0) translate(-50%,-50%)` })
    }
    frame = requestAnimationFrame(render)
  }

  function stateFor(target) {
    if (!target) return { state: '', interactive: false }
    const unavailable = target.matches(':disabled, [aria-disabled="true"]') || target.dataset.cursor?.toLowerCase() === 'disabled'
    let state = unavailable ? 'disabled' : target.dataset.cursor?.toLowerCase()
    if (state === 'drag' && !target.closest(SEAT_DRAG_SELECTOR)) state = ''
    if (!state && target.matches('[draggable="true"], [data-draggable="true"]') && target.closest(SEAT_DRAG_SELECTOR)) state = 'drag'
    return { state: state || '', interactive: true }
  }

  function updateState(target) {
    const { state, interactive } = stateFor(target)
    const rootElement = safeElementOf(root)
    if (!rootElement) return
    rootElement.dataset.state = state
    rootElement.classList.toggle('is-interactive', interactive)
    const labelElement = safeElementOf(label)
    if (labelElement) labelElement.textContent = LABELS[state] || ''
  }

  function onMove(event) {
    targetX = event.clientX
    targetY = event.clientY
    if (!visible) { dotX = ringX = targetX; dotY = ringY = targetY }
    visible = true
    const rootElement = safeElementOf(root)
    const nativeArea = Boolean(event.target.closest?.(NATIVE_SELECTOR))
      || Boolean(window.getSelection?.()?.toString())
    rootElement?.classList.add('is-visible')
    rootElement?.classList.toggle('is-native-area', nativeArea)
    updateState(nativeArea ? null : event.target.closest?.(INTERACTIVE_SELECTOR))
  }

  function hide() { visible = false; safeElementOf(root)?.classList.remove('is-visible') }
  function reset() { hide(); updateState(null) }
  function onPointerDown() {
    if (safeElementOf(root)?.dataset.state === 'drag') safeElementOf(root)?.classList.add('is-active')
  }
  function onPointerUp() { safeElementOf(root)?.classList.remove('is-active') }
  function start() { if (!running) { running = true; frame = requestAnimationFrame(render) } }
  function stop() { running = false; cancelAnimationFrame(frame); frame = 0 }

  function sync() {
    const { theme, enabled } = readCursorPreferences()
    const active = enabled && theme !== 'system' && desktop?.matches && !reduced?.matches && !document.hidden
    const rootElement = safeElementOf(root)
    document.documentElement.classList.toggle('has-custom-cursor', Boolean(active))
    document.documentElement.dataset.cursorTheme = active ? theme : 'system'
    if (rootElement) rootElement.dataset.theme = theme
    rootElement?.classList.toggle('is-enabled', Boolean(active))
    if (active) start()
    else { stop(); hide(); updateState(null) }
  }

  function onVisibility() { if (document.hidden) { stop(); hide() } else sync() }
  function onBlur() { stop(); hide() }
  onMounted(() => {
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', hide)
    document.addEventListener('pointerdown', onPointerDown, { passive: true })
    document.addEventListener('pointerup', onPointerUp, { passive: true })
    document.addEventListener('pointercancel', onPointerUp, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', sync)
    window.addEventListener('resize', sync, { passive: true })
    window.addEventListener(CURSOR_EVENT, sync)
    desktop?.addEventListener('change', sync)
    reduced?.addEventListener('change', sync)
    sync()
  })
  onBeforeUnmount(() => {
    stop()
    document.documentElement.classList.remove('has-custom-cursor')
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerleave', hide)
    document.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('pointerup', onPointerUp)
    document.removeEventListener('pointercancel', onPointerUp)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('focus', sync)
    window.removeEventListener('resize', sync)
    window.removeEventListener(CURSOR_EVENT, sync)
    desktop?.removeEventListener('change', sync)
    reduced?.removeEventListener('change', sync)
  })
  return { reset, sync }
}
