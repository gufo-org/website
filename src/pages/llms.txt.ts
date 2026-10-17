import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';

// Generated rather than kept in public/ so the blog is listed only once it has posts.
export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const optional =
    posts.length > 0 ? `\n## Optional\n\n- [Blog](https://gufo.blog/blog): engineering notes and design decisions\n` : '';

  return new Response(
    `# Gufo

> Gufo is the open source AI engine for AMD Strix Halo (Ryzen AI MAX+ 395, Radeon 8060S \`gfx1151\`, up to 128 GiB of unified memory). It runs text, vision and speech models locally as a single C++ binary with an OpenAI-compatible server; image and video generation are in progress.

Gufo targets one machine only and supports only the best model in each class, so every kernel is tuned for \`gfx1151\`. Each model has a quality report, and speed optimizations must not change output quality.

## Docs

- [Documentation](https://gufo.blog/docs): quickstart with Podman, the OpenAI-compatible API, and building from source with or without Nix
- [Benchmarks](https://gufo.blog/benchmarks): measured prefill, decode and concurrency results for Qwen3.8 Flash-Next, Qwen3.8 27B and DeepSeek V4 Flash, compared with llama.cpp and antirez/ds4

## Source

- [GitHub repository](https://github.com/gufo-org/gufo): source code, model guides, benchmark and quality reports
- [API contract](https://github.com/gufo-org/gufo/blob/main/docs/SERVER.md): Chat Completions and Responses endpoints
- [Container images](https://github.com/gufo-org/toolboxes): prebuilt runtime and development images
${optional}`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
};
