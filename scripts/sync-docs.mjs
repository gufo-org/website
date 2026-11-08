#!/usr/bin/env node
// Copy the public documentation of one Gufo revision into src/content/docs/<version>/.
//
//   node scripts/sync-docs.mjs --source ../gufo --version 0.32.0 --ref v0.32.0 --release
//
// Public pages are docs/*.md (except AGENTS.md and CLAUDE.md), docs/models/*.md and
// docs/figures/*.svg. Each page gets front matter with the title and summary from its
// first lines. Links to other public pages become /docs/<version>/<page>; links to
// anything else in the repository become GitHub URLs at --ref. The navigation comes
// from docs/README.md and the model table in docs/models/README.md. The newest --keep
// releases are kept, plus non-release versions such as "development" (Gufo main),
// which list after the releases. A version whose pages didn't change keeps its date.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    source: { type: 'string' },
    version: { type: 'string' },
    ref: { type: 'string' },
    release: { type: 'boolean', default: false },
    keep: { type: 'string', default: '10' },
    date: { type: 'string', default: new Date().toISOString().slice(0, 10) },
    out: { type: 'string', default: 'src/content/docs' },
  },
});
for (const name of ['source', 'version', 'ref']) {
  if (!args[name]) throw new Error(`--${name} is required`);
}
if (!/^[0-9A-Za-z][0-9A-Za-z.-]*$/.test(args.version)) throw new Error(`invalid --version ${args.version}`);

const REPO = 'https://github.com/gufo-org/gufo';
const source = path.resolve(args.source);
const docsDir = path.join(source, 'docs');
const outRoot = path.resolve(args.out);
const outDir = path.join(outRoot, args.version);
const posix = (p) => p.split(path.sep).join('/');

// Repository-relative path of each public page, and its page slug ('' is the docs home).
const pages = new Map();
for (const file of fs.readdirSync(docsDir).sort()) {
  if (file.endsWith('.md') && !['AGENTS.md', 'CLAUDE.md'].includes(file)) {
    pages.set(`docs/${file}`, file === 'README.md' ? '' : file.slice(0, -3));
  }
}
for (const file of fs.readdirSync(path.join(docsDir, 'models')).sort()) {
  if (file.endsWith('.md')) pages.set(`docs/models/${file}`, file === 'README.md' ? 'models' : `models/${file.slice(0, -3)}`);
}
if (!pages.has('docs/README.md')) throw new Error(`${docsDir} has no README.md: not the public docs layout`);

const pageUrl = (slug) => `/docs/${args.version}${slug ? `/${slug}` : ''}`;
const outFile = (slug) => path.join(outDir, `${slug === '' ? 'index' : slug === 'models' ? 'models/index' : slug}.md`);

function rewriteTarget(target, fromRepoPath) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) return target;
  const [rawPath, ...rest] = target.split('#');
  const anchor = rest.length ? `#${rest.join('#')}` : '';
  const repoPath = path.posix.normalize(path.posix.join(path.posix.dirname(fromRepoPath), rawPath));
  if (pages.has(repoPath)) return pageUrl(pages.get(repoPath)) + anchor;
  if (repoPath.startsWith('docs/figures/') && repoPath.endsWith('.svg')) {
    // Figures are copied beside the pages and inlined at build time.
    const fromOut = path.dirname(outFile(pages.get(fromRepoPath)));
    return posix(path.relative(fromOut, path.join(outDir, 'figures', path.basename(repoPath))));
  }
  const kind = fs.existsSync(path.join(source, repoPath)) && fs.statSync(path.join(source, repoPath)).isDirectory() ? 'tree' : 'blob';
  return `${REPO}/${kind}/${args.ref}/${repoPath}${anchor}`;
}

function rewriteLinks(markdown, fromRepoPath) {
  let fence = null;
  return markdown
    .split('\n')
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) {
        if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
        return line;
      }
      if (marker) {
        fence = marker[1];
        return line;
      }
      return line.replace(/\]\(([^)\s]+)\)/g, (_, target) => `](${rewriteTarget(target, fromRepoPath)})`);
    })
    .join('\n');
}

const yaml = (text) => JSON.stringify(text);
const plain = (text) => text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, '').trim();

