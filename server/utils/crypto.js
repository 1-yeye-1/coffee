import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, KEY_LENGTH)
  return `scrypt:${salt}:${Buffer.from(derivedKey).toString('hex')}`
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, salt, keyHex] = String(storedHash || '').split(':')
  if (algorithm !== 'scrypt' || !salt || !keyHex) return false

  const expected = Buffer.from(keyHex, 'hex')
  const actual = Buffer.from(await scrypt(password, salt, expected.length))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
