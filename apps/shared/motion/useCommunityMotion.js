import { onBeforeUnmount } from 'vue'
import { animate } from 'animejs'
import { gsap } from 'gsap'
import { isMotionEnabled, registerMotionController } from './runtime.js'

function reduced() {
  return !isMotionEnabled() || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

function setElementText(node, text) {
  if (node instanceof HTMLElement || node?.nodeType === 1) node.textContent = text
}

export function useCommunityMotion(root = null) {
  let context = null
  const animations = new Set()
  const animeInstances = new Set()
  const temporaryNodes = new Set()
  const timers = new Set()
  const scope = () => root?.value || root || document

  function runGsap(factory) {
    if (!context) context = gsap.context(() => {}, scope())
    let instance
    context.add(() => { instance = factory() })
    if (instance) animations.add(instance)
    return instance
  }

  function later(callback, delay) {
    const timer = window.setTimeout(() => {
      timers.delete(timer)
      callback()
    }, delay)
    timers.add(timer)
  }

  function trackAnime(instance) {
    if (instance) animeInstances.add(instance)
    return instance
  }

  function likeParticle(source, countTarget, badgeTarget) {
    if (!source || reduced()) return null
    const bounds = source.getBoundingClientRect()
    const particles = Array.from({ length: 6 }, (_, index) => {
      const particle = document.createElement('span')
      particle.className = 'community-like-particle'
      setElementText(particle, index % 2 ? '♥' : '·')
      particle.style.left = `${bounds.left + bounds.width / 2}px`
      particle.style.top = `${bounds.top + bounds.height / 2}px`
      document.body.appendChild(particle)
      temporaryNodes.add(particle)
      return particle
    })
    const instance = trackAnime(animate(particles, {
      translateX: (_, index) => Math.cos((Math.PI * 2 * index) / particles.length) * (24 + index * 2),
      translateY: (_, index) => Math.sin((Math.PI * 2 * index) / particles.length) * (20 + index * 2),
      scale: [0.6, 1.15, 0], opacity: [0, 1, 0], duration: 620, ease: 'out(3)',
    }))
    trackAnime(animate(source, { scale: [1, 1.24, 1], duration: 430, ease: 'out(4)' }))
    if (countTarget) trackAnime(animate(countTarget, { translateY: [0, -6, 0], duration: 380, ease: 'out(3)' }))
    if (badgeTarget) trackAnime(animate(badgeTarget, { scale: [1, 1.08, 1], opacity: [1, 0.78, 1], duration: 460, ease: 'out(3)' }))
    later(() => particles.forEach((particle) => { particle.remove(); temporaryNodes.delete(particle) }), 700)
    return instance
  }

  function bookmarkFlight(source, target) {
    if (!source || reduced()) return null
    const from = source.getBoundingClientRect()
    const to = target?.getBoundingClientRect?.() || { left: window.innerWidth - 48, top: 32, width: 1, height: 1 }
    const marker = document.createElement('span')
    marker.className = 'community-bookmark-flight'
    setElementText(marker, '◆')
    marker.style.left = `${from.left + from.width / 2}px`
    marker.style.top = `${from.top + from.height / 2}px`
    document.body.appendChild(marker)
    temporaryNodes.add(marker)
    const instance = trackAnime(animate(marker, {
      translateX: to.left + to.width / 2 - from.left - from.width / 2,
      translateY: to.top + to.height / 2 - from.top - from.height / 2,
      scale: [0.7, 1.1, 0.35], rotate: [0, 18, 0], opacity: [0, 1, 0], duration: 720, ease: 'inOut(3)',
    }))
    later(() => { marker.remove(); temporaryNodes.delete(marker) }, 780)
    return instance
  }

  function revealComment(target, open, done) {
    if (!target) { done?.(); return null }
    if (reduced()) {
      gsap.set(target, { opacity: open ? 1 : 0, scaleY: open ? 1 : 0.98, transformOrigin: 'top' })
      done?.()
      return null
    }
    return runGsap(() => gsap.fromTo(target,
      { scaleY: open ? 0.98 : 1, y: open ? -6 : 0, opacity: open ? 0 : 1, transformOrigin: 'top' },
      { scaleY: open ? 1 : 0.98, y: open ? 0 : -6, opacity: open ? 1 : 0, duration: 0.3, ease: 'power2.inOut', clearProps: 'transform,opacity', onComplete: done },
    ))
  }

  function highlightPost(target) {
    if (!target) return null
    target.classList.add('is-new-post')
    if (!reduced()) runGsap(() => gsap.fromTo(target, { opacity: 0, y: -18, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.58, ease: 'power3.out', clearProps: 'opacity,transform' }))
    later(() => target.classList.remove('is-new-post'), 2000)
    return target
  }

  function switchGallery(target) {
    if (!target || reduced()) return null
    return runGsap(() => gsap.fromTo(target, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.34, ease: 'power3.out', clearProps: 'opacity,transform' }))
  }

  function cleanup() {
    animations.forEach((instance) => instance?.kill?.())
    animeInstances.forEach((instance) => { instance?.revert?.(); instance?.cancel?.() })
    timers.forEach((timer) => window.clearTimeout(timer))
    temporaryNodes.forEach((node) => node.remove())
    animations.clear(); animeInstances.clear(); timers.clear(); temporaryNodes.clear()
    context?.revert(); context = null
  }

  const unregister = registerMotionController({ disable: cleanup })
  onBeforeUnmount(() => { cleanup(); unregister() })
  return { likeParticle, bookmarkFlight, revealComment, highlightPost, switchGallery, cleanup, prefersReducedMotion: reduced }
}
