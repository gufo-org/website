// Extension catalogue, in two tiers:
// - core: listed in gufo-org/gufo extensions.lock and shipped in official
//   artifacts; fields copied by hand from src/models/<name>/extension.json, and
//   summaries from docs/models/<model>.md.
// - community: the reviewed extensions of the gufo-org/gufo-extension registry,
//   which live in their authors' repositories. Generated from registry.json,
//   which scripts/sync-extensions.mjs rewrites on every registry merge; only
//   their display titles live here.
import registry from './registry.json';

export type Capability = 'text' | 'embeddings' | 'asr' | 'tts' | 'image' | 'video' | 'decision';

export interface CapabilityInfo {
  label: string;
  /** `gufo serve` subcommand for this capability. */
  command: string;
  /** Accent for its chips and pills. */
  color: string;
}

export const capabilities: Record<Capability, CapabilityInfo> = {
  text: { label: 'Text generation', command: 'llm', color: '#2f5d3a' },
  embeddings: { label: 'Embeddings', command: 'embedding', color: '#4f7fae' },
  asr: { label: 'Speech recognition', command: 'asr', color: '#2e817c' },
  tts: { label: 'Speech synthesis', command: 'tts', color: '#80559e' },
  image: { label: 'Image generation', command: 'image', color: '#c06f12' },
  video: { label: 'Video generation', command: 'video', color: '#bf4d43' },
  decision: { label: 'Decisions', command: 'decision', color: '#6b6a24' },
};

export interface Provider {
  id: string;
  capability: Capability;
  keys: string[];
  modelIds: string[];
  speculative?: string[];
}

export type Tier = 'core' | 'community';

export interface TierInfo {
  label: string;
  color: string;
}

export const tiers: Record<Tier, TierInfo> = {
  core: {
    label: 'Core',
    color: '#2f5d3a',
  },
  community: {
    label: 'Community',
    color: '#4f7fae',
  },
};

export interface Release {
  version: string;
  revision: string;
  digest: string;
  apiVersion: string;
  platforms: string[];
  notes?: string;
}

export interface Extension {
  /** Manifest `name`; also the anchor on the catalogue page. */
  name: string;
  title: string;
  tier: Tier;
  summary: string;
  version: string;
  apiVersion: string;
  platforms: string[];
  providers: Provider[];
  /** Manifest `options`, by canonical name. */
  options: string[];
  /** Manifest help text of each option, when synced. */
  optionHelp?: Record<string, string>;
  /** GitHub repository holding the manifest. */
  repo: string;
  /** Directory of the manifest inside `repo`; empty for a repository root. */
  path?: string;
  /** Model guide under docs/models/ in gufo-org/gufo. */
  docPath?: string;
  /** Section of /benchmarks, when the model is measured there. */
  benchmarks?: string;
  license?: string;
  /** Registry maintainers, as GitHub handles. */
  maintainers?: string[];
  /** Reviewed releases, newest first. */
  releases?: Release[];
  /** Gufo versions (`gufoVersions`) that can run it. */
  worksWith: string[];
}

const gufo = 'gufo-org/gufo';

const core: Omit<Extension, 'worksWith'>[] = [
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
    docPath: 'docs/models/qwen3.8-27b.md',
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
    docPath: 'docs/models/qwen3.8-flash-next.md',
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
    docPath: 'docs/models/deepseek-v4-flash.md',
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
    docPath: 'docs/models/qwen3-asr.md',
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
    docPath: 'docs/models/qwen3-tts.md',
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
    docPath: 'docs/models/qwen-image-2.1.md',
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
    docPath: 'docs/models/minimax-h3.md',
    license: 'MIT',
  },
];

/** Display titles of community extensions; the registry name is the fallback. */
const communityTitles: Record<string, string> = {
  deepseek41flash: 'DeepSeek V4.1 Flash',
  flint: 'Flint 40B',
  lfm3: 'LFM3',
};

export const registryRevision = registry.registry.revision;

/** Recent Gufo releases, newest first, then `development` (main), with their extension API version. */
export const gufoVersions: { version: string; api: string }[] = registry.gufo;

// Registry rule: same MAJOR.MINOR series, and a revision at least the requested one.
function satisfies(api: string, requirement: string) {
  const want = requirement.match(/^>=\s*(\d+)\.(\d+)\.(\d+)$/);
  const have = api.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!want || !have) return false;
  return want[1] === have[1] && want[2] === have[2] && Number(have[3]) >= Number(want[3]);
}

// Core extensions ship inside Gufo; a community one runs where any reviewed release fits.
const worksWith = (requirements: string[]) =>
  gufoVersions.filter((g) => requirements.some((r) => satisfies(g.api, r))).map((g) => g.version);

const community: Extension[] = registry.extensions.map((r) => {
  const [latest] = r.releases;
  return {
    name: r.name,
    title: communityTitles[r.name] ?? r.name,
    tier: 'community',
    summary: r.description,
    version: latest.version,
    apiVersion: latest.apiVersion,
    platforms: latest.platforms,
    providers: r.providers.map((p) => ({ ...p, capability: p.capability as Capability })),
    options: r.options.map((o) => o.name),
    optionHelp: Object.fromEntries(r.options.flatMap((o) => ('help' in o && o.help ? [[o.name, o.help]] : []))),
    repo: r.source.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, ''),
    license: r.license,
    maintainers: r.maintainers,
    releases: r.releases,
    worksWith: worksWith(r.releases.map((release) => release.apiVersion)),
  };
});

export const extensions: Extension[] = [
  ...core.map((e) => ({ ...e, worksWith: gufoVersions.map((g) => g.version) })),
  ...community,
];
