/**
 * Finds images that exist with the identical filename AND identical byte
 * content in BOTH src/assets/images and public/images, then checks your
 * actual .tsx/.ts source files to see whether each copy is referenced
 * before recommending anything. This is a REPORT ONLY script — it never
 * deletes anything. You review the report, then delete manually if you
 * agree with a recommendation.
 *
 * RUN:
 *   node find-duplicate-images.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const SRC_IMAGES = path.resolve("src/assets/images");
const PUBLIC_IMAGES = path.resolve("public/images");
const SRC_CODE_DIR = path.resolve("src");
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png"]);
const CODE_EXTS = new Set([".ts", ".tsx"]);

async function hashFile(filePath) {
  const buf = await readFile(filePath);
  return crypto.createHash("md5").update(buf).digest("hex");
}

async function listImages(dir) {
  const files = await readdir(dir);
  return files.filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()));
}

// Recursively collects every .ts/.tsx file's text content, concatenated,
// so we can just do simple substring checks against it.
async function collectAllCode(dir) {
  let combined = "";
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "assets") continue; // skip image folders themselves
      combined += await collectAllCode(full);
    } else if (CODE_EXTS.has(path.extname(entry.name).toLowerCase())) {
      combined += await readFile(full, "utf-8");
    }
  }
  return combined;
}

function isReferenced(codeText, filename) {
  return codeText.includes(filename);
}

// The public-URL usage pattern always starts a string literal with
// "images/...", e.g.  BASE_URL + "images/Aarti.jpg"
// The src-import pattern always has something before "images/" inside
// the string, e.g.  "./assets/images/Aarti.jpg"
// So checking for a quote character immediately before "images/" correctly
// tells the two apart, instead of a bare substring check which matched
// both (that was the bug in the previous version of this script).
function isReferencedAsPublicUrl(codeText, filename) {
  return (
    codeText.includes(`"images/${filename}`) ||
    codeText.includes(`'images/${filename}`)
  );
}

async function run() {
  console.log("Scanning images...");
  const srcFiles = await listImages(SRC_IMAGES);
  const pubFiles = await listImages(PUBLIC_IMAGES);
  const common = srcFiles.filter((f) => pubFiles.includes(f));

  console.log(`Found ${common.length} filenames present in both folders. Checking content...`);

  const trueDuplicates = [];
  for (const file of common) {
    const hSrc = await hashFile(path.join(SRC_IMAGES, file));
    const hPub = await hashFile(path.join(PUBLIC_IMAGES, file));
    if (hSrc === hPub) trueDuplicates.push(file);
  }

  console.log(`\n${trueDuplicates.length} of those are byte-identical true duplicates.`);
  console.log("Scanning your code (src/, index.html, public/*.html) to see how each is actually used...\n");

  let codeText = await collectAllCode(SRC_CODE_DIR);

  // Also scan index.html and any .html files directly inside public/ —
  // these can reference images too (e.g. og:image meta tags) and are
  // outside src/, so the recursive scan above never sees them.
  const rootIndexPath = path.resolve("index.html");
  try {
    codeText += await readFile(rootIndexPath, "utf-8");
  } catch { /* no index.html at root, skip */ }

  try {
    const publicEntries = await readdir(path.resolve("public"));
    for (const entry of publicEntries) {
      if (entry.toLowerCase().endsWith(".html")) {
        codeText += await readFile(path.resolve("public", entry), "utf-8");
      }
    }
  } catch { /* no public/ dir, skip */ }

  const safeToRemovePublic = [];
  const safeToRemoveSrc = [];
  const keepBoth = [];
  const neitherReferenced = [];

  for (const file of trueDuplicates) {
    const usedAsSrcImport = isReferenced(codeText, `assets/images/${file}`);
    const usedAsPublicUrl = isReferencedAsPublicUrl(codeText, file);

    if (usedAsSrcImport && usedAsPublicUrl) {
      keepBoth.push(file);
    } else if (usedAsSrcImport && !usedAsPublicUrl) {
      safeToRemovePublic.push(file);
    } else if (!usedAsSrcImport && usedAsPublicUrl) {
      safeToRemoveSrc.push(file);
    } else {
      neitherReferenced.push(file);
    }
  }

  console.log("=== REPORT (nothing has been deleted) ===\n");

  console.log(`Safe to delete from public/images (still used via src/assets import elsewhere): ${safeToRemovePublic.length}`);
  safeToRemovePublic.forEach((f) => console.log(`  - public/images/${f}  (and matching .webp)`));

  console.log(`\nSafe to delete from src/assets/images (still used via public/ URL elsewhere): ${safeToRemoveSrc.length}`);
  safeToRemoveSrc.forEach((f) => console.log(`  - src/assets/images/${f}  (and matching .webp)`));

  console.log(`\nUsed from BOTH locations by different components — keep both copies: ${keepBoth.length}`);
  keepBoth.forEach((f) => console.log(`  - ${f}`));

  console.log(`\nNOT found referenced in either form — investigate manually before deleting, could be unused or use a pattern this script doesn't recognize: ${neitherReferenced.length}`);
  neitherReferenced.forEach((f) => console.log(`  - ${f}`));

  console.log("\nThis script never deletes anything automatically. Review the lists above, then delete the specific .jpg/.png AND matching .webp files you're comfortable removing.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
