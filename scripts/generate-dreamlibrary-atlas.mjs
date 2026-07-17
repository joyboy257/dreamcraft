import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const names = ["grass", "dirt", "stone", "brick", "concrete", "school-tile", "kitchen-tile", "wood", "metal", "glass", "water", "ice", "sand", "paper", "fabric", "candy", "porcelain", "cloud", "shadow", "emissive", "fire", "lava"];
const palette = [0x54864d,0x7a5038,0x70727c,0x9b4f42,0x8c929a,0x8ea4ad,0xd9c6ae,0x8b603e,0x87939f,0x9ddcff,0x2c8bd6,0xc6efff,0xd8ba75,0xf3e6c9,0xc75d83,0xfb8ac5,0xf1eee4,0xd8e8f5,0x19182b,0xffe486,0xff652d,0xff4f19];
const tile = 32, columns = 16, rows = 16, width = columns * tile, height = rows * tile;
const pixels = Buffer.alloc((width * 4 + 1) * height);
for (let y = 0; y < height; y++) {
  const row = y * (width * 4 + 1); pixels[row] = 0;
  for (let x = 0; x < width; x++) {
    const index = Math.floor(y / tile) * columns + Math.floor(x / tile);
    const color = palette[index] ?? 0x241f34;
    const jitter = ((x * 13 + y * 7 + index * 17) % 9) - 4;
    const p = row + 1 + x * 4;
    pixels[p] = Math.max(0, Math.min(255, (color >> 16) + jitter));
    pixels[p + 1] = Math.max(0, Math.min(255, ((color >> 8) & 255) + jitter));
    pixels[p + 2] = Math.max(0, Math.min(255, (color & 255) + jitter));
    pixels[p + 3] = index === 9 ? 150 : 255;
  }
}
const crc = (buffer) => { let c = -1; for (const byte of buffer) { c ^= byte; for (let k=0;k<8;k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; } return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length, 0); out.write(type, 4); data.copy(out, 8); out.writeUInt32BE(crc(Buffer.concat([Buffer.from(type), data])), data.length + 8); return out; };
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", Buffer.from([0,0,2,0,0,0,2,0,8,6,0,0,0])), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]);
const output = new URL("../public/dreamlibrary/textures/", import.meta.url);
mkdirSync(output, { recursive: true }); writeFileSync(new URL("dreamlibrary-atlas.png", output), png);
writeFileSync(new URL("dreamlibrary-atlas.json", output), JSON.stringify({ version: "0.1.0", width, height, tile, columns, nearest: true, tiles: Object.fromEntries(names.map((name, index) => [name, { x: (index % columns) * tile, y: Math.floor(index / columns) * tile, width: tile, height: tile }])) }, null, 2) + "\n");
