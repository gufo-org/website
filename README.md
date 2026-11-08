# gufo Website

Official documentation and benchmarks website for the [gufo](https://github.com/gufo-org) inference engine, built with [Astro](https://astro.build).

## Development

Use the Nix Flake development shell for all workflows:

```sh
# Start local dev server on port 7474
nix develop -c pnpm dev --port 7474 --host

# Build static production site to dist/
nix develop -c pnpm build

# Preview the production build locally
nix develop -c pnpm preview --port 7474 --host
```

Alternatively, enter the dev shell interactively:

```sh
nix develop
pnpm dev
```

## Documentation

`/docs` is Gufo's public documentation (`docs/*.md`, `docs/models/*.md` and
`docs/figures/` in [gufo-org/gufo](https://github.com/gufo-org/gufo)), kept
here as one copy per release under `src/content/docs/<version>/`.
`src/content/docs/versions.json` lists the versions, newest first, with the
navigation taken from Gufo's `docs/README.md`. `/docs/<page>` redirects to the
newest version.

Don't edit those files by hand: change the docs in Gufo. The
**Sync Gufo docs** workflow (`.github/workflows/sync-docs.yml`) runs when Gufo
publishes a release (`gufo-release` dispatch), copies the docs at that tag with
`scripts/sync-docs.mjs`, checks and builds the site, merges the result through
a pull request and deploys. It keeps the 10 newest releases. Run it by hand
with any Gufo ref, for example `main`, to publish a non-release `development`
version until the next release replaces it. Locally:

```sh
node scripts/sync-docs.mjs --source ../gufo --version development --ref "$(git -C ../gufo rev-parse HEAD)"
```
