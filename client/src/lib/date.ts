import { format as formatDateFns } from "date-fns";

export function toDateSafe(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const v: any = value;
  if (v && typeof v.toDate === "function") {
    try {
      const d = v.toDate();
      return d instanceof Date ? d : null;
    } catch {
      return null;
    }
  }
  if (v && typeof v.seconds === "number") {
    const millis = v.seconds * 1000 + (v.nanoseconds || 0) / 1e6;
    const d = new Date(millis);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatDateSafe(value: unknown, fmt: string): string {
  const d = toDateSafe(value);
  return d ? formatDateFns(d, fmt) : "Invalid date";
}