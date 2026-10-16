import { cacheScenarios, cacheConversations, cacheModels, uniqueChunks, storageBytes, capacityEstimate, type ModelId, type ConversationPoint, type CacheView, type Checkpoint, type Chunk } from '../data/cache-explorer';

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing cache explorer element: ${id}`);
  return node as T;
}
const number = (value: number) => Math.round(value).toLocaleString('en-US');
const bytes = (value: number) => value >= 2 ** 30 ? `${(value / 2 ** 30).toFixed(2)} GiB` : `${(value / 2 ** 20).toFixed(1)} MiB`;
let scenarioIndex = 0;
let stepIndex = 0;
// Flash-Next is the only model shown, the one the cache blog post measures.
const model: ModelId = 'flash';
let timer: ReturnType<typeof setInterval> | undefined;
let earlierOpen = false;
const prev = element<HTMLButtonElement>('cache-prev');
const next = element<HTMLButtonElement>('cache-next');
const play = element<HTMLButtonElement>('cache-play');
const depth = element<HTMLInputElement>('cache-depth');
const count = element<HTMLInputElement>('cache-count');
const budget = element<HTMLInputElement>('cache-budget');
const tree = element('cache-tree');
const treeScroll = element('cache-tree-scroll');
const card = element('cache-hybrid');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scenario = () => cacheScenarios[scenarioIndex];
const points = () => cacheConversations[scenario().id].points;
const currentStep = () => scenario().steps[stepIndex];

// Tree geometry in CSS pixels: one row per branch, one column per turn.
const LANE_HEIGHT = 40;
const TREE_PADDING = 12;
const COLUMN_MIN = 50;
const COLUMN_MAX = 132;
const ROLE_LABELS = { user: 'user', assistant: 'gufo', tool: 'tool', event: 'event' };
const ROUTE_LABELS = { live: 'Live hit · continue in place', ram: 'RAM hit · restore exact state', disk: 'Disk hit · read and restore', miss: 'Cache miss · cold prefill' };

function stop() {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  play.textContent = 'Play story';
  play.setAttribute('aria-pressed', 'false');
}

function goTo(index: number) {
  const target = Math.max(0, Math.min(scenario().steps.length - 1, index));
  if (target === stepIndex) return;
  const direction = target > stepIndex ? 'next' : 'prev';
  stepIndex = target;
  renderStory(direction);
}

// Each point continues the previous point on its lane, unless it forks from an explicit parent.
// Branch lanes are listed directly below the lane they fork from.
function treeShape(list: ConversationPoint[]) {
  const parents = list.map((point, i) => {
    if (point.from !== undefined) return point.from;
    for (let j = i - 1; j >= 0; j--) if (list[j].lane === point.lane) return j;
    return undefined;
  });
  const parentLane = new Map<string, string | undefined>();
  list.forEach((point, i) => {
    const parent = parents[i];
    if (!parentLane.has(point.lane)) parentLane.set(point.lane, parent === undefined ? undefined : list[parent].lane);
  });
  const lanes: string[] = [];
  const visit = (lane: string) => {
    lanes.push(lane);
    parentLane.forEach((parent, child) => { if (parent === lane) visit(child); });
  };
  parentLane.forEach((parent, lane) => { if (parent === undefined) visit(lane); });
  return { parents, lanes };
}

function renderTree() {
  const list = points();
  const { parents, lanes } = treeShape(list);
  const column = Math.min(COLUMN_MAX, Math.max(COLUMN_MIN, Math.floor(treeScroll.clientWidth / list.length)));
  const x = (i: number) => (i + 0.5) * column;
  const y = (i: number) => TREE_PADDING + (lanes.indexOf(list[i].lane) + 0.5) * LANE_HEIGHT;
  const width = column * list.length;
  const height = TREE_PADDING * 2 + lanes.length * LANE_HEIGHT;
  const laneList = element('cache-tree-lanes');
  // Keep node buttons mounted during time travel so keyboard focus stays on the chosen turn.
  const key = `${scenario().id}:${column}`;
  if (tree.dataset.key !== key) {
    tree.dataset.key = key;
    tree.style.width = `${width}px`;
    tree.style.height = `${height}px`;
    laneList.style.paddingTop = `${TREE_PADDING}px`;
    laneList.innerHTML = lanes.map(lane => `<li data-lane="${lane}" style="height:${LANE_HEIGHT}px">${lane}</li>`).join('');
    tree.innerHTML = `<svg class="tree-edges" width="${width}" height="${height}" aria-hidden="true"></svg>` + list.map((point, i) => `
      <button type="button" class="tree-node role-${point.role}" data-time="${i}" style="left:${x(i)}px;top:${y(i)}px" aria-label="Step ${i + 1} of ${list.length}, branch ${point.lane}: ${point.speaker}. ${point.boundary}">
        <span class="tree-dot">${i + 1}</span><span class="tree-role">${ROLE_LABELS[point.role]}</span>
      </button>`).join('');
  }
  // The selected turn's ancestors are the token history its prompt extends.
  const history = new Set<number>();
  for (let i: number | undefined = stepIndex; i !== undefined; i = parents[i]) history.add(i);
  const edges = list.map((point, i) => {
    const parent = parents[i];
    if (parent === undefined) return { order: 0, markup: '' };
    const [x1, y1, x2, y2] = [x(parent), y(parent), x(i), y(i)];
    const bend = x1 + Math.min(column * 0.75, x2 - x1);
    const path = y1 === y2 ? `M${x1} ${y1}H${x2}` : `M${x1} ${y1}C${(x1 + bend) / 2} ${y1} ${(x1 + bend) / 2} ${y2} ${bend} ${y2}H${x2}`;
    const kind = history.has(i) ? 'is-history' : i > stepIndex ? 'is-future' : '';
    const label = point.fork ? `<text x="${x2}" y="${y2 - 19}" text-anchor="middle" class="${kind}">${point.fork}</text>` : '';
    return { order: history.has(i) ? 1 : 0, markup: `<path class="${kind}" d="${path}" />${label}` };
  });
  // An async report runs along its subagent's row, then drops into the turn that receives it.
  const results = list.map((point, i) => {
    if (point.result === undefined) return '';
    const [x1, y1, x2, y2] = [x(point.result), y(point.result), x(i), y(i)];
    const corner = Math.min(10, Math.abs(y2 - y1) / 2);
    const down = y2 > y1 ? 1 : -1;
    const kind = `is-result ${i > stepIndex ? 'is-future' : ''}`;
    const tip = y2 - down * 15;
    const path = `M${x1} ${y1}H${x2 - corner}Q${x2} ${y1} ${x2} ${y1 + down * corner}V${tip}`;
    const head = `M${x2 - 4} ${tip - down * 5}L${x2} ${tip}L${x2 + 4} ${tip - down * 5}`;
    const label = point.resultLabel ? `<text x="${(x1 + x2) / 2}" y="${y1 - 7}" text-anchor="middle" class="is-result">${point.resultLabel}</text>` : '';
    return `<path class="${kind}" d="${path}" /><path class="${kind} result-head" d="${head}" />${label}`;
  }).join('');
  // Paint the selected history last so it stays visible where branches cross.
  tree.querySelector('svg')!.innerHTML = results + edges.sort((a, b) => a.order - b.order).map(edge => edge.markup).join('');
  tree.querySelectorAll<HTMLButtonElement>('[data-time]').forEach(button => {
    const index = Number(button.dataset.time);
    const current = index === stepIndex;
    button.classList.toggle('is-current', current);
    button.classList.toggle('is-history', history.has(index));
    button.classList.toggle('is-future', index > stepIndex);
    button.tabIndex = current ? 0 : -1;
    if (current) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  laneList.querySelectorAll<HTMLElement>('[data-lane]').forEach(item => item.classList.toggle('is-current', item.dataset.lane === list[stepIndex].lane));
  // Reveal the selected turn inside the tree without moving the page.
  const offset = x(stepIndex) - treeScroll.scrollLeft;
  if (offset < column || offset > treeScroll.clientWidth - column) {
    treeScroll.scrollTo({ left: x(stepIndex) - treeScroll.clientWidth / 2, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
}

function renderReadout(index?: number) {
  const readout = element('cache-tree-readout');
  if (index === undefined) {
    readout.innerHTML = '<span class="readout-hint">Hover a turn to preview it. Select it to see the cache at that moment.</span>';
    return;
  }
  const point = points()[index];
  readout.innerHTML = `<b>${String(index + 1).padStart(2, '0')} · ${point.speaker}</b> ${point.text} <span>${point.boundary}</span>`;
}

const previousIndex = (index: number) => scenario().steps[index].previous ?? index - 1;
const refsTo = (state: CacheView, chunk: string) => state.checkpoints.filter(p => p.chunks.some(k => k.id === chunk)).length;
const chunkName = (chunk: Chunk) => chunk.tail ? 'Partial tail' : chunk.id;
const signed = (value: number) => `${value < 0 ? '−' : '+'}${bytes(Math.abs(value))}`;

function retained(state: CacheView) {
  const ram = state.checkpoints.filter(c => c.ram);
  const durable = state.checkpoints.filter(c => c.disk === 'durable');
  if (ram.length) return { bytes: storageBytes(ram, model), label: 'RAM + reservations' };
  if (durable.length) return { bytes: storageBytes(durable, model), label: 'on disk' };
  return { bytes: 0, label: 'retained' };
}

function checkpointChange(before: Checkpoint, after: Checkpoint) {
  const changes: string[] = [];
  if (before.ram !== after.ram) changes.push(after.ram ? 'back in RAM' : 'left RAM');
  if (before.disk !== after.disk) changes.push(after.disk === 'durable' ? 'now durable' : after.disk === 'queued' ? 'disk queued' : 'off disk');
  if (before.borrowed && !after.borrowed && after.ram) changes.push('rows preserved');
  return changes.join(' · ');
}

// Compare a step's cache with the state it evolved from: what appeared, changed or disappeared.
function stateDiff(index: number) {
  const from = previousIndex(index);
  if (from < 0) return undefined;
  const before = scenario().steps[from].state;
  const after = scenario().steps[index].state;
  const beforeCheckpoints = new Map(before.checkpoints.map(c => [c.id, c]));
  const afterChunks = new Set(uniqueChunks(after.checkpoints).map(c => c.id));
  const beforeChunks = new Map(uniqueChunks(before.checkpoints).map(c => [c.id, c]));
  const changed = new Map<string, string>();
  after.checkpoints.forEach(c => {
    const old = beforeCheckpoints.get(c.id);
    const change = old && checkpointChange(old, c);
    if (change) changed.set(c.id, change);
  });
  return {
    from, before, after,
    addedCheckpoints: new Set(after.checkpoints.filter(c => !beforeCheckpoints.has(c.id)).map(c => c.id)),
    removedCheckpoints: before.checkpoints.filter(c => !after.checkpoints.some(k => k.id === c.id)),
    changed,
    addedChunks: new Set([...afterChunks].filter(id => !beforeChunks.has(id))),
    removedChunks: [...beforeChunks.values()].filter(c => !afterChunks.has(c.id)),
  };
}
type StateDiff = NonNullable<ReturnType<typeof stateDiff>>;

function diffSummary(index: number, diff: StateDiff) {
  const after = scenario().steps[index].state;
  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
  const items = [
    ...[...diff.addedCheckpoints].map(id => `<li class="diff-added">+ ${id}</li>`),
    ...[...diff.changed].map(([id, change]) => `<li class="diff-changed">~ ${id} · ${change}</li>`),
    ...diff.removedCheckpoints.map(c => `<li class="diff-removed">− ${c.id}</li>`),
    diff.addedChunks.size ? `<li class="diff-added">+ ${plural(diff.addedChunks.size, 'KV chunk')}</li>` : '',
    diff.removedChunks.length ? `<li class="diff-removed">− ${plural(diff.removedChunks.length, 'KV chunk')} freed</li>` : '',
    ...after.sessions.map((s, i) => {
      const old = diff.before.sessions[i];
      if (!old || (old.name === s.name && old.position === s.position)) return '';
      return old.name === s.name
        ? `<li class="diff-changed">~ Slot ${i + 1} · frontier ${number(old.position)} → ${number(s.position)}</li>`
        : `<li class="diff-changed">~ Slot ${i + 1} · ${old.name} → ${s.name}</li>`;
    }),
  ].filter(Boolean);
  const [old, now] = [retained(diff.before), retained(after)];
  if (old.label === now.label && old.bytes !== now.bytes) items.push(`<li class="diff-changed">~ Retained ${signed(now.bytes - old.bytes)}</li>`);
  const title = `Step ${diff.from + 1} → step ${index + 1}${diff.from === index - 1 ? '' : ' · where this path branches'}`;
  return `<span class="cache-diff-title">${title}</span><ul>${items.join('') || '<li class="diff-none">Retained state unchanged</li>'}</ul>`;
}

type HistoryRow = { start: number; end: number; point?: ConversationPoint; index?: number };
const holdsTokens = (row: HistoryRow) => row.point?.end !== undefined || !row.point;
const excerpt = (text: string, length = 46) => text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;

// The selected turn's branch history as token spans. A fork or an edit cuts its parent's tail.
function historyRows(index: number) {
  const list = points();
  const { parents } = treeShape(list);
  const chain: number[] = [];
  for (let i: number | undefined = index; i !== undefined; i = parents[i]) chain.unshift(i);
  const rows: HistoryRow[] = [];
  let cursor = 0;
  chain.forEach(i => {
    const point = list[i];
    if (point.end === undefined) { rows.push({ start: cursor, end: cursor, point, index: i }); return; }
    const start = point.start ?? cursor;
    if (!rows.length && start > 0) rows.push({ start: 0, end: start });
    rows.push({ start, end: point.end, point, index: i });
    cursor = point.end;
  });
  rows.forEach((row, k) => {
    const following = rows.slice(k + 1).find(holdsTokens);
    if (holdsTokens(row) && following && following.start < row.end) row.end = following.start;
  });
  return rows.filter(row => !holdsTokens(row) || row.end > row.start);
}

// Which part of a message the request reuses from cache, needs to prefill, or generates.
function rowStatus(row: HistoryRow, reused: number, prompt: number) {
  if (row.start >= prompt) return { kind: 'generated', label: 'generated' };
  if (row.end <= reused) return { kind: 'reused', label: 'in cache' };
  if (row.start >= reused) return { kind: 'prefill', label: 'prefill' };
  return { kind: 'partial', label: `${number(reused - row.start)} of ${number(row.end - row.start)} in cache` };
}

function threadMarkup(index: number) {
  const step = scenario().steps[index];
  const rows = historyRows(index);
  const tokenRows = rows.filter(holdsTokens);
  // Events can show another conversation's request; statuses only apply to this branch's own request.
  const applies = tokenRows.every(row => row.end <= step.prompt || row.start >= step.prompt);
  const row = (r: HistoryRow) => {
    const current = r.index === index;
    if (r.point && r.point.end === undefined) {
      return `<li class="thread-row role-event ${current ? 'is-current' : ''}"><span class="thread-event"><b>${r.point.speaker}</b> ${r.point.text}</span></li>`;
    }
    const status = applies ? rowStatus(r, step.state.reused, step.prompt) : { kind: 'neutral', label: 'tokens' };
    const role = r.point?.role ?? 'context';
    return `<li class="thread-row role-${role} status-${status.kind} ${current ? 'is-current' : ''}">
      <div class="thread-bubble"><span class="thread-speaker">${r.point?.speaker ?? 'Earlier context'}${current ? '<span class="thread-now">now</span>' : ''}</span><p>${r.point?.text ?? 'System prompt, tools and earlier turns.'}</p></div>
      <span class="thread-meta"><i></i>${status.label} · ${number(r.start)}–${number(r.end)}${r.start === 0 && r.point ? ' · incl. system prompt' : ''}</span></li>`;
  };
  const shown = rows.length > 3 ? rows.slice(-3) : rows;
  const earlier = rows.slice(0, rows.length - shown.length);
  const earlierTokens = earlier.filter(holdsTokens);
  const earlierEnd = Math.max(0, ...earlierTokens.map(r => r.end));
  const earlierTotal = earlierTokens.reduce((n, r) => n + r.end - r.start, 0);
  const earlierCached = earlierTokens.reduce((n, r) => n + Math.max(0, Math.min(r.end, step.state.reused) - r.start), 0);
  const earlierLabel = !applies ? `tokens 0–${number(earlierEnd)}` : earlierCached === earlierTotal ? `all in cache · 0–${number(earlierEnd)}` : `${number(earlierCached)} of ${number(earlierTotal)} tokens in cache`;
  return `
    <section class="cache-thread">
      <div class="cache-store-heading"><h4>Conversation · branch ${points()[index].lane}</h4><span>${applies ? `${number(step.prompt)}-token prompt` : 'no request on this branch at this step'}</span></div>
      ${earlier.length ? `<details class="thread-earlier" ${earlierOpen ? 'open' : ''}><summary>${earlier.length} earlier messages · ${earlierLabel}</summary><ol class="thread">${earlier.map(row).join('')}</ol></details>` : ''}
      <ol class="thread">${shown.map(row).join('')}</ol>
    </section>`;
}

// Name the message a checkpoint ends after, when its conversation and boundary match one exactly.
function checkpointExcerpt(c: Checkpoint) {
  const point = points().find(p => p.lane === c.id.split('@')[0] && p.end === c.position);
  return point ? `<span class="checkpoint-excerpt" title="${point.speaker}: ${point.text}">after “${excerpt(point.text)}”</span>` : '';
}

// Render the selected step's cache in two columns: the request on the left, what the cache holds on
// the right. Marks show what is new or changed since the state this step evolved from.
function cardMarkup(index: number, diff?: StateDiff) {
  const steps = scenario().steps;
  const step = steps[index];
  const point = points()[index];
  const state = step.state;
  const route = state.route;
  const fraction = state.reused / step.prompt * 100;
  const prefill = step.prompt - state.reused;
  const sessions = state.sessions.map((s, i) => {
    const other = diff?.before.sessions[i];
    const moved = other && (other.name !== s.name || other.position !== s.position);
    const frontier = moved && other.name === s.name && other.position ? `${number(other.position)} → ${number(s.position)}` : number(s.position);
    return `
    <div class="session-card ${s.position === 0 ? 'free' : ''} ${route?.target === i + 1 ? 'route-target' : ''} ${moved ? 'is-changed' : ''}"><small>Slot ${i + 1}${route?.target === i + 1 ? ' · this request' : ''}</small><b>${s.name}</b><span>${s.position ? `Live frontier · ${frontier}` : 'No live state'}</span>${moved && other.name !== s.name ? `<em class="diff-delta">was ${other.name}</em>` : ''}</div>`;
  }).join('');
  const checkpoints = state.checkpoints.length ? state.checkpoints.map(c => {
    const source = route?.checkpoint === c.id;
    const added = diff?.addedCheckpoints.has(c.id);
    const change = diff?.changed.get(c.id);
    const mark = added ? 'is-added' : change ? 'is-changed' : '';
    const diffTag = added ? '<span class="diff-tag added">+ new</span>' : change ? `<span class="diff-tag changed">~ ${change}</span>` : '';
    return `<div class="checkpoint-card ${source ? 'restore-source' : ''} ${mark}">
      <span class="checkpoint-label"><span class="checkpoint-name">${c.id}</span>${checkpointExcerpt(c)}</span><span class="checkpoint-tags">${diffTag}${source ? '<span class="state-tag source-tag">restore source</span>' : ''}<span class="state-tag ref-tag">${c.chunks.length} refs</span>
      ${c.ram ? '<span class="state-tag ram-tag">RAM</span>' : ''}
      ${c.disk !== 'none' ? `<span class="state-tag ${c.disk === 'durable' ? 'durable-tag' : 'queued-tag'}">${c.disk === 'durable' ? 'disk ✓' : 'disk queued'}</span>` : ''}</span></div>`;
  }).join('') : '<div class="cache-empty">No checkpoint at an exact restore boundary yet</div>';
  const chunkList = uniqueChunks(state.checkpoints);
  const chunks = chunkList.length ? chunkList.map(c => {
    const refs = refsTo(state, c.id);
    const added = diff?.addedChunks.has(c.id);
    const refDelta = diff && !added ? refs - refsTo(diff.before, c.id) : 0;
    return `<div class="chunk-card origin-${c.lineage} ${c.tail ? 'tail' : ''} ${added ? 'is-added' : ''}">
      <b>${chunkName(c)}</b><small>${number(c.end - c.start)} rows · ${refs} ref${refs > 1 ? 's' : ''}${refDelta ? ` <em class="diff-delta">(${refDelta > 0 ? '+' : '−'}${Math.abs(refDelta)})</em>` : ''}${state.checkpoints.filter(p => p.chunks.some(k => k.id === c.id)).every(p => !p.ram) ? ' · disk' : ''}</small></div>`;
  }).join('') : '<div class="cache-empty">Chunks appear when a checkpoint needs rows</div>';
  const storage = retained(state);
  const oldStorage = diff && retained(diff.before);
  const storageDelta = oldStorage && oldStorage.label === storage.label && oldStorage.bytes !== storage.bytes ? ` <em class="diff-delta">${signed(storage.bytes - oldStorage.bytes)}</em>` : '';
  return `
    <div class="cache-col">
      <header class="cache-card-head">
        <div class="cache-card-meta">${point.boundary}</div>
        <div class="cache-story-copy"><h3>${step.title}</h3><p>${step.explanation}</p></div>
      </header>
      <div class="cache-request">
        <div class="request-label"><span>Incoming prompt</span><span>${number(step.prompt)} tokens</span></div>
        <div class="request-bar" role="img" aria-label="${number(state.reused)} reused tokens and ${number(prefill)} tokens needing prefill">
          <span class="reused-segment" style="width:${fraction}%">${fraction > 18 ? number(state.reused) : ''}</span>
          <span class="prefill-segment" style="width:${100 - fraction}%">${fraction < 82 ? number(prefill) : ''}</span>
        </div>
        <div class="request-metrics"><span><b>${number(state.reused)}</b> reused</span><span><b>${number(prefill)}</b> prefilled</span><span><b>${number(step.common)}</b> common prefix</span><span class="cache-outcome">${state.source}</span></div>
      </div>
      ${route ? `<div class="cache-route" data-kind="${route.kind}"><b>${ROUTE_LABELS[route.kind]}</b><span>${route.from} · to slot ${route.target}</span></div>` : ''}
      ${threadMarkup(index)}
    </div>
    <div class="cache-col">
      <div class="cache-diff">${diff ? diffSummary(index, diff) : '<span class="cache-diff-title">Step 1</span><ul><li class="diff-none">Starting state</li></ul>'}</div>
      <section><div class="cache-store-heading"><h4>Execution slots</h4><span>example · ${state.sessions.length} slots</span></div><div class="cache-sessions">${sessions}</div></section>
      <section><div class="cache-store-heading"><h4>Checkpoints · fixed state</h4><span>${storage.bytes ? bytes(storage.bytes) : '0 bytes'} ${storage.label}${storageDelta}</span></div><div class="cache-checkpoints">${checkpoints}</div></section>
      <section class="cache-pool"><div class="cache-store-heading"><h4>Shared KV chunks · RAM / disk</h4></div><div class="cache-chunks">${chunks}</div></section>
      <p class="cache-lane-note">${state.note}</p>
    </div>`;
}

function renderCards(direction?: 'next' | 'prev') {
  card.innerHTML = cardMarkup(stepIndex, stateDiff(stepIndex));
  if (!direction || reducedMotion.matches) return;
  const shift = direction === 'next' ? 16 : -16;
  card.animate([{ opacity: 0.4, transform: `translateX(${shift}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2, .7, .2, 1)' });
}

