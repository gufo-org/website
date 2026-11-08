---
title: "Gufo documentation"
summary: "Gufo is an open-source inference engine for AMD Strix Halo that serves text, embedding, speech, image and video models over OpenAI-compatible APIs. These pages explain how to install it, run models, and extend it with your own."
source: "docs/README.md"
---

Gufo is an open-source inference engine for AMD Strix Halo that serves text,
embedding, speech, image and video models over OpenAI-compatible APIs. These
pages explain how to install it, run models, and extend it with your own.

## Get started

1. [Install](/docs/development/install): container, Debian package, Nix, source or Windows.
2. [Models](/docs/development/models): what each official model does, the files to
   download and the speed to expect.
3. [Command line](/docs/development/cli): the `gufo` commands and their main options.
4. [Server](/docs/development/server): the HTTP API, clients, llama-swap and exposure.

## Run it well

- [Cache](/docs/development/cache): how Gufo reuses work across requests, and how to size it.
- [Troubleshooting](/docs/development/troubleshooting): diagnostics, logs and common failures.
- [Benchmarks](/docs/development/benchmarks): how the published speeds are measured.
- [Versions](/docs/development/versions): what a release promises and where it's published.

## Extend it

- [Extensions](/docs/development/extensions): add community models to your Gufo.
- [Writing an extension](/docs/development/writing-extensions): port a model of your own.
- [Extension API](/docs/development/extension-api): versions and the contracts a provider
  implements.

## Contribute

Developer documentation, design records and per-model evidence live in
[`internal/`](https://github.com/gufo-org/gufo/blob/main/docs/internal/development.md), in the repository only. Start with
[development](https://github.com/gufo-org/gufo/blob/main/docs/internal/development.md) and [testing](https://github.com/gufo-org/gufo/blob/main/docs/internal/testing.md).
