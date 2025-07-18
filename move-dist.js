import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const src = path.join(__dirname, 'dist');
const dest = path.join(__dirname, 'dist/rustfs/console');

await fs.mkdir(dest, { recursive: true });

const items = await fs.readdir(src);
for (const item of items) {
  if (item === 'rustfs') continue;
  const from = path.join(src, item);
  const to = path.join(dest, item);
  await fs.rename(from, to);
}
