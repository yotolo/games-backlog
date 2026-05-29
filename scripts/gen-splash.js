/**
 * Generates assets/splash.png — 2732×2732 dark background (#0d0d1a) with the
 * 512×512 icon centered at 512px. Used by @capacitor/assets to produce all
 * Android splash-screen density variants.
 */
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const OUT  = path.resolve(__dirname, '../assets/splash.png');
const ICON = path.resolve(__dirname, '../public/icon-512.png');
const SIZE = 2732;
const ICON_SIZE = 512;
const OFFSET = Math.floor((SIZE - ICON_SIZE) / 2);

// Dark background (#0d0d1a = 13,13,26)
const bg = Buffer.alloc(SIZE * SIZE * 4);
for (let i = 0; i < SIZE * SIZE; i++) {
  bg[i * 4 + 0] = 13;   // R
  bg[i * 4 + 1] = 13;   // G
  bg[i * 4 + 2] = 26;   // B
  bg[i * 4 + 3] = 255;  // A
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const iconBuf = await sharp(ICON).resize(ICON_SIZE, ICON_SIZE).toBuffer();

  await sharp(bg, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .composite([{ input: iconBuf, left: OFFSET, top: OFFSET }])
    .png()
    .toFile(OUT);

  console.log(`✓ ${OUT} (${SIZE}×${SIZE})`);
}

main().catch(e => { console.error(e); process.exit(1); });
