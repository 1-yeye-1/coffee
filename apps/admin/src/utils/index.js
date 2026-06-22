export function debounce(callback, delay = 250) {
  let timer
  const wrapped = (...args) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => callback(...args), delay)
  }
  wrapped.cancel = () => window.clearTimeout(timer)
  return wrapped
}
