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
}

const GUFO = '#e8891c';
const REF = '#6a9bcc';
const ACCENT = '#2f5d3a';
const GOLD = '#c2a14d';
const PURPLE = '#8a76c4';

const DEPTHS = ['0', '4,096', '8,192', '12,288', '16,384', '32,768', '65,536', '131,072'];
const DEPTH_AXIS = 'Cached prefix depth (tokens)';

export const benchmarks: BenchModel[] = [
  {
    id: 'qwen3.8-flash-next',
    name: 'Qwen3.8 Flash-Next',
    short: 'Flash-Next',
    type: 'Hybrid recurrent/QSA MoE, text and images',
    format: 'UD-Q4_K_XL GGUF, four shards, shared-Q8_0 MTP sidecar',
    sourceDir: 'src/models/qwen38_flash_next',
    docPath: 'docs/models/qwen3.8-flash-next/BENCHMARKS.md',
    reference: 'llama.cpp b11069 (AR) and 6fcaa16f (MTP)',
    measured: 'October 9, 2026',
    summary:
      'Unsloth UD-Q4_K_XL weights with the Q8_0 MTP predictor. HTTP, greedy, thinking off.',
    highlights: [
      { label: 'Prefill, depth 0', value: '1,700.52 tok/s', note: 'llama.cpp 489.59 tok/s · +247.3%' },
      { label: 'Prefill, depth 131,072', value: '1,478.66 tok/s', note: 'llama.cpp 144.78 tok/s · +921.3%' },
      { label: 'Decode AR, depth 0', value: '25.95 tok/s', note: 'llama.cpp 22.20 tok/s · +16.9%' },
      { label: 'Decode AR, depth 131,072', value: '24.92 tok/s', note: 'llama.cpp 7.98 tok/s · +212.3%' },
      { label: 'Decode MTP, repetitive, depth 0', value: '60.39 tok/s', note: 'llama.cpp 48.12 tok/s · +25.5%' },
      { label: 'Eight users, MTP, repetitive', value: '162.98 tok/s', note: 'llama.cpp 58.13 tok/s · +180.4%' },
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
              { label: 'Gufo', data: [1700.52, 1618.6, 1611.53, 1602.99, 1597.41, 1585.98, 1509.1, 1478.66], color: GUFO },
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
              { label: 'Gufo', data: [25.95, 25.84, 25.96, 25.94, 25.9, 25.78, 25.4, 24.92], color: GUFO },
              { label: 'llama.cpp', data: [22.2, 21.21, 20.4, 19.64, 18.95, 16.54, 11.62, 7.98], color: REF, dashed: true },
            ],
          },
        ],
        table: {
          title: 'Single user, autoregressive',
          note: 'Approximately pp2048 / tg128; depth is the cached prefix in tokens.',
          columns: ['Depth', 'Gufo pp', 'llama.cpp pp', 'Gain', 'Gufo tg', 'llama.cpp tg', 'Gain'],
          rows: [
            ['0', '1700.52', '489.59', '+247.3%', '25.95', '22.20', '+16.9%'],
            ['4,096', '1618.60', '455.24', '+255.5%', '25.84', '21.21', '+21.8%'],
            ['8,192', '1611.53', '428.85', '+275.8%', '25.96', '20.40', '+27.3%'],
            ['12,288', '1602.99', '400.21', '+300.5%', '25.94', '19.64', '+32.1%'],
            ['16,384', '1597.41', '375.89', '+325.0%', '25.90', '18.95', '+36.7%'],
            ['32,768', '1585.98', '301.31', '+426.4%', '25.78', '16.54', '+55.9%'],
            ['65,536', '1509.10', '221.94', '+580.0%', '25.40', '11.62', '+118.6%'],
            ['131,072', '1478.66', '144.78', '+921.3%', '24.92', '7.98', '+212.3%'],
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
              { label: 'Gufo', data: [25.95, 31.32, 60.39], color: GUFO },
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
              { label: 'Gufo', data: [60.39, 57.66, 49.28, 42.15, 50.58, 44.54, 44.45, 44.26], color: PURPLE },
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
            ['0', '1642.85', '468.76', '31.32', '31.73', '60.39', '48.12'],
            ['4,096', '1575.60', '423.79', '32.48', '34.48', '57.66', '45.71'],
            ['8,192', '1573.54', '394.98', '32.38', '32.20', '49.28', '44.31'],
            ['12,288', '1559.07', '365.91', '34.68', '32.32', '42.15', '43.53'],
            ['16,384', '1547.52', '341.98', '35.09', '32.07', '50.58', '43.66'],
            ['32,768', '1541.35', '277.61', '34.20', '25.41', '44.54', '39.28'],
            ['65,536', '1466.98', '208.04', '33.49', '19.65', '44.45', '27.75'],
            ['131,072', '1436.89', '135.42', '33.07', '14.63', '44.26', '20.96'],
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
              { label: 'Gufo AR', data: [25.84, 45.77, 76.33, 95.75, 108.68], color: GUFO },
              { label: 'llama.cpp AR', data: [22.34, 37.08, 54.82, 65.34, 68.79], color: REF },
              { label: 'Gufo MTP repetitive', data: [60.1, 84.52, 131.1, 145.38, 162.98], color: PURPLE },
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
            ['1', '25.84', '22.34', '31.28', '31.77', '60.10', '46.93'],
            ['2', '45.77', '37.08', '52.22', '42.79', '84.52', '52.57'],
            ['4', '76.33', '54.82', '76.16', '48.78', '131.10', '48.23'],
            ['6', '95.75', '65.34', '96.01', '52.59', '145.38', '48.51'],
            ['8', '108.68', '68.79', '107.77', '61.92', '162.98', '58.13'],
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
            ['Peak memory, pp2048 + tg128 (GiB)', '85.56', '84.84', '-0.8%'],
            ['Peak memory, 16K prefix, pp4096 + tg128 (GiB)', '86.71', '85.31', '-1.6%'],
          ],
        },
      },
    ],
    notes: [
      'The multi-user runs use the normal short-context attention path.',
      'In the multi-user runs, llama.cpp recomputes the last four tokens of each checkpoint.',
      'MTP picks its draft length on the fly; --draft-tokens caps it between one and seven.',
    ],
  },
  {
    id: 'qwen3.8-27b',
    name: 'Qwen3.8 27B',
    short: 'Qwen3.8 27B',
    type: 'Dense text and images',
    format: 'UD-Q4_K_XL / UD-Q8_K_XL GGUF',
    sourceDir: 'src/models/qwen',
    docPath: 'docs/models/qwen3.8-27b/BENCHMARKS.md',
    reference: 'llama.cpp b11069',
    measured: 'September 23, 2026',
    summary:
      'Both engines run the same Q4_K_XL and Q8_K_XL weights with the same Q4_K_M DFlash2 draft.',
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
              { label: 'Gufo', data: [63.12, 52.24, 61.55, 53.18, 49.67, 47.76, 29.44, 26.83], color: PURPLE },
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
              { label: 'Gufo', data: [46.84, 40.51, 41.53, 40.45, 39.39, 35.87, 25.45, 23.41], color: PURPLE },
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
              { label: 'Gufo DFlash2 repetitive', data: [70.56, 105.51, 110.49, 113.52, 123.0], color: PURPLE },
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
              { label: 'Gufo DFlash2 repetitive', data: [51.23, 86.58, 102.98, 109.42, 118.07], color: PURPLE },
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
      'With greedy decoding, DFlash2 output matches plain decoding. llama.cpp differs in a few settings; the quality report has the details.',
      'Multi-user numbers add up each request’s decode speed and leave out prefill and queueing.',
      'The draft doesn’t need to match the main model’s precision: one Q4_K_M draft serves both.',
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
    measured: 'September 24, 2026',
    summary:
      'The 80.76 GiB model with its DSpark support file. The reference server turns DSpark off when batching, and its single-user DSpark run changes greedy output, so those comparisons are N/A instead of guessed.',
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
              { label: 'DSpark repetitive', data: [26.62, 25.54, 25.03, 23.87, 23.81, 22.9, 19.76, 15.17], color: PURPLE },
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
              { label: 'Gufo DSpark repetitive', data: [26.59, 41.97, 47.04, 42.04, 52.77], color: PURPLE },
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
      'With the most users measured here, DSpark is no faster than plain decoding.',
      'The reference server doesn’t report pp and tg times over HTTP, so they come from its log, checked against the token counts.',
      'Quality against the original model is still open. AR and DSpark agreeing is not a quality claim.',
    ],
  },
];
