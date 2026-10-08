import { cacheScenarios, cacheConversations, cacheModels, uniqueChunks, storageBytes, capacityEstimate, type ModelId, type CacheView } from '../data/cache-explorer';

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing cache explorer element: ${id}`);
  return node as T;
}
const number = (value: number) => Math.round(value).toLocaleString('en-US');
const bytes = (value: number) => value >= 2 ** 30 ? `${(value / 2 ** 30).toFixed(2)} GiB` : `${(value / 2 ** 20).toFixed(1)} MiB`;
let scenarioIndex = 0;
let stepIndex = 0;
let model: ModelId = 'qwen';
let timer: ReturnType<typeof setInterval> | undefined;
let inspected: { kind: 'checkpoint' | 'chunk'; id: string } | undefined;
const prev = element<HTMLButtonElement>('cache-prev');
const next = element<HTMLButtonElement>('cache-next');
const play = element<HTMLButtonElement>('cache-play');
const modelSelect = element<HTMLSelectElement>('cache-model');
const depth = element<HTMLInputElement>('cache-depth');
const count = element<HTMLInputElement>('cache-count');
const budget = element<HTMLInputElement>('cache-budget');
const currentStep = () => cacheScenarios[scenarioIndex].steps[stepIndex];

function stop() {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  play.textContent = 'Play story';
  play.setAttribute('aria-pressed', 'false');
}

function renderCache(state: CacheView) {
  const panel = element('cache-hybrid');
  element('cache-slot-count').textContent = `Example · ${state.sessions.length} slots`;
  const prompt = currentStep().prompt;
  const fraction = state.reused / prompt * 100;
  panel.querySelector('[data-request]')!.innerHTML = `
    <div class="request-label"><span>Incoming prompt</span><span>${number(prompt)} tokens</span></div>
    <div class="request-bar" role="img" aria-label="${number(state.reused)} reused tokens and ${number(prompt - state.reused)} tokens needing prefill">
      <span class="reused-segment" style="width:${fraction}%">${fraction > 18 ? number(state.reused) : ''}</span>
      <span class="prefill-segment" style="width:${100 - fraction}%">${fraction < 82 ? number(prompt - state.reused) : ''}</span>
    </div>
    <div class="request-metrics"><span><b>${number(state.reused)}</b> reused</span><span><b>${number(prompt - state.reused)}</b> prefilled</span><span><b>${number(currentStep().common)}</b> common prefix</span></div>
    <div class="cache-outcome">${state.source}</div>`;
  const route = panel.querySelector<HTMLElement>('[data-route]')!;
  route.hidden = !state.route;
  panel.querySelector<HTMLElement>('.cache-flow-label')!.hidden = Boolean(state.route);
  if (state.route) {
    const labels = { live: 'Live hit · continue in place', ram: 'RAM hit · restore exact state', disk: 'Disk hit · read and restore', miss: 'Cache miss · cold prefill' };
    route.dataset.kind = state.route.kind;
    route.innerHTML = `<b>${labels[state.route.kind]}</b><span>${state.route.from}</span><span class="cache-route-destination">↓ Execution slot ${state.route.target}</span>`;
  } else { route.innerHTML = ''; delete route.dataset.kind; }
  panel.querySelector('[data-sessions]')!.innerHTML = state.sessions.map((s, i) => `
    <div class="session-card ${s.position === 0 ? 'free' : ''} ${state.route?.target === i + 1 ? 'route-target' : ''}"><small>Execution slot ${i + 1}${state.route?.target === i + 1 ? ' · this request' : ''}</small><b>${s.name}</b><span>${s.position ? `Live frontier · ${number(s.position)}` : 'No retained live state'}</span></div>`).join('');
  panel.querySelector('[data-checkpoints]')!.innerHTML = state.checkpoints.length ? state.checkpoints.map(c => `
    <button type="button" class="checkpoint-card ${state.route?.checkpoint === c.id ? 'restore-source' : ''}" data-checkpoint="${c.id}" aria-pressed="false" aria-label="Inspect ${c.id}, ${number(c.position)} tokens${state.route?.checkpoint === c.id ? ', source of this restore' : ''}">
      <span class="checkpoint-name">${c.id}</span><span class="checkpoint-tags">${state.route?.checkpoint === c.id ? '<span class="state-tag source-tag">restore source</span>' : ''}<span class="state-tag">fixed state</span>
      <span class="state-tag ref-tag">${c.chunks.length} refs</span>
      ${c.ram ? '<span class="state-tag ram-tag">RAM</span>' : ''}
      ${c.disk !== 'none' ? `<span class="state-tag ${c.disk === 'durable' ? 'durable-tag' : 'queued-tag'}">${c.disk === 'durable' ? 'disk ✓' : 'disk queued'}</span>` : ''}</span></button>`).join('') : '<div class="cache-empty">No checkpoint at an exact restore boundary yet</div>';
  const ram = state.checkpoints.filter(c => c.ram);
  const durable = state.checkpoints.filter(c => c.disk === 'durable');
  panel.querySelector('[data-storage]')!.textContent = ram.length ? `${bytes(storageBytes(ram, model))} RAM + reservations`
    : durable.length ? `${bytes(storageBytes(durable, model))} on disk` : '0 bytes retained';
  panel.querySelector('[data-note]')!.textContent = state.note;
  const chunks = uniqueChunks(state.checkpoints);
  panel.querySelector('[data-chunks]')!.innerHTML = chunks.length ? chunks.map(c => {
    const refs = state.checkpoints.filter(p => p.chunks.some(k => k.id === c.id));
    return `<button type="button" class="chunk-card origin-${c.lineage} ${c.tail ? 'tail' : ''}" data-chunk="${c.id}" aria-pressed="false" aria-label="Inspect ${c.id}, ${number(c.end - c.start)} rows, ${refs.length} checkpoint references">
      <b>${c.tail ? 'Partial tail' : c.id}</b><small>${number(c.end - c.start)} rows · ${refs.length} ref${refs.length > 1 ? 's' : ''}${refs.every(p => !p.ram) ? ' · disk' : ''}</small></button>`;
  }).join('') : '<div class="cache-empty">Chunks appear when a checkpoint needs rows</div>';
}

function renderInspector() {
  document.querySelectorAll('.checkpoint-card, .chunk-card').forEach(node => {
    node.classList.remove('selected', 'referenced');
    node.setAttribute('aria-pressed', 'false');
  });
  const title = element('cache-inspector-title');
  const copy = element('cache-inspector-copy');
  if (!inspected) {
    title.textContent = 'Click a checkpoint or a chunk';
    copy.textContent = 'Inspect the exact token boundary, RAM or disk status, and the checkpoints that share a physical KV range.';
    return;
  }
  if (inspected.kind === 'checkpoint') {
    const c = currentStep().state.checkpoints.find(c => c.id === inspected!.id);
    if (!c) { inspected = undefined; renderInspector(); return; }
    element('cache-hybrid').querySelectorAll<HTMLElement>('[data-checkpoint]').forEach(node => {
      if (node.dataset.checkpoint === c.id) { node.classList.add('selected'); node.setAttribute('aria-pressed', 'true'); }
    });
    document.querySelectorAll<HTMLElement>('[data-chunk]').forEach(node => {
      if (c.chunks.some(k => k.id === node.dataset.chunk)) node.classList.add('referenced');
    });
    const location = [c.ram ? 'RAM' : '', c.disk === 'durable' ? 'durable disk' : c.disk === 'queued' ? 'queued for disk (not durable)' : ''].filter(Boolean).join(' + ');
    title.textContent = `${c.id} · exact state at token ${number(c.position)}`;
    copy.textContent = `${bytes(cacheModels[model].fixed)} of fixed state paired with ${c.chunks.length} KV ranges. Location: ${location}. ${c.ram ? c.borrowed ? 'Rows are borrowed from live storage where possible, with backing spill capacity reserved.' : 'Rows have been preserved in the chunk pool.' : 'Rows are restored from durable disk storage.'} It can resume only a prompt that extends these exact tokens with compatible input identity.`;
  } else {
    const state = currentStep().state;
    const c = uniqueChunks(state.checkpoints).find(c => c.id === inspected!.id);
    if (!c) { inspected = undefined; renderInspector(); return; }
    const refs = state.checkpoints.filter(p => p.chunks.some(k => k.id === c.id));
    document.querySelectorAll<HTMLElement>('[data-chunk]').forEach(node => {
      if (node.dataset.chunk === c.id) { node.classList.add('selected'); node.setAttribute('aria-pressed', 'true'); }
    });
    element('cache-hybrid').querySelectorAll<HTMLElement>('[data-checkpoint]').forEach(node => {
      if (refs.some(p => p.id === node.dataset.checkpoint)) node.classList.add('referenced');
    });
    title.textContent = `${c.id} · rows ${number(c.start)}–${number(c.end - 1)} · provenance ${c.lineage}`;
    copy.textContent = `${bytes((c.end - c.start) * cacheModels[model].perToken)} of ${c.tail ? 'partial-tail' : 'append-only'} data, referenced by ${refs.map(p => p.id).join(', ')}. Deleting one checkpoint only frees these bytes when its last reference disappears. Token equality with another computation does not establish common provenance.`;
  }
}

function renderConversation() {
  const scenario = cacheScenarios[scenarioIndex];
  const conversation = cacheConversations[scenario.id];
  const points = element('cache-conversation-points');
  element('cache-conversation-context').textContent = conversation.setup;
  // Keep buttons mounted during time travel so keyboard focus stays on the chosen message.
  if (points.dataset.conversation !== scenario.id) {
    points.dataset.conversation = scenario.id;
    points.innerHTML = conversation.points.map((point, i) => `<li class="conversation-point">
      <button type="button" class="conversation-message role-${point.role}" data-time="${i}" aria-label="Point ${i + 1}: ${point.speaker}. ${point.boundary}">
        <span class="conversation-message-header"><span class="conversation-role">${point.speaker}</span><span class="conversation-time">${String(i + 1).padStart(2, '0')}</span></span>
        <span class="conversation-message-text">${point.text}</span><span class="conversation-boundary">${point.boundary}</span>
        <span class="conversation-now">Viewing this moment</span>
      </button></li>`).join('');
  }
  points.querySelectorAll<HTMLButtonElement>('[data-time]').forEach(button => {
    const index = Number(button.dataset.time);
    const active = index === stepIndex;
    button.classList.toggle('is-current', active);
    button.classList.toggle('is-future', index > stepIndex);
    button.classList.toggle('is-past', index < stepIndex);
    if (active) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
    button.closest('li')?.classList.toggle('is-current', active);
  });
  // Reveal the selected point inside the timeline without moving the page.
  const rail = element('cache-conversation-points');
  const container = window.matchMedia('(min-width: 1051px)').matches ? rail.closest<HTMLElement>('.cache-conversation')! : rail;
  const selected = rail.querySelector<HTMLElement>('[aria-current="step"]')!;
  const bounds = container.getBoundingClientRect();
  const chosen = selected.getBoundingClientRect();
  if (chosen.bottom > bounds.bottom - 12) container.scrollTop += chosen.bottom - bounds.bottom + 12;
  else if (chosen.top < bounds.top + 12) container.scrollTop += chosen.top - bounds.top - 12;
}

function renderStory() {
  const scenario = cacheScenarios[scenarioIndex];
  const step = currentStep();
  element('cache-step-number').textContent = `Step ${stepIndex + 1} / ${scenario.steps.length}`;
  element('cache-step-title').textContent = step.title;
  element('cache-step-explanation').textContent = step.explanation;
  element('cache-lesson').textContent = scenario.lesson;
  renderConversation();
  prev.disabled = stepIndex === 0;
  next.disabled = stepIndex === scenario.steps.length - 1;
  document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach(button => {
    const active = button.dataset.scenario === scenario.id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  element('cache-step-dots').innerHTML = scenario.steps.map((s, i) => `<button type="button" data-step="${i}" aria-label="Step ${i + 1}: ${s.title}" ${i === stepIndex ? 'aria-current="step"' : ''}></button>`).join('');
  renderCache(step.state);
  renderInspector();
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
  element('cache-shared-bytes').textContent = bytes(result.total);
  element('cache-kv-bytes').textContent = bytes(result.kv);
  element('cache-fixed-bytes').textContent = bytes(result.fixed);
  const ceiling = Math.max(result.total, result.budget) * 1.12;
  element('cache-shared-kv-bar').style.width = `${result.kv / ceiling * 100}%`;
  element('cache-shared-fixed-bar').style.width = `${result.fixed / ceiling * 100}%`;
  document.querySelectorAll<HTMLElement>('.cache-budget-marker').forEach(node => { node.style.left = `${result.budget / ceiling * 100}%`; });
  const fit = element('cache-shared-fit');
  fit.textContent = result.fits ? `Fits · ${bytes(result.budget - result.total)} left in the cache budget` : `Exceeds the budget by ${bytes(result.total - result.budget)} · some checkpoints must be evicted or refused`;
  fit.classList.toggle('over-budget', !result.fits);
  element('cache-size-formula').textContent = `${cacheModels[model].name}: ${bytes(cacheModels[model].fixed)} fixed per checkpoint + ${(cacheModels[model].perToken / 1024).toFixed(2)} KiB per token.`;
}

document.querySelector('.cache-scenarios')!.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-scenario]');
  if (!button) return;
  stop();
  scenarioIndex = cacheScenarios.findIndex(s => s.id === button.dataset.scenario);
  stepIndex = 0;
  inspected = undefined;
  renderStory();
});
element('cache-step-dots').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-step]');
  if (!button) return;
  stop(); stepIndex = Number(button.dataset.step); inspected = undefined; renderStory();
});
element('cache-conversation-points').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-time]');
  if (!button) return;
  stop(); stepIndex = Number(button.dataset.time); inspected = undefined; renderStory();
});
prev.addEventListener('click', () => { stop(); stepIndex = Math.max(0, stepIndex - 1); inspected = undefined; renderStory(); });
next.addEventListener('click', () => { stop(); stepIndex = Math.min(cacheScenarios[scenarioIndex].steps.length - 1, stepIndex + 1); inspected = undefined; renderStory(); });
play.addEventListener('click', () => {
  if (timer !== undefined) { stop(); return; }
  if (next.disabled) { stepIndex = 0; renderStory(); }
  play.textContent = 'Pause story';
  play.setAttribute('aria-pressed', 'true');
  timer = setInterval(() => {
    stepIndex++; inspected = undefined; renderStory();
    if (next.disabled) stop();
  }, 6500);
});
element('cache-hybrid').addEventListener('click', event => {
  const checkpoint = (event.target as HTMLElement).closest<HTMLElement>('[data-checkpoint]');
  const chunk = (event.target as HTMLElement).closest<HTMLElement>('[data-chunk]');
  if (checkpoint) inspected = { kind: 'checkpoint', id: checkpoint.dataset.checkpoint! };
  else if (chunk) inspected = { kind: 'chunk', id: chunk.dataset.chunk! };
  else return;
  stop(); renderInspector();
});
modelSelect.addEventListener('change', () => { model = modelSelect.value as ModelId; renderStory(); renderCapacity(); });
[depth, count, budget].forEach(input => input.addEventListener('input', renderCapacity));
window.addEventListener('pagehide', stop);
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
renderStory();
renderCapacity();
