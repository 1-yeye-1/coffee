import { spawn } from 'node:child_process'

const commands = [
  ['server', 'npm', ['run', 'dev:server']],
  ['web', 'npm', ['run', 'dev:web']],
  ['admin', 'npm', ['run', 'dev:admin']],
]

const children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  })
  child.on('exit', (code) => {
    if (code) process.exitCode = code
    console.log(`[${name}] exited with code ${code}`)
  })
  return child
})

function stop() {
  for (const child of children) child.kill()
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
