const sharp = require('sharp');

async function doSquareCrop() {
  await sharp('public/logo.png')
    .extract({ left: 213, top: 101, width: 186, height: 186 })
    .toFile('public/logo_final.png');
  console.log("Created square crop 186x186.");
}
doSquareCrop();
