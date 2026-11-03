import Link from "next/link";
import { Star } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";
import { ageLabel } from "@/lib/format";
import type { Card } from "@/lib/types";

export function ProfileCard({
  card,
  view,
  onFavorite,
}: {
  card: Card;
  view: "large" | "grid" | "list";
  onFavorite?: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const photos = card.photos.length ? card.photos : [];
  const main = photos[0]?.url;
  const side = [photos[1]?.url || main, photos[2]?.url || main];

  if (view === "list") {
    return (
      <article className="flex items-center gap-4 rounded-[1.5rem] border border-hairline bg-charcoal p-3">
        <Link href={`/catalog/${card.id}`} className="h-20 w-16 shrink-0 overflow-hidden rounded-2xl">
          {main ? <img src={main} alt="" className="h-full w-full object-cover" /> : null}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/catalog/${card.id}`} className="block truncate font-serif text-2xl italic text-white">
            {card.name}
          </Link>
          <p className="text-xs text-zincMuted">
            {ageLabel(card.age, locale)} · {card.city}
          </p>
        </div>
        <span className="hidden text-xs font-bold text-champagne sm:inline">{t(`tier.${card.tier}`)}</span>
      </article>
    );
  }

  const tall = view === "large";
  return (
    <article className={`card-hover group flex flex-col overflow-hidden rounded-[1.5rem] border border-hairline bg-charcoal sm:rounded-[2rem] ${tall ? "sm:min-h-[640px]" : "sm:min-h-[460px]"}`}>
      <div className={`relative overflow-hidden ${tall ? "aspect-[3/4] sm:aspect-auto sm:min-h-0 sm:flex-1" : "aspect-[4/5] sm:aspect-auto sm:min-h-0 sm:flex-1"}`}>
        <Link href={`/catalog/${card.id}`} className="absolute inset-0">
          {main ? <img src={main} alt="" className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" /> : null}
          <span className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
        </Link>
        <div className="pointer-events-none absolute left-4 top-4 flex max-w-[70%] flex-col gap-2 sm:left-5 md:left-8 md:top-8">
          <span className={`w-fit rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md sm:px-4 sm:py-2 ${card.availability === "AVAILABLE" ? "border-emerald/30 bg-emerald/10 text-emerald" : "border-champagne/30 bg-champagne/10 text-champagne"}`}>
            {t(`status.${card.availability}`)}
          </span>
          <span className="w-fit max-w-full truncate rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md sm:px-4 sm:py-2">
            {card.city}
          </span>
        </div>
        {onFavorite ? (
          <button
            type="button"
            onClick={() => onFavorite(card.id)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-zincMuted backdrop-blur-md transition-colors hover:text-champagne sm:right-5 sm:h-12 sm:w-12 md:right-8 md:top-8"
            aria-label={t("catalog.saved")}
          >
            <Star weight={card.favorite ? "fill" : "regular"} className={card.favorite ? "text-champagne" : ""} size={22} />
          </button>
        ) : null}
        <div className="pointer-events-none absolute bottom-28 right-5 hidden flex-col gap-2 sm:flex md:bottom-32 md:right-8">
          {side.map((src, index) =>
            src ? (
              <span key={index} className={`h-16 w-14 overflow-hidden rounded-2xl shadow-2xl md:h-24 md:w-20 ${index === 0 ? "border-2 border-champagne" : "border border-white/20"}`}>
                <img src={src} alt="" className="h-full w-full object-cover" />
              </span>
            ) : null,
          )}
        </div>
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-5 sm:right-24 md:bottom-10 md:left-8">
          <h3 className={`font-serif italic tracking-tight text-white ${tall ? "text-4xl md:text-5xl" : "text-3xl"}`}>{card.name}</h3>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-champagne">{ageLabel(card.age, locale)}</p>
          {tall ? <p className="mt-3 line-clamp-2 max-w-lg text-sm text-zincMuted">{card.excerpt}</p> : null}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 pt-4 sm:hidden">
        {photos.slice(0, 3).map((photo) => (
          <Link key={photo.id} href={`/catalog/${card.id}`} className="aspect-[3/4] overflow-hidden rounded-xl">
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
          </Link>
        ))}
      </div>
      <div className="flex flex-col gap-4 border-t border-hairline bg-graphite/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 md:p-8">
        <div className="grid grid-cols-3 gap-3 sm:flex sm:gap-8">
          <Meta label={t("catalog.ethnicity")} value={t(`ethnicity.${card.ethnicity}`)} />
          <Meta label={t("catalog.height")} value={`${card.heightCm} cm`} />
          <Meta label={t("catalog.status")} value={t(`tier.${card.tier}`)} gold />
        </div>
        <Link href={`/catalog/${card.id}`} className="gold-gradient min-h-12 rounded-2xl px-6 py-3 text-center text-xs font-bold uppercase tracking-widest text-ink">
          {t("catalog.dossier")}
        </Link>
      </div>
    </article>
  );
}

function Meta({ label, value, gold = false }: { label: string; value: string; gold?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-zincMuted">{label}</p>
      <p className={`break-words text-xs leading-snug ${gold ? "font-bold text-champagne" : "text-white"}`}>{value}</p>
    </div>
  );
}
