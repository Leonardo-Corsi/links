#!/usr/bin/env node
/**
 * Generate a composition-aware static portrait for the CV at build time.
 *
 * Source: assets/ppic/ppic.png (preserved, never overwritten)
 * Output: assets/ppic/ppic-smartcrop.jpg (commit this generated asset)
 *
 * Dependencies run only during development; the published Jekyll site
 * serves a static JPEG and does not load SmartCrop/Sharp in the browser.
 */
'use strict';
const path = require('node:path');
const fs = require('node:fs/promises');
const smartcrop = require('smartcrop-sharp');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const input = path.join(root, 'assets', 'ppic', 'ppic.png');
const output = path.join(root, 'assets', 'ppic', 'ppic-smartcrop.jpg');
const OUT_SIZE = 560; // plenty for 28-mm A4 print portrait and high-DPI screens

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

async function main() {
  await fs.access(input);

  // The source is explicitly PNG, so no EXIF rotation is needed.
  // SmartCrop considers saliency, skin color and the rule of thirds;
  // it is NOT a facial landmark detector.
  const result = await smartcrop.crop(input, {
    width: OUT_SIZE,
    height: OUT_SIZE,
    ruleOfThirds: true,
  });
  if (!result || !result.topCrop) {
    throw new Error('SmartCrop did not return a crop');
  }

  const info = await sharp(input).metadata();
  const crop = result.topCrop;
  const left = clamp(Math.round(crop.x), 0, info.width - 1);
  const top = clamp(Math.round(crop.y), 0, info.height - 1);
  const width = clamp(Math.round(crop.width), 1, info.width - left);
  const height = clamp(Math.round(crop.height), 1, info.height - top);

  await fs.mkdir(path.dirname(output), {recursive: true});
  await sharp(input)
    .extract({left, top, width, height})
    .resize(OUT_SIZE, OUT_SIZE, {fit: 'cover', kernel: 'lanczos3'})
    .jpeg({quality: 88, mozjpeg: true})
    .toFile(output);

  const relative = (p) => path.relative(root, p).replaceAll('\\', '/');
  const bytes = (await fs.stat(output)).size;
  console.log('SmartCrop source:', relative(input), `${info.width}x${info.height}`);
  console.log('Selected crop:', `x=${left}, y=${top}, ${width}x${height}`);
  console.log('Output:', relative(output), `${OUT_SIZE}x${OUT_SIZE}`, `${Math.round(bytes / 1024)} KB`);
}
main().catch((error) => {
  console.error('Portrait crop failed:', error.message);
  process.exitCode = 1;
});
