---
title: "Command line"
summary: "The gufo command serves models over HTTP, runs them in the terminal, and measures and checks your setup. This page covers the commands and the options you'll reach for most; gufo <command> --help lists every option."
source: "docs/cli.md"
---

The `gufo` command serves models over HTTP, runs them in the terminal, and
measures and checks your setup. This page covers the commands and the options
you'll reach for most; `gufo <command> --help` lists every option.

## Commands

| Command | What it does |
| --- | --- |
| `gufo serve` | Starts the [OpenAI-compatible server](/docs/0.32.0/server) for one model. |
| `gufo chat` | Holds a conversation with a text model in the terminal. |
| `gufo prompt` | Answers one prompt and exits; reads standard input when piped. |
| `gufo transcribe` | Transcribes an audio file, or live audio with `--live`. |
| `gufo speak` | Synthesizes speech, or answers in speech with models that support it. |
| `gufo video` | Generates a video with [MiniMax H3](/docs/0.32.0/models/minimax-h3). |
| `gufo decide` | Answers decision requests from a file or standard input. |
| `gufo bench` | Measures prefill and decode speed of a model. |
| `gufo eval` | Grades a running server on a fixed set of questions. |
| `gufo diagnose` | Checks drivers, permissions and memory; see [troubleshooting](/docs/0.32.0/troubleshooting). |
| `gufo extension` | Builds and manages [extension modules](/docs/0.32.0/extensions#modules). |

Every command accepts `--help` and `--version`. Unknown options and invalid
combinations are errors, never silently ignored.

## Serving

```text
gufo serve [server options] <modality> [model options]
```

| Modality | Serves | Endpoints |
| --- | --- | --- |
| `llm` (default) | Text models | `/v1/chat/completions`, `/v1/responses`, `/v1/completions` |
| `embedding` | Embedding models | `/v1/embeddings` |
| `asr` | Speech recognition | `/v1/audio/transcriptions` |
| `tts` | Speech synthesis | `/v1/audio/speech` |
| `image` | Image generation and editing | `/v1/images/generations`, `/v1/images/edits` |
| `video` | Video generation | `/v1/videos` |
| `decision` | Decision models | `/v1/systemone` |

One process serves one model. To offer several models under one URL, put
them behind [llama-swap](/docs/0.32.0/server#llama-swap).

These server options work with every modality:

| Option | Default | Use |
| --- | --- | --- |
| `--host`, `-i` | `127.0.0.1` | Address to listen on. Use `0.0.0.0` inside a container, or `::` for IPv6 and IPv4. |
| `--port`, `-p` | `8080` | Port to listen on. |
| `--max-connections` | 16 | Open HTTP connections; more wait or are refused. |
| `--max-request-bytes` | 8 MiB | Largest request body. Raise it for audio and image uploads. |
| `--log-level` | `info` | `error`, `warn`, `info` or `debug`; `-v` means `debug`. |
| `--served-model-name` | per model | The model ID clients send. Repeat it to accept aliases. |

> **Warning:** Anyone who can reach the port can use the model. Read
> [exposure](/docs/0.32.0/server#exposure) before listening on anything but localhost.

## Text models

`serve llm`, `chat` and `prompt` share these options.

**Model and memory**

- `--model`, `-m`: the GGUF file. For sharded files, pass the first shard.
- `--context`, `-c`: tokens per request. The default is the model's native
  context; lower it to fit more sessions in memory.
- `--sessions`, `-j` (server only): requests that compute at the same time,
  1 by default. Each session reserves memory for a full context.

**Sampling**

Each value is a default; requests can override it.

| Option | Effect |
| --- | --- |
| `--temperature` | Randomness. 0 is greedy: always the most likely token. |
| `--top-p`, `--top-k`, `--min-p` | Keep only likely tokens: by probability mass, by count, or relative to the best token. |
| `--min-keep` | Keep at least this many tokens after those filters. |
| `--seed` | Repeatable sampling. |
| `--repeat-penalty`, `--repeat-last-n` | Discourage tokens from the last N, to stop loops. |
| `--frequency-penalty`, `--presence-penalty` | Discourage tokens by how often, or whether, they were used. |
| `--max-tokens`, `-n` | Most tokens to generate. The server's default is until the model stops or the context is full. |

**Reasoning**

- `--think on|off|auto`: whether the model thinks before answering. `auto`
  uses the model's default.
- `--reasoning-effort`: `auto`, `minimal`, `low`, `medium`, `high`, `xhigh`
  or `max`. Effort is an instruction to the model, not a token limit.
- `--reasoning-budget N` (server only): stop thinking after N tokens.
- `--preserve-thinking on|off|auto`: keep earlier turns' reasoning in the
  conversation, at the cost of context.

**Speculative decoding**

A smaller **draft** proposes tokens and the model checks them in one pass.
Greedy output is identical to decoding without a draft; sampled output follows
the same distribution.

- `--speculative`: `off`, or the mode a model offers: `dflash2`
  ([Qwen3.8 27B](/docs/0.32.0/models/qwen3.8-27b)), `mtp`
  ([Qwen3.8 Flash-Next](/docs/0.32.0/models/qwen3.8-flash-next)), `dspark`
  ([DeepSeek V4 Flash](/docs/0.32.0/models/deepseek-v4-flash)).
- `--dflash-model`, `--mtp-model`, `--dspark-model`: the draft file.
- `--draft-tokens`: most tokens proposed per step.

**Server scheduling and limits**

| Option | Default | Use |
| --- | --- | --- |
| `--prefill-chunk` | ignored | Deprecated and ignored; it will be removed. A prompt beside decoding requests is split by layers, so they keep decoding. |
| `--max-pending` | 16 | Requests waiting for a session. |
| `--max-pending-per-client` | `--max-pending` | Waiting requests per client IP. |
| `--request-timeout-ms` | off | Cancel a request after this long, waiting included. |
| `--stall-timeout-ms` | off | Exit as `device_lost` when generation stops progressing, so a supervisor restarts the server. At least 60000. |
| `--max-output-bytes` | 1 MiB | Largest response. |

**Cache**

`--cache-ram-bytes` and `--cache-disk DIR` control how much finished work is
kept for later requests; the [cache page](/docs/0.32.0/cache) explains both.

**Diagnostics**

`--trace FILE` (server only) writes every request, the prompt as the model saw
it and every reply to a JSON Lines file. Use it to find out why a client got
broken output, then delete the file: it holds whole conversations.

## Other modalities

- **Embeddings:** `gufo serve embedding --model DIR`; see
  [EmbeddingGemma 2](/docs/0.32.0/models/embeddinggemma-2).
- **Speech:** `gufo serve asr` and `gufo serve tts` load one checkpoint
  each; see [Qwen3-ASR](/docs/0.32.0/models/qwen3-asr) and
  [Qwen3-TTS](/docs/0.32.0/models/qwen3-tts). `gufo transcribe` and `gufo speak` run
  the same models without a server. Models with an audio projector accept
  `--mmproj`.
- **Images:** `gufo serve image --model DIR`; see
  [Qwen-Image-2.1](/docs/0.32.0/models/qwen-image-2.1).
- **Video:** `gufo serve video` and `gufo video`; see
  [MiniMax H3](/docs/0.32.0/models/minimax-h3).
- **Decisions:** `gufo serve decision --model PATH` answers at
  `POST /v1/systemone`, and `gufo decide --model PATH --request request.json`
  (or `--jsonl` on standard input) answers without HTTP. `--context` limits
  the whole prompt, 8192 tokens by default. The model defines the request and
  response shapes.

## Measuring

`gufo bench` loads a model and reports prefill and decode speed, as llama.cpp's
`llama-bench` does:

```sh
gufo bench --model "$MODEL" --n-prompt 2048 --n-gen 128
```

`gufo eval` sends a pinned set of questions to a running server and grades the
answers, to check that a setup gives correct results as well as fast ones.
