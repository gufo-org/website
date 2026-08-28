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
