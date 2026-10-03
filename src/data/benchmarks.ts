// Benchmark data transcribed from the Gufo repository:
// docs/models/<model>/BENCHMARKS.md. Every row here exists in those tables.
// Pending cells are TODO and comparisons a reference cannot run are N/A,
// exactly as the repository reports them.

export interface BenchTable {
  title: string;
  note?: string;
  columns: string[];
  rows: string[][];
}

export interface BenchSeries {
  label: string;
  data: (number | null)[];
  color: string;
  dashed?: boolean;
}

export interface BenchChart {
  id: string;
  title: string;
  type: 'line' | 'bar';
  labels: string[];
  series: BenchSeries[];
  xTitle?: string;
  yTitle: string;
}

/** One selectable benchmark: a table, and the charts that visualize it. */
export interface BenchView {
  id: string;
  label: string;
  kicker: string;
  charts: BenchChart[];
  table: BenchTable;
}

export interface BenchModel {
  id: string;
  name: string;
  short: string;
  type: string;
  format: string;
  sourceDir: string;
  docPath: string;
  reference: string | null;
  measured: string;
  summary: string;
  highlights: { label: string; value: string; note: string }[];
  views: BenchView[];
  notes: string[];
  reproduce: string[];
}

const GUFO = '#25c2a0';
const REF = '#e06c75';
const ACCENT = '#3578e5';
const GOLD = '#ffba00';
const GREEN = '#00d68f';

const DEPTHS = ['0', '4,096', '8,192', '12,288', '16,384', '32,768', '65,536', '131,072'];
const DEPTH_AXIS = 'Cached prefix depth (tokens)';

