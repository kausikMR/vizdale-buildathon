/**
 * Unsplash photos, free to use under the Unsplash License (unsplash.com/license) —
 * no attribution required. Hotlinked at a fixed size via Unsplash's own image
 * CDN query params rather than downloaded, so there is nothing to keep in sync.
 */
const unsplash = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const templeImages = {
  /** Thanjavur gopuram — sign-in and hero backdrop. */
  gopuram: (w = 1600) => unsplash("1661359054901-39c83f9563ac", w),
  /** Colourful sanctum-facing gopuram — event card panels. */
  sanctum: (w = 800) => unsplash("1742277296187-1cc2f783d792", w),
  /** Diya lamps — prasadam/inventory-adjacent screens, if that lane wants it. */
  diyas: (w = 800) => unsplash("1572798089532-487718bc9d26", w),
  /** Marigold flowers on a temple offering — alternate card panel. */
  flowers: (w = 800) => unsplash("1548080833-a0943f064d74", w),
};
