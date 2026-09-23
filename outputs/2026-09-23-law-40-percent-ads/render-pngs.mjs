// Render every ads/*.html to a PNG beside it with headless Chrome (sizes from the file suffix).
import { execFileSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ADS = resolve(HERE, 'ads');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
for (const f of readdirSync(ADS).filter(f => f.endsWith('.html'))) {
  const size = f.includes('-story') ? '1080,1920' : f.includes('-1x1') ? '1080,1080' : '1080,1350';
  const png = resolve(ADS, f.replace('.html', '.png'));
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=4000',
    `--window-size=${size}`, `--screenshot=${png}`, pathToFileURL(resolve(ADS, f)).href], { stdio: 'ignore' });
  console.log(f, size, statSync(png).mtime.toISOString());
}
