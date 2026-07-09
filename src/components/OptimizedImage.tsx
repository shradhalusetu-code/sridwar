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
import type { CSSProperties, HTMLAttributeReferrerPolicy } from "react";

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
}: OptimizedImageProps) {
  const derivedWebp = webpSrc ?? src.replace(/\.(jpe?g|png)(\?.*)?$/i, ".webp$2");

  return (
    <picture>
      <source srcSet={derivedWebp} type="image/webp" />
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
      />
    </picture>
  );
}
