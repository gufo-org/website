// Model catalogue derived from the Gufo repository documentation:
// docs/models/README.md, docs/models/<model>/README.md and
// docs/models/<model>/BENCHMARKS.md. Keep every number traceable to a table
// there; do not add figures the repository does not measure.

export interface CatalogueModel {
  id: string;
  name: string;
  role: string;
  sourceDir: string;
  docPath: string;
  weights: string;
  footprint: string;
  modes: string;
  headline: string;
  status: 'measured' | 'in-progress';
}

export const catalogue: CatalogueModel[] = [
  {
    id: 'qwen3.8-27b',
    name: 'Qwen3.8 27B',
    role: 'Dense text and images',
    sourceDir: 'src/models/qwen',
    docPath: 'docs/models/qwen3.8-27b',
    weights: 'GGUF UD-Q4_K_XL / UD-Q8_K_XL',
    footprint: '16.35 GiB (Q4) · 29.30 GiB (Q8)',
    modes: 'AR, DFlash2',
    headline: '656.33 tok/s pp · 12.37 tok/s tg AR · 123.00 tok/s aggregated at 8 users',
    status: 'measured',
  },
  {
    id: 'qwen3.8-flash-next',
    name: 'Qwen3.8 Flash-Next',
    role: 'Hybrid recurrent/QSA MoE, text and images',
    sourceDir: 'src/models/qwen38_flash_next',
    docPath: 'docs/models/qwen3.8-flash-next',
    weights: 'GGUF UD-Q4_K_XL (four shards) + shared-Q8_0 MTP',
    footprint: '85.55 GiB peak, pp2048 + tg128 at C1',
    modes: 'AR, MTP',
    headline: '1,628.52 tok/s pp · 25.87 tok/s tg AR · 157.22 tok/s aggregated at 8 users',
    status: 'measured',
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    role: 'Sparse MoE text',
    sourceDir: 'src/models/deepseek_v4_flash',
    docPath: 'docs/models/deepseek-v4-flash',
    weights: 'Flash 0731 mixed IQ2/Q2/Q8 GGUF + DSpark sidecar',
    footprint: '80.76 GiB weights, 93.09 GiB peak at C1',
    modes: 'AR, DSpark',
    headline: '484.62 tok/s pp · 16.28 tok/s tg AR · 55.47 tok/s aggregated at 8 users',
    status: 'measured',
  },
  {
    id: 'qwen3-asr',
    name: 'Qwen3-ASR 1.7B',
    role: 'Speech recognition',
    sourceDir: 'src/models/qwen3_asr',
    docPath: 'docs/models/qwen3-asr',
    weights: 'BF16 safetensors',
    footprint: 'Audio-tower weights excluded from the decoder: 606 MiB saved',
    modes: 'Greedy decoding, file and realtime streaming',
    headline: '15.27 audio seconds per wall second · RTF 0.0655',
    status: 'measured',
  },
  {
    id: 'qwen3-tts',
    name: 'Qwen3-TTS 12Hz 1.7B',
    role: 'Speech synthesis and voice cloning',
    sourceDir: 'src/models/qwen3_tts',
    docPath: 'docs/models/qwen3-tts',
    weights: 'BF16 safetensors: CustomVoice, VoiceDesign, Base',
    footprint: '215–238 MiB of unused encoder weights excluded from uploads',
    modes: 'Buffered WAV, PCM, SSE, WebSocket',
    headline: 'RTF 0.394 (2.54× realtime) · 0.201 s to first PCM audio',
    status: 'measured',
  },
  {
    id: 'qwen-image-2.1',
    name: 'Qwen-Image-2.1',
    role: 'Image generation and editing',
    sourceDir: 'src/models/qwen_image_21',
    docPath: 'docs/models/qwen-image-2.1',
    weights: 'BF16 safetensors, about 33.1 GB',
    footprint: 'Vision and VAE-encoder weights load only for editing',
    modes: 'Generation, edit with references',
    headline: '40-step generation timings are TODO; a warm two-step 1024×1024 control takes 5.838 s',
    status: 'in-progress',
  },
  {
    id: 'minimax-h3',
    name: 'MiniMax H3 FL2VA',
    role: 'Text to video and audio',
    sourceDir: 'src/models/minimax_h3',
    docPath: 'docs/models/minimax-h3',
    weights: 'Pinned BF16 safetensors, operator-supplied',
    footprint: '40.01 GiB peak for one full-resolution denoiser evaluation',
    modes: 'exact, exact-1344x768, fast, aggressive, dev',
    headline: 'One denoiser evaluation is 91.00 s; the exact preset needs 49 of them. End-to-end timing TODO',
    status: 'in-progress',
  },
];
