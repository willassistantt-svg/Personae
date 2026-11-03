import Link from "next/link";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import { ArrowDown, ArrowLeft, Play, Star } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Footer, LoadingBlock, Wordmark } from "@/components/ui";
import { LanguageButton } from "@/components/ui";
import { useGuard } from "@/hooks/useGuard";
import { api } from "@/lib/api";
import { ageLabel, formatPrice, heightLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Detail } from "@/lib/types";

export function DetailContainer() {
  const session = useGuard(false);
  const { t, locale } = useI18n();
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const client = useQueryClient();
  const scroller = useRef<HTMLDivElement>(null);
  const [contact, setContact] = useState(false);
  const [film, setFilm] = useState<Detail["videos"][number] | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["profile", id, locale],
    enabled: Boolean(session.user && id),
    queryFn: () => api<Detail>(`/api/profiles/${id}?locale=${locale}`),
  });
  const favorite = useMutation({
    mutationFn: () => api(`/api/profiles/${id}/favorite`, { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["profile", id] }),
  });

  if (!session.user || detail.isLoading || !router.isReady) {
    return <LoadingBlock label={t("common.loading")} />;
  }
  if (!detail.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink">
        <p className="text-sm text-zincMuted">{t("common.error")}</p>
        <Link href="/catalog" className="text-xs uppercase tracking-widest text-champagne">
          {t("detail.back")}
        </Link>
      </div>
    );
  }
  const persona = detail.data;
  const hero = persona.photos[0]?.url;

  return (
    <div className="min-h-screen bg-ink pb-24 sm:pb-0">
      <header className="fixed top-0 z-40 w-full border-b border-hairline/60 bg-ink/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-2 px-3 md:h-24 md:px-8">
          <div className="flex min-w-0 items-center gap-2 md:gap-10">
            <Link href="/catalog" aria-label="Personae" className="hidden sm:block">
              <Wordmark compact />
            </Link>
            <Link href="/catalog" className="flex min-h-11 min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zincMuted hover:text-white md:text-xs">
              <ArrowLeft /> <span className="truncate">{t("detail.back")}</span>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-5">
            <LanguageButton />
            <button type="button" onClick={() => favorite.mutate()} className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline hover:border-champagne">
              <Star weight={persona.favorite ? "fill" : "regular"} className={persona.favorite ? "text-champagne" : ""} />
            </button>
            <button type="button" onClick={() => setContact(true)} className="gold-gradient hidden min-h-11 rounded-xl px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-ink sm:inline-flex md:px-8 md:text-xs">
              {t("detail.contact")}
            </button>
          </div>
        </div>
      </header>
      <main className="pb-28 pt-16 sm:pb-0 md:pt-24">
        <section className="relative h-[78svh] min-h-[26rem] w-full overflow-hidden md:h-[800px]">
          {hero ? <img src={hero} alt="" className="h-full w-full object-cover" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
          <div className="absolute bottom-12 left-0 w-full px-5 md:bottom-20 md:px-12 lg:px-24">
            <div className="max-w-4xl">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-champagne/40 bg-champagne/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-champagne backdrop-blur-md">
                  {t(`tier.${persona.tier}`)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
                  {persona.city}
                </span>
              </div>
              <h2 className="mb-6 break-words font-serif text-5xl italic tracking-tight text-white sm:text-6xl md:text-8xl">{persona.name}.</h2>
              <p className="mb-8 line-clamp-4 max-w-2xl text-base font-medium leading-relaxed text-zincBright/80 sm:line-clamp-none md:text-xl">{persona.description}</p>
              <a href="#gallery" className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.3em] text-champagne">
                {t("detail.gallery")} <ArrowDown className="animate-bounce" />
              </a>
            </div>
          </div>
        </section>
        <section id="gallery" className="border-y border-hairline bg-charcoal/30 py-16 md:py-24">
          <div className="mb-10 flex flex-col gap-4 px-5 sm:flex-row sm:items-end sm:justify-between md:px-12 lg:px-24">
            <div className="min-w-0">
              <h3 className="mb-2 font-serif text-3xl italic sm:text-4xl">{t("detail.gallery")}</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-zincMuted">{t("detail.galleryNote")}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => scroller.current?.scrollBy({ left: -420, behavior: "smooth" })} className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline text-zincMuted hover:border-champagne hover:text-white">
                <ArrowLeft />
              </button>
              <button type="button" onClick={() => scroller.current?.scrollBy({ left: 420, behavior: "smooth" })} className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline text-zincMuted hover:border-champagne hover:text-white">
                <ArrowLeft className="rotate-180" />
              </button>
            </div>
          </div>
          <div ref={scroller} className="no-scrollbar flex snap-x gap-6 overflow-x-auto px-5 md:px-12 lg:px-24">
            {persona.photos.map((item) => (
              <button type="button" key={item.id} onClick={() => setPhoto(item.url)} className="h-[68vh] w-[82vw] max-w-[24rem] shrink-0 snap-center overflow-hidden rounded-[1.5rem] border border-hairline/40 sm:h-[420px] sm:w-[280px] sm:rounded-[2rem] md:h-[650px] md:w-[500px] md:max-w-none">
                <img src={item.url} alt="" className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
              </button>
            ))}
          </div>
        </section>
        <section className="mx-auto grid max-w-[1600px] grid-cols-1 items-start gap-16 px-5 py-20 md:px-12 lg:grid-cols-2 lg:gap-24 lg:px-24">
          <div>
            <h3 className="mb-8 font-serif text-4xl italic sm:mb-10 sm:text-5xl">
              {t("detail.persona")} <span className="font-bold not-italic text-champagne">{t("detail.personaEm")}</span>
            </h3>
            <div className="space-y-6 text-base leading-relaxed text-zincMuted md:text-lg">
              {persona.description.split(/\n+/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-hairline bg-charcoal p-5 sm:rounded-[3rem] sm:p-8 md:p-14">
            <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-champagne/5 blur-3xl" />
            <h3 className="mb-10 border-b border-hairline/40 pb-6 font-serif text-3xl italic">{t("detail.refined")}</h3>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <Fact label={t("detail.age")} value={ageLabel(persona.age, locale)} />
              <Fact label={t("catalog.ethnicity")} value={t(`ethnicity.${persona.ethnicity}`)} />
              <Fact label={t("catalog.height")} value={heightLabel(persona.heightCm)} />
              <Fact label={t("detail.weight")} value={`${persona.weightKg} kg`} />
              <Fact label={t("detail.hair")} value={persona.hair || "—"} />
              <Fact label={t("detail.eyes")} value={persona.eyes || "—"} />
              <Fact label={t("detail.languages")} value={persona.languages || "—"} />
              <Fact label={t("detail.availability")} value={t(`status.${persona.availability}`)} />
              <Fact label={t("detail.fee")} value={formatPrice(persona.priceCents, persona.currency, locale)} />
              <Fact label={t("detail.sitePhone")} value={persona.sitePhone} />
              <Fact label={t("detail.profilePhone")} value={persona.phone} />
              <Fact label={t("detail.email")} value={persona.email} />
            </div>
          </div>
        </section>
        <section className="bg-ink px-5 py-16 md:px-12 lg:px-24">
          <div className="mb-12 text-center">
            <h3 className="mb-4 font-serif text-4xl italic sm:text-5xl">
              {t("detail.films")} <span className="font-bold not-italic text-champagne">{t("detail.filmsEm")}</span>
            </h3>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-zincMuted">{t("detail.filmsNote")}</p>
          </div>
          {persona.videos.length === 0 ? <p className="text-center text-sm text-zincMuted">{t("detail.noFilm")}</p> : null}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {persona.videos.map((item) => (
              <button type="button" key={item.id} onClick={() => setFilm(item)} className="group relative aspect-[3/4] overflow-hidden rounded-3xl border border-hairline sm:aspect-[9/16]">
                <img src={hero} alt="" className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/30 backdrop-blur-md">
                    <Play weight="fill" className="text-3xl text-white" />
                  </span>
                </span>
                <span className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-3">
                  <span className="min-w-0 truncate rounded-full bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">{item.label || "Film"}</span>
                  <span className="font-mono text-[10px] text-white/80">{item.durationLabel}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-ink/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <button type="button" onClick={() => setContact(true)} className="gold-gradient min-h-12 w-full rounded-2xl px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-ink">
          {t("detail.contact")}
        </button>
      </div>
      {contact ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:px-4">
          <button type="button" className="absolute inset-0 bg-ink/95 backdrop-blur-md" onClick={() => setContact(false)} aria-label={t("detail.close")} />
          <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border border-hairline bg-charcoal p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2.5rem] sm:p-8 md:p-12">
            <h3 className="mb-3 text-center font-serif text-3xl italic text-white">{t("detail.contactTitle")}</h3>
            <p className="mb-8 text-center text-sm leading-relaxed text-zincMuted">{t("detail.contactLead")}</p>
            <div className="space-y-4 text-sm">
              <p><span className="block text-[10px] uppercase tracking-widest text-zincMuted">{t("detail.sitePhone")}</span><a className="inline-flex min-h-11 items-center break-all text-base text-champagne" href={`tel:${persona.sitePhone}`}>{persona.sitePhone}</a></p>
              <p><span className="block text-[10px] uppercase tracking-widest text-zincMuted">{t("detail.profilePhone")}</span><a className="inline-flex min-h-11 items-center break-all text-base text-champagne" href={`tel:${persona.phone}`}>{persona.phone}</a></p>
              <p><span className="block text-[10px] uppercase tracking-widest text-zincMuted">{t("detail.email")}</span><a className="inline-flex min-h-11 items-center break-all text-base text-champagne" href={`mailto:${persona.email}`}>{persona.email}</a></p>
              <p><span className="block text-[10px] uppercase tracking-widest text-zincMuted">{t("detail.fee")}</span>{formatPrice(persona.priceCents, persona.currency, locale)}</p>
            </div>
            <button type="button" onClick={() => setContact(false)} className="mt-8 w-full py-4 text-xs font-bold uppercase tracking-widest text-zincMuted">
              {t("detail.close")}
            </button>
          </div>
        </div>
      ) : null}
      {film ? (
        <div className="fixed inset-0 z-[80] flex flex-col bg-ink/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
          <button type="button" className="mb-4 self-end px-2 py-3 text-xs uppercase tracking-widest text-champagne" onClick={() => setFilm(null)}>
            {t("detail.close")}
          </button>
          <video src={film.url} controls autoPlay playsInline className="mx-auto max-h-[75dvh] w-full rounded-3xl" />
        </div>
      ) : null}
      {photo ? (
        <button type="button" className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/95 p-4" onClick={() => setPhoto(null)}>
          <img src={photo} alt="" className="max-h-[85dvh] max-w-full rounded-3xl object-contain" />
        </button>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zincMuted">{label}</p>
      <p className="break-words text-base font-medium text-white sm:text-lg">{value}</p>
    </div>
  );
}
