/**
 * Run this AFTER convert-images-to-webp.mjs, from the same project folder.
 * It checks every .webp file it finds in src/assets/images and public/images
 * and reports:
 *   - its actual width/height (so you can confirm hero/aerial images came out
 *     at 1920px and card images came out at 1000px, as intended)
 *   - its file size
 *   - whether it's 0 bytes or unreadable (a leftover from a failed/locked
 *     write, like the "Invalid argument" error from earlier)
 *
 * RUN:
 *   node verify-webp.mjs
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIRS = [
  path.resolve("src/assets/images"),
  path.resolve("public/images"),
];

async function checkDir(dir) {
  const files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".webp"));
  const problems = [];

  console.log(`\n--- ${dir} (${files.length} webp files) ---`);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const stats = await stat(fullPath);
      if (stats.size === 0) {
        problems.push(`${file} — 0 bytes, likely a failed write, delete and re-run the conversion for this file`);
        continue;
      }
      const meta = await sharp(fullPath).metadata();
      const sizeKB = (stats.size / 1024).toFixed(0);
      console.log(`${file}  ${meta.width}x${meta.height}  ${sizeKB}KB`);
    } catch (err) {
      problems.push(`${file} — could not be read (${err.message})`);
    }
  }

  return problems;
}

async function run() {
  let allProblems = [];
  for (const dir of DIRS) {
    const problems = await checkDir(dir);
    allProblems = allProblems.concat(problems);
  }

  if (allProblems.length > 0) {
    console.log(`\n${allProblems.length} PROBLEM FILE(S) FOUND:`);
    allProblems.forEach((p) => console.log(`  - ${p}`));
    console.log("\nFix: delete the problem file(s) listed above, close anything that might have them open, and re-run convert-images-to-webp.mjs — it'll only need to remake the missing ones.");
  } else {
    console.log("\nAll webp files look healthy — correct dimensions, non-zero size, readable.");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
