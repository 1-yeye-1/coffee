function upsertMeta(name, content) {
  let element = document.head.querySelector(`meta[name="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('name', name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

export function applyRouteSeo(route, defaults) {
  document.title = route.meta.title ? `${route.meta.title} | ${defaults.siteName}` : defaults.siteName
  upsertMeta('description', route.meta.description || defaults.description)
  upsertMeta('keywords', route.meta.keywords || defaults.keywords)
}
