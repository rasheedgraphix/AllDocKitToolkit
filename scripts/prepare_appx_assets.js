import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import pngToIco from 'png-to-ico';

async function prepareAssets() {
  console.log('Generating AppX and Electron assets from public/alldockit_logo.svg...');

  const svgBuffer = fs.readFileSync('public/alldockit_logo.svg');

  // Ensure directories exist
  const dirs = ['build', 'build/appx', 'public'];
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  // 1. Standard PNG sizes in public/
  const publicSizes = [
    { name: 'public/logo_512x512.png', size: 512 },
    { name: 'public/logo_300x300.png', size: 300 },
    { name: 'public/logo_150x150.png', size: 150 },
    { name: 'public/logo_71x71.png', size: 71 },
    { name: 'public/logo_1080x1080.png', size: 1080 },
  ];

  for (const item of publicSizes) {
    await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png({ quality: 100 })
      .toFile(item.name);
    console.log(`Generated: ${item.name}`);
  }

  // 2. Multi-size Windows .ico file for public/ and build/
  const icoBuffer = await pngToIco([
    'public/logo_71x71.png',
    'public/logo_150x150.png',
    'public/logo_300x300.png',
    'public/logo_512x512.png',
  ]);
  fs.writeFileSync('public/icon.ico', icoBuffer);
  fs.writeFileSync('build/icon.ico', icoBuffer);
  fs.writeFileSync('public/favicon.ico', icoBuffer);
  console.log('Generated: public/icon.ico, build/icon.ico, public/favicon.ico');

  // 3. build/icon.png (for electron-builder fallback)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile('build/icon.png');
  console.log('Generated: build/icon.png');

  // 4. Microsoft Store / AppX manifest specific assets in build/appx
  const appxAssets = [
    { name: 'build/appx/Square44x44Logo.png', size: 44 },
    { name: 'build/appx/Square44x44Logo.targetsize-44.png', size: 44 },
    { name: 'build/appx/Square44x44Logo.targetsize-24.png', size: 24 },
    { name: 'build/appx/Square44x44Logo.targetsize-48.png', size: 48 },
    { name: 'build/appx/Square44x44Logo.targetsize-256.png', size: 256 },
    { name: 'build/appx/Square71x71Logo.png', size: 71 },
    { name: 'build/appx/Square150x150Logo.png', size: 150 },
    { name: 'build/appx/Square310x310Logo.png', size: 310 },
    { name: 'build/appx/StoreLogo.png', size: 50 },
    { name: 'build/appx/BadgeLogo.png', size: 24 },
  ];

  for (const a of appxAssets) {
    await sharp(svgBuffer)
      .resize(a.size, a.size)
      .png({ quality: 100 })
      .toFile(a.name);
    console.log(`Generated: ${a.name}`);
  }

  // 5. Wide310x150Logo.png (310x150 banner with dark background and centered logo)
  const logo120 = await sharp(svgBuffer).resize(120, 120).png().toBuffer();
  await sharp({
    create: {
      width: 310,
      height: 150,
      channels: 4,
      background: { r: 9, g: 13, b: 22, alpha: 1 },
    },
  })
    .composite([{ input: logo120, gravity: 'center' }])
    .png()
    .toFile('build/appx/Wide310x150Logo.png');
  console.log('Generated: build/appx/Wide310x150Logo.png');

  // 6. SplashScreen.png (620x300 banner with centered logo)
  const logo200 = await sharp(svgBuffer).resize(200, 200).png().toBuffer();
  await sharp({
    create: {
      width: 620,
      height: 300,
      channels: 4,
      background: { r: 9, g: 13, b: 22, alpha: 1 },
    },
  })
    .composite([{ input: logo200, gravity: 'center' }])
    .png()
    .toFile('build/appx/SplashScreen.png');
  console.log('Generated: build/appx/SplashScreen.png');

  console.log('All AppX and Electron assets generated successfully!');
}

prepareAssets().catch(console.error);
