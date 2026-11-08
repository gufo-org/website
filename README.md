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
here as one copy per release, plus `development` for Gufo `main`, under
`src/content/docs/<version>/`.
`src/content/docs/versions.json` lists them, releases newest first, with the
navigation taken from Gufo's `docs/README.md`. `/docs/<page>` redirects to the
newest release.

Don't edit those files by hand: change the docs in Gufo. The
**Sync Gufo docs** workflow (`.github/workflows/sync-docs.yml`) copies them with
`scripts/sync-docs.mjs`, checks and builds the site, and merges the result
through a pull request, whose push deploys the site:

- `gufo-release`, sent by Gufo's release workflow with the new tag, adds that
  release. The 10 newest releases are kept, and `/docs` shows the newest.
- `gufo-docs`, sent by Gufo's `docs-website.yml` when a push to `main` changes
  the public docs, refreshes the `development` version.
- A manual run syncs any Gufo ref.

It uses the `gufo-release-bot` app token (org variable `RELEASE_APP_CLIENT_ID`,
secret `RELEASE_APP_PRIVATE_KEY`), so Actions in this repository don't need
permission to create pull requests. Locally:

```sh
node scripts/sync-docs.mjs --source ../gufo --version development --ref main
```

## Extensions

`/extensions` lists two tiers. Core extensions are written by hand in
`src/data/extensions.ts`. Community extensions are the reviewed entries of the
[extension registry](https://github.com/gufo-org/gufo-extension):
`src/data/registry.json` holds every entry of its `index.json`, with the
providers and options of each newest release read from its `extension.json` at
the reviewed commit, plus the extension API version of Gufo's newest releases
and `main`, which drives the "Works with Gufo" filter.

Don't edit `registry.json` by hand. The **Sync reviewed extensions** workflow
(`.github/workflows/sync-extensions.yml`) rewrites it with
`scripts/sync-extensions.mjs` when the registry's `website.yml` sends
`gufo-extensions` after a push to its `main`, when Gufo sends `gufo-release`, or
on a manual run, then checks, builds and merges it like the docs. Only display
titles live in `extensions.ts`; a new entry shows its registry name until one
is added. Locally:

```sh
git clone --filter=blob:none --no-checkout https://github.com/gufo-org/gufo /tmp/gufo-tags
node scripts/sync-extensions.mjs --registry ../gufo-extension \
  --ref "$(git -C ../gufo-extension rev-parse HEAD)" --gufo /tmp/gufo-tags
```