function parsePage(repoPath) {
  const text = fs.readFileSync(path.join(source, repoPath), 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  if (!lines[0].startsWith('# ')) throw new Error(`${repoPath}: first line is not a '# Title'`);
  const title = lines[0].slice(2).trim();
  let i = 1;
  while (i < lines.length && lines[i].trim() === '') i++;
  const summaryLines = [];
  while (i < lines.length && lines[i].trim() !== '') summaryLines.push(lines[i++]);
  return { title, summary: plain(summaryLines.join(' ')), body: lines.slice(1).join('\n').replace(/^\n+/, '') };
}

// Navigation: each '## Group' of docs/README.md with its list of links, then the models.
function navigation() {
  const groups = [];
  let group = null;
  const readme = fs.readFileSync(path.join(docsDir, 'README.md'), 'utf8');
  for (const line of readme.split('\n')) {
    const heading = line.match(/^## (.+)/);
    if (heading) {
      group = { group: heading[1].trim(), items: [] };
      groups.push(group);
      continue;
    }
    const item = line.match(/^\s*(?:[-*]|\d+\.)\s+\[([^\]]+)\]\(([^)#\s]+)[^)]*\)/);
    if (!group || !item) continue;
    const repoPath = path.posix.normalize(path.posix.join('docs', item[2]));
    if (pages.has(repoPath)) group.items.push({ title: item[1], slug: pages.get(repoPath) });
  }
  const models = { group: 'Models', items: [] };
  const index = fs.readFileSync(path.join(docsDir, 'models', 'README.md'), 'utf8');
  for (const line of index.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    const link = line.match(/\]\(([^)#\s]+\.md)/);
    if (cells.length < 4 || !link || cells[1].startsWith('-')) continue;
    const repoPath = path.posix.normalize(path.posix.join('docs/models', link[1]));
    if (pages.has(repoPath)) models.items.push({ title: plain(cells[1]), slug: pages.get(repoPath) });
  }
  return [...groups.filter((g) => g.items.length > 0), models].filter((g) => g.items.length > 0);
}

// Snapshot the previous copy so an unchanged sync leaves versions.json alone.
function snapshot(dir) {
  const files = new Map();
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else files.set(path.relative(dir, p), fs.readFileSync(p, 'utf8'));
    }
  };
  walk(dir);
  return files;
}
const before = snapshot(outDir);
fs.rmSync(outDir, { recursive: true, force: true });
for (const [repoPath, slug] of pages) {
  const { title, summary, body } = parsePage(repoPath);
  const file = outFile(slug);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const front = `---\ntitle: ${yaml(title)}\nsummary: ${yaml(summary)}\nsource: ${yaml(repoPath)}\n---\n\n`;
  fs.writeFileSync(file, front + rewriteLinks(body, repoPath));
}
const figures = path.join(docsDir, 'figures');
if (fs.existsSync(figures)) {
  fs.mkdirSync(path.join(outDir, 'figures'), { recursive: true });
  for (const file of fs.readdirSync(figures)) {
    if (file.endsWith('.svg')) fs.copyFileSync(path.join(figures, file), path.join(outDir, 'figures', file));
  }
}

const after = snapshot(outDir);
const unchanged = before.size === after.size && [...after].every(([file, text]) => before.get(file) === text);

// versions.json: releases newest first by semantic version, then non-release versions.
const versionsFile = path.join(outRoot, 'versions.json');
const semver = (v) => v.split(/[.-]/).slice(0, 3).map(Number);
const newer = (a, b) => {
  const [x, y] = [semver(a.version), semver(b.version)];
  for (let k = 0; k < 3; k++) if (x[k] !== y[k]) return y[k] - x[k];
  return 0;
};
let versions = fs.existsSync(versionsFile) ? JSON.parse(fs.readFileSync(versionsFile, 'utf8')) : [];
const previous = versions.find((v) => v.version === args.version);
const entry = { version: args.version, ref: args.ref, release: args.release, date: args.date, nav: navigation() };
versions = versions.filter((v) => v.version !== args.version);
versions.push(unchanged && previous && previous.ref === args.ref ? previous : entry);
const releases = versions.filter((v) => v.release).sort(newer).slice(0, Number(args.keep));
const others = versions.filter((v) => !v.release).sort((a, b) => a.version.localeCompare(b.version));
versions = [...releases, ...others];
fs.writeFileSync(versionsFile, `${JSON.stringify(versions, null, 2)}\n`);

for (const entry of fs.readdirSync(outRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && !versions.some((v) => v.version === entry.name)) {
    fs.rmSync(path.join(outRoot, entry.name), { recursive: true });
    console.log(`removed ${entry.name}`);
  }
}
console.log(`synced ${pages.size} pages for ${args.version} (${args.ref}); keeping ${versions.map((v) => v.version).join(', ')}`);
