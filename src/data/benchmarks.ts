// Benchmark data transcribed from the Gufo repository:
// docs/internal/models/<model>/BENCHMARKS.md. Every row here exists in those tables.
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
    docPath: 'docs/internal/models/qwen3.8-flash-next/BENCHMARKS.md',
    reference: 'llama.cpp b11069 (AR) and 6fcaa16f (MTP)',
    measured: 'October 18, 2026',
    summary:
      'Unsloth UD-Q4_K_XL weights with the Q8_0 MTP predictor. HTTP, greedy, thinking off.',
    highlights: [
      { label: 'Prefill, depth 0', value: '1,801.01 tok/s', note: 'llama.cpp 489.59 tok/s · +267.9%' },
      { label: 'Prefill, depth 131,072', value: '1,557.18 tok/s', note: 'llama.cpp 144.78 tok/s · +975.5%' },
      { label: 'Decode AR, depth 0', value: '28.29 tok/s', note: 'llama.cpp 22.20 tok/s · +27.4%' },
      { label: 'Decode AR, depth 131,072', value: '27.85 tok/s', note: 'llama.cpp 7.98 tok/s · +249.0%' },
      { label: 'Decode MTP, repetitive, depth 0', value: '116.93 tok/s', note: 'llama.cpp 48.12 tok/s · +143.0%' },
      { label: 'Eight users, MTP, repetitive', value: '245.81 tok/s', note: 'llama.cpp 58.13 tok/s · +322.9%' },
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
              { label: 'Gufo', data: [1801.01, 1727.95, 1721.41, 1710.64, 1706.86, 1672.6, 1602.93, 1557.18], color: GUFO },
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
              { label: 'Gufo', data: [28.29, 28.27, 28.27, 28.21, 28.25, 28.18, 28.09, 27.85], color: GUFO },
              { label: 'llama.cpp', data: [22.2, 21.21, 20.4, 19.64, 18.95, 16.54, 11.62, 7.98], color: REF, dashed: true },
            ],
          },
        ],
        table: {
          title: 'Single user, autoregressive',
          note: 'Approximately pp2048 / tg128; depth is the cached prefix in tokens.',
          columns: ['Depth', 'Gufo pp', 'llama.cpp pp', 'Gain', 'Gufo tg', 'llama.cpp tg', 'Gain'],
          rows: [
            ['0', '1801.01', '489.59', '+267.9%', '28.29', '22.20', '+27.4%'],
            ['4,096', '1727.95', '455.24', '+279.6%', '28.27', '21.21', '+33.3%'],
            ['8,192', '1721.41', '428.85', '+301.4%', '28.27', '20.40', '+38.6%'],
            ['12,288', '1710.64', '400.21', '+327.4%', '28.21', '19.64', '+43.6%'],
            ['16,384', '1706.86', '375.89', '+354.1%', '28.25', '18.95', '+49.1%'],
            ['32,768', '1672.60', '301.31', '+455.1%', '28.18', '16.54', '+70.4%'],
            ['65,536', '1602.93', '221.94', '+622.2%', '28.09', '11.62', '+141.7%'],
            ['131,072', '1557.18', '144.78', '+975.5%', '27.85', '7.98', '+249.0%'],
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
              { label: 'Gufo', data: [28.29, 35.79, 116.93], color: GUFO },
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
              { label: 'Gufo', data: [116.93, 116.41, 114.08, 105.48, 113.32, 105.38, 104.78, 108.37], color: PURPLE },
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
            ['0', '1734.96', '468.76', '35.79', '31.73', '116.93', '48.12'],
            ['4,096', '1676.83', '423.79', '37.64', '34.48', '116.41', '45.71'],
            ['8,192', '1669.91', '394.98', '36.91', '32.20', '114.08', '44.31'],
            ['12,288', '1660.54', '365.91', '39.28', '32.32', '105.48', '43.53'],
            ['16,384', '1635.18', '341.98', '40.54', '32.07', '113.32', '43.66'],
            ['32,768', '1618.63', '277.61', '39.97', '25.41', '105.38', '39.28'],
            ['65,536', '1556.32', '208.04', '39.23', '19.65', '104.78', '27.75'],
            ['131,072', '1481.19', '135.42', '39.87', '14.63', '108.37', '20.96'],
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
              { label: 'Gufo AR', data: [28.24, 50.66, 86.01, 108.34, 125.48], color: GUFO },
              { label: 'llama.cpp AR', data: [22.34, 37.08, 54.82, 65.34, 68.79], color: REF },
              { label: 'Gufo MTP repetitive', data: [116.5, 165.5, 218.12, 231.85, 245.81], color: PURPLE },
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
            ['1', '28.24', '22.34', '35.74', '31.77', '116.50', '46.93'],
            ['2', '50.66', '37.08', '61.30', '42.79', '165.50', '52.57'],
            ['4', '86.01', '54.82', '88.77', '48.78', '218.12', '48.23'],
            ['6', '108.34', '65.34', '109.74', '52.59', '231.85', '48.51'],
            ['8', '125.48', '68.79', '127.02', '61.92', '245.81', '58.13'],
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
              { label: 'Gufo', data: [16.42], color: GUFO },
              { label: 'llama.cpp', data: [117.83], color: REF },
            ],
          },
        ],
        table: {
          title: 'Loading and memory',
          note: 'Loading: C1, context capacity 262144, MTP. Memory: C1, context capacity 133121, AR, peak reported by HIP.',
          columns: ['Measurement', 'Gufo', 'llama.cpp', 'Gain'],
          rows: [
            ['Ready (s)', '16.42', '117.83', '+617.6%'],
            ['Peak memory, pp2048 + tg128 (GiB)', '88.78', '84.84', '-4.4%'],
            ['Peak memory, 16K prefix, pp4096 + tg128 (GiB)', '90.53', '85.31', '-5.8%'],
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
    docPath: 'docs/internal/models/qwen3.8-27b/BENCHMARKS.md',
    reference: 'llama.cpp b11069',
    measured: 'October 19, 2026',
    summary:
      'Both engines run the same Q4_K_XL and Q8_K_XL weights with the same Q4_K_M DFlash2 draft.',
    highlights: [
      { label: 'Prefill, Q4, depth 0', value: '648.89 tok/s', note: 'llama.cpp 357.54 tok/s · +81.5%' },
      { label: 'Prefill, Q4, depth 131,072', value: '259.73 tok/s', note: 'llama.cpp 135.95 tok/s · +91.0%' },
      { label: 'Decode AR, Q4, depth 0', value: '12.37 tok/s', note: 'llama.cpp 12.06 tok/s · +2.6%' },
      { label: 'Decode DFlash2, repetitive', value: '64.74 tok/s', note: 'llama.cpp 35.86 tok/s · +80.5%' },
      { label: 'Eight users, DFlash2, repetitive', value: '128.42 tok/s', note: 'Sum of individual decode rates · +13.1%' },
      { label: 'Cold load to HTTP readiness, Q4', value: '6.27 s', note: 'llama.cpp 23.33 s · +272.1%' },
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
              { label: 'Gufo', data: [648.89, 608.7, 586.09, 565.92, 546.2, 469.28, 342.31, 259.73], color: GUFO },
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
              { label: 'Gufo', data: [12.37, 12.2, 12.03, 11.87, 11.71, 11.13, 10.07, 8.51], color: GUFO },
              { label: 'llama.cpp', data: [12.06, 11.88, 11.73, 11.59, 11.44, 10.89, 9.93, 8.46], color: REF, dashed: true },
            ],
          },
        ],
        table: {
          title: 'Single user, autoregressive, Q4',
          note: 'Approximately pp2048 / tg128.',
          columns: ['Depth', 'Gufo pp', 'llama.cpp pp', 'Gain', 'Gufo tg', 'llama.cpp tg', 'Gain'],
          rows: [
            ['0', '648.89', '357.54', '+81.5%', '12.37', '12.06', '+2.6%'],
            ['4,096', '608.70', '330.42', '+84.2%', '12.20', '11.88', '+2.7%'],
            ['8,192', '586.09', '316.09', '+85.4%', '12.03', '11.73', '+2.6%'],
            ['12,288', '565.92', '302.54', '+87.1%', '11.87', '11.59', '+2.4%'],
            ['16,384', '546.20', '290.23', '+88.2%', '11.71', '11.44', '+2.4%'],
            ['32,768', '469.28', '246.97', '+90.0%', '11.13', '10.89', '+2.2%'],
            ['65,536', '342.31', '193.61', '+76.8%', '10.07', '9.93', '+1.4%'],
            ['131,072', '259.73', '135.95', '+91.0%', '8.51', '8.46', '+0.6%'],
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
              { label: 'Gufo', data: [479.25, 463.03, 451.42, 426.61, 407.95, 363.22, 293.26, 228.1], color: GUFO },
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
              { label: 'Gufo', data: [7.19, 7.14, 7.08, 7.01, 6.95, 6.76, 6.37, 5.72], color: GUFO },
              { label: 'llama.cpp', data: [7.2, 7.14, 7.08, 7.02, 6.97, 6.76, 6.38, 5.74], color: REF, dashed: true },
            ],
          },
        ],
        table: {
          title: 'Single user, autoregressive, Q8',
          note: 'Decode is bandwidth bound at this precision: both engines land on the same rate.',
          columns: ['Depth', 'Gufo pp', 'llama.cpp pp', 'Gain', 'Gufo tg', 'llama.cpp tg', 'Gain'],
          rows: [
            ['0', '479.25', '337.08', '+42.2%', '7.19', '7.20', '-0.1%'],
            ['4,096', '463.03', '317.96', '+45.6%', '7.14', '7.14', '+0.0%'],
            ['8,192', '451.42', '306.22', '+47.4%', '7.08', '7.08', '+0.0%'],
            ['12,288', '426.61', '289.19', '+47.5%', '7.01', '7.02', '-0.1%'],
            ['16,384', '407.95', '276.91', '+47.3%', '6.95', '6.97', '-0.3%'],
            ['32,768', '363.22', '236.32', '+53.7%', '6.76', '6.76', '+0.0%'],
            ['65,536', '293.26', '186.67', '+57.1%', '6.37', '6.38', '-0.2%'],
            ['131,072', '228.10', '133.34', '+71.1%', '5.72', '5.74', '-0.3%'],
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
              { label: 'Gufo', data: [12.37, 26.91, 64.74], color: GUFO },
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
              { label: 'Gufo', data: [64.74, 54.04, 63.83, 55.72, 52.23, 51.2, 31.85, 29.93], color: PURPLE },
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
            ['0', '579.58', '347.51', '26.91', '23.40', '64.74', '35.86'],
            ['4,096', '527.39', '316.58', '27.99', '23.03', '54.04', '34.47'],
            ['8,192', '502.57', '302.47', '26.44', '21.73', '63.83', '34.73'],
            ['12,288', '487.00', '289.98', '24.88', '23.05', '55.72', '34.19'],
            ['16,384', '471.44', '278.53', '24.80', '21.84', '52.23', '33.75'],
            ['32,768', '413.41', '239.21', '19.77', '18.88', '51.20', '31.75'],
            ['65,536', '339.15', '190.92', '18.61', '18.53', '31.85', '26.33'],
            ['131,072', '246.56', '133.37', '15.30', '14.58', '29.93', '22.93'],
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
              { label: 'Gufo', data: [7.19, 16.44, 47.69], color: GUFO },
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
              { label: 'Gufo', data: [47.69, 41.47, 42.61, 41.75, 40.92, 37.88, 27.7, 26.8], color: PURPLE },
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
            ['0', '445.02', '333.85', '16.44', '15.00', '47.69', '23.83'],
            ['4,096', '407.55', '310.23', '16.71', '16.12', '41.47', '23.59'],
            ['8,192', '389.48', '292.86', '16.04', '15.27', '42.61', '23.21'],
            ['12,288', '380.40', '280.40', '15.50', '13.21', '41.75', '22.10'],
            ['16,384', '370.43', '269.03', '14.87', '13.83', '40.92', '22.56'],
            ['32,768', '332.88', '231.89', '15.17', '14.44', '37.88', '21.16'],
            ['65,536', '283.99', '185.73', '12.38', '12.62', '27.70', '19.03'],
            ['131,072', '216.84', '131.80', '10.06', '11.62', '26.80', '17.23'],
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
              { label: 'Gufo AR', data: [12.42, 23.83, 44.27, 61.02, 74.95], color: GUFO },
              { label: 'llama.cpp AR', data: [12.2, 22.58, 38.94, 47.45, 50.14], color: REF },
              { label: 'Gufo DFlash2 repetitive', data: [71.55, 105.08, 113.45, 117.03, 128.42], color: PURPLE },
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
            ['1', '12.42', '12.20', '37.19', '27.15', '71.55', '37.56'],
            ['2', '23.83', '22.58', '57.20', '40.04', '105.08', '51.65'],
            ['4', '44.27', '38.94', '74.29', '74.43', '113.45', '93.38'],
            ['6', '61.02', '47.45', '83.30', '77.19', '117.03', '97.52'],
            ['8', '74.95', '50.14', '91.27', '71.71', '128.42', '113.56'],
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
              { label: 'Gufo AR', data: [7.21, 14.45, 27.79, 39.89, 51.63], color: GUFO },
              { label: 'llama.cpp AR', data: [7.24, 13.71, 25.32, 34.64, 41.57], color: REF },
              { label: 'Gufo DFlash2 repetitive', data: [51.69, 87.02, 107.08, 115.36, 123.47], color: PURPLE },
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
            ['1', '7.21', '7.24', '25.04', '17.54', '51.69', '24.09'],
            ['2', '14.45', '13.71', '44.50', '31.64', '87.02', '41.60'],
            ['4', '27.79', '25.32', '53.02', '43.88', '107.08', '58.92'],
            ['6', '39.89', '34.64', '58.97', '53.14', '115.36', '72.40'],
            ['8', '51.63', '41.57', '66.63', '60.64', '123.47', '86.25'],
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
              { label: 'Gufo', data: [6.27, 8.59], color: GUFO },
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
              { label: 'Gufo', data: [40.2, 53.15], color: GUFO },
              { label: 'llama.cpp', data: [36.19, 48.6], color: REF },
            ],
          },
        ],
        table: {
          title: 'Loading and memory',
          note: 'Loading: C1, context capacity 262144, DFlash2. Memory: C1, context capacity 262144, AR.',
          columns: ['Measurement', 'Gufo', 'llama.cpp', 'Gain'],
          rows: [
            ['Ready, Q4 (s)', '6.27', '23.33', '+272.1%'],
            ['Ready, Q8 (s)', '8.59', '36.47', '+324.6%'],
            ['Peak memory, Q4, pp2048 + tg128 (GiB)', '40.20', '36.19', '-10.0%'],
            ['Peak memory, Q4, 16K prefix, pp4096 + tg128 (GiB)', '50.27', '36.62', '-27.2%'],
            ['Peak memory, Q8, pp2048 + tg128 (GiB)', '53.15', '48.60', '-8.6%'],
            ['Peak memory, Q8, 16K prefix, pp4096 + tg128 (GiB)', '63.22', '49.02', '-22.5%'],
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
    docPath: 'docs/internal/models/deepseek-v4-flash/BENCHMARKS.md',
    reference: 'antirez/ds4 0aaea5a2 (ROCm)',
    measured: 'October 30, 2026',
    summary:
      'The 80.76 GiB model with its DSpark support file. The reference server turns DSpark off when batching, and its single-user DSpark run changes greedy output, so those comparisons are N/A instead of guessed.',
    highlights: [
      { label: 'Prefill, depth 0', value: '469.49 tok/s', note: 'antirez/ds4 237.46 tok/s · +97.7%' },
      { label: 'Decode AR, depth 0', value: '17.65 tok/s', note: 'antirez/ds4 14.75 tok/s · +19.7%' },
      { label: 'Decode AR, depth 131,072', value: '16.04 tok/s', note: 'antirez/ds4 10.21 tok/s · +57.1%' },
      { label: 'Decode DSpark, repetitive', value: '29.57 tok/s', note: 'Reference N/A: its C1 control changes greedy output' },
      { label: 'Eight users, AR', value: '77.12 tok/s', note: 'antirez/ds4 14.85 tok/s · +419.3%' },
      { label: 'Cold load to HTTP readiness', value: '14.50 s', note: 'antirez/ds4 14.77 s · +1.9%' },
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
              { label: 'Gufo', data: [469.49, 443.83, 405.71, 389.89, 395.96, 405.8, 354.84, 287.52], color: GUFO },
              { label: 'antirez/ds4', data: [237.46, 236.0, 221.99, 213.14, 213.56, 205.29, 178.8, 143.49], color: REF, dashed: true },
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
              { label: 'Gufo', data: [17.65, 17.44, 17.39, 17.34, 17.29, 17.03, 16.81, 16.04], color: GUFO },
              { label: 'antirez/ds4', data: [14.75, 14.11, 13.88, 13.76, 13.63, 12.98, 12.04, 10.21], color: REF, dashed: true },
            ],
          },
        ],
        table: {
          title: 'Single user, autoregressive',
          note: 'Approximately pp2048 / tg128; depth is the cached prefix in tokens.',
          columns: ['Depth', 'Gufo pp', 'ds4 pp', 'Gain', 'Gufo tg', 'ds4 tg', 'Gain'],
          rows: [
            ['0', '469.49', '237.46', '+97.7%', '17.65', '14.75', '+19.7%'],
            ['4,096', '443.83', '236.00', '+88.1%', '17.44', '14.11', '+23.6%'],
            ['8,192', '405.71', '221.99', '+82.8%', '17.39', '13.88', '+25.3%'],
            ['12,288', '389.89', '213.14', '+82.9%', '17.34', '13.76', '+26.0%'],
            ['16,384', '395.96', '213.56', '+85.4%', '17.29', '13.63', '+26.9%'],
            ['32,768', '405.80', '205.29', '+97.7%', '17.03', '12.98', '+31.2%'],
            ['65,536', '354.84', '178.80', '+98.5%', '16.81', '12.04', '+39.6%'],
            ['131,072', '287.52', '143.49', '+100.4%', '16.04', '10.21', '+57.1%'],
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
              { label: 'AR', data: [17.65, 17.44, 17.39, 17.34, 17.29, 17.03, 16.81, 16.04], color: GUFO },
              { label: 'DSpark mixed', data: [23.79, 23.35, 18.93, 23.05, 18.15, 21.7, 18.37, 21.98], color: ACCENT },
              { label: 'DSpark repetitive', data: [29.57, 28.95, 28.21, 27.29, 27.71, 27.85, 26.64, 24.65], color: PURPLE },
            ],
          },
        ],
        table: {
          title: 'Single user, DSpark',
          note: 'The reference is N/A throughout: its matched C1 control changes greedy output versus AR.',
          columns: ['Depth', 'Gufo pp', 'ds4 pp', 'Gufo tg mixed', 'Gufo tg repetitive', 'ds4 tg'],
          rows: [
            ['0', '474.87', 'N/A', '23.79', '29.57', 'N/A'],
            ['4,096', '440.81', 'N/A', '23.35', '28.95', 'N/A'],
            ['8,192', '403.45', 'N/A', '18.93', '28.21', 'N/A'],
            ['12,288', '388.84', 'N/A', '23.05', '27.29', 'N/A'],
            ['16,384', '393.30', 'N/A', '18.15', '27.71', 'N/A'],
            ['32,768', '399.50', 'N/A', '21.70', '27.85', 'N/A'],
            ['65,536', '352.36', 'N/A', '18.37', '26.64', 'N/A'],
            ['131,072', '290.75', 'N/A', '21.98', '24.65', 'N/A'],
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
              { label: 'Gufo AR', data: [17.66, 31.14, 52.62, 66.0, 77.12], color: GUFO },
              { label: 'antirez/ds4 AR', data: [14.76, 14.74, 14.77, 14.89, 14.85], color: REF },
              { label: 'Gufo DSpark repetitive', data: [29.61, 48.6, 56.5, 65.3, 73.85], color: PURPLE },
            ],
          },
        ],
        table: {
          title: 'Multiple users',
          note: 'Context 4096 per user, tg128, all sessions prefilled before timed decoding. ROCm batching disables reference DSpark at C greater than one.',
          columns: ['Users', 'Gufo AR', 'ds4 AR', 'Gain', 'Gufo DSpark mixed', 'Gufo DSpark repetitive', 'ds4 DSpark'],
          rows: [
            ['1', '17.66', '14.76', '+19.6%', '23.76', '29.61', 'N/A'],
            ['2', '31.14', '14.74', '+111.3%', '30.94', '48.60', 'N/A'],
            ['4', '52.62', '14.77', '+256.3%', '50.84', '56.50', 'N/A'],
            ['6', '66.00', '14.89', '+343.3%', '61.76', '65.30', 'N/A'],
            ['8', '77.12', '14.85', '+419.3%', '73.95', '73.85', 'N/A'],
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
              { label: 'Gufo', data: [14.5], color: GUFO },
              { label: 'antirez/ds4', data: [14.77], color: REF },
            ],
          },
          {
            id: 'ds4-memory',
            title: 'Peak memory reported by HIP',
            type: 'bar',
            labels: ['pp2048 + tg128', '16K prefix, pp4096 + tg128'],
            yTitle: 'GiB',
            series: [
              { label: 'Gufo', data: [90.55, 91.22], color: GUFO },
              { label: 'antirez/ds4', data: [97.41, 97.46], color: REF },
            ],
          },
        ],
        table: {
          title: 'Loading and memory',
          note: 'C1, context capacity 262144. Loading uses DSpark; memory is the peak reported by HIP under AR.',
          columns: ['Measurement', 'Gufo', 'antirez/ds4', 'Gain'],
          rows: [
            ['Ready (s)', '14.50', '14.77', '+1.9%'],
            ['Peak memory, pp2048 + tg128 (GiB)', '90.55', '97.41', '+7.6%'],
            ['Peak memory, 16K prefix, pp4096 + tg128 (GiB)', '91.22', '97.46', '+6.8%'],
          ],
        },
      },
    ],
    notes: [
      'At eight users, AR slightly exceeds DSpark throughput on these workloads.',
      'The reference server doesn’t report pp and tg times over HTTP, so they come from its log, checked against the token counts.',
      'Quality against the original model is still open. AR and DSpark agreeing is not a quality claim.',
    ],
  },
];
