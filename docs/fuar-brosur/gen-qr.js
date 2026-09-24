const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const url = 'https://siriplan.com/auth/kayit?sp_app=0';
const outDir = path.join(__dirname, 'v2');
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  await QRCode.toFile(path.join(outDir, 'siriplan-qr.png'), url, {
    errorCorrectionLevel: 'M', margin: 2, scale: 20,
    color: { dark: '#000000', light: '#ffffff' },
  });
  const plainSvg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 });
  fs.writeFileSync(path.join(outDir, 'siriplan-qr.svg'), plainSvg);

  await QRCode.toFile(path.join(outDir, 'siriplan-qr-sik.png'), url, {
    errorCorrectionLevel: 'H', margin: 2, scale: 20,
    color: { dark: '#5c1a3d', light: '#ffffff' },
  });
  const sikSvg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'H', margin: 2 });
  fs.writeFileSync(path.join(outDir, 'siriplan-qr-sik.svg'), sikSvg.replace(/#000000/g, '#5c1a3d'));

  console.log('done', url);
}
main();
