import type { Media } from "@/lib/types";

export type PendingPhoto = { key: string; file: File; url: string };
export type Tile = { media: Media; pending?: undefined } | { media?: undefined; pending: PendingPhoto };

export function move<T>(items: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function tileKey(tile: Tile): string {
  return tile.pending ? tile.pending.key : tile.media.id;
}

/** Saved and new photos in the order on screen; items the layout does not know yet go to the end. */
export function arrangeTiles(saved: Media[], pending: PendingPhoto[], layout: string[] | null): Tile[] {
  const all: Tile[] = [...saved.map((media) => ({ media })), ...pending.map((item) => ({ pending: item }))];
  if (!layout) return all;
  const byKey = new Map(all.map((tile) => [tileKey(tile), tile]));
  const placed = layout.flatMap((key) => {
    const tile = byKey.get(key);
    if (!tile) return [];
    byKey.delete(key);
    return [tile];
  });
  return [...placed, ...byKey.values()];
}

/** Multipart fields for a save: new files in screen order plus the full photo order ("new:<n>" for files). */
export function photoFields(tiles: Tile[]): { photos: File[]; order: string[] } {
  const photos: File[] = [];
  const order = tiles.map((tile) => {
    if (!tile.pending) return tile.media.id;
    photos.push(tile.pending.file);
    return `new:${photos.length - 1}`;
  });
  return { photos, order };
}
