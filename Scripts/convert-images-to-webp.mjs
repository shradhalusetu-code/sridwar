/**
 * Batch-converts src/assets/images/*.{jpg,jpeg,png} and public/images/*.{jpg,jpeg,png}
 * to WebP — v2, tuned for better compression after the first pass only got
 * 28.21MB -> 24.16MB (~14%).
 *
 * WHAT CHANGED FROM v1 AND WHY:
 *
 * 1. TIERED RESIZE WIDTH — v1 resized everything to a max of 1600px, but most
 *    of your images (deity cards, seva cards, bazaar products) actually render
 *    inside cards far narrower than that on screen. Full-width hero/banner/
 *    aerial shots genuinely need to stay large; small card images don't.
 *    This version picks the resize width based on the filename:
 *      - files with "hero", "aerial", "og-preview" in the name -> stay at 1920px
 *      - everything else -> resize to 1000px (2x a ~500px card, which covers
 *        retina screens without keeping full camera resolution)
 *    If a specific image looks soft after this, just move its filename into
 *    the LARGE list below and re-run.
 *
 * 2. STRONGER COMPRESSION EFFORT — added `effort: 6` (max) to the webp
 *    encoder. This makes sharp spend more CPU time finding a smaller file at
 *    the SAME visual quality. It's slower per-image (fine for a one-time
 *    build script) but typically saves another 5-15% over effort's default.
 *
 * 3. QUALITY 75 instead of 80 — still visually lossless on a phone/laptop
 *    screen for photographic images, and shaves a bit more size.
 *
 * RUN LOCALLY (same as before):
 *   npm install --save-dev sharp
 *   node convert-images-to-webp.mjs
 *
 * Still non-destructive: writes new .webp files ALONGSIDE your existing
 * .jpg/.png files. Re-running this just overwrites the .webp files it made
 * before — your original .jpg/.png files are never touched.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIRS = [
  path.resolve("src/assets/images"),
  path.resolve("public/images"),
];
const EXTS = new Set([".jpg", ".jpeg", ".png"]);

// Filenames containing any of these substrings (case-insensitive) are
// treated as large/full-width images and kept at a bigger resize width.
const LARGE_IMAGE_HINTS = ["hero", "aerial", "og-preview"];

const LARGE_MAX_WIDTH = 1920;
const CARD_MAX_WIDTH = 1000;
const WEBP_QUALITY = 75;
const WEBP_EFFORT = 6; // 0 (fastest/worst) to 6 (slowest/best), sharp default is 4

function isLargeImage(filename) {
  const lower = filename.toLowerCase();
  return LARGE_IMAGE_HINTS.some((hint) => lower.includes(hint));
}

// On Windows, a file can transiently fail to write if something else
// (OneDrive, antivirus, Explorer's preview pane, Search indexing) has it
// locked for a split second. Retrying after a short pause almost always
// clears it, so we retry each file up to 3 times before giving up on it.
async function writeWithRetry(outputBuffer, outputPath, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sharp(outputBuffer).toFile(outputPath);
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
}

async function convertDir(SRC_DIR) {
  const files = await readdir(SRC_DIR);
  let totalBefore = 0;
  let totalAfter = 0;
  const failed = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!EXTS.has(ext)) continue;

    const inputPath = path.join(SRC_DIR, file);
    const outputPath = path.join(SRC_DIR, file.replace(ext, ".webp"));
    const maxWidth = isLargeImage(file) ? LARGE_MAX_WIDTH : CARD_MAX_WIDTH;

    try {
      const inputBuffer = await sharp(inputPath).toBuffer();

      const outputBuffer = await sharp(inputBuffer)
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
        .toBuffer();

      await writeWithRetry(outputBuffer, outputPath);

      totalBefore += inputBuffer.length;
      totalAfter += outputBuffer.length;

      const tag = isLargeImage(file) ? "[large]" : "[card] ";
      console.log(
        `${tag} ${file} -> ${path.basename(outputPath)}  (${(inputBuffer.length / 1024).toFixed(0)}KB -> ${(outputBuffer.length / 1024).toFixed(0)}KB)`
      );
    } catch (err) {
      failed.push(file);
      console.log(`[SKIPPED - locked or in use] ${file}  (${err.message})`);
    }
  }

  return { totalBefore, totalAfter, failed };
}

async function run() {
  let totalBefore = 0;
  let totalAfter = 0;
  const allFailed = [];

  for (const dir of DIRS) {
    console.log(`\n--- ${dir} ---`);
    const result = await convertDir(dir);
    totalBefore += result.totalBefore;
    totalAfter += result.totalAfter;
    allFailed.push(...result.failed);
  }

  console.log(
    `\nGrand total: ${(totalBefore / 1024 / 1024).toFixed(2)}MB -> ${(totalAfter / 1024 / 1024).toFixed(2)}MB`
  );

  if (allFailed.length > 0) {
    console.log(
      `\n${allFailed.length} file(s) were skipped because something had them locked:\n` +
      allFailed.map((f) => `  - ${f}`).join("\n") +
      "\n\nJust run the script again — it only needs to process the skipped ones " +
      "(files that already have a .webp will still be re-converted, which is fine)."
    );
  }

  console.log(
    "\nIf any specific image now looks too soft on a big screen, add a keyword " +
    "from its filename to LARGE_IMAGE_HINTS near the top of this file and re-run " +
    "just that one — it'll get the bigger 1920px treatment instead."
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
