#!/usr/bin/env node
// Copy the reviewed extensions of one gufo-extension registry revision into
// src/data/registry.json, which the catalogue page reads.
//
//   node scripts/sync-extensions.mjs --registry ../gufo-extension --ref <commit> --gufo ../gufo
//
// The registry's index.json gives each extension and its reviewed releases. The
// providers and options come from the extension.json of the newest release, read
// from its source at the reviewed revision, so the catalogue shows exactly what
// `gufo extension install <name>` builds. --gufo, a Git clone of gufo-org/gufo
// (blobless is enough), adds the extension API version of its newest releases
// and of its HEAD, so the catalogue can say which Gufo runs each release. The
// output has no timestamps: unchanged inputs give an unchanged file.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    registry: { type: 'string' },
    ref: { type: 'string' },
    gufo: { type: 'string' },
    releases: { type: 'string', default: '5' },
    out: { type: 'string', default: 'src/data/registry.json' },
  },
});
for (const name of ['registry', 'ref']) {
  if (!args[name]) throw new Error(`--${name} is required`);
}

// Manifest capability names, by the catalogue's capability ids in src/data/extensions.ts.
const CAPABILITIES = {
  text_generation: 'text',
  embeddings: 'embeddings',
  speech_recognition: 'asr',
  speech_synthesis: 'tts',
  image_generation: 'image',
  video_generation: 'video',
  decision: 'decision',
};

const index = JSON.parse(fs.readFileSync(path.join(args.registry, 'index.json'), 'utf8'));
if (index.schema !== 1) throw new Error(`unsupported registry schema ${index.schema}`);

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'gufo-registry-'));
const git = (cwd, ...argv) => execFileSync('git', argv, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

// Read one file of a source at an exact commit, fetching only that commit.
function readAt(source, revision, file) {
  const dir = path.join(scratch, revision);
  fs.mkdirSync(dir);
  git(dir, 'init', '--quiet', '--bare');
  git(dir, 'remote', 'add', 'origin', source);
  git(dir, 'fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', revision);
  return git(dir, 'show', `${revision}:${file}`);
}

// Model IDs are matched case-insensitively, so keep the first spelling of each.
function uniqueIds(ids) {
  const seen = new Set();
  return ids.filter((id) => !seen.has(id.toLowerCase()) && seen.add(id.toLowerCase()));
}

const extensions = [];
try {
  for (const [name, entry] of Object.entries(index.extensions).sort(([a], [b]) => a.localeCompare(b))) {
    const [latest] = entry.releases;
    if (!latest) throw new Error(`${name} lists no release`);
    const manifest = JSON.parse(readAt(entry.source, latest.revision, 'extension.json'));
    if (manifest.name !== name || manifest.version !== latest.version) {
      throw new Error(`${name}: extension.json at ${latest.revision} is ${manifest.name} ${manifest.version}, not ${latest.version}`);
    }
    extensions.push({
      name,
      description: entry.description,
      homepage: entry.homepage,
      source: entry.source,
      license: entry.license,
      maintainers: entry.maintainers ?? [],
      releases: entry.releases.map((r) => ({
        version: r.version,
        revision: r.revision,
        digest: r.digest,
        apiVersion: r.api_version,
        platforms: r.platforms,
        ...(r.notes ? { notes: r.notes } : {}),
      })),
      providers: (manifest.providers ?? []).map((p) => {
        const capability = CAPABILITIES[p.capability];
        if (!capability) throw new Error(`${name}: provider ${p.id} has unknown capability ${p.capability}; add it to CAPABILITIES`);
        return {
          id: p.id,
          capability,
          keys: p.keys,
          modelIds: uniqueIds(p.model_ids ?? []),
          ...(p.speculative?.length ? { speculative: p.speculative } : {}),
        };
      }),
      options: (manifest.options ?? []).map((o) => ({ name: o.name, ...(o.help ? { help: o.help } : {}) })),
    });
  }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

// The extension API version of one Gufo revision, derived like
// cmake/GufoExtensionVersion.cmake: the active series in api-series.json plus
// one revision per change record of that series, except its baseline.
function apiVersion(gufo, ref) {
  const file = 'include/gufo/ext/api-series.json';
  if (!git(gufo, 'ls-tree', '--name-only', ref, file).trim()) return null; // Older than versioned extensions.
  const series = JSON.parse(git(gufo, 'show', `${ref}:${file}`));
  const dir = `include/gufo/ext/changes/${series.major}.${series.minor}/`;
  const skip = new Set(['baseline.md', `${series.revision_base}.md`, 'AGENTS.md', 'CLAUDE.md', 'README.md']);
  const records = git(gufo, 'ls-tree', '--name-only', ref, dir)
    .split('\n')
    .map((f) => f.slice(dir.length))
    .filter((f) => f.endsWith('.md') && !skip.has(f));
  return `${series.major}.${series.minor}.${series.revision_base + records.length}`;
}

const gufo = [];
if (args.gufo) {
  const semver = /^v(\d+)\.(\d+)\.(\d+)$/;
  const tags = git(args.gufo, 'tag', '--list', 'v*')
    .split('\n')
    .filter((t) => semver.test(t))
    .sort((a, b) => {
      const [x, y] = [a, b].map((t) => t.match(semver).slice(1).map(Number));
      return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
    });
  for (const tag of tags.slice(0, Number(args.releases))) {
    const api = apiVersion(args.gufo, tag);
    if (api) gufo.push({ version: tag.slice(1), api });
  }
  const head = apiVersion(args.gufo, 'HEAD');
  if (head) gufo.push({ version: 'development', api: head });
}

const out = { registry: { repository: 'gufo-org/gufo-extension', revision: args.ref }, gufo, extensions };
fs.writeFileSync(args.out, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${extensions.length} reviewed extensions to ${args.out}`);
