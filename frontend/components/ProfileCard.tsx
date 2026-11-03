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
          <Link href={`/catalog/${card.id}`} className="font-serif text-2xl italic text-white">
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
    <article className={`card-hover group flex flex-col overflow-hidden rounded-[2rem] border border-hairline bg-charcoal ${tall ? "min-h-[640px]" : "min-h-[460px]"}`}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Link href={`/catalog/${card.id}`} className="absolute inset-0">
          {main ? <img src={main} alt="" className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" /> : null}
          <span className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
        </Link>
        <div className="pointer-events-none absolute left-5 top-5 flex flex-col gap-2 md:left-8 md:top-8">
          <span className={`w-fit rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md ${card.availability === "AVAILABLE" ? "border-emerald/30 bg-emerald/10 text-emerald" : "border-champagne/30 bg-champagne/10 text-champagne"}`}>
            {t(`status.${card.availability}`)}
          </span>
          <span className="w-fit rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
            {card.city}
          </span>
        </div>
        {onFavorite ? (
          <button
            type="button"
            onClick={() => onFavorite(card.id)}
            className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-zincMuted backdrop-blur-md transition-colors hover:text-champagne md:right-8 md:top-8"
            aria-label={t("catalog.saved")}
          >
            <Star weight={card.favorite ? "fill" : "regular"} className={card.favorite ? "text-champagne" : ""} size={22} />
          </button>
        ) : null}
        <div className="pointer-events-none absolute bottom-28 right-5 flex flex-col gap-2 md:bottom-32 md:right-8">
          {side.map((src, index) =>
            src ? (
              <span key={index} className={`h-16 w-14 overflow-hidden rounded-2xl shadow-2xl md:h-24 md:w-20 ${index === 0 ? "border-2 border-champagne" : "border border-white/20"}`}>
                <img src={src} alt="" className="h-full w-full object-cover" />
              </span>
            ) : null,
          )}
        </div>
        <div className="pointer-events-none absolute bottom-6 left-5 right-24 md:bottom-10 md:left-8">
          <h3 className={`font-serif italic tracking-tight text-white ${tall ? "text-4xl md:text-5xl" : "text-3xl"}`}>{card.name}</h3>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-champagne">{ageLabel(card.age, locale)}</p>
          {tall ? <p className="mt-3 line-clamp-2 max-w-lg text-sm text-zincMuted">{card.excerpt}</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-4 border-t border-hairline bg-graphite/40 p-5 sm:flex-row sm:items-center sm:justify-between md:p-8">
        <div className="flex gap-8">
          <Meta label={t("catalog.ethnicity")} value={t(`ethnicity.${card.ethnicity}`)} />
          <Meta label={t("catalog.height")} value={`${card.heightCm} cm`} />
          <Meta label={t("catalog.status")} value={t(`tier.${card.tier}`)} gold />
        </div>
        <Link href={`/catalog/${card.id}`} className="gold-gradient rounded-2xl px-6 py-3 text-center text-xs font-bold uppercase tracking-widest text-ink">
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
      <p className={`text-xs ${gold ? "font-bold text-champagne" : "text-white"}`}>{value}</p>
    </div>
  );
}
