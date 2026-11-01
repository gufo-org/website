// Extension catalogue. Every manifest field (name, version, api_version,
// platforms, providers, options) is copied from the extension's extension.json:
// src/models/<name>/extension.json in gufo-org/gufo for core extensions, the
// repository root for community ones. Core means listed in extensions.lock and
// shipped in official artifacts. Community extensions are the repositories a
// GitHub search for "gufo-extension" finds; re-check their manifests when
// updating this file. Summaries come from docs/models/ and each README.

export type Capability = 'text' | 'embeddings' | 'asr' | 'tts' | 'image' | 'video' | 'decision';

export interface CapabilityInfo {
  label: string;
  /** `gufo serve` subcommand for this capability. */
  command: string;
}

export const capabilities: Record<Capability, CapabilityInfo> = {
  text: { label: 'Text generation', command: 'llm' },
  embeddings: { label: 'Embeddings', command: 'embedding' },
  asr: { label: 'Speech recognition', command: 'asr' },
  tts: { label: 'Speech synthesis', command: 'tts' },
  image: { label: 'Image generation', command: 'image' },
  video: { label: 'Video generation', command: 'video' },
  decision: { label: 'Decisions', command: 'decision' },
};

export interface Provider {
  id: string;
  capability: Capability;
  keys: string[];
  modelIds: string[];
  speculative?: string[];
}

export interface Extension {
  /** Manifest `name`; also the anchor on the catalogue page. */
  name: string;
  title: string;
  tier: 'core' | 'community';
  summary: string;
  version: string;
  apiVersion: string;
  platforms: string[];
  providers: Provider[];
  /** Manifest `options`, by canonical name. */
  options: string[];
  /** GitHub repository holding the manifest. */
  repo: string;
  /** Directory of the manifest inside `repo`; empty for a repository root. */
  path?: string;
  /** Model guide under docs/models/ in gufo-org/gufo. */
  docPath?: string;
  /** Section of /benchmarks, when the model is measured there. */
  benchmarks?: string;
  license?: string;
  /** Build command when the default GUFO_EXTENSION_DIRS one doesn't apply. */
  build?: string;
  /** Caveat shown on the card. */
  note?: string;
}

const gufo = 'gufo-org/gufo';

