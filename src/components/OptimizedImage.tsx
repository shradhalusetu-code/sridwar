/**
 * Drop-in replacement for a plain <img> tag.
 *
 * Renders a <picture> that serves the .webp version to every modern browser
 * and silently falls back to the original .jpg/.png if webp isn't supported
 * or the file is ever missing — no JS, nothing can visibly break.
 *
 * WHICH CASE ARE YOU IN?
 *
 * 1. Your `src` comes from `import.meta.env.BASE_URL + "images/Name.jpg"`
 *    (this is true for ~everything driven by data/*.ts — bazaar, seva,
 *    wellness, temples, live darshan, etc.)
 *      -> just pass `src`. The matching "Name.webp" sits right next to
 *         "Name.jpg" in public/images (convert-images-to-webp.mjs put it
 *         there), so it's derived automatically. No other prop needed.
 *
 * 2. Your image comes from a static import at the top of the file, e.g.
 *      import deityJagannath from "../assets/images/deity_jagannath_....jpg";
 *      import deityJagannathWebp from "../assets/images/deity_jagannath_....webp";
 *    (Vite fingerprints these into hashed /assets/ filenames at build time,
 *    so string-replacing ".jpg" -> ".webp" on the resolved URL will NOT
 *    work and will 404.)
 *      -> pass BOTH `src={deityJagannath}` AND `webpSrc={deityJagannathWebp}`.
 *
 * If you're not sure which case a component is in, check its imports —
 * if you see `import xyz from "../assets/images/..."` at the top, you're
 * in case 2 for that image.
 */
import type { CSSProperties, HTMLAttributeReferrerPolicy, SyntheticEvent } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Only needed for statically-imported images — see case 2 above. */
  webpSrc?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  width?: number;
  height?: number;
  style?: CSSProperties;
  referrerPolicy?: HTMLAttributeReferrerPolicy;
  /** Passed straight through to the underlying <img> (e.g. broken-image fallback UI). */
  onError?: (e: SyntheticEvent<HTMLImageElement, Event>) => void;
}

export default function OptimizedImage({
  src,
  alt,
  className,
  webpSrc,
  loading = "lazy",
  fetchPriority,
  width,
  height,
  style,
  referrerPolicy,
  onError,
}: OptimizedImageProps) {
  const derivedWebp = webpSrc ?? src.replace(/\.(jpe?g|png)(\?.*)?$/i, ".webp$2");

  // ── srcset space fix ──────────────────────────────────────────────────
  // `srcset`/`<source srcSet>` is a comma-separated list of "url descriptor"
  // pairs. Several source filenames contain spaces (e.g. "Gau Seva.jpg"),
  // and an un-encoded space in that position is read by the browser as the
  // boundary between the URL and a width descriptor — so it silently drops
  // the whole candidate (visible in DevTools as "Dropped srcset candidate").
  // encodeURI() turns the space into %20 so the browser treats the whole
  // path as one URL. It's a no-op for paths that have no spaces, and safe
  // for Vite-hashed asset URLs (webpSrc / case 2) since those never contain
  // characters encodeURI would touch.
  const safeWebpSrcSet = encodeURI(derivedWebp);

  return (
    <picture>
      <source srcSet={safeWebpSrcSet} type="image/webp" />
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        width={width}
        height={height}
        style={style}
        referrerPolicy={referrerPolicy}
        onError={onError}
      />
    </picture>
  );
}
