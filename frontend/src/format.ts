import { timestampDate } from "@bufbuild/protobuf/wkt";
import type { Timestamp } from "@bufbuild/protobuf/wkt";

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatSalaryRange(min: number, max: number): string {
  if (!min && !max) return "—";
  if (min && max) return `${eur.format(min)} – ${eur.format(max)}`;
  return eur.format(min || max);
}

export function formatDate(ts?: Timestamp): string {
  if (!ts) return "—";
  return timestampDate(ts).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Timestamp -> value for <input type="date">. */
export function toDateInputValue(ts?: Timestamp): string {
  if (!ts) return "";
  return timestampDate(ts).toISOString().slice(0, 10);
}
