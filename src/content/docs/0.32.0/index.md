---
title: "Gufo documentation"
summary: "Gufo is an open-source inference engine for AMD Strix Halo that serves text, embedding, speech, image and video models over OpenAI-compatible APIs. These pages explain how to install it, run models, and extend it with your own."
source: "docs/README.md"
---

Gufo is an open-source inference engine for AMD Strix Halo that serves text,
embedding, speech, image and video models over OpenAI-compatible APIs. These
pages explain how to install it, run models, and extend it with your own.

## Get started

1. [Install](/docs/0.32.0/install): container, Debian package, Nix, source or Windows.
2. [Models](/docs/0.32.0/models): what each official model does, the files to
   download and the speed to expect.
3. [Command line](/docs/0.32.0/cli): the `gufo` commands and their main options.
4. [Server](/docs/0.32.0/server): the HTTP API, clients, llama-swap and exposure.

## Run it well

- [Cache](/docs/0.32.0/cache): how Gufo reuses work across requests, and how to size it.
- [Troubleshooting](/docs/0.32.0/troubleshooting): diagnostics, logs and common failures.
- [Benchmarks](/docs/0.32.0/benchmarks): how the published speeds are measured.
- [Versions](/docs/0.32.0/versions): what a release promises and where it's published.

## Extend it

- [Extensions](/docs/0.32.0/extensions): add community models to your Gufo.
- [Writing an extension](/docs/0.32.0/writing-extensions): port a model of your own.
- [Extension API](/docs/0.32.0/extension-api): versions and the contracts a provider
  implements.

## Contribute

Developer documentation, design records and per-model evidence live in
[`internal/`](https://github.com/gufo-org/gufo/blob/v0.32.0/docs/internal/development.md), in the repository only. Start with
[development](https://github.com/gufo-org/gufo/blob/v0.32.0/docs/internal/development.md) and [testing](https://github.com/gufo-org/gufo/blob/v0.32.0/docs/internal/testing.md).
