import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()

async function collect(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory() && ['node_modules', 'dist'].includes(entry.name)) continue
    const relative = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collect(relative))
    else if (/\.(?:js|vue)$/.test(entry.name)) files.push(relative.replaceAll('\\', '/'))
  }
  return files
}

const files = await collect('apps')
for (const file of files) {
  const source = await readFile(path.join(root, file), 'utf8')
  const sharedMotion = file.startsWith('apps/shared/motion/')
  if (!sharedMotion) {
    assert(!/\bgsap\.(?:to|from|fromTo|set|timeline)\b/.test(source), `${file} contains a scattered GSAP call`)
    assert(!/from\s+['"]animejs['"]/.test(source), `${file} imports Anime.js outside shared motion`)
  }
  const highFrequencyAdds = (source.match(/addEventListener\(['"](?:mousemove|pointermove)['"]/g) || []).length
  const highFrequencyRemoves = (source.match(/removeEventListener\(['"](?:mousemove|pointermove)['"]/g) || []).length
  assert.equal(highFrequencyAdds, highFrequencyRemoves, `${file} has an unpaired high-frequency pointer listener`)
  if (sharedMotion) {
    if (/setTimeout\(/.test(source)) assert(/clearTimeout\(/.test(source), `${file} has an uncleared timeout`)
    if (/setInterval\(/.test(source)) assert(/clearInterval\(/.test(source), `${file} has an uncleared interval`)
    if (/requestAnimationFrame\(/.test(source)) assert(/cancelAnimationFrame\(/.test(source), `${file} has an uncancelled animation frame`)
    const animationCalls = source.match(/gsap\.(?:to|from|fromTo|set)\([\s\S]{0,500}?\)\)/g) || []
    for (const call of animationCalls) {
      assert(!/\b(?:width|height|top|left)\s*:/.test(call), `${file} animates a layout property`)
    }
  }
}

console.log('Motion audit checks passed')
