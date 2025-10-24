import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple cookbook icon SVG with green/teal branding
const cookbookSVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#14b8a6" rx="60"/>
  <g transform="translate(256, 256)">
    <!-- Chef hat -->
    <ellipse cx="0" cy="-80" rx="120" ry="60" fill="white"/>
    <rect x="-100" y="-80" width="200" height="80" fill="white"/>
    <rect x="-100" y="-10" width="200" height="20" rx="5" fill="#5eead4"/>

    <!-- Book -->
    <rect x="-90" y="20" width="180" height="120" rx="8" fill="white"/>
    <rect x="-80" y="30" width="160" height="100" rx="4" fill="#fef3c7"/>

    <!-- Lines representing text -->
    <rect x="-60" y="50" width="120" height="4" rx="2" fill="#92400e"/>
    <rect x="-60" y="65" width="100" height="4" rx="2" fill="#92400e"/>
    <rect x="-60" y="80" width="110" height="4" rx="2" fill="#92400e"/>
    <rect x="-60" y="95" width="90" height="4" rx="2" fill="#92400e"/>
    <rect x="-60" y="110" width="115" height="4" rx="2" fill="#92400e"/>
  </g>
</svg>
`;

async function generateIcons() {
  try {
    // Ensure public directory exists
    const publicDir = path.join(process.cwd(), 'public');

    console.log('Generating PWA icons...');

    // Generate icons for each size
    for (const size of sizes) {
      const filename = `icon-${size}x${size}.png`;
      const filepath = path.join(publicDir, filename);

      await sharp(Buffer.from(cookbookSVG))
        .resize(size, size)
        .png()
        .toFile(filepath);

      console.log(`✓ Generated ${filename}`);
    }

    // Generate Apple touch icon
    await sharp(Buffer.from(cookbookSVG))
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));

    console.log('✓ Generated apple-touch-icon.png');

    // Generate favicon
    await sharp(Buffer.from(cookbookSVG))
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.png'));

    console.log('✓ Generated favicon.png');

    // Generate placeholder screenshots (you can replace these with actual screenshots later)
    const screenshotSVG1 = `
    <svg width="540" height="1140" viewBox="0 0 540 1140" xmlns="http://www.w3.org/2000/svg">
      <rect width="540" height="1140" fill="#f0fdfa"/>
      <rect x="20" y="20" width="500" height="80" rx="8" fill="#14b8a6"/>
      <text x="270" y="70" font-family="Arial" font-size="32" fill="white" text-anchor="middle">Kookboek</text>

      <!-- Recipe cards -->
      <rect x="20" y="120" width="500" height="150" rx="8" fill="white"/>
      <rect x="20" y="290" width="500" height="150" rx="8" fill="white"/>
      <rect x="20" y="460" width="500" height="150" rx="8" fill="white"/>
      <rect x="20" y="630" width="500" height="150" rx="8" fill="white"/>
      <rect x="20" y="800" width="500" height="150" rx="8" fill="white"/>
      <rect x="20" y="970" width="500" height="150" rx="8" fill="white"/>
    </svg>`;

    const screenshotSVG2 = `
    <svg width="540" height="1140" viewBox="0 0 540 1140" xmlns="http://www.w3.org/2000/svg">
      <rect width="540" height="1140" fill="#f0fdfa"/>
      <rect x="20" y="20" width="500" height="80" rx="8" fill="#14b8a6"/>
      <text x="270" y="70" font-family="Arial" font-size="32" fill="white" text-anchor="middle">Recept Details</text>

      <!-- Recipe image -->
      <rect x="20" y="120" width="500" height="300" rx="8" fill="#5eead4"/>

      <!-- Recipe content -->
      <rect x="20" y="440" width="500" height="680" rx="8" fill="white"/>
    </svg>`;

    await sharp(Buffer.from(screenshotSVG1))
      .png()
      .toFile(path.join(publicDir, 'screenshot1.png'));

    await sharp(Buffer.from(screenshotSVG2))
      .png()
      .toFile(path.join(publicDir, 'screenshot2.png'));

    console.log('✓ Generated screenshot placeholders');

    console.log('\n✅ All icons generated successfully!');

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();