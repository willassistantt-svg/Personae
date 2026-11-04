import { describe, expect, it } from "vitest";
import { arrangeTiles, move, photoFields, tileKey, type PendingPhoto } from "@/lib/photoTiles";
import type { Media } from "@/lib/types";

const saved = (id: string) => ({ id, kind: "PHOTO", url: `/api/media/${id}` }) as Media;
const fresh = (key: string): PendingPhoto => ({ key, file: new File(["x"], `${key}.jpg`), url: `blob:${key}` });

describe("photo tiles", () => {
  const photos = [saved("a"), saved("b")];
  const pending = [fresh("n1"), fresh("n2")];

  it("starts with saved photos, then new ones", () => {
    expect(arrangeTiles(photos, pending, null).map(tileKey)).toEqual(["a", "b", "n1", "n2"]);
  });

  it("lets a new photo sit anywhere and appends what the layout does not know", () => {
    const layout = move(arrangeTiles(photos, pending, null).map(tileKey), 2, 0);
    expect(layout).toEqual(["n1", "a", "b", "n2"]);
    expect(arrangeTiles(photos, [...pending, fresh("n3")], layout).map(tileKey)).toEqual(["n1", "a", "b", "n2", "n3"]);
  });

  it("drops removed photos from the layout", () => {
    expect(arrangeTiles([saved("b")], [fresh("n2")], ["n1", "a", "b", "n2"]).map(tileKey)).toEqual(["b", "n2"]);
  });

  it("sends files in screen order with matching order tokens", () => {
    const tiles = arrangeTiles(photos, pending, ["n2", "a", "n1", "b"]);
    const fields = photoFields(tiles);
    expect(fields.photos.map((file) => file.name)).toEqual(["n2.jpg", "n1.jpg"]);
    expect(fields.order).toEqual(["new:0", "a", "new:1", "b"]);
  });

  it("ignores moves outside the list", () => {
    const items = ["a", "b"];
    expect(move(items, 0, 5)).toBe(items);
    expect(move(items, 1, 1)).toBe(items);
  });
});
