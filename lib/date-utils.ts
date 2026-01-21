export function toLocalDateTime(dateStr: string, timeStr: string): Date {
  // Normaliza timeStr a HH:MM:SS
  const normalizedTime = (() => {
    const parts = timeStr.split(":");
    const h = parts[0] ?? "00";
    const m = parts[1] ?? "00";
    const s = parts[2] ?? "00";
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`;
  })();

  const [year, month, day] = dateStr.split("-").map((p) => parseInt(p, 10));
  const [hour, minute, second] = normalizedTime
    .split(":")
    .map((p) => parseInt(p, 10));

  // Construye fecha en zona local del runtime (cliente) sin interpretar como UTC
  return new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, second || 0, 0);
}

export function getCurrentLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getCurrentLocalTime(): string {
  const now = new Date();
  const hh = `${now.getHours()}`.padStart(2, "0");
  const mm = `${now.getMinutes()}`.padStart(2, "0");
  const ss = `${now.getSeconds()}`.padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}