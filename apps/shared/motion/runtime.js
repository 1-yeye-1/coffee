const controllers = new Set()
let disabled = false
let preferenceQuery = null
let preferenceHandler = null

export function isMotionEnabled() {
  return !disabled
}

export function registerMotionController(controller) {
  if (!controller) return () => {}
  controllers.add(controller)
  if (disabled) controller.disable?.()
  return () => controllers.delete(controller)
}

function disable() {
  if (disabled) return status()
  disabled = true
  if (typeof document !== 'undefined') document.documentElement.classList.add('coffee-motion-disabled')
  controllers.forEach((controller) => controller.disable?.())
  return status()
}

function enable() {
  if (!disabled) return status()
  disabled = false
  if (typeof document !== 'undefined') document.documentElement.classList.remove('coffee-motion-disabled')
  controllers.forEach((controller) => controller.enable?.())
  return status()
}

function status() {
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return { enabled: !disabled, reducedMotion, controllers: controllers.size }
}

export function installMotionDevTools() {
  if (typeof window === 'undefined') return null
  if (!preferenceQuery) {
    preferenceQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    preferenceHandler = (event) => {
      if (event.matches) controllers.forEach((controller) => controller.disable?.())
      else controllers.forEach((controller) => controller.enable?.())
    }
    preferenceQuery.addEventListener('change', preferenceHandler)
  }
  const api = Object.freeze({ disable, enable, status })
  Object.defineProperty(window, '__coffeeMotion', { configurable: true, value: api })
  return api
}
