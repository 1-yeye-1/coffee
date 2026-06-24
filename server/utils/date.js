export const BUSINESS_TIME_ZONE = 'Asia/Shanghai'

const shanghaiDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function shanghaiDateString(value = new Date()) {
  const parts = Object.fromEntries(
    shanghaiDateFormatter.formatToParts(value).map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

const shanghaiDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function parseBusinessDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) throw new TypeError('Business date must be YYYY-MM-DD')
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

function formatDateParts(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

export function getBusinessDate(value = new Date()) {
  return shanghaiDateString(value)
}

export function getToday(value = new Date()) {
  return getBusinessDate(value)
}

export function addBusinessDays(date, days) {
  const { year, month, day } = parseBusinessDate(date)
  return formatDateParts(new Date(Date.UTC(year, month - 1, day + Number(days || 0))))
}

export function getStartOfDay(date = getBusinessDate()) {
  return `${date} 00:00:00`
}

export function getEndOfDay(date = getBusinessDate()) {
  return `${addBusinessDays(date, 1)} 00:00:00`
}

export function getBusinessDayRange(date = getBusinessDate()) {
  return { start: getStartOfDay(date), end: getEndOfDay(date) }
}

export function getLastBusinessDates(count = 7, endDate = getBusinessDate()) {
  return Array.from({ length: count }, (_, index) => addBusinessDays(endDate, index - count + 1))
}

export function getBusinessTimestamp(value = new Date()) {
  const parts = Object.fromEntries(
    shanghaiDateTimeFormatter.formatToParts(value).map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`
}

export function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

export function isBirthdayOnDate(birthday, date) {
  const birthdayMatch = String(birthday || '').match(/^\d{4}-(\d{2})-(\d{2})$/)
  const dateMatch = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!birthdayMatch || !dateMatch) return false
  const [, birthMonth, birthDay] = birthdayMatch
  const [, year, month, day] = dateMatch
  if (birthMonth === month && birthDay === day) return true
  return birthMonth === '02' && birthDay === '29'
    && month === '02' && day === '28' && !isLeapYear(Number(year))
}
