const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Utility to create a PNG file buffer with RGBA pixels
function createPNG(width, height, getPixel) {
  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // Helper for chunk creation
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // CRC32 implementation
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return crc ^ 0xffffffff;
  }

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT Chunk (Raw image data with scanline filter bytes)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // No filter byte for scanline
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      rawData.push(r, g, b, a);
    }
  }

  const compressedData = zlib.deflateSync(Buffer.from(rawData));
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Ensure icons dir exists
const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icon pixel drawer (Camera / Screenshot icon on gradient background)
function getIconPixel(x, y, width, height) {
  const nx = x / width;
  const ny = y / height;
  
  // Rounded rect background check
  const cx = Math.abs(nx - 0.5);
  const cy = Math.abs(ny - 0.5);
  const cornerR = 0.15;
  if (cx > 0.5 - cornerR && cy > 0.5 - cornerR) {
    const dx = cx - (0.5 - cornerR);
    const dy = cy - (0.5 - cornerR);
    if (dx * dx + dy * dy > cornerR * cornerR) {
      return [0, 0, 0, 0]; // Transparent outside rounded corner
    }
  }

  // Gradient background: Indigo to Cyan (#4F46E5 to #06B6D4)
  let r = Math.round(79 + nx * (-73));
  let g = Math.round(70 + ny * 112);
  let b = Math.round(229 + nx * (-17));

  // Draw camera/screenshot symbol in center
  const inBody = nx >= 0.24 && nx <= 0.76 && ny >= 0.40 && ny <= 0.75;
  const inTop = nx >= 0.38 && nx <= 0.62 && ny >= 0.28 && ny <= 0.40;
  
  const ldx = nx - 0.5;
  const ldy = ny - 0.575;
  const distSq = ldx * ldx + ldy * ldy;
  const inOuterLens = distSq <= 0.0225; // radius 0.15
  const inInnerLens = distSq <= 0.0064; // radius 0.08

  const fdx = nx - 0.68;
  const fdy = ny - 0.46;
  const inFlash = fdx * fdx + fdy * fdy <= 0.0006;

  if (inInnerLens || inFlash) {
    r = 255; g = 255; b = 255;
  } else if (inOuterLens) {
    r = 99; g = 102; b = 241;
  } else if (inBody || inTop) {
    r = 255; g = 255; b = 255;
  }

  return [r, g, b, 255];
}

const sizes = [16, 48, 128];
sizes.forEach(size => {
  const buf = createPNG(size, size, getIconPixel);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, buf);
  console.log(`Created ${filePath}`);
});
