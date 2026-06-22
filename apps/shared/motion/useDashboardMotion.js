import { useAnimeMotion } from './useAnimeMotion.js'
import { useGsapNumber } from './useGsapNumber.js'
import { useGsapReveal } from './useGsapReveal.js'

// Dashboard orchestration stays in GSAP; Anime.js is reserved for badge feedback.
export function useDashboardMotion(root = null) {
  const reveal = useGsapReveal(root)
  const numbers = useGsapNumber()
  const micro = useAnimeMotion()

  function animateDashboardStats(target, values, options = {}) {
    reveal.revealCards(target, { key: 'dashboard-stats', stagger: 0.06, limit: 20, ...options })
    const scope = root?.value || root || document
    const elements = typeof target === 'string' ? scope?.querySelectorAll(`${target} strong`) || [] : target
    return numbers.animateCounts(elements, values, { duration: 0.6 })
  }

  function animateDashboardFeeds(target = '.admin-chart, .dashboard-feed > button, .admin-panel', options = {}) {
    return reveal.revealList(target, { key: 'dashboard-feeds', stagger: 0.045, limit: 20, ...options })
  }

  function animateProgressBars(target = '.admin-bar span', options = {}) {
    return reveal.animateProgress(target, { axis: 'y', ...options })
  }

  function pulseDashboardBadge(target) {
    return micro.pulseBadge(target)
  }

  function cleanup() {
    reveal.cleanup()
    numbers.cleanup()
    micro.cleanup()
  }

  return {
    animateDashboardStats,
    animateDashboardFeeds,
    animateProgressBars,
    pulseDashboardBadge,
    cleanup,
    prefersReducedMotion: reveal.prefersReducedMotion,
  }
}
