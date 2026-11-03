import type { Locale } from "@/lib/i18n";

export function formatPrice(cents: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "en-US", {
    style: "currency",
    currency: currency || "BRL",
  }).format(cents / 100);
}

export function ageLabel(age: number, locale: Locale): string {
  return locale === "pt" ? `${age} anos` : `${age} years`;
}

export function formatWhen(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function heightLabel(cm: number): string {
  const inches = Math.round(cm / 2.54);
  const feet = Math.floor(inches / 12);
  const rest = inches % 12;
  return `${cm} cm / ${feet}'${rest}"`;
}
