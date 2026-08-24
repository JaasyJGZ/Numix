const PANAMA_TIME_ZONE = "America/Panama"

export function normalizeTimeString(timeStr: string): string {
  const parts = String(timeStr || "").split(":")
  const h = parts[0] ?? "00"
  const m = parts[1] ?? "00"
  const s = parts[2] ?? "00"
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`
}

export function toLocalDateTime(dateStr: string, timeStr: string): Date {
  const normalizedTime = normalizeTimeString(timeStr)
  const [year, month, day] = dateStr.split("-").map((p) => parseInt(p, 10))
  const [hour, minute, second] = normalizedTime.split(":").map((p) => parseInt(p, 10))

  // Construye fecha en zona local del runtime sin reinterpretarla como UTC.
  return new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, second || 0, 0)
}

export function getCurrentPanamaDateTime(referenceDate: Date = new Date()): { currentDate: string; currentTime: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PANAMA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  const parts = formatter.formatToParts(referenceDate)
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00"

  return {
    currentDate: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    currentTime: `${getPart("hour")}:${getPart("minute")}:${getPart("second")}`,
  }
}

export function hasPanamaDateTimePassed(targetDate: string, targetTime: string, referenceDate: Date = new Date()): boolean {
  const { currentDate, currentTime } = getCurrentPanamaDateTime(referenceDate)
  const normalizedTargetTime = normalizeTimeString(targetTime)

  return targetDate < currentDate || (targetDate === currentDate && normalizedTargetTime <= currentTime)
}

export function getCurrentLocalDate(): string {
  return getCurrentPanamaDateTime().currentDate
}

export function getCurrentLocalTime(): string {
  return getCurrentPanamaDateTime().currentTime
}
