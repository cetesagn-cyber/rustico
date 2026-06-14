import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '../public/logo-nuevo-2.png');
const out = path.join(__dirname, '../public/icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function main() {
  if (!fs.existsSync(src)) {
    console.error('No se encontró logo-nuevo-2.png en /public');
    process.exit(1);
  }
  fs.mkdirSync(out, { recursive: true });
  for (const size of sizes) {
    await sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 30, g: 51, b: 84, alpha: 1 } })
      .png()
      .toFile(path.join(out, `icon-${size}.png`));
    console.log(`✓ icon-${size}.png`);
  }
  // favicon SVG fallback  
  console.log('Iconos generados en public/icons/');
}

main().catch(console.error);
