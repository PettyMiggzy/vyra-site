// Run: node --test test/site.test.mjs   (no dependencies)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'preview', 'node_modules', 'test']);
const TEXT_EXT = new Set(['.html', '.css', '.js', '.json', '.txt', '.xml', '.md', '']);

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP_DIRS.has(n)) continue;
    const p = join(dir, n);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const files = walk(ROOT);
const rel = (p) => relative(ROOT, p);
const textFiles = files.filter((p) => TEXT_EXT.has(extname(p)) && !rel(p).startsWith('fonts/OFL'));
const read = (n) => readFileSync(join(ROOT, n), 'utf8');
const html = ['index.html', '404.html'];

// Sentences that are required and legal as written
const REQUIRED = [
  'VYRE is an independent project, not affiliated with or endorsed by Circle.',
  'VYRA is a community mascot token with no promised use, price or return. Tokens can fall to zero. Nothing here is financial advice.',
];
function stripRequired(s) { return REQUIRED.reduce((a, r) => a.split(r).join(''), s); }

test('banned words and phrases', () => {
  const banned = [
    /layer[\s-]*2/i, /\bl2\b/i, /\bon arc\b/i, /settles? on/i, /trustless/i, /audited/i, /independent/i,
    /decentrali[sz]ed/i, /cheapest/i, /instant withdraw/i, /airdrop/i, /jackpot/i, /lotter/i, /\bwins?\b/i, /winning/i,
    /guarantee/i, /\bmoon/i, /\b\d+x\b/i, /\bprofit/i, /\bpresale/i, /\bprice\b/i, /\bapy\b/i, /passive income/i,
    // process / vendor / tool words
    /claude/i, /anthropic/i, /openai/i, /chatgpt/i, /\bgpt/i, /\bllm\b/i, /midjourney/i, /meshy/i, /\bcursor\b/i,
    /copilot/i, /sonnet/i, /\bopus\b/i, /generated (by|with)/i, /co-authored/i, /jarvis/i,
  ];
  const bad = [];
  for (const f of textFiles) {
    const s = stripRequired(readFileSync(f, 'utf8'));
    const code = ['.css', '.js'].includes(extname(f)); // 'cursor: pointer' and '0x' are code, not words
    for (const re of banned) {
      if (code && (re.source === '\\bcursor\\b' || re.source === '\\b\\d+x\\b')) continue;
      if (re.test(s)) bad.push(`${rel(f)}: ${re}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('required sentences are present', () => {
  const idx = read('index.html').replace(/\s+/g, ' ');
  for (const r of REQUIRED) assert.ok(idx.includes(r), r);
  assert.match(idx, /mainnet is live/i);
  assert.match(idx, /withdrawal back to Arc takes about a day/i);
  assert.match(idx, /The mascot of VYRE/);
  assert.match(idx, /Not launched yet/);
});

test('no contract-like 0x address anywhere (token.json default is empty)', () => {
  const re = /0x[0-9a-fA-F]{40}/;
  for (const f of textFiles) assert.ok(!re.test(readFileSync(f, 'utf8')), `${rel(f)} holds an address`);
  assert.equal(JSON.parse(read('token.json')).address, '');
});

test('every img has non-empty alt text', () => {
  for (const h of html) {
    for (const m of read(h).matchAll(/<img\b[^>]*>/gi)) {
      const alt = /\balt="([^"]*)"/i.exec(m[0]);
      assert.ok(alt && alt[1].trim().length > 8, `${h}: ${m[0].slice(0, 60)}`);
      assert.match(m[0], /\bwidth="\d+"/);
      assert.match(m[0], /\bheight="\d+"/);
    }
  }
});

test('external requests only to the allowlist', () => {
  const allow = [
    /^https:\/\/vyrechain\.com(\/[\w\-./]*)?$/,
    /^https:\/\/vyra\.vyrechain\.com\/[\w\-./]*$/,
    /^https:\/\/minta\.vyrechain\.com\/?$/,
    /^https:\/\/rpc\.vyrechain\.com$/,
    /^https:\/\/explorer\.vyrechain\.com(\/token\/)?$/,
    /^https:\/\/x\.com\/vyrechain$/,
    /^http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9$/,
  ];
  const bad = [];
  for (const f of textFiles) {
    for (const m of readFileSync(f, 'utf8').matchAll(/https?:\/\/[^\s"'<>)`\\]+/g)) {
      const u = m[0].replace(/[.,;]+$/, '');
      if (!allow.some((re) => re.test(u))) bad.push(`${rel(f)}: ${u}`);
    }
  }
  assert.deepEqual(bad, []);
  // nothing that loads from elsewhere: CSS url() and src/href to other origins
  for (const h of html) {
    for (const m of read(h).matchAll(/\b(?:src|srcset|href)="(https?:)?\/\/[^"]*"/g)) {
      if (/\b(src|srcset)=/.test(m[0])) assert.fail(`${h}: loads ${m[0]}`);
    }
  }
  assert.ok(!/url\(\s*['"]?https?:/i.test(read('style.css')));
  assert.ok(!/fonts\.(googleapis|gstatic)/.test(files.map((f) => readFileSync(f, 'latin1')).join('')));
});

test('meta tags on the main page', () => {
  const s = read('index.html');
  const need = [
    /<title>[^<]{5,70}<\/title>/, /<meta name="description" content="[^"]{50,200}"/, /<link rel="canonical" href="https:\/\/vyra\.vyrechain\.com\/">/,
    /<meta property="og:title"/, /<meta property="og:description"/, /<meta property="og:image" content="https:\/\/vyra\.vyrechain\.com\/img\/og-1200x630\.jpg"/,
    /<meta property="og:url" content="https:\/\/vyra\.vyrechain\.com\/">/, /<meta name="twitter:card" content="summary_large_image">/,
    /<meta name="viewport"/, /<html lang="en">/, /<link rel="icon"/, /<link rel="apple-touch-icon"/, /<meta property="og:image:alt"/,
  ];
  for (const re of need) assert.match(s, re);
  assert.match(read('404.html'), /<meta name="robots" content="noindex">/);
});

test('every referenced local file exists', () => {
  for (const h of html) {
    for (const m of read(h).matchAll(/\b(?:src|href)="(\/[^"#?]*)"/g)) {
      if (m[1] === '/') continue;
      assert.ok(files.includes(join(ROOT, m[1])), `${h}: missing ${m[1]}`);
    }
    for (const m of read(h).matchAll(/(\/img\/[\w\-.]+)\s+\d+w/g)) assert.ok(files.includes(join(ROOT, m[1])), m[1]);
  }
  for (const m of read('style.css').matchAll(/url\(\/?([^)]+)\)/g)) assert.ok(files.includes(join(ROOT, m[1])), m[1]);
  for (const n of ['robots.txt', 'sitemap.xml', 'llms.txt', '404.html', 'token.json', 'favicon.ico']) assert.ok(files.includes(join(ROOT, n)), n);
});

test('image sizes are within budget', () => {
  for (const f of files.filter((p) => rel(p).startsWith('img/'))) {
    const kb = statSync(f).size / 1024;
    assert.ok(kb <= 150, `${rel(f)} is ${kb.toFixed(0)} KB (max 150)`);
  }
});

test('first-load weight and request count (desktop path)', () => {
  const need = ['index.html', 'style.css', 'app.js', 'fonts/archivo-latin.woff2', 'img/vyra-1000.webp', 'token.json'];
  const total = need.reduce((a, n) => a + statSync(join(ROOT, n)).size, 0);
  assert.ok(total <= 400 * 1024, `${(total / 1024).toFixed(0)} KB`);
  assert.ok(need.length < 10);
});

test('token.json shape', () => {
  const t = JSON.parse(read('token.json'));
  assert.deepEqual(Object.keys(t).sort(), ['address', 'launched', 'mintaUrl', 'name', 'symbol']);
  assert.equal(typeof t.launched, 'boolean');
  for (const k of ['address', 'symbol', 'name', 'mintaUrl']) assert.equal(typeof t[k], 'string', k);
  assert.match(t.mintaUrl, /^https:\/\/minta\.vyrechain\.com(\/[\w\-./?=&%#]*)?$/);
  assert.match(t.symbol, /^[A-Za-z0-9]{1,12}$/);
  if (t.launched) assert.match(t.address, /^0x[0-9a-fA-F]{40}$/, 'launched needs a valid address');
  else assert.equal(t.address, '', 'not launched means an empty address');
});

test('no inline script or style, no inline handlers or style attributes', () => {
  for (const h of html) {
    const s = read(h);
    assert.ok(!/<style\b/i.test(s), `${h}: <style>`);
    assert.ok(!/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(s), `${h}: inline <script>`);
    assert.ok(!/\sstyle\s*=/i.test(s), `${h}: style attribute`);
    assert.ok(!/\son[a-z]+\s*=/i.test(s), `${h}: inline event handler`);
    assert.ok(!/javascript:/i.test(s));
  }
});

test('no tracking, cookies or storage', () => {
  const js = read('app.js');
  assert.ok(!/document\.cookie|localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|eval\(|innerHTML/.test(js));
  assert.ok(!/gtag|analytics|pixel|fbq/i.test(read('index.html') + js));
});

test('accessibility basics', () => {
  const s = read('index.html');
  assert.equal((s.match(/<h1\b/g) || []).length, 1);
  assert.match(s, /<main\b/);
  assert.match(s, /class="skip"/);
  assert.match(read('style.css'), /:focus-visible/);
  assert.match(read('style.css'), /prefers-reduced-motion: reduce/);
  assert.match(read('app.js'), /prefers-reduced-motion/);
  const ids = [...s.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids');
  for (const m of s.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(m[1]), `#${m[1]}`);
  // external links carry rel=noopener
  for (const m of s.matchAll(/<a\b[^>]*href="https:[^>]*>/g)) assert.match(m[0], /rel="noopener"/);
});
