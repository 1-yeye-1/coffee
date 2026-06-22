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
