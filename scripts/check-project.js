import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const staleFiles = [
  'apps/web/src/router/route-names.js',
  'apps/admin/src/router/route-names.js',
  'apps/admin/src/stores/admin.js',
  'apps/admin/src/api/admin.js',
]
const stalePatterns = ['AdminFinanceView', 'AdminSettingsView', 'ADMIN_FINANCE', 'ADMIN_SETTINGS', 'fetchFinanceDashboard', 'financeDashboard', 'saveSettings']

for (const file of staleFiles) {
  const source = await readFile(file, 'utf8')
  for (const pattern of stalePatterns) assert(!source.includes(pattern), `${file} contains stale reference: ${pattern}`)
}

const routeFiles = [
  'apps/web/src/router/modules/public.js', 'apps/web/src/router/modules/member.js',
  'apps/admin/src/router/modules/admin.js',
]
for (const file of routeFiles) {
  const source = await readFile(file, 'utf8')
  assert(source.includes('() => import('), `${file} must contain lazy routes`)
}

const gitignore = await readFile('.gitignore', 'utf8')
for (const pattern of ['node_modules/', 'dist/', 'uploads/', 'server/public/uploads/', 'logs/', '.env']) {
  assert(gitignore.split(/\r?\n/).includes(pattern), `.gitignore must contain ${pattern}`)
}

const diff = spawnSync('git', ['diff', '--check'], { encoding: 'utf8', shell: process.platform === 'win32' })
assert.equal(diff.status, 0, diff.stdout || diff.stderr || 'git diff --check failed')
console.log('Project checks passed')