function renderStory(direction?: 'next' | 'prev') {
  const steps = scenario().steps;
  element('cache-step-number').textContent = `Step ${stepIndex + 1} / ${steps.length}`;
  element('cache-step-status').textContent = `Step ${stepIndex + 1} of ${steps.length}: ${currentStep().title}`;
  element('cache-conversation-context').textContent = cacheConversations[scenario().id].setup;
  prev.disabled = stepIndex === 0;
  next.disabled = stepIndex === steps.length - 1;
  document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(button => {
    const active = button.dataset.scenario === scenario().id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  element('cache-story-name').textContent = scenario().name;
  element('cache-story-caption').textContent = scenario().caption;
  renderTree();
  renderCards(direction);
  if (started) syncLocation();
}

// Deep links: /playground/cache?story=edit&step=2 opens that story at that step; ?view=memory opens the Memory tab.
// The address follows along once the reader starts exploring, so it can be shared.
let started = false;
function syncLocation() {
  const params = new URLSearchParams({ story: scenario().id, step: String(stepIndex + 1) });
  history.replaceState(history.state, '', `${location.pathname}?${params}${location.hash}`);
}
function readLocation() {
  const params = new URLSearchParams(location.search);
  const linked = cacheScenarios.findIndex(s => s.id === params.get('story'));
  if (linked >= 0) {
    scenarioIndex = linked;
    stepIndex = Math.max(0, Math.min(scenario().steps.length - 1, (Number(params.get('step')) || 1) - 1));
  }
  if (params.get('view') === 'memory') showView('memory');
}

function renderCapacity() {
  const context = Number(depth.value);
  count.max = String(Math.min(32, context / 2048));
  if (Number(count.value) > Number(count.max)) count.value = count.max;
  const checkpoints = Number(count.value);
  const budgetGiB = Number(budget.value);
  const result = capacityEstimate(context, checkpoints, budgetGiB, model);
  element<HTMLOutputElement>('cache-depth-value').value = `${number(context)} tokens`;
  element<HTMLOutputElement>('cache-count-value').value = String(checkpoints);
  element<HTMLOutputElement>('cache-budget-value').value = `${budgetGiB.toFixed(1)} GiB`;
  // The cost doesn't depend on the budget, so show the two side by side: changing the budget changes the share.
  element('cache-shared-bytes').innerHTML = `${bytes(result.total)} <small>of ${budgetGiB.toFixed(1)} GiB budget · ${Math.round(result.total / result.budget * 100)}%</small>`;
  element('cache-kv-bytes').textContent = bytes(result.kv);
  element('cache-fixed-bytes').textContent = bytes(result.fixed);
  // A fixed scale up to the largest budget the slider allows, so moving the budget moves its marker
  // instead of rescaling the bars.
  const ceiling = Math.max(result.total, Number(budget.max) * 2 ** 30);
  element('cache-shared-kv-bar').style.width = `${result.kv / ceiling * 100}%`;
  element('cache-shared-fixed-bar').style.width = `${result.fixed / ceiling * 100}%`;
  document.querySelectorAll<HTMLElement>('.cache-budget-marker').forEach(node => { node.style.left = `${result.budget / ceiling * 100}%`; });
  const fit = element('cache-shared-fit');
  fit.textContent = result.fits ? `Fits · ${bytes(result.budget - result.total)} left in the cache budget` : `Exceeds the budget by ${bytes(result.total - result.budget)} · some checkpoints must be evicted or refused`;
  fit.classList.toggle('over-budget', !result.fits);
  element('cache-size-formula').textContent = `${cacheModels[model].name}: ${bytes(cacheModels[model].fixed)} fixed per checkpoint + ${(cacheModels[model].perToken / 1024).toFixed(2)} KiB per token.`;
}

const turnButton = (event: Event) => (event.target as HTMLElement).closest<HTMLButtonElement>('[data-time]');
// The story picker is a dropdown: a toggle button over a list of stories.
const storyToggle = element<HTMLButtonElement>('cache-story-toggle');
const storyList = element<HTMLUListElement>('cache-story-list');
const storyOptions = () => [...storyList.querySelectorAll<HTMLButtonElement>('[data-scenario]')];
function setStoryMenu(open: boolean, focus = false) {
  storyList.hidden = !open;
  storyToggle.setAttribute('aria-expanded', String(open));
  if (open) storyOptions().find(option => option.classList.contains('active'))?.focus();
  else if (focus) storyToggle.focus();
}
storyToggle.addEventListener('click', () => setStoryMenu(storyList.hidden));
document.addEventListener('click', event => {
  if (!storyList.hidden && !(event.target as HTMLElement).closest('.cache-story-picker')) setStoryMenu(false);
});
storyList.addEventListener('keydown', event => {
  const options = storyOptions();
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  if (event.key === 'Escape') { event.preventDefault(); setStoryMenu(false, true); }
  else if (event.key === 'ArrowDown') { event.preventDefault(); options[Math.min(options.length - 1, index + 1)].focus(); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); options[Math.max(0, index - 1)].focus(); }
});
storyList.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-scenario]');
  if (!button) return;
  setStoryMenu(false, true);
  stop();
  scenarioIndex = cacheScenarios.findIndex(s => s.id === button.dataset.scenario);
  stepIndex = 0;
  renderStory();
  renderReadout();
});
tree.addEventListener('click', event => {
  const button = turnButton(event);
  if (!button) return;
  stop(); goTo(Number(button.dataset.time));
});
tree.addEventListener('keydown', event => {
  const moves: Record<string, number> = { ArrowLeft: stepIndex - 1, ArrowRight: stepIndex + 1, Home: 0, End: scenario().steps.length - 1 };
  if (!(event.key in moves)) return;
  event.preventDefault();
  stop(); goTo(moves[event.key]);
  tree.querySelector<HTMLButtonElement>('[aria-current="step"]')?.focus();
});
tree.addEventListener('pointerover', event => { const button = turnButton(event); if (button) renderReadout(Number(button.dataset.time)); });
tree.addEventListener('focusin', event => { const button = turnButton(event); if (button) renderReadout(Number(button.dataset.time)); });
tree.addEventListener('pointerleave', () => renderReadout());
tree.addEventListener('focusout', () => renderReadout());
new ResizeObserver(() => renderTree()).observe(treeScroll);
prev.addEventListener('click', () => { stop(); goTo(stepIndex - 1); });
next.addEventListener('click', () => { stop(); goTo(stepIndex + 1); });
play.addEventListener('click', () => {
  if (timer !== undefined) { stop(); return; }
  if (next.disabled) { stepIndex = 0; renderStory(); }
  play.textContent = 'Pause story';
  play.setAttribute('aria-pressed', 'true');
  timer = setInterval(() => {
    goTo(stepIndex + 1);
    if (next.disabled) stop();
  }, 6500);
});
// Earlier messages stay expanded across steps once the reader opens them.
element('cache-state').addEventListener('toggle', event => {
  const details = event.target as HTMLElement;
  if (details.matches('.thread-earlier')) earlierOpen = (details as HTMLDetailsElement).open;
}, true);
// Walkthrough and Memory are tabs, so each view fits the screen on its own.
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[data-view]')];
function showView(view: string, focus = false) {
  tabs.forEach(tab => {
    const active = tab.dataset.view === view;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    element(tab.getAttribute('aria-controls')!).hidden = !active;
    if (active && focus) tab.focus();
  });
  if (view !== 'walkthrough') stop();
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => showView(tab.dataset.view!));
  tab.addEventListener('keydown', event => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    showView(tabs[(i + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].dataset.view!, true);
  });
});
const diffToggle = element<HTMLInputElement>('cache-diff-toggle');
// Highlighting starts on, even when the browser restores an unchecked box from an earlier visit.
diffToggle.checked = true;
diffToggle.addEventListener('change', () => element('cache-state').classList.toggle('hide-diff', !diffToggle.checked));
[depth, count, budget].forEach(input => input.addEventListener('input', renderCapacity));
window.addEventListener('pagehide', stop);
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
readLocation();
renderStory();
renderReadout();
renderCapacity();
started = true;