export const benchmarks: BenchModel[] = [
  {
    id: 'qwen3.8-27b',
    name: 'Qwen3.8 27B',
    short: 'Qwen3.8 27B',
    type: 'Dense text and images',
    format: 'UD-Q4_K_XL / UD-Q8_K_XL GGUF',
    sourceDir: 'src/models/qwen',
    docPath: 'docs/models/qwen3.8-27b/BENCHMARKS.md',
    reference: 'llama.cpp b11069',
    measured: 'September 23, 2026 · Gufo 628ed18e · HTTP, greedy, thinking off',
    summary:
      'Same Q4_K_XL / Q8_K_XL targets on both engines, both using the Q4_K_M DFlash2 draft; Gufo runs its adaptive controller. Depth is the cached prefix in tokens, approximately pp2048 / tg128.',
    highlights: [
      { label: 'Prefill, Q4, depth 0', value: '656.33 tok/s', note: 'llama.cpp 357.54 tok/s · +83.6%' },
      { label: 'Prefill, Q4, depth 131,072', value: '287.12 tok/s', note: 'llama.cpp 135.95 tok/s · +111.2%' },
      { label: 'Decode AR, Q4, depth 0', value: '12.37 tok/s', note: 'llama.cpp 12.06 tok/s · +2.6%' },
      { label: 'Decode DFlash2, repetitive', value: '63.12 tok/s', note: 'llama.cpp 35.86 tok/s · +76.0%' },
      { label: 'Eight users, DFlash2, repetitive', value: '123.00 tok/s', note: 'Sum of individual decode rates · +8.3%' },
      { label: 'Cold load to HTTP readiness, Q4', value: '5.87 s', note: 'llama.cpp 23.33 s · +297.4%' },
    ],
    views: [
      {
        id: 'single-ar-q4',
        label: 'Single user, AR',
        kicker: 'Q4',
        charts: [
          {
            id: 'q27-ar-q4-pp',
            title: 'Prefill across context depth',
            type: 'line',
            labels: DEPTHS,
            xTitle: DEPTH_AXIS,
            yTitle: 'Prefill (tok/s)',
            series: [
              { label: 'Gufo', data: [656.33, 633.16, 615.06, 594.61, 575.5, 505.07, 386.92, 287.12], color: GUFO },
              { label: 'llama.cpp', data: [357.54, 330.42, 316.09, 302.54, 290.23, 246.97, 193.61, 135.95], color: REF, dashed: true },
            ],
          },
          {
            id: 'q27-ar-q4-tg',
            title: 'Decode across context depth',
            type: 'line',
            labels: DEPTHS,
            xTitle: DEPTH_AXIS,
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo', data: [12.37, 12.21, 12.03, 11.88, 11.72, 11.13, 10.13, 8.52], color: GUFO },
              { label: 'llama.cpp', data: [12.06, 11.88, 11.73, 11.59, 11.44, 10.89, 9.93, 8.46], color: REF, dashed: true },
            ],
          },
        ],
        table: {
          title: 'Single user, autoregressive, Q4',
          note: 'Approximately pp2048 / tg128.',
          columns: ['Depth', 'Gufo pp', 'llama.cpp pp', 'Gain', 'Gufo tg', 'llama.cpp tg', 'Gain'],
          rows: [
            ['0', '656.33', '357.54', '+83.6%', '12.37', '12.06', '+2.6%'],
            ['4,096', '633.16', '330.42', '+91.6%', '12.21', '11.88', '+2.8%'],
            ['8,192', '615.06', '316.09', '+94.6%', '12.03', '11.73', '+2.6%'],
            ['12,288', '594.61', '302.54', '+96.5%', '11.88', '11.59', '+2.5%'],
            ['16,384', '575.50', '290.23', '+98.3%', '11.72', '11.44', '+2.4%'],
            ['32,768', '505.07', '246.97', '+104.5%', '11.13', '10.89', '+2.2%'],
            ['65,536', '386.92', '193.61', '+99.8%', '10.13', '9.93', '+2.0%'],
            ['131,072', '287.12', '135.95', '+111.2%', '8.52', '8.46', '+0.7%'],
          ],
        },
      },
      {
        id: 'single-ar-q8',
        label: 'Single user, AR',
        kicker: 'Q8',
        charts: [
          {
            id: 'q27-ar-q8-pp',
            title: 'Prefill across context depth',
            type: 'line',
            labels: DEPTHS,
            xTitle: DEPTH_AXIS,
            yTitle: 'Prefill (tok/s)',
            series: [
              { label: 'Gufo', data: [485.26, 470.8, 450.84, 436.37, 423.19, 381.43, 311.47, 248.6], color: GUFO },
              { label: 'llama.cpp', data: [337.08, 317.96, 306.22, 289.19, 276.91, 236.32, 186.67, 133.34], color: REF, dashed: true },
            ],
          },
          {
            id: 'q27-ar-q8-tg',
            title: 'Decode across context depth',
            type: 'line',
            labels: DEPTHS,
            xTitle: DEPTH_AXIS,
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo', data: [7.2, 7.14, 7.08, 7.03, 6.97, 6.76, 6.38, 5.71], color: GUFO },
              { label: 'llama.cpp', data: [7.2, 7.14, 7.08, 7.02, 6.97, 6.76, 6.38, 5.74], color: REF, dashed: true },
            ],
          },
        ],
        table: {
          title: 'Single user, autoregressive, Q8',
          note: 'Decode is bandwidth bound at this precision: both engines land on the same rate.',
          columns: ['Depth', 'Gufo pp', 'llama.cpp pp', 'Gain', 'Gufo tg', 'llama.cpp tg', 'Gain'],
          rows: [
            ['0', '485.26', '337.08', '+44.0%', '7.20', '7.20', '+0.0%'],
            ['4,096', '470.80', '317.96', '+48.1%', '7.14', '7.14', '+0.0%'],
            ['8,192', '450.84', '306.22', '+47.2%', '7.08', '7.08', '+0.0%'],
            ['12,288', '436.37', '289.19', '+50.9%', '7.03', '7.02', '+0.1%'],
            ['16,384', '423.19', '276.91', '+52.8%', '6.97', '6.97', '+0.0%'],
            ['32,768', '381.43', '236.32', '+61.4%', '6.76', '6.76', '+0.0%'],
            ['65,536', '311.47', '186.67', '+66.9%', '6.38', '6.38', '+0.0%'],
            ['131,072', '248.60', '133.34', '+86.4%', '5.71', '5.74', '-0.5%'],
          ],
        },
      },
      {
        id: 'single-dflash2-q4',
        label: 'Single user, DFlash2',
        kicker: 'Q4',
        charts: [
          {
            id: 'q27-df-q4-modes',
            title: 'Decode at depth 0 by execution mode',
            type: 'bar',
            labels: ['AR', 'DFlash2 mixed', 'DFlash2 repetitive'],
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo', data: [12.37, 26.13, 63.12], color: GUFO },
              { label: 'llama.cpp', data: [12.06, 23.4, 35.86], color: REF },
            ],
          },
          {
            id: 'q27-df-q4-depth',
            title: 'DFlash2 decode across context depth, repetitive output',
            type: 'line',
            labels: DEPTHS,
            xTitle: DEPTH_AXIS,
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo', data: [63.12, 52.24, 61.55, 53.18, 49.67, 47.76, 29.44, 26.83], color: GREEN },
              { label: 'llama.cpp', data: [35.86, 34.47, 34.73, 34.19, 33.75, 31.75, 26.33, 22.93], color: REF, dashed: true },
            ],
          },
        ],
        table: {
          title: 'Single user, DFlash2, Q4',
          note: 'pp is the highest measured rate per engine and depth across mixed and repetitive text.',
          columns: [
            'Depth',
            'Gufo pp',
            'llama.cpp pp',
            'Gufo tg mixed',
            'llama.cpp tg mixed',
            'Gufo tg repetitive',
            'llama.cpp tg repetitive',
          ],
          rows: [
            ['0', '607.27', '347.51', '26.13', '23.40', '63.12', '35.86'],
            ['4,096', '559.04', '316.58', '27.06', '23.03', '52.24', '34.47'],
            ['8,192', '537.00', '302.47', '26.77', '21.73', '61.55', '34.73'],
            ['12,288', '520.81', '289.98', '23.92', '23.05', '53.18', '34.19'],
            ['16,384', '504.59', '278.53', '23.78', '21.84', '49.67', '33.75'],
            ['32,768', '448.96', '239.21', '19.25', '18.88', '47.76', '31.75'],
            ['65,536', '347.29', '190.92', '17.70', '18.53', '29.44', '26.33'],
            ['131,072', '274.07', '133.37', '14.70', '14.58', '26.83', '22.93'],
          ],
        },
      },
      {
        id: 'single-dflash2-q8',
        label: 'Single user, DFlash2',
        kicker: 'Q8',
        charts: [
          {
            id: 'q27-df-q8-modes',
            title: 'Decode at depth 0 by execution mode',
            type: 'bar',
            labels: ['AR', 'DFlash2 mixed', 'DFlash2 repetitive'],
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo', data: [7.2, 16.08, 46.84], color: GUFO },
              { label: 'llama.cpp', data: [7.2, 15.0, 23.83], color: REF },
            ],
          },
          {
            id: 'q27-df-q8-depth',
            title: 'DFlash2 decode across context depth, repetitive output',
            type: 'line',
            labels: DEPTHS,
            xTitle: DEPTH_AXIS,
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo', data: [46.84, 40.51, 41.53, 40.45, 39.39, 35.87, 25.45, 23.41], color: GREEN },
              { label: 'llama.cpp', data: [23.83, 23.59, 23.21, 22.1, 22.56, 21.16, 19.03, 17.23], color: REF, dashed: true },
            ],
          },
        ],
        table: {
          title: 'Single user, DFlash2, Q8',
          note: 'Mixed-text decode falls behind the reference at the two deepest points; repetitive output stays well ahead.',
          columns: [
            'Depth',
            'Gufo pp',
            'llama.cpp pp',
            'Gufo tg mixed',
            'llama.cpp tg mixed',
            'Gufo tg repetitive',
            'llama.cpp tg repetitive',
          ],
          rows: [
            ['0', '457.05', '333.85', '16.08', '15.00', '46.84', '23.83'],
            ['4,096', '423.09', '310.23', '16.36', '16.12', '40.51', '23.59'],
            ['8,192', '408.06', '292.86', '15.57', '15.27', '41.53', '23.21'],
            ['12,288', '401.07', '280.40', '14.99', '13.21', '40.45', '22.10'],
            ['16,384', '390.69', '269.03', '14.28', '13.83', '39.39', '22.56'],
            ['32,768', '355.59', '231.89', '14.41', '14.44', '35.87', '21.16'],
            ['65,536', '293.81', '185.73', '10.87', '12.62', '25.45', '19.03'],
            ['131,072', '237.24', '131.80', '8.87', '11.62', '23.41', '17.23'],
          ],
        },
      },
      {
        id: 'multi-q4',
        label: 'Multiple users',
        kicker: 'Q4',
        charts: [
          {
            id: 'q27-multi-q4',
            title: 'Summed decode rates by concurrency',
            type: 'bar',
            labels: ['1', '2', '4', '6', '8'],
            xTitle: 'Concurrent users',
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo AR', data: [12.42, 23.84, 44.23, 60.99, 74.46], color: GUFO },
              { label: 'llama.cpp AR', data: [12.2, 22.58, 38.94, 47.45, 50.14], color: REF },
              { label: 'Gufo DFlash2 repetitive', data: [70.56, 105.51, 110.49, 113.52, 123.0], color: GREEN },
              { label: 'llama.cpp DFlash2 repetitive', data: [37.56, 51.65, 93.38, 97.52, 113.56], color: GOLD },
            ],
          },
        ],
        table: {
          title: 'Multiple users, Q4',
          note: 'Context 4096 per user, tg128. Throughput sums individual request decode rates, excluding prefill and scheduling.',
          columns: [
            'Users',
            'Gufo AR',
            'llama.cpp AR',
            'Gufo DFlash2 mixed',
            'llama.cpp DFlash2 mixed',
            'Gufo DFlash2 repetitive',
            'llama.cpp DFlash2 repetitive',
          ],
          rows: [
            ['1', '12.42', '12.20', '36.30', '27.15', '70.56', '37.56'],
            ['2', '23.84', '22.58', '56.34', '40.04', '105.51', '51.65'],
            ['4', '44.23', '38.94', '70.87', '74.43', '110.49', '93.38'],
            ['6', '60.99', '47.45', '79.83', '77.19', '113.52', '97.52'],
            ['8', '74.46', '50.14', '85.39', '71.71', '123.00', '113.56'],
          ],
        },
      },
      {
        id: 'multi-q8',
        label: 'Multiple users',
        kicker: 'Q8',
        charts: [
          {
            id: 'q27-multi-q8',
            title: 'Summed decode rates by concurrency',
            type: 'bar',
            labels: ['1', '2', '4', '6', '8'],
            xTitle: 'Concurrent users',
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo AR', data: [7.22, 14.45, 27.81, 39.96, 51.62], color: GUFO },
              { label: 'llama.cpp AR', data: [7.24, 13.71, 25.32, 34.64, 41.57], color: REF },
              { label: 'Gufo DFlash2 repetitive', data: [51.23, 86.58, 102.98, 109.42, 118.07], color: GREEN },
              { label: 'llama.cpp DFlash2 repetitive', data: [24.09, 41.6, 58.92, 72.4, 86.25], color: GOLD },
            ],
          },
        ],
        table: {
          title: 'Multiple users, Q8',
          note: 'Mixed prompts and repetitive output, context 4096 per user, up to 128 output tokens. No prompt-cache hits.',
          columns: [
            'Users',
            'Gufo AR',
            'llama.cpp AR',
            'Gufo DFlash2 mixed',
            'llama.cpp DFlash2 mixed',
            'Gufo DFlash2 repetitive',
            'llama.cpp DFlash2 repetitive',
          ],
          rows: [
            ['1', '7.22', '7.24', '24.65', '17.54', '51.23', '24.09'],
            ['2', '14.45', '13.71', '42.87', '31.64', '86.58', '41.60'],
            ['4', '27.81', '25.32', '48.44', '43.88', '102.98', '58.92'],
            ['6', '39.96', '34.64', '54.77', '53.14', '109.42', '72.40'],
            ['8', '51.62', '41.57', '65.52', '60.64', '118.07', '86.25'],
          ],
        },
      },
      {
        id: 'loading-memory',
        label: 'Loading and memory',
        kicker: 'Q4 · Q8',
        charts: [
          {
            id: 'q27-loading',
            title: 'Cold files to HTTP readiness',
            type: 'bar',
            labels: ['Q4', 'Q8'],
            yTitle: 'Seconds',
            series: [
              { label: 'Gufo', data: [5.87, 8.17], color: GUFO },
              { label: 'llama.cpp', data: [23.33, 36.47], color: REF },
            ],
          },
          {
            id: 'q27-memory',
            title: 'Peak memory reported by HIP, pp2048 + tg128',
            type: 'bar',
            labels: ['Q4', 'Q8'],
            yTitle: 'GiB',
            series: [
              { label: 'Gufo', data: [37.63, 50.58], color: GUFO },
              { label: 'llama.cpp', data: [36.19, 48.6], color: REF },
            ],
          },
        ],
        table: {
          title: 'Loading and memory',
          note: 'Loading: C1, context capacity 262144, DFlash2. Memory: C1, context capacity 262144, AR.',
          columns: ['Measurement', 'Gufo', 'llama.cpp', 'Gain'],
          rows: [
            ['Ready, Q4 (s)', '5.87', '23.33', '+297.4%'],
            ['Ready, Q8 (s)', '8.17', '36.47', '+346.4%'],
            ['Peak memory, Q4, pp2048 + tg128 (GiB)', '37.63', '36.19', '-3.8%'],
            ['Peak memory, Q4, 16K prefix, pp4096 + tg128 (GiB)', '39.88', '36.62', '-8.2%'],
            ['Peak memory, Q8, pp2048 + tg128 (GiB)', '50.58', '48.60', '-3.9%'],
            ['Peak memory, Q8, 16K prefix, pp4096 + tg128 (GiB)', '52.83', '49.02', '-7.2%'],
          ],
        },
      },
    ],
    notes: [
      'Greedy speculation must reproduce autoregressive output; llama.cpp differs in some controls, recorded in the model quality report.',
      'Concurrency rates sum individual request decode rates and exclude prefill and scheduling time.',
      'Targets and drafts need not have matching precision: the Q4_K_M DFlash2 draft serves both targets.',
    ],
    reproduce: [
      './result/bin/gufo serve llm --model models/qwen3.8-27b/Qwen3.8-27B-UD-Q4_K_XL.gguf \\',
      '  --speculative dflash2 --dflash-model models/qwen3.8-27b/Qwen3.8-27B-DFlash2-Q4_K_M.gguf',
      'python3 tools/bench/model-bench.py --model qwen3.8-27b --gguf "$MODEL" run --target gufo',
    ],
  },
  {
    id: 'qwen3.8-flash-next',
    name: 'Qwen3.8 Flash-Next',
    short: 'Flash-Next',
    type: 'Hybrid recurrent/QSA MoE, text and images',
    format: 'UD-Q4_K_XL GGUF, four shards, shared-Q8_0 MTP sidecar',
    sourceDir: 'src/models/qwen38_flash_next',
    docPath: 'docs/models/qwen3.8-flash-next/BENCHMARKS.md',
    reference: 'llama.cpp b11069 (AR) and 6fcaa16f (MTP)',
    measured: 'Gufo single-user tg September 27, 2026 (f797b5b); pp and other results September 22–23',
    summary:
      'Unsloth UD-Q4_K_XL target with the shared-Q8_0 MTP sidecar; Gufo uses adaptive MTP. HTTP, greedy, thinking off. Context capacities differ between engines, so read the measurement details before quoting depth-for-depth.',
    highlights: [
      { label: 'Prefill, depth 0', value: '1,628.52 tok/s', note: 'llama.cpp 489.59 tok/s · +232.6%' },
      { label: 'Prefill, depth 131,072', value: '1,292.02 tok/s', note: 'llama.cpp 144.78 tok/s · +792.4%' },
      { label: 'Decode AR, depth 0', value: '25.87 tok/s', note: 'llama.cpp 22.20 tok/s · +16.5%' },
      { label: 'Decode AR, depth 131,072', value: '22.89 tok/s', note: 'llama.cpp 7.98 tok/s · +186.8%' },
      { label: 'Decode MTP, repetitive, depth 0', value: '59.30 tok/s', note: 'llama.cpp 48.12 tok/s · +23.2%' },
      { label: 'Eight users, MTP, repetitive', value: '157.22 tok/s', note: 'llama.cpp 58.13 tok/s · +170.5%' },
    ],
    views: [
      {
        id: 'single-ar',
        label: 'Single user, AR',
        kicker: 'Q4',
        charts: [
          {
            id: 'fn-ar-pp',
            title: 'Prefill across context depth',
            type: 'line',
            labels: DEPTHS,
            xTitle: DEPTH_AXIS,
            yTitle: 'Prefill (tok/s)',
            series: [
              { label: 'Gufo', data: [1628.52, 1523.39, 1499.13, 1477.98, 1457.16, 1421.93, 1304.01, 1292.02], color: GUFO },
              { label: 'llama.cpp', data: [489.59, 455.24, 428.85, 400.21, 375.89, 301.31, 221.94, 144.78], color: REF, dashed: true },
            ],
          },
          {
            id: 'fn-ar-tg',
            title: 'Decode across context depth',
            type: 'line',
            labels: DEPTHS,
            xTitle: DEPTH_AXIS,
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo', data: [25.87, 25.84, 25.84, 25.8, 25.79, 25.69, 25.41, 22.89], color: GUFO },
              { label: 'llama.cpp', data: [22.2, 21.21, 20.4, 19.64, 18.95, 16.54, 11.62, 7.98], color: REF, dashed: true },
            ],
          },
        ],
        table: {
          title: 'Single user, autoregressive',
          note: 'Approximately pp2048 / tg128; depth is the cached prefix in tokens.',
          columns: ['Depth', 'Gufo pp', 'llama.cpp pp', 'Gain', 'Gufo tg', 'llama.cpp tg', 'Gain'],
          rows: [
            ['0', '1628.52', '489.59', '+232.6%', '25.87', '22.20', '+16.5%'],
            ['4,096', '1523.39', '455.24', '+234.6%', '25.84', '21.21', '+21.8%'],
            ['8,192', '1499.13', '428.85', '+249.6%', '25.84', '20.40', '+26.7%'],
            ['12,288', '1477.98', '400.21', '+269.3%', '25.80', '19.64', '+31.4%'],
            ['16,384', '1457.16', '375.89', '+287.7%', '25.79', '18.95', '+36.1%'],
            ['32,768', '1421.93', '301.31', '+371.9%', '25.69', '16.54', '+55.3%'],
            ['65,536', '1304.01', '221.94', '+487.6%', '25.41', '11.62', '+118.7%'],
            ['131,072', '1292.02', '144.78', '+792.4%', '22.89', '7.98', '+186.8%'],
          ],
        },
      },
      {
        id: 'single-mtp',
        label: 'Single user, MTP',
        kicker: 'Q4',
        charts: [
          {
            id: 'fn-mtp-modes',
            title: 'Decode at depth 0 by execution mode',
            type: 'bar',
            labels: ['AR', 'MTP mixed', 'MTP repetitive'],
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo', data: [25.87, 32.2, 59.3], color: GUFO },
              { label: 'llama.cpp', data: [22.2, 31.73, 48.12], color: REF },
            ],
          },
          {
            id: 'fn-mtp-depth',
            title: 'MTP decode across context depth, repetitive output',
            type: 'line',
            labels: DEPTHS,
            xTitle: DEPTH_AXIS,
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo', data: [59.3, 46.74, 50.26, 44.81, 53.53, 44.96, 46.12, 45.01], color: GREEN },
              { label: 'llama.cpp', data: [48.12, 45.71, 44.31, 43.53, 43.66, 39.28, 27.75, 20.96], color: REF, dashed: true },
            ],
          },
        ],
        table: {
          title: 'Single user, MTP',
          note: 'pp is the highest measured rate per engine and depth across mixed and repetitive text, including Gufo predictor catch-up.',
          columns: [
            'Depth',
            'Gufo pp',
            'llama.cpp pp',
            'Gufo tg mixed',
            'llama.cpp tg mixed',
            'Gufo tg repetitive',
            'llama.cpp tg repetitive',
          ],
          rows: [
            ['0', '1602.82', '468.76', '32.20', '31.73', '59.30', '48.12'],
            ['4,096', '1506.32', '423.79', '32.50', '34.48', '46.74', '45.71'],
            ['8,192', '1492.95', '394.98', '36.08', '32.20', '50.26', '44.31'],
            ['12,288', '1488.03', '365.91', '34.26', '32.32', '44.81', '43.53'],
            ['16,384', '1471.81', '341.98', '35.41', '32.07', '53.53', '43.66'],
            ['32,768', '1449.56', '277.61', '31.03', '25.41', '44.96', '39.28'],
            ['65,536', '1316.70', '208.04', '32.63', '19.65', '46.12', '27.75'],
            ['131,072', '1335.91', '135.42', '34.20', '14.63', '45.01', '20.96'],
          ],
        },
      },
      {
        id: 'multi',
        label: 'Multiple users',
        kicker: 'AR · MTP',
        charts: [
          {
            id: 'fn-multi',
            title: 'Summed decode rates by concurrency',
            type: 'bar',
            labels: ['1', '2', '4', '6', '8'],
            xTitle: 'Concurrent users',
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo AR', data: [25.85, 45.7, 76.29, 95.66, 108.67], color: GUFO },
              { label: 'llama.cpp AR', data: [22.34, 37.08, 54.82, 65.34, 68.79], color: REF },
              { label: 'Gufo MTP repetitive', data: [59.2, 93.16, 127.91, 142.14, 157.22], color: GREEN },
              { label: 'llama.cpp MTP repetitive', data: [46.93, 52.57, 48.23, 48.51, 58.13], color: GOLD },
            ],
          },
        ],
        table: {
          title: 'Multiple users',
          note: 'Same pp2048 prompts as single-user depth 0, tg128, context 4096 per user. All sessions are prefilled before timed decoding.',
          columns: [
            'Users',
            'Gufo AR',
            'llama.cpp AR',
            'Gufo MTP mixed',
            'llama.cpp MTP mixed',
            'Gufo MTP repetitive',
            'llama.cpp MTP repetitive',
          ],
          rows: [
            ['1', '25.85', '22.34', '32.09', '31.77', '59.20', '46.93'],
            ['2', '45.70', '37.08', '51.68', '42.79', '93.16', '52.57'],
            ['4', '76.29', '54.82', '75.92', '48.78', '127.91', '48.23'],
            ['6', '95.66', '65.34', '89.18', '52.59', '142.14', '48.51'],
            ['8', '108.67', '68.79', '106.47', '61.92', '157.22', '58.13'],
          ],
        },
      },
      {
        id: 'loading-memory',
        label: 'Loading and memory',
        kicker: 'Q4',
        charts: [
          {
            id: 'fn-loading',
            title: 'Cold files to HTTP readiness',
            type: 'bar',
            labels: ['Q4 target and MTP sidecar'],
            yTitle: 'Seconds',
            series: [
              { label: 'Gufo', data: [15.45], color: GUFO },
              { label: 'llama.cpp', data: [117.83], color: REF },
            ],
          },
        ],
        table: {
          title: 'Loading and memory',
          note: 'Loading: C1, context capacity 262144, MTP. Memory: C1, context capacity 133121, AR, peak reported by HIP.',
          columns: ['Measurement', 'Gufo', 'llama.cpp', 'Gain'],
          rows: [
            ['Ready (s)', '15.45', '117.83', '+662.7%'],
            ['Peak memory, pp2048 + tg128 (GiB)', '85.55', '84.84', '-0.8%'],
            ['Peak memory, 16K prefix, pp4096 + tg128 (GiB)', '86.27', '85.31', '-1.1%'],
          ],
        },
      },
    ],
    notes: [
      'Concurrency uses the unchanged short-context attention path.',
      'llama.cpp re-evaluates its four-token checkpoint tail in the concurrency runs.',
      'Adaptive MTP is the default; --draft-tokens caps proposals between one and seven.',
    ],
    reproduce: [
      './result/bin/gufo serve llm --model "$FIRST_SHARD" --speculative mtp --mtp-model "$MTP"',
      'python3 tools/bench/model-bench.py --model qwen3.8-flash-next --gguf "$MODEL" --mtp "$MTP" run --target reference --table single-mtp',
    ],
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    short: 'DeepSeek V4 Flash',
    type: 'Sparse MoE text',
    format: 'Flash 0731 mixed IQ2XXS GGUF, DSpark support sidecar',
    sourceDir: 'src/models/deepseek_v4_flash',
    docPath: 'docs/models/deepseek-v4-flash/BENCHMARKS.md',
    reference: 'antirez/ds4 0aaea5a2 (ROCm)',
    measured: '2026-09-23–24 · one warmed sample per point · greedy, thinking off',
    summary:
      'The 80.76 GiB target with its DSpark support sidecar. The pinned reference server disables DSpark when batching and its matched C1 DSpark control changes greedy output, so those comparisons stay N/A rather than being estimated.',
    highlights: [
      { label: 'Prefill, depth 0', value: '484.62 tok/s', note: 'antirez/ds4 248.41 tok/s · +95.1%' },
      { label: 'Decode AR, depth 0', value: '16.28 tok/s', note: 'antirez/ds4 14.83 tok/s · +9.8%' },
      { label: 'Decode AR, depth 131,072', value: '12.04 tok/s', note: 'antirez/ds4 10.15 tok/s · +18.6%' },
      { label: 'Decode DSpark, repetitive', value: '26.62 tok/s', note: 'Reference N/A: its C1 control changes greedy output' },
      { label: 'Eight users, AR', value: '55.47 tok/s', note: 'antirez/ds4 14.99 tok/s · +270.0%' },
      { label: 'Cold load to HTTP readiness', value: '16.41 s', note: 'antirez/ds4 150.87 s · +819.4%' },
    ],
    views: [
      {
        id: 'single-ar',
        label: 'Single user, AR',
        kicker: 'IQ2XXS',
        charts: [
          {
            id: 'ds4-ar-pp',
            title: 'Prefill across context depth',
            type: 'line',
            labels: DEPTHS,
            xTitle: DEPTH_AXIS,
            yTitle: 'Prefill (tok/s)',
            series: [
              { label: 'Gufo', data: [484.62, 399.75, 368.17, 393.95, 358.41, 370.1, 321.28, 279.95], color: GUFO },
              { label: 'antirez/ds4', data: [248.41, 238.93, 223.24, 212.41, 214.97, 205.7, 177.43, 140.04], color: REF, dashed: true },
            ],
          },
          {
            id: 'ds4-ar-tg',
            title: 'Decode across context depth',
            type: 'line',
            labels: DEPTHS,
            xTitle: DEPTH_AXIS,
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo', data: [16.28, 15.97, 15.82, 15.64, 15.5, 14.87, 13.95, 12.04], color: GUFO },
              { label: 'antirez/ds4', data: [14.83, 14.12, 13.9, 13.78, 13.64, 12.96, 12.0, 10.15], color: REF, dashed: true },
            ],
          },
        ],
        table: {
          title: 'Single user, autoregressive',
          note: 'Approximately pp2048 / tg128; depth is the cached prefix in tokens.',
          columns: ['Depth', 'Gufo pp', 'ds4 pp', 'Gain', 'Gufo tg', 'ds4 tg', 'Gain'],
          rows: [
            ['0', '484.62', '248.41', '+95.1%', '16.28', '14.83', '+9.8%'],
            ['4,096', '399.75', '238.93', '+67.3%', '15.97', '14.12', '+13.1%'],
            ['8,192', '368.17', '223.24', '+64.9%', '15.82', '13.90', '+13.8%'],
            ['12,288', '393.95', '212.41', '+85.5%', '15.64', '13.78', '+13.5%'],
            ['16,384', '358.41', '214.97', '+66.7%', '15.50', '13.64', '+13.6%'],
            ['32,768', '370.10', '205.70', '+79.9%', '14.87', '12.96', '+14.7%'],
            ['65,536', '321.28', '177.43', '+81.1%', '13.95', '12.00', '+16.2%'],
            ['131,072', '279.95', '140.04', '+99.9%', '12.04', '10.15', '+18.6%'],
          ],
        },
      },
      {
        id: 'single-dspark',
        label: 'Single user, DSpark',
        kicker: 'IQ2XXS',
        charts: [
          {
            id: 'ds4-dspark-depth',
            title: 'Gufo decode across context depth, AR versus DSpark',
            type: 'line',
            labels: DEPTHS,
            xTitle: DEPTH_AXIS,
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'AR', data: [16.28, 15.97, 15.82, 15.64, 15.5, 14.87, 13.95, 12.04], color: GUFO },
              { label: 'DSpark mixed', data: [18.25, 16.01, 16.48, 15.79, 15.52, 14.98, 14.05, 11.95], color: ACCENT },
              { label: 'DSpark repetitive', data: [26.62, 25.54, 25.03, 23.87, 23.81, 22.9, 19.76, 15.17], color: GREEN },
            ],
          },
        ],
        table: {
          title: 'Single user, DSpark',
          note: 'The reference is N/A throughout: its matched C1 control changes greedy output versus AR.',
          columns: ['Depth', 'Gufo pp', 'ds4 pp', 'Gufo tg mixed', 'Gufo tg repetitive', 'ds4 tg'],
          rows: [
            ['0', '483.11', 'N/A', '18.25', '26.62', 'N/A'],
            ['4,096', '398.06', 'N/A', '16.01', '25.54', 'N/A'],
            ['8,192', '367.84', 'N/A', '16.48', '25.03', 'N/A'],
            ['12,288', '393.32', 'N/A', '15.79', '23.87', 'N/A'],
            ['16,384', '358.90', 'N/A', '15.52', '23.81', 'N/A'],
            ['32,768', '367.12', 'N/A', '14.98', '22.90', 'N/A'],
            ['65,536', '336.67', 'N/A', '14.05', '19.76', 'N/A'],
            ['131,072', '283.45', 'N/A', '11.95', '15.17', 'N/A'],
          ],
        },
      },
      {
        id: 'multi',
        label: 'Multiple users',
        kicker: 'AR · DSpark',
        charts: [
          {
            id: 'ds4-multi',
            title: 'Summed decode rates by concurrency',
            type: 'bar',
            labels: ['1', '2', '4', '6', '8'],
            xTitle: 'Concurrent users',
            yTitle: 'Decode (tok/s)',
            series: [
              { label: 'Gufo AR', data: [16.27, 26.88, 41.09, 49.21, 55.47], color: GUFO },
              { label: 'antirez/ds4 AR', data: [14.81, 14.81, 14.89, 15.01, 14.99], color: REF },
              { label: 'Gufo DSpark repetitive', data: [26.59, 41.97, 47.04, 42.04, 52.77], color: GREEN },
            ],
          },
        ],
        table: {
          title: 'Multiple users',
          note: 'Context 4096 per user, tg128, all sessions prefilled before timed decoding. ROCm batching disables reference DSpark at C greater than one.',
          columns: ['Users', 'Gufo AR', 'ds4 AR', 'Gain', 'Gufo DSpark mixed', 'Gufo DSpark repetitive', 'ds4 DSpark'],
          rows: [
            ['1', '16.27', '14.81', '+9.9%', '18.24', '26.59', 'N/A'],
            ['2', '26.88', '14.81', '+81.5%', '30.80', '41.97', 'N/A'],
            ['4', '41.09', '14.89', '+176.0%', '41.20', '47.04', 'N/A'],
            ['6', '49.21', '15.01', '+227.8%', '46.35', '42.04', 'N/A'],
            ['8', '55.47', '14.99', '+270.0%', '54.74', '52.77', 'N/A'],
          ],
        },
      },
      {
        id: 'loading-memory',
        label: 'Loading and memory',
        kicker: 'IQ2XXS',
        charts: [
          {
            id: 'ds4-loading',
            title: 'Cold files to HTTP readiness',
            type: 'bar',
            labels: ['IQ2XXS target and DSpark sidecar'],
            yTitle: 'Seconds',
            series: [
              { label: 'Gufo', data: [16.41], color: GUFO },
              { label: 'antirez/ds4', data: [150.87], color: REF },
            ],
          },
          {
            id: 'ds4-memory',
            title: 'Peak memory reported by HIP',
            type: 'bar',
            labels: ['pp2048 + tg128', '16K prefix, pp4096 + tg128'],
            yTitle: 'GiB',
            series: [
              { label: 'Gufo', data: [93.09, 93.88], color: GUFO },
              { label: 'antirez/ds4', data: [99.96, 100.01], color: REF },
            ],
          },
        ],
        table: {
          title: 'Loading and memory',
          note: 'C1, context capacity 262144. Loading uses DSpark; memory is the peak reported by HIP under AR.',
          columns: ['Measurement', 'Gufo', 'antirez/ds4', 'Gain'],
          rows: [
            ['Ready (s)', '16.41', '150.87', '+819.4%'],
            ['Peak memory, pp2048 + tg128 (GiB)', '93.09', '99.96', '+7.4%'],
            ['Peak memory, 16K prefix, pp4096 + tg128 (GiB)', '93.88', '100.01', '+6.5%'],
          ],
        },
      },
    ],
    notes: [
      'Gufo DSpark is not faster than AR in the largest cohorts measured here.',
      'The reference HTTP payload omits pp and tg durations; the driver reads the pinned server stage timers from its log and checks them against HTTP token counts.',
      'Target-model parity remains open: do not read AR/DSpark agreement as a quality claim.',
    ],
    reproduce: [
      './result/bin/gufo serve llm --model "$TARGET" --dspark-model "$DSPARK" --context 32768 --sessions 1',
      'nix shell .#ds4-reference  # pinned reference server and bench',
    ],
  },
  {
    id: 'qwen3-tts',
    name: 'Qwen3-TTS 12Hz 1.7B',
    short: 'Qwen3-TTS',
    type: 'Speech synthesis',
    format: 'BF16 safetensors, F32 waveform decoder',
    sourceDir: 'src/models/qwen3_tts',
    docPath: 'docs/models/qwen3-tts/BENCHMARKS.md',
    reference: null,
    measured: '2026-09-20 · Nix production build 8e4ba46f9dd0 · seed 42, resident models',
    summary:
      'Fixed-work checks over the same 37-word paragraph for all three variants: 64 codec frames, 5.12 seconds of audio. Buffered latency is the median of three requests after one warmup. RTF is request time over generated audio duration, so lower is better.',
    highlights: [
      { label: 'CustomVoice buffered WAV', value: '2.018 s', note: 'RTF 0.394 for 5.12 s of audio' },
      { label: 'First PCM audio', value: '0.201 s', note: 'First chunk carries four codec frames, 320 ms' },
      { label: 'VoiceDesign buffered WAV', value: '2.024 s', note: 'RTF 0.395' },
      { label: 'Base ICL buffered WAV', value: '2.234 s', note: 'RTF 0.436, first audio 0.345 s' },
      { label: 'Cold launch to readiness', value: '1.48–1.84 s', note: 'Context 4096, one cold-file-cache launch' },
      { label: 'GPU busy during synthesis', value: '90.5%', note: 'CustomVoice warm profile, 68,241 dispatches' },
    ],
    views: [
      {
        id: 'single-request',
        label: 'Single request',
        kicker: '64 codec frames',
        charts: [
          {
            id: 'tts-latency',
            title: 'Request latency by variant',
            type: 'bar',
            labels: ['CustomVoice', 'VoiceDesign', 'Base ICL'],
            yTitle: 'Seconds',
            series: [
              { label: 'First PCM audio', data: [0.201, 0.201, 0.345], color: ACCENT },
              { label: 'Buffered WAV', data: [2.018, 2.024, 2.234], color: GUFO },
              { label: 'Complete PCM', data: [2.059, 2.065, 2.247], color: GREEN },
            ],
          },
        ],
        table: {
          title: 'Single request, 64 codec frames',
          note: '5.12 seconds of generated audio. Buffered latency is the median of three requests after one warmup.',
          columns: ['Variant', 'Buffered WAV', 'RTF', 'First PCM audio', 'Complete PCM'],
          rows: [
            ['CustomVoice', '2.018 s', '0.394', '0.201 s', '2.059 s'],
            ['VoiceDesign', '2.024 s', '0.395', '0.201 s', '2.065 s'],
            ['Base ICL', '2.234 s', '0.436', '0.345 s', '2.247 s'],
          ],
        },
      },
      {
        id: 'transports',
        label: 'Transports',
        kicker: 'HTTP · SSE · WebSocket',
        charts: [
          {
            id: 'tts-transport',
            title: 'One warmed loopback check per transport',
            type: 'bar',
            labels: ['PCM HTTP', 'SSE', 'WebSocket'],
            yTitle: 'Seconds',
            series: [
              { label: 'First audio', data: [0.199, 0.201, 0.199], color: ACCENT },
              { label: 'Complete request', data: [2.053, 2.051, 2.048], color: GUFO },
            ],
          },
        ],
        table: {
          title: 'Transports',
          note: 'WebSocket uses TCP_NODELAY. WAV, PCM, SSE and WebSocket return identical PCM bytes.',
          columns: ['Transport', 'First audio', 'Complete request'],
          rows: [
            ['PCM HTTP', '0.199 s', '2.053 s'],
            ['SSE', '0.201 s', '2.051 s'],
            ['WebSocket', '0.199 s', '2.048 s'],
          ],
        },
      },
      {
        id: 'loading',
        label: 'Loading',
        kicker: '2026-09-21',
        charts: [
          {
            id: 'tts-loading',
            title: 'Cold-file-cache launch to HTTP readiness',
            type: 'bar',
            labels: ['CustomVoice', 'VoiceDesign', 'Base ICL'],
            yTitle: 'Seconds',
            series: [{ label: 'Ready', data: [1.59, 1.48, 1.84], color: GUFO }],
          },
        ],
        table: {
          title: 'Loading',
          note: 'One cold-file-cache launch to HTTP readiness at context 4096.',
          columns: ['Variant', 'Ready'],
          rows: [
            ['CustomVoice', '1.59 s'],
            ['VoiceDesign', '1.48 s'],
            ['Base ICL', '1.84 s'],
          ],
        },
      },
      {
        id: 'profile',
        label: 'Warm profile',
        kicker: 'GPU work',
        charts: [
          {
            id: 'tts-profile',
            title: 'GPU work in the isolated warm 64-frame profile',
            type: 'bar',
            labels: ['CustomVoice', 'VoiceDesign', 'Base ICL'],
            yTitle: 'Seconds of GPU work',
            series: [{ label: 'GPU work', data: [1.899, 1.915, 2.107], color: ACCENT }],
          },
        ],
        table: {
          title: 'Warm 64-frame profile',
          note: 'Isolated profiles exclude loading, warmup and idle server time. Profiler overhead is excluded from the latency tables.',
          columns: ['Variant', 'Dispatches', 'GPU work', 'GPU busy', 'Projection share'],
          rows: [
            ['CustomVoice', '68,241', '1.899 s', '90.5%', '76.6%'],
            ['VoiceDesign', '68,054', '1.915 s', '90.5%', '76.1%'],
            ['Base ICL', '69,737', '2.107 s', '90.9%', '69.3%'],
          ],
        },
      },
      {
        id: 'concurrency',
        label: 'Concurrency',
        kicker: 'partly TODO',
        charts: [],
        table: {
          title: 'Concurrency',
          note: 'TTS execution remains serialized; streaming delivers audio earlier and queued requests are cancellable. Concurrency does not imply batched model work.',
          columns: ['Concurrency', 'Request completion times'],
          rows: [
            ['1', '2.018 s'],
            ['2', '2.025 / 4.046 s'],
            ['4 / 6 / 8', 'TODO'],
          ],
        },
      },
    ],
    notes: [
      'WAV, PCM, SSE and WebSocket return identical PCM bytes, and seeded waveforms repeat exactly.',
      'Projection traffic remains the main bottleneck; Base additionally spends 16.7% in library prefill and waveform operations.',
      'Base uses a cached 15.05-second reference clip; its latency is not directly comparable to text-only CustomVoice and VoiceDesign.',
    ],
    reproduce: [
      './result/bin/gufo serve tts --model models/Qwen3-TTS-12Hz-1.7B-Base --context 4096 \\',
      '  --voice narrator=reference.wav --voice-text narrator=reference.txt',
      'nix develop -c python3 tools/prof/prof.py --stages qwen-tts',
    ],
  },
  {
    id: 'qwen3-asr',
    name: 'Qwen3-ASR 1.7B',
    short: 'Qwen3-ASR',
    type: 'Speech recognition',
    format: 'BF16 safetensors',
    sourceDir: 'src/models/qwen3_asr',
    docPath: 'docs/models/qwen3-asr/BENCHMARKS.md',
    reference: null,
    measured: '2026-09-21 · Nix production binary ce73ab914d06 · one warmup, three timed requests',
    summary:
      'A 15.05125-second English recording producing 49 greedy output tokens that match the official reference. Timings include audio decoding, features, encoder and text generation; model loading is excluded.',
    highlights: [
      { label: 'Median request', value: '985.67 ms', note: 'RTF 0.0655 on a 15.05 s recording' },
      { label: 'Audio seconds per wall second', value: '15.27', note: 'Transcription runs 15× faster than the recording' },
      { label: 'Audio encoder', value: '33.25 ms', note: 'Stage median, measured separately' },
      { label: 'Text prefill and generation', value: '944.25 ms', note: 'Text generation dominates the request' },
      { label: 'Device storage saved', value: '606 MiB', note: 'Decoder excludes the audio tower weights' },
      { label: 'GPU busy in profile', value: '97.4%', note: '13,253 dispatches, 1,275.19 ms GPU work' },
    ],
    views: [
      {
        id: 'single-request',
        label: 'Single request',
        kicker: '15.05 s recording',
        charts: [
          {
            id: 'asr-stages',
            title: 'Stage medians, measured separately',
            type: 'bar',
            labels: ['Audio encoder', 'Text prefill and generation', 'Complete request'],
            yTitle: 'Milliseconds',
            series: [{ label: 'Median', data: [33.25, 944.25, 985.67], color: GUFO }],
          },
        ],
        table: {
          title: 'Single request',
          note: 'Stage medians are measured separately; do not sum them into another headline.',
          columns: ['Metric', 'Result'],
          rows: [
            ['Median request', '985.67 ms'],
            ['RTF', '0.0655'],
            ['Audio seconds per wall second', '15.27'],
            ['Audio encoder', '33.25 ms'],
            ['Text prefill and generation', '944.25 ms'],
            ['Warm-file-cache CLI model setup', '0.37 s'],
            ['Cold HTTP readiness', 'TODO'],
          ],
        },
      },
      {
        id: 'concurrency',
        label: 'Concurrent HTTP',
        kicker: 'TODO',
        charts: [],
        table: {
          title: 'Concurrent HTTP',
          note: 'GPU work remains serialized between chunks; CPU frontend preparation can overlap for two requests.',
          columns: ['Concurrency', 'Current status'],
          rows: [
            ['1', 'Resident control above; HTTP adds transport overhead'],
            ['2 / 4 / 6 / 8', 'TODO: refresh after chunk-level admission changes'],
          ],
        },
      },
    ],
    notes: [
      'Native convolutions remove MIOpen and improve the encoder by 8.2% in the matched control; complete-request latency stays about 0.99 s because text generation dominates, so no substantial whole-model gain is claimed.',
      'The profiled request has 13,253 dispatches and a 1,308.67 ms kernel span; the measured unprofiled request is 985.67 ms.',
      'Long-form corpus accuracy and current concurrent throughput remain TODO.',
    ],
    reproduce: [
      'nix develop -c python3 src/models/qwen3_asr/tools/benchmark.py \\',
      '  --model "$MODEL" --audio speech.wav --warmup 1 --repeat 3',
    ],
  },
  {
    id: 'qwen-image-2.1',
    name: 'Qwen-Image-2.1',
    short: 'Qwen-Image-2.1',
    type: 'Image generation and editing',
    format: 'BF16 safetensors',
    sourceDir: 'src/models/qwen_image_21',
    docPath: 'docs/models/qwen-image-2.1/BENCHMARKS.md',
    reference: null,
    measured: '2026-09-21 cold-file-cache control · production nix build binary',
    summary:
      'The qualified 40-step generation and edit matrix is still TODO. What exists is a short development control used for kernel iteration: warm C1, 1024×1024, two steps, seed 42. A two-step smoke check is not model quality or normal generation performance.',
    highlights: [
      { label: 'Metadata readiness', value: '0.27 s', note: 'Cold file cache' },
      { label: 'First 256×256 two-step generation', value: '8.83 s', note: 'Includes loading active components' },
      { label: 'Repeat of the same request', value: '0.42 s', note: 'Components already resident' },
      { label: 'Two-step 1024×1024 control', value: '5.838 s', note: 'HTTP total: prompt 0.089 s, denoising 4.865 s, VAE 0.826 s' },
      { label: 'GPU work in the control profile', value: '5.76 s', note: 'GPU idle is 0.5% of the request span' },
      { label: '40-step generation and edit', value: 'TODO', note: 'The 5 s target has not been reached' },
    ],
    views: [
      {
        id: 'dev-control',
        label: 'Development control',
        kicker: 'two steps, 1024×1024',
        charts: [
          {
            id: 'image-stages',
            title: 'Stage time in the warm two-step control',
            type: 'bar',
            labels: ['Prompt', 'Denoising', 'VAE', 'HTTP total'],
            yTitle: 'Seconds',
            series: [{ label: 'Warm C1, seed 42', data: [0.089, 4.865, 0.826, 5.838], color: GUFO }],
          },
        ],
        table: {
          title: 'Short development control',
          note: 'Warm C1, 1024×1024, two steps, seed 42. For kernel iteration only — not generation quality or normal performance.',
          columns: ['Prompt', 'Denoising', 'VAE', 'HTTP total'],
          rows: [['0.089 s', '4.865 s', '0.826 s', '5.838 s']],
        },
      },
      {
        id: 'gpu-profile',
        label: 'GPU profile',
        kicker: 'request-only',
        charts: [
          {
            id: 'image-gpu',
            title: 'GPU work in the separate control profile',
            type: 'bar',
            labels: ['Native projections', 'Fused feed-forward', 'Fused attention', 'Native convolution'],
            yTitle: 'Seconds',
            series: [{ label: 'GPU time', data: [1.72, 1.41, 1.49, 0.55], color: ACCENT }],
          },
        ],
        table: {
          title: 'GPU work, 5.76 s total',
          note: 'GPU idle time is 0.5% of the request span. HTTP timings use no profiler or correctness observer.',
          columns: ['Operation', 'GPU time'],
          rows: [
            ['Native projections', '1.72 s'],
            ['Fused feed-forward', '1.41 s'],
            ['Fused attention', '1.49 s'],
            ['Native convolution', '0.55 s'],
          ],
        },
      },
      {
        id: 'qualified',
        label: 'Qualified matrix',
        kicker: 'TODO',
        charts: [],
        table: {
          title: 'Qualified matrix',
          note: 'Warm runs exclude model loading. Concurrent requests are isolated and queued; concurrent GPU batching is not implemented.',
          columns: ['Mode', 'Output', 'Steps', 'Prompt', 'Denoising', 'VAE', 'Total'],
          rows: [
            ['Generation, C1', '1024×1024', '40', 'TODO', 'TODO', 'TODO', 'TODO'],
            ['Edit, one reference, C1', '1024×1024', '40', 'TODO', 'TODO', 'TODO', 'TODO'],
          ],
        },
      },
    ],
    notes: [
      'Concurrent requests are isolated and queued; concurrent GPU batching is not implemented.',
      'PNG uses low compression with adaptive filters and preserves every RGBA pixel; the control response is about 1.00 MB.',
      'Weights use the non-commercial Qwen Research License, separate from Gufo’s MIT license.',
    ],
    reproduce: [
      './result/bin/gufo serve image --model "$MODEL_DIR" --served-model-name Qwen-Image-2.1 --port 8080',
    ],
  },
  {
    id: 'minimax-h3',
    name: 'MiniMax H3 FL2VA',
    short: 'MiniMax H3',
    type: 'Text to video and audio',
    format: 'Pinned BF16 safetensors',
    sourceDir: 'src/models/minimax_h3',
    docPath: 'docs/models/minimax-h3/BENCHMARKS.md',
    reference: null,
    measured: '2026-09-21 · Nix release on gfx1151 · ROCm 7.2.3, BF16',
    summary:
      'The qualified end-to-end timing matrix is TODO. Component traces and extrapolations are not complete-generation measurements: one denoiser evaluation takes 91.00 s, and the exact preset needs 49 of them followed by video and audio decoding.',
    highlights: [
      { label: 'One denoiser evaluation', value: '91.00 s', note: '50 transformer blocks at 1344×768×124, not a complete video' },
      { label: 'Evaluations for the exact preset', value: '49', note: 'Then video and audio decoding; total latency TODO' },
      { label: 'Peak retained memory', value: '40.01 GiB', note: 'Includes 2.93 GiB scratch and retained BLAS workspace' },
      { label: 'Metadata-only HTTP readiness', value: '0.17 s', note: 'Loading control, peak device memory 1.88 GiB' },
      { label: 'Native attention, 37,716 rows', value: '1,087.53 ms', note: 'Component measurement, one timed launch after warm-up' },
      { label: 'Production Nix runtime closure', value: '3.82 GiB', note: 'No Triton/AOTriton, Composable Kernel or MIOpen' },
    ],
    views: [
      {
        id: 'dit-components',
        label: 'Native DiT components',
        kicker: '2026-09-21',
        charts: [
          {
            id: 'h3-attention',
            title: 'Native attention by sequence rows',
            type: 'bar',
            labels: ['528', '1,872', '4,096', '4,097', '7,136', '37,716'],
            xTitle: 'Sequence rows',
            yTitle: 'GPU milliseconds',
            series: [{ label: 'Native attention', data: [0.63, 6.02, 27.33, 14.2, 39.5, 1087.53], color: GUFO }],
          },
        ],
        table: {
          title: 'Native DiT components',
          note: '56 heads of width 128. Kernel measurements use the production compiler flags; loading is excluded. These are component measurements, not complete-generation latency.',
          columns: ['Sequence rows', 'Native attention, GPU ms', 'Real-weight block, GPU ms', 'Block wall ms'],
          rows: [
            ['528', '0.63', 'TODO', 'TODO'],
            ['1,872', '6.02', 'TODO', 'TODO'],
            ['4,096', '27.33', 'TODO', 'TODO'],
            ['4,097', '14.20', 'TODO', 'TODO'],
            ['7,136', '39.50', '312.85', '326.31'],
            ['37,716', '1,087.53', '1,761.13', '1,823.90'],
          ],
        },
      },
      {
        id: 'memory',
        label: 'Component inventory',
        kicker: 'tensor bytes',
        charts: [
          {
            id: 'h3-memory',
            title: 'Component tensor inventory',
            type: 'bar',
            labels: ['Qwen prompt encoder', 'AdaLN/time precompute', 'DiT core and heads', 'VisualVAE', 'AudioVAE'],
            yTitle: 'GiB',
            series: [{ label: 'Tensor bytes', data: [62.13, 24.35, 37.38, 9.7, 0.56], color: ACCENT }],
          },
        ],
        table: {
          title: 'Component inventory',
          note: 'Phase owners release their resources on completion, failure or cancellation. These inventories must not be added as though all were resident together.',
          columns: ['Component', 'Tensor bytes', 'GiB'],
          rows: [
            ['Qwen prompt encoder', '66,714,780,128', '62.13'],
            ['AdaLN/time precompute', '26,142,079,488', '24.35'],
            ['DiT core and heads', '40,138,350,656', '37.38'],
            ['VisualVAE', '10,415,484,128', '9.70'],
            ['AudioVAE', '605,306,340', '0.56'],
          ],
        },
      },
      {
        id: 'presets',
        label: 'Presets',
        kicker: 'TODO',
        charts: [],
        table: {
          title: 'Presets',
          note: 'One worker executes jobs with one queued job. There is no parallel C greater than one model execution; throughput and queue latency are TODO.',
          columns: ['Preset', 'Single request wall', 'Peak resident memory', 'Delivery quality'],
          rows: [
            ['exact, 512x512', 'TODO', 'TODO', 'Component evidence only'],
            ['exact-1344x768', 'TODO', 'TODO', 'Component evidence only'],
            ['fast', 'TODO', 'TODO', 'Approximate; full comparison TODO'],
            ['aggressive', 'TODO', 'TODO', 'Approximate; full comparison TODO'],
            ['dev, selected frames', 'TODO', 'TODO', 'Bounded diagnostic only'],
          ],
        },
      },
    ],
    notes: [
      'Attention remains the largest cost, followed by projections; the GPU is continuously busy during the transformer blocks.',
      'No complete-video speedup is established, and throughput or queue-latency numbers are TODO.',
      'Routine iteration uses one block or forward, or selected frames, with independent quality gates rather than full videos.',
    ],
    reproduce: [
      'nix develop -c python3 tools/gufo/h3_profile.py  # full generation needs --allow-full-generation',
    ],
  },
];
