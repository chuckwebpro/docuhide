import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const ORIGIN = 'https://www.docuhide.com';

export async function fetchLiveText(urlPath) {
  const url = urlPath.startsWith('http') ? urlPath : ORIGIN + urlPath;
  const result = spawnSync('curl', ['-fsSL', url], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`curl failed ${url}: ${result.stderr || result.status}`);
  }
  return result.stdout;
}

export async function fetchLiveBuffer(urlPath) {
  const url = urlPath.startsWith('http') ? urlPath : ORIGIN + urlPath;
  const tmp = path.join(
    os.tmpdir(),
    `docuhide-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const result = spawnSync('curl', ['-fsSL', '-o', tmp, url], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`curl failed ${url}: ${result.stderr || result.status}`);
  }
  const buf = await fs.readFile(tmp);
  await fs.unlink(tmp).catch(() => {});
  return buf;
}

export { ORIGIN };
