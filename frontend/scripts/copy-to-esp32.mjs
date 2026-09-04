// Publishes the production build into the ESP32 LittleFS image folder.
//
// The old xcopy step only ever added files, so a rebuild with a new content
// hash left the previous bundle behind and the LittleFS partition filled up
// with dead assets. This wipes the target first so data/ is always exactly
// one build.
import { rmSync, cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dist = resolve('dist');
const target = resolve('..', 'esp32_firmware', 'data');

if (!existsSync(dist)) {
  console.error('dist/ not found - run "npm run build" first.');
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(dist, target, { recursive: true });

let total = 0;
const walk = (dir, prefix = '') => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, `${prefix}${entry}/`);
    } else {
      total += st.size;
      console.log(`  ${(st.size / 1024).toFixed(1).padStart(8)} KB  ${prefix}${entry}`);
    }
  }
};

console.log(`Copied production build -> esp32_firmware/data`);
walk(target);
const kb = total / 1024;
console.log(`  ${'-'.repeat(8)}`);
console.log(`  ${kb.toFixed(1).padStart(8)} KB  total`);

// A "Default 4MB with spiffs" partition scheme gives ~1.5 MB of filesystem.
if (kb > 1400) {
  console.warn('\nWARNING: build exceeds ~1.4 MB and may not fit the LittleFS partition.');
  console.warn('Pick a partition scheme with a larger SPIFFS/LittleFS region.');
}
