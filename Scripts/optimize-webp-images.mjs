/**
 * Recompresses every existing .webp image in /public against its .jpg/.jpeg
 * source, and OVERWRITES the .webp ONLY IF the new version is smaller.
 *
 * Safe by design:
 *  - Never touches .jpg/.jpeg files (your fallback stays exactly as-is).
 *  - Never renames or moves anything — same filenames, same paths.
 *  - Never makes a file bigger — compares byte-for-byte before writing.
 *  - Does not touch OptimizedImage.tsx or any component — nothing to
 *    change there, this only shrinks the binary files it already serves.
 *
 * Why this is needed: some existing .webp files were saved at too high a
 * quality and ended up LARGER than the .jpg fallback sitting next to them
 * (e.g. Bells.webp was 80KB vs Bells.jpg at 69KB) — meaning every visitor
 * whose browser prefers webp (virtually everyone) was downloading MORE
 * data than the jpg fallback would have cost. This fixes that.
 *
 * Usage:
 *   node scripts/optimize-webp-images.mjs
 *   node scripts/optimize-webp-images.mjs --dry-run   (report only, no writes)
 *
 * Run this from the project root (where /public lives). Re-run any time
 * after adding new images — it's idempotent, already-optimal files are
 * left alone.
 */
import { readdirSync, statSync, existsSync, writeFileSync, readFileSync } from "fs";
import { join, extname } from "path";
import sharp from "sharp";

const PUBLIC_DIR = "public";
const QUALITY_CANDIDATES = [60, 65, 70, 75, 80]; // tries each, keeps the smallest
const DRY_RUN = process.argv.includes("--dry-run");

/** Recursively find every .jpg/.jpeg file under a directory. */
function findJpegs(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findJpegs(full, out);
    } else if ([".jpg", ".jpeg"].includes(extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

async function bestWebpBuffer(jpegPath) {
  const buffers = await Promise.all(
    QUALITY_CANDIDATES.map((quality) =>
      sharp(jpegPath).webp({ quality, effort: 6 }).toBuffer()
    )
  );
  return buffers.reduce((smallest, buf) => (buf.length < smallest.length ? buf : smallest));
}

async function main() {
  if (!existsSync(PUBLIC_DIR)) {
    console.error(`✗ No "${PUBLIC_DIR}" directory found. Run this from your project root.`);
    process.exit(1);
  }

  const jpegs = findJpegs(PUBLIC_DIR);
  let improved = 0;
  let skippedNoWebp = 0;
  let skippedAlreadyOptimal = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;
  const changes = [];

  for (const jpegPath of jpegs) {
    const webpPath = jpegPath.replace(/\.jpe?g$/i, ".webp");
    if (!existsSync(webpPath)) {
      skippedNoWebp++;
      continue;
    }

    const currentSize = statSync(webpPath).size;
    const candidate = await bestWebpBuffer(jpegPath);

    if (candidate.length < currentSize) {
      changes.push({
        file: webpPath,
        before: currentSize,
        after: candidate.length,
        saved: currentSize - candidate.length,
      });
      bytesBefore += currentSize;
      bytesAfter += candidate.length;
      improved++;
      if (!DRY_RUN) {
        writeFileSync(webpPath, candidate);
      }
    } else {
      skippedAlreadyOptimal++;
    }
  }

  changes.sort((a, b) => b.saved - a.saved);
  console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}Image optimization report`);
  console.log("─".repeat(60));
  for (const c of changes) {
    console.log(
      `${c.file}  ${(c.before / 1024).toFixed(0)}KB → ${(c.after / 1024).toFixed(0)}KB  (saved ${(c.saved / 1024).toFixed(0)}KB)`
    );
  }
  console.log("─".repeat(60));
  console.log(`Improved:        ${improved} file(s)`);
  console.log(`Already optimal: ${skippedAlreadyOptimal} file(s) — left untouched`);
  console.log(`No webp sibling: ${skippedNoWebp} file(s) — skipped`);
  if (improved > 0) {
    console.log(
      `Total saved:     ${((bytesBefore - bytesAfter) / 1024 / 1024).toFixed(2)} MB`
    );
  }
  if (DRY_RUN) {
    console.log("\nNo files were written (--dry-run). Re-run without the flag to apply.");
  } else {
    console.log("\nDone. Your .jpg fallbacks were not touched.");
  }
}

main().catch((err) => {
  console.error("✗ Optimization failed:", err);
  process.exit(1);
});
