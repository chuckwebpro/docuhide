/**
 * Run preview + pa11y-ci without start-server-and-test (avoids wmic.exe on Windows).
 */
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

function findChrome() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  return candidates.find((path) => path && fs.existsSync(path));
}

const chrome = findChrome();
if (chrome) {
  process.env.PUPPETEER_EXECUTABLE_PATH = chrome;
}

const PREVIEW_URL = 'http://localhost:4321/';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
}

async function isServerUp() {
  try {
    const res = await fetch(PREVIEW_URL);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await isServerUp()) return;
    await sleep(500);
  }
  throw new Error(`Preview did not respond at ${PREVIEW_URL}`);
}

let preview = null;
let startedPreview = false;

if (!(await isServerUp())) {
  preview = spawn('npm', ['run', 'preview'], { stdio: 'inherit', shell: true });
  startedPreview = true;
  await waitForServer();
}

let exitCode = 1;

try {
  exitCode = await run('npx', ['pa11y-ci']);
} finally {
  if (startedPreview && preview) {
    preview.kill('SIGTERM');
    await sleep(300);
    if (!preview.killed) preview.kill('SIGKILL');
  }
}

process.exit(exitCode);