export const extensions: Extension[] = [
  {
    name: 'qwen',
    title: 'Qwen3.8 27B',
    tier: 'core',
    summary: 'Dense text and images, with DFlash2 speculative decoding.',
    version: '0.1.0',
    apiVersion: '>= 0.1.0',
    platforms: ['linux', 'windows'],
    providers: [{ id: 'qwen27-q4', capability: 'text', keys: ['gguf:qwen27'], modelIds: ['qwen27'], speculative: ['dflash2'] }],
    options: ['--dflash-model'],
    repo: gufo,
    path: 'src/models/qwen',
    docPath: 'docs/models/qwen3.8-27b',
    benchmarks: 'qwen3.8-27b',
    license: 'MIT',
  },
  {
    name: 'qwen38_flash_next',
    title: 'Qwen3.8 Flash-Next',
    tier: 'core',
    summary: 'Mixture-of-experts text and images, with an MTP draft head for speculative decoding.',
    version: '0.1.0',
    apiVersion: '>= 0.1.0',
    platforms: ['linux', 'windows'],
    providers: [{ id: 'flash-next-q4', capability: 'text', keys: ['gguf:qwen4exp'], modelIds: ['flash-next-q4'], speculative: ['mtp'] }],
    options: ['--mtp-model'],
    repo: gufo,
    path: 'src/models/qwen38_flash_next',
    docPath: 'docs/models/qwen3.8-flash-next',
    benchmarks: 'qwen3.8-flash-next',
    license: 'MIT',
  },
  {
    name: 'deepseek_v4_flash',
    title: 'DeepSeek V4 Flash',
    tier: 'core',
    summary: 'Mixture-of-experts text with compressed attention and DSpark speculative decoding.',
    version: '0.1.0',
    apiVersion: '>= 0.1.0',
    platforms: ['linux', 'windows'],
    providers: [{ id: 'deepseek4', capability: 'text', keys: ['gguf:deepseek4'], modelIds: ['deepseek4'], speculative: ['dspark'] }],
    options: ['--dspark-model'],
    repo: gufo,
    path: 'src/models/deepseek_v4_flash',
    docPath: 'docs/models/deepseek-v4-flash',
    benchmarks: 'deepseek-v4-flash',
    license: 'MIT',
  },
  {
    name: 'embedding_gemma2',
    title: 'EmbeddingGemma 2',
    tier: 'core',
    summary: 'Text embeddings, with its own batch scheduler.',
    version: '0.1.0',
    apiVersion: '>= 0.1.0',
    platforms: ['linux', 'windows'],
    providers: [
      {
        id: 'embeddinggemma-2',
        capability: 'embeddings',
        keys: ['safetensors:embedding_gemma2', 'safetensors:EmbeddingGemma2Model'],
        modelIds: ['embeddinggemma-2'],
      },
    ],
    options: ['--default-prompt-name'],
    repo: gufo,
    path: 'src/models/embedding_gemma2',
    license: 'MIT',
  },
  {
    name: 'qwen3_asr',
    title: 'Qwen3-ASR 1.7B',
    tier: 'core',
    summary: 'Speech recognition for files and realtime streaming, 15.27× realtime.',
    version: '0.1.0',
    apiVersion: '>= 0.1.0',
    platforms: ['linux', 'windows'],
    providers: [{ id: 'qwen3-asr', capability: 'asr', keys: ['safetensors:qwen3_asr', 'safetensors:Qwen3ASRModel'], modelIds: ['qwen3-asr'] }],
    options: [],
    repo: gufo,
    path: 'src/models/qwen3_asr',
    docPath: 'docs/models/qwen3-asr',
    license: 'MIT',
  },
  {
    name: 'qwen3_tts',
    title: 'Qwen3-TTS 12Hz 1.7B',
    tier: 'core',
    summary: 'Speech synthesis and voice cloning over WAV, PCM, SSE and WebSocket; 201 ms to first audio.',
    version: '0.1.0',
    apiVersion: '>= 0.1.0',
    platforms: ['linux', 'windows'],
    providers: [{ id: 'qwen3-tts', capability: 'tts', keys: ['safetensors:qwen3_tts', 'safetensors:Qwen3TTSModel'], modelIds: ['qwen3-tts'] }],
    options: [],
    repo: gufo,
    path: 'src/models/qwen3_tts',
    docPath: 'docs/models/qwen3-tts',
    license: 'MIT',
  },
  {
    name: 'qwen_image_21',
    title: 'Qwen-Image-2.1',
    tier: 'core',
    summary: 'Image generation and editing with reference images. In progress.',
    version: '0.1.0',
    apiVersion: '>= 0.1.0',
    platforms: ['linux', 'windows'],
    providers: [
      {
        id: 'qwen-image-21',
        capability: 'image',
        keys: ['safetensors:qwen_image_21', 'safetensors:QwenImage21Model'],
        modelIds: ['qwen-image-2.1'],
      },
    ],
    options: [],
    repo: gufo,
    path: 'src/models/qwen_image_21',
    docPath: 'docs/models/qwen-image-2.1',
    license: 'MIT',
  },
  {
    name: 'minimax_h3',
    title: 'MiniMax H3 FL2VA',
    tier: 'core',
    summary: 'Text to video and audio, with exact, fast and aggressive denoiser modes. In progress.',
    version: '0.1.0',
    apiVersion: '>= 0.1.0',
    platforms: ['linux', 'windows'],
    providers: [{ id: 'minimax-h3', capability: 'video', keys: ['safetensors:minimax_h3', 'safetensors:MiniMaxH3Model'], modelIds: ['minimax-h3'] }],
    options: [],
    repo: gufo,
    path: 'src/models/minimax_h3',
    docPath: 'docs/models/minimax-h3',
    license: 'MIT',
  },
  {
    name: 'lfm3',
    title: 'LFM3',
    tier: 'community',
    summary:
      'LiquidAI LFM3-1.7B text, plus the checkpoints on the same backbone: LFM3-VL-2B images, LFM3-Audio-2B speech recognition and synthesis, and d1-Omni-2B decisions.',
    version: '0.4.0',
    apiVersion: '>= 0.1.12',
    platforms: ['linux'],
    providers: [
      { id: 'lfm3', capability: 'text', keys: ['gguf:lfm3'], modelIds: ['LFM3-1.7B', 'LFM3-VL-2B'] },
      { id: 'lfm3-audio-asr', capability: 'asr', keys: ['gguf:lfm3'], modelIds: ['LFM3-Audio-2B'] },
      { id: 'lfm3-audio-tts', capability: 'tts', keys: ['gguf:lfm3'], modelIds: ['LFM3-Audio-2B'] },
      { id: 'd1', capability: 'decision', keys: ['gguf:lfm3'], modelIds: ['d1-Omni-2B'] },
    ],
    options: [],
    repo: 'gufo-org/lfm3-gufo-extension',
  },
  {
    name: 'fish_drama3',
    title: 'Fish Audio Drama-3',
    tier: 'community',
    summary: 'Text-to-speech and zero-shot voice cloning for fishaudio/drama-3, with a native C++ DAC codec and cached reference voices.',
    version: '0.1.0',
    apiVersion: '>= 0.1.0',
    platforms: ['linux', 'windows'],
    providers: [
      {
        id: 'fish-drama3-tts',
        capability: 'tts',
        keys: ['safetensors:fish_omni', 'safetensors:FishOmniModel', 'safetensors:fish_qwen3_omni', 'safetensors:FishQwen3OmniForCausalLM'],
        modelIds: ['fish-drama-3'],
      },
    ],
    options: [],
    repo: 'rikaaa0928/fish-drama3-gufo-extension',
    license: 'MIT',
  },
  {
    name: 'qwen38_flash_next_gsq',
    title: 'Qwen3.8 Flash-Next GSQ',
    tier: 'community',
    summary:
      'Pruned 256-expert Qwen3.8-Flash-Next GSQ-RCO checkpoints with native IQ-codebook quants and the MTP draft handshake. A fork of the core Flash-Next extension.',
    version: '0.1.0',
    apiVersion: '>= 0.1.16',
    platforms: ['linux'],
    providers: [
      { id: 'flash-next-gsq-coder', capability: 'text', keys: ['gguf:qwen4exp'], modelIds: ['flash-next-gsq-coder'], speculative: ['mtp'] },
    ],
    options: ['--mtp-model'],
    repo: 'codibre/qwen38-flash-next-gsq-gufo-extension',
    license: 'MIT',
    build: './scripts/build.sh',
    note: 'Replaces the core Flash-Next in the binary and needs a pinned Gufo with an unmerged loader fix (gufo#939); its script handles both.',
  },
];
