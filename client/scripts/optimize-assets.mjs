import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIR = path.resolve("src/assets");

// Hero art is shown full width, card art is smaller. Widths are a ceiling:
// withoutEnlargement stops us from blowing up anything already small.
const TARGETS = [
  { file: "laptop.png", width: 1400 },
  { file: "about.png", width: 1200 },
  { file: "student.png", width: 1000 },
  { file: "campusboy.png", width: 900 },
  { file: "bush-side.png", width: 900 },
];

const kb = (bytes) => `${(bytes / 1024).toFixed(0).padStart(5)} kB`;
const saved = (before, after) => `-${Math.round((1 - after / before) * 100)}%`;

let beforeTotal = 0;
let afterTotal = 0;

for (const { file, width } of TARGETS) {
  const input = path.join(DIR, file);
  const output = path.join(DIR, file.replace(/\.png$/, ".webp"));

  const before = (await readFile(input)).length;
  const meta = await sharp(input).metadata();
  const target = Math.min(width, meta.width ?? width);

  await sharp(input)
    .resize({ width: target, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(output);

  const after = (await readFile(output)).length;
  beforeTotal += before;
  afterTotal += after;
  console.log(
    `${file.padEnd(16)} ${String(meta.width).padStart(4)}x${String(meta.height).padEnd(4)} -> ${target}w   ${kb(before)} -> ${kb(after)}  ${saved(before, after)}`,
  );
}

console.log(
  `\ntotal ${kb(beforeTotal)} -> ${kb(afterTotal)}  ${saved(beforeTotal, afterTotal)}`,
);
