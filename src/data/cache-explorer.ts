export const CACHE_SOURCE = 'https://github.com/gufo-org/gufo/blob/5e401f9b/docs/cache-redesign';
export const CHUNK_TOKENS = 2048;

export const cacheModels = {
  flash: { name: 'Flash-Next · MTP', fixed: 119_328_358, perToken: 27_460 },
  qwen: { name: '27B · DFlash2', fixed: 243_700_000, perToken: 65_536 },
};
export type ModelId = keyof typeof cacheModels;
export type Chunk = { id: string; start: number; end: number; lineage: string; tail: boolean };
export type Checkpoint = {
  id: string; position: number; chunks: Chunk[]; borrowed: boolean;
  ram: boolean; disk: 'none' | 'queued' | 'durable';
};
export type CacheView = {
  reused: number; source: string; note: string; checkpoints: Checkpoint[];
  sessions: { name: string; position: number }[];
  route?: { kind: 'live' | 'ram' | 'disk' | 'miss'; from: string; target: number; checkpoint?: string };
};
// `previous` names the step whose cache state this one evolves from, when it is not the step before.
export type CacheStep = {
  title: string; explanation: string; prompt: number; common: number;
  state: CacheView; previous?: number;
};
export type CacheScenario = { id: string; name: string; caption: string; lesson: string; steps: CacheStep[] };
// `lane` groups turns into one conversation branch; `from` forks a branch off an earlier point.
// A message spans tokens [start, end): `start` defaults to where its history ends, and earlier
// tokens of a root message are system prompt, tools and older history. Events carry no tokens.
export type ConversationPoint = {
  lane: string; role: 'user' | 'assistant' | 'tool' | 'event'; speaker: string; text: string; boundary: string;
  from?: number; fork?: string; start?: number; end?: number;
  // An async subagent's report: the point whose work this message returns. It is text, not shared history.
  result?: number; resultLabel?: string;
};

// Abbreviated example messages, not the recorded benchmark conversations.
// Each point corresponds to the same-index cache step, including lifecycle events.
export const cacheConversations: Record<string, { setup: string; points: ConversationPoint[] }> = {
  continuation: {
    setup: 'A coding assistant has a system prompt and tool definitions. The client replays assistant messages exactly.',
    points: [
      { lane: 'A', role: 'user', speaker: 'You', text: 'Some users sign up with addresses like “anna@example”. Where does the signup form check emails?', boundary: 'Prompt arrives · 4,096 tokens total', end: 4096 },
      { lane: 'A', role: 'assistant', speaker: 'Gufo', text: 'The signup handler calls validateEmail() before it creates the account. That function decides what counts as a valid address.', boundary: '+512 generated tokens · live frontier 4,608', end: 4608 },
      { lane: 'A', role: 'user', speaker: 'You', text: 'Why does “anna@example” pass that check?', boundary: 'Next prompt arrives · 5,120 tokens total', end: 5120 },
      { lane: 'A', role: 'assistant', speaker: 'Gufo', text: 'Its pattern only needs an @ followed by some characters, so a domain without a dot is accepted.', boundary: '+256 generated tokens · live frontier 5,376', end: 5376 },
      { lane: 'A', role: 'user', speaker: 'You', text: 'Show me the handler. What happens after validation?', boundary: 'Next prompt · 5,888 tokens total', end: 5888 },
      { lane: 'A', role: 'assistant', speaker: 'Gufo · tool call', text: 'I’ll open the signup handler.', boundary: '+256 generated tokens · live frontier 6,144', end: 6144 },
      { lane: 'A', role: 'tool', speaker: 'Read file · result', text: 'signup.ts: the handler trims the address, calls validateEmail(), saves the account, then sends a welcome email…', boundary: 'Tool output appended · prompt 7,680', end: 7680 },
      { lane: 'A', role: 'assistant', speaker: 'Gufo', text: 'Validation runs before anything is saved, so tightening the pattern is enough. I suggest requiring a dot after the @.', boundary: '+512 generated tokens · live frontier 8,192', end: 8192 },
      { lane: 'A', role: 'user', speaker: 'You', text: 'Are there tests for this? I don’t want to lock out existing users.', boundary: 'Next prompt · 8,704 tokens total', end: 8704 },
      { lane: 'A', role: 'assistant', speaker: 'Gufo · tool call', text: 'I’ll look for the existing validation tests.', boundary: '+512 generated tokens · live frontier 9,216', end: 9216 },
      { lane: 'A', role: 'tool', speaker: 'Read file · result', text: 'validate.test.ts: eight cases cover empty input and a missing @. None covers a domain without a dot…', boundary: 'Tool output appended · prompt 10,240', end: 10240 },
      { lane: 'A', role: 'assistant', speaker: 'Gufo', text: 'The tests miss this case, so I’ll add “anna@example” as invalid. Existing accounts are not re-validated, so nobody is locked out.', boundary: '+512 generated tokens · live frontier 10,752', end: 10752 },
      { lane: 'A', role: 'user', speaker: 'You', text: 'Summarize the fix in two sentences for the pull request.', boundary: 'Final prompt · 11,264 tokens total', end: 11264 },
      { lane: 'A', role: 'assistant', speaker: 'Gufo', text: 'Require a dot in the domain of new email addresses, and test addresses such as “anna@example”. Existing accounts are unaffected because only new signups are validated.', boundary: '+256 generated tokens · live frontier 11,520', end: 11520 },
    ],
  },
  sessions: {
    setup: 'Three independent conversations, A/B/C, rotate through two execution slots. D later branches from A’s exact 4,096-token prefix. Disk caching is enabled. Slot choices and retained boundaries are illustrative; clients replay history rather than naming an execution slot.',
    points: [
      { lane: 'A', role: 'user', speaker: 'A · you', text: 'Plan a three-day trip to Lisbon for two people who love food and walking.', boundary: 'A arrives · prompt 4,096 · slot 1', end: 4096 },
      { lane: 'A', role: 'assistant', speaker: 'A · Gufo', text: 'Day one: Alfama and the castle, with lunch at a tasca. Day two: Belém and pastéis de nata. Day three: Sintra.', boundary: 'A@4096 saved · live frontier 4,608', end: 4608 },
      { lane: 'B', role: 'user', speaker: 'B · you', text: 'Help me write a cover letter for a junior data analyst job.', boundary: 'B arrives · prompt 6,144 · slot 2', end: 6144 },
      { lane: 'B', role: 'assistant', speaker: 'B · Gufo', text: 'Here’s a first draft. It opens with your internship results and closes by asking for an interview.', boundary: 'B@6144 saved · live frontier 6,400', end: 6400 },
      { lane: 'A', role: 'user', speaker: 'A · you', text: 'Swap Sintra for a day at the beach. Which one is easiest by train?', boundary: 'A returns · prompt 5,120 · live hit in slot 1', end: 5120 },
      { lane: 'A', role: 'assistant', speaker: 'A · Gufo', text: 'Cascais is about 40 minutes from Cais do Sodré, with frequent trains. I’ve updated day three.', boundary: 'A@5120 saved · live frontier 5,376', end: 5376 },
      { lane: 'C', role: 'user', speaker: 'C · you', text: 'Explain how a heat pump can heat a house when it’s cold outside.', boundary: 'C arrives · prompt 8,192 · reassign slot 1', end: 8192 },
      { lane: 'C', role: 'assistant', speaker: 'C · Gufo', text: 'It moves heat instead of making it: a refrigerant absorbs warmth from the outside air, even below freezing, and releases it indoors.', boundary: 'C@8192 durable · live frontier 8,448', end: 8448 },
      { lane: 'A', role: 'user', speaker: 'A · you', text: 'Back to Lisbon: suggest a restaurant for our last night.', boundary: 'A returns · prompt 5,888 · RAM hit → slot 2', end: 5888 },
      { lane: 'A', role: 'assistant', speaker: 'A · Gufo', text: 'Try a seafood restaurant near Cais do Sodré, close to the Cascais train. Book ahead for Saturday.', boundary: 'A@5888 saved · live frontier 6,144', end: 6144 },
      { lane: 'B', role: 'user', speaker: 'B · you', text: 'Make the cover letter shorter and mention my SQL skills.', boundary: 'B returns · prompt 6,912 · RAM hit → slot 1', end: 6912 },
      { lane: 'B', role: 'assistant', speaker: 'B · Gufo', text: 'Done: it’s now three paragraphs, with SQL in the second one next to your dashboard project.', boundary: 'B@6912 saved · live frontier 7,168', end: 7168 },
      { lane: 'D', role: 'user', speaker: 'D · new branch', text: 'Actually, we’re travelling with two young kids. Can you adapt the plan?', boundary: 'Different conversation · shared prefix 4,096 · prompt 6,144', from: 0, fork: 'shares 4,096', end: 6144 },
      { lane: 'D', role: 'assistant', speaker: 'D · Gufo', text: 'With kids, keep mornings busy and afternoons light: the Oceanário, tram 28 and an early dinner each day.', boundary: 'D@6144 saved · live frontier 6,400', end: 6400 },
      { lane: 'C', role: 'event', speaker: 'Cache · RAM pressure', text: 'Evict C’s checkpoint from RAM. Its completed disk copy remains available, and A and D keep their live slots.', boundary: 'C@8192 becomes disk-only' },
      { lane: 'C', role: 'user', speaker: 'C · you', text: 'How much would a heat pump save compared with my gas boiler?', boundary: 'C returns · prompt 8,960 · disk hit → slot 1', end: 8960 },
      { lane: 'C', role: 'assistant', speaker: 'C · Gufo', text: 'It depends on local prices, but heat pumps are typically three to four times as efficient. Here’s a rough estimate for your house…', boundary: 'C@8960 saved in RAM · live frontier 9,216', end: 9216 },
      { lane: 'E', role: 'user', speaker: 'E · changed instructions', text: 'Plan a three-day trip to Lisbon for two people who love food and walking.', boundary: 'Changed input identity/prefix · prompt 4,096 · cache miss', end: 4096 },
    ],
  },
  edit: {
    setup: 'The conversation has reached 8,192 tokens. An earlier user message sits after token 7,000.',
    points: [
      { lane: 'Original', role: 'assistant', speaker: 'Gufo · original history', text: 'Here is the summary of the sales report: revenue grew 12%, driven mostly by the new subscription plan.', boundary: 'Before the edit · live frontier 8,192', start: 7000, end: 8192 },
      { lane: 'Edit', role: 'user', speaker: 'You · edited message', text: 'Change that earlier request: summarize customer churn instead of revenue.', boundary: 'Edit at token 7,001 · new prompt 8,192', from: 0, fork: 'edit @ 7,001', start: 7000, end: 8192 },
      { lane: 'Edit', role: 'event', speaker: 'Cache · edited branch ready', text: 'Restore an earlier exact boundary, then compute the rewritten suffix. The recomputed rows have new provenance.', boundary: 'After prefill · new branch frontier 8,192' },
      { lane: 'Edit', role: 'assistant', speaker: 'Gufo · edited branch', text: 'Churn rose from 3.2% to 4.1% this quarter. Most of the increase came from customers on monthly plans.', boundary: '+512 generated tokens · live frontier 8,704', end: 8704 },
      { lane: 'Edit', role: 'user', speaker: 'You', text: 'Which customers churned the most?', boundary: 'Next prompt · 9,216 tokens total', end: 9216 },
      { lane: 'Edit', role: 'assistant', speaker: 'Gufo · edited branch', text: 'New monthly customers in their first 90 days: 7.8%, against 2.1% for annual plans.', boundary: 'Edit@9216 saved · live frontier 9,472', end: 9472 },
    ],
  },
  fork: {
    setup: 'A parent agent has a 10,000-token history. Its system prompt and tools occupy a shared 6,000-token prefix. Subagents run asynchronously: the parent does not wait, and each report returns to it as a tool result.',
    points: [
      { lane: 'S', role: 'user', speaker: 'Subagent S · first task', text: 'Using the shared instructions and tools, find every place the app sends an email.', boundary: 'First fork arrives · 8,192-token prompt', start: 6000, end: 8192 },
      { lane: 'S', role: 'event', speaker: 'Cache · shared boundary reached', text: 'Pause at token 6,000 and save the exact state where the shared instructions end.', boundary: 'New learned checkpoint · token 6,000' },
      { lane: 'T', role: 'user', speaker: 'Subagent T · second task', text: 'Using the same instructions and tools, write tests for the password-reset flow.', boundary: 'Next fork arrives · reuse the 6,000-token boundary', from: 1, fork: 'restore @ 6,000', start: 6000, end: 8192 },
      { lane: 'Parent', role: 'tool', speaker: 'Subagent S · async result', text: 'Emails are sent from three places: signup, password reset and the weekly digest. Each one builds its own template…', boundary: 'S finished · report appended to the parent · prompt 10,768', start: 10000, end: 10768, result: 1, resultLabel: 'S report' },
      { lane: 'Parent', role: 'assistant', speaker: 'Parent · Gufo', text: 'S found three senders. I’ll move them onto one shared template, starting with signup; T is still writing the reset tests.', boundary: 'Parent@10768 saved · live frontier 11,024', end: 11024 },
      { lane: 'Parent', role: 'tool', speaker: 'Subagent T · async result', text: 'Added four tests for the password-reset flow. All of them pass against the current code.', boundary: 'T finished · report appended to the parent · prompt 11,536', end: 11536, result: 2, resultLabel: 'T report' },
    ],
  },
  spill: {
    setup: 'Two independent conversations share a small execution pool. Checkpoints can outlive the session that computed them.',
    points: [
      { lane: 'A', role: 'assistant', speaker: 'Gufo · conversation A', text: 'Your novel outline is ready: three acts, twelve chapters and a twist in chapter nine.', boundary: 'A pauses · checkpoints at 8,192 and 12,288', end: 12288 },
      { lane: 'B', role: 'user', speaker: 'You · conversation B', text: 'Translate this product description into Spanish.', boundary: 'B takes A’s slot · preserve A before overwrite', end: 2048 },
      { lane: 'A', role: 'event', speaker: 'Cache · memory pressure', text: 'Remove A’s older checkpoint. Its chunks remain needed by the newer checkpoint.', boundary: 'Evict A@8192 · shared rows remain referenced' },
      { lane: 'A', role: 'user', speaker: 'You · back in conversation A', text: 'Great. Now draft the opening of chapter one from that outline.', boundary: 'A returns · 12,800-token prompt', end: 12800 },
    ],
  },
  restart: {
    setup: 'Disk caching is enabled. The newest response can finish before its checkpoint is durable.',
    points: [
      { lane: 'A', role: 'assistant', speaker: 'Gufo · conversation A', text: 'Here’s the refactored payment module. The retry logic now lives in its own function.', boundary: '12,288 in RAM · only 8,192 durable on disk', end: 12288 },
      { lane: 'A', role: 'event', speaker: 'Disk writer · publication complete', text: 'The checkpoint and all its dependencies are durable. It can now survive a process restart.', boundary: '12,288 becomes durable' },
      { lane: 'A', role: 'user', speaker: 'You · after restart', text: 'Thanks. Now add unit tests for the retry function.', boundary: 'Restore durable state · 12,800-token prompt', end: 12800 },
      { lane: 'Crash', role: 'event', speaker: 'Alternative · crash before publication', text: 'Rewind to the first point: what if the server died while the newest write was unfinished?', boundary: 'Alternative crash path · only 8,192 survives', from: 0, fork: 'crash before publish' },
    ],
  },
  provenance: {
    setup: 'Two clients submit identical tokens independently. A later client actually restores one of their checkpoints.',
    points: [
      { lane: 'A + B', role: 'user', speaker: 'Clients A and B', text: 'Summarize this supplier contract and list its termination clauses.', boundary: 'Two independent cold prompts · 6,144 tokens each', end: 6144 },
      { lane: 'A + B', role: 'event', speaker: 'Cache · preserve both computations', text: 'The tokens match, but independent prefill shapes can produce different bytes. Keep A’s state and B’s state separate.', boundary: 'Two provenances · six full chunks in the hybrid' },
      { lane: 'C', role: 'user', speaker: 'Client C · extends A', text: 'Following A’s summary: which of those clauses favour the supplier?', boundary: 'Restore A’s 6,144 tokens · new prompt 8,192', from: 1, fork: 'restores A', end: 8192 },
    ],
  },
};

function checkpoint(id: string, position: number, lineage = 'A', options: Partial<Checkpoint> & { shared?: number; sharedLineage?: string } = {}): Checkpoint {
  const chunks: Chunk[] = [];
  for (let start = 0; start < position; start += CHUNK_TOKENS) {
    const end = Math.min(start + CHUNK_TOKENS, position);
    const tail = end - start < CHUNK_TOKENS;
    const origin = end <= (options.shared ?? 0) ? options.sharedLineage ?? 'A' : lineage;
    chunks.push({ id: tail ? `${id}-tail` : `${origin}:${start / CHUNK_TOKENS + 1}`, start, end, lineage: origin, tail });
  }
  return { id, position, chunks, borrowed: true, ram: true, disk: 'none', ...options };
}
const cp = checkpoint;
const a4 = cp('A@4096', 4096);
const a6 = cp('A@6144', 6144);
const a8 = cp('A@8192', 8192);
const a12 = cp('A@12288', 12288);
const slots = (name: string, position: number) => [{ name, position }, { name: 'Free', position: 0 }];
const view = (reused: number, source: string, note: string, checkpoints: Checkpoint[] = [], sessions = slots('Free', 0)): CacheView =>
  ({ reused, source, note, checkpoints, sessions });
const withState = (state: CacheView) => ({ state });
const routed = (v: CacheView, route: NonNullable<CacheView['route']>): CacheView => ({ ...v, route });

// Multi-slot history: overwritten rows are preserved; only actual restores
// inherit provenance. A partial checkpoint tail is private, even when restored.
const sessionA = [a4, cp('A@5120', 5120)];
const savedA = sessionA.map(c => ({ ...c, borrowed: false }));
const b6 = cp('B@6144', 6144, 'B');
const savedB = { ...b6, borrowed: false };
const c8 = cp('C@8192', 8192, 'C', { disk: 'durable' });
const resumedA = cp('A@5888', 5888, 'R', { shared: 4096 });
const resumedB = cp('B@6912', 6912, 'T', { shared: 6144, sharedLineage: 'B' });
const d6 = cp('D@6144', 6144, 'D', { shared: 4096 });
const beforeBranch = [...savedA, savedB, { ...c8, borrowed: false }, resumedA, resumedB];
const afterBranch = [...beforeBranch.map(c => c.id === resumedB.id ? { ...c, borrowed: false } : c), d6];
const diskOnlyC = afterBranch.map(c => c.id === c8.id ? { ...c, ram: false } : c);
const returningC = diskOnlyC.map(c => c.id === d6.id ? { ...c, borrowed: false } : c);
const slotPair = (first: string, p1: number, second: string, p2: number) => [{ name: first, position: p1 }, { name: second, position: p2 }];
const edit8 = cp('Edit@8192', 8192, 'E', { shared: 6144, borrowed: false });
const forkCheckpoints = [a4, cp('Parent@10000', 10000), cp('Shared@6000', 6000, 'S', { shared: 4096, borrowed: false })];

export const cacheScenarios: CacheScenario[] = [
  {
    id: 'continuation', name: 'Continue a conversation', caption: 'Reuse a live frontier',
    lesson: 'A live frontier includes the tokens actually executed during generation. If the client replays them exactly, the next turn can continue in place without restoring a snapshot.',
    steps: [
      { title: 'A cold prompt arrives', explanation: 'Conversation A sends 4,096 tokens. No session or checkpoint has computed this history yet.', prompt: 4096, common: 0,
        ...withState(view(0, 'Cold prefill', 'Every prompt token needs to run through the model.')) },
      { title: 'Save the prompt, then generate', explanation: 'Keep a checkpoint at 4,096. The live session advances by 512 generated tokens to 4,608; the checkpoint remains at its original boundary.', prompt: 4096, common: 4096,
        ...withState(view(0, 'First request complete', 'The prompt checkpoint is frozen. The live frontier can advance.', [a4], slots('Conversation A', 4608))) },
      { title: 'The next turn continues in place', explanation: 'The new 5,120-token prompt begins with the exact 4,608 tokens in the live session. Only 512 new tokens need prefill.', prompt: 5120, common: 4608,
        ...withState(view(4608, 'Live session · no restore', 'Reusing live state avoids restoring fixed state and copying KV.', [a4], slots('Conversation A', 4608))) },
      { title: 'The stable checkpoint advances too', explanation: 'Save the new prompt boundary at 5,120. Retaining this boundary also helps clients that rewrite or omit the previous assistant reasoning.', prompt: 5120, common: 4608,
        ...withState(view(4608, 'Live session · no restore', 'A new boundary means future turns can resume farther into the history.', [a4, cp('A@5120', 5120)], slots('Conversation A', 5376))) },
      { title: 'Ask to see the source', explanation: 'A’s 5,376-token live frontier is an exact prefix of this 5,888-token request. The next user message adds 512 tokens.', prompt: 5888, common: 5376,
        ...withState(view(5376, 'Live session · no restore', 'Only the new user message needs prefill.', [a4, cp('A@5120', 5120)], slots('Conversation A', 5376))) },
      { title: 'A tool call is generated history too', explanation: 'Save the prompt at 5,888, then generate 256 tokens containing the assistant’s tool call. The live state reaches 6,144.', prompt: 5888, common: 5376,
        ...withState(view(5376, 'Live session · no restore', 'Exact replay includes tool calls as well as ordinary assistant text.', [a4, cp('A@5120', 5120), cp('A@5888', 5888)], slots('Conversation A', 6144))) },
      { title: 'Append a large tool result', explanation: 'The file-reading result adds 1,536 tokens. Gufo can reuse the 6,144 tokens already executed and prefill just the appended result.', prompt: 7680, common: 6144,
        ...withState(view(6144, 'Live session · no restore', 'Tool output is new input. The preceding tool call is already in the live frontier.', [a4, cp('A@5120', 5120), cp('A@5888', 5888)], slots('Conversation A', 6144))) },
      { title: 'Gufo explains what it found', explanation: 'Capture the 7,680-token prompt, then generate 512 tokens. Multiple checkpoints now remember this same computation history.', prompt: 7680, common: 6144,
        ...withState(view(6144, 'Live session · no restore', 'Full chunks share provenance; each checkpoint keeps its own partial tail and fixed state.', [a4, cp('A@5120', 5120), cp('A@5888', 5888), cp('A@7680', 7680)], slots('Conversation A', 8192))) },
      { title: 'Start another investigation', explanation: 'The next user message extends the 8,192-token live frontier by 512 tokens. The older checkpoint depth does not limit this live hit.', prompt: 8704, common: 8192,
        ...withState(view(8192, 'Live session · no restore', 'The retained prompt boundary is 7,680; the live frontier also includes the assistant’s response.', [a4, cp('A@5120', 5120), cp('A@5888', 5888), cp('A@7680', 7680)], slots('Conversation A', 8192))) },
      { title: 'Issue the second tool call', explanation: 'Checkpoint the 8,704-token prompt. The next generated tool call extends the live session to 9,216.', prompt: 8704, common: 8192,
        ...withState(view(8192, 'Live session · no restore', 'Growing history increases retained bytes even when execution continues without a restore.', [a4, cp('A@5120', 5120), cp('A@5888', 5888), cp('A@7680', 7680), cp('A@8704', 8704)], slots('Conversation A', 9216))) },
      { title: 'The test file returns', explanation: 'Another 1,024-token tool result extends the live history. This request reaches 10,240 tokens, with just 1,024 requiring prefill.', prompt: 10240, common: 9216,
        ...withState(view(9216, 'Live session · no restore', 'A long conversation can alternate user turns and tool results while continuing in the same slot.', [a4, cp('A@5120', 5120), cp('A@5888', 5888), cp('A@7680', 7680), cp('A@8704', 8704)], slots('Conversation A', 9216))) },
      { title: 'Keep another exact boundary', explanation: 'Retain the prompt at 10,240, then generate 512 tokens. Older restore points remain in this illustrative checkpoint set.', prompt: 10240, common: 9216,
        ...withState(view(9216, 'Live session · no restore', 'These checkpoints share complete chunks from this uninterrupted history; fixed state and partial tails remain private.', [a4, cp('A@5120', 5120), cp('A@5888', 5888), cp('A@7680', 7680), cp('A@8704', 8704), cp('A@10240', 10240)], slots('Conversation A', 10752))) },
      { title: 'Ask for a final summary', explanation: 'A’s 10,752 executed tokens match the new prompt exactly. Only the final 512-token user message needs prefill.', prompt: 11264, common: 10752,
        ...withState(view(10752, 'Live session · no restore', 'No snapshot restore is necessary while this exact frontier remains available.', [a4, cp('A@5120', 5120), cp('A@5888', 5888), cp('A@7680', 7680), cp('A@8704', 8704), cp('A@10240', 10240)], slots('Conversation A', 10752))) },
      { title: 'Seven requests, one live history', explanation: 'The last prompt checkpoint is at 11,264; 256 generated tokens take the live session to 11,520. Six subsequent requests have continued directly from live state.', prompt: 11264, common: 10752,
        ...withState(view(10752, 'Live session · no restore', 'Retained storage and execution reuse are separate: checkpoints share chunks while this exact live frontier continues without a restore.', [a4, cp('A@5120', 5120), cp('A@5888', 5888), cp('A@7680', 7680), cp('A@8704', 8704), cp('A@10240', 10240), cp('A@11264', 11264)], slots('Conversation A', 11520))) },
    ],
  },
  {
    id: 'sessions', name: 'Several conversations, two slots', caption: 'Trace hits across execution sessions',
    lesson: 'A conversation is a token history, not an execution-slot assignment. Compatible exact-prefix checkpoints can serve any slot or client. Live hits avoid a restore; cross-slot hits restore frozen state, which may be behind the last generated token. Independent histories do not share KV merely because they use the same model.',
    steps: [
      { title: 'A starts in the first slot', explanation: 'No compatible state exists. A’s first 4,096-token prompt is cold; the second execution slot remains free.', prompt: 4096, common: 0,
        ...withState(routed(view(0, 'Miss · A is new', 'All 4,096 tokens need prefill.', [], slotPair('A · starting', 0, 'Free', 0)), { kind: 'miss', from: 'No matching state', target: 1 })) },
      { title: 'A leaves both live and frozen state', explanation: 'Save A@4096, then generate 512 tokens. The live frontier is 4,608, but the checkpoint remains at 4,096.', prompt: 4096, common: 4096,
        ...withState(routed(view(0, 'A’s first request complete', 'The checkpoint is independent of the generated frontier.', [a4], slotPair('Conversation A', 4608, 'Free', 0)), { kind: 'miss', from: 'Cold request completed', target: 1 })) },
      { title: 'B uses the other execution slot', explanation: 'B’s different system prompt and history do not match A. Using the same model does not make this a hit.', prompt: 6144, common: 0,
        ...withState(routed(view(0, 'Miss · B is independent', 'A stays available in slot 1 while B starts in slot 2.', [a4], slotPair('Conversation A', 4608, 'B · starting', 0)), { kind: 'miss', from: 'No matching state', target: 2 })) },
      { title: 'Both conversations now have live state', explanation: 'B saves its 6,144-token prompt and generates 256 tokens. A and B each occupy one slot, with separate computation provenance.', prompt: 6144, common: 6144,
        ...withState(routed(view(0, 'B’s first request complete', 'The cache retains A and B independently.', [a4, b6], slotPair('Conversation A', 4608, 'Conversation B', 6400)), { kind: 'miss', from: 'Cold request completed', target: 2 })) },
      { title: 'A returns: choose its matching live slot', explanation: 'A’s new 5,120-token prompt includes its exact 4,608-token live frontier in slot 1. Reuse it directly and prefill 512 tokens.', prompt: 5120, common: 4608,
        ...withState(routed(view(4608, 'Live hit · A in slot 1', 'B’s slot and checkpoint remain available.', [a4, b6], slotPair('Conversation A', 4608, 'Conversation B', 6400)), { kind: 'live', from: 'A live @ 4,608 · slot 1', target: 1 })) },
      { title: 'A advances while B stays unchanged', explanation: 'Capture A@5120 and generate 256 tokens, reaching 5,376. A now has two frozen boundaries along the same history.', prompt: 5120, common: 4608,
        ...withState(routed(view(4608, 'Live hit · request complete', 'The hybrid shares A’s first two full chunks across its checkpoints.', [...sessionA, b6], slotPair('Conversation A', 5376, 'Conversation B', 6400)), { kind: 'live', from: 'A live continuation', target: 1 })) },
      { title: 'C arrives: preserve A before reusing slot 1', explanation: 'There are two execution slots, not a limit of two retained conversations. Reassign A’s idle slot to unrelated C after preserving any borrowed rows its checkpoints need.', prompt: 8192, common: 0,
        ...withState(routed(view(0, 'Miss · C replaces live A', 'A’s generated frontier is gone; its exact checkpoints remain reusable.', [...savedA, b6], slotPair('C · starting', 0, 'Conversation B', 6400)), { kind: 'miss', from: 'No matching state · preserve A', target: 1 })) },
      { title: 'C completes and its disk copy becomes durable', explanation: 'C checkpoints 8,192 tokens and generates 256. This point is after its disk write has completed, so C@8192 exists in RAM and on durable disk.', prompt: 8192, common: 8192,
        ...withState(routed(view(0, 'C’s cold request complete', 'Three conversations have checkpoints even though only two have live frontiers.', [...savedA, b6, c8], slotPair('Conversation C', 8448, 'Conversation B', 6400)), { kind: 'miss', from: 'Cold request + disk publication complete', target: 1 })) },
      { title: 'A hits RAM and moves from slot 1 to slot 2', explanation: 'A’s 5,376-token live frontier was overwritten. Its longest retained prefix is A@5120. Preserve B, restore A into slot 2, then prefill 768 tokens, including the 256-token response absent from the snapshot.', prompt: 5888, common: 5376,
        ...withState(routed(view(5120, 'RAM hit · A@5120 → slot 2', 'A checkpoint captured from one slot can restore into another. Cross-slot contiguous restores copy KV and load fixed state.', [...savedA, savedB, c8], slotPair('Conversation C', 8448, 'A · restored', 5120)), { kind: 'ram', from: 'A@5120 · retained RAM', target: 2, checkpoint: 'A@5120' })) },
      { title: 'A’s new checkpoint inherits only restored rows', explanation: 'A saves its new 5,888-token prompt and generates 256 tokens. Its full chunks through 4,096 descend from A; the new private tail includes the restored 1,024-row tail and the recomputed suffix.', prompt: 5888, common: 5376,
        ...withState(routed(view(5120, 'RAM hit · request complete', 'A@5120 and A@5888 share full chunks, but their partial tails remain separate.', [...savedA, savedB, c8, resumedA], slotPair('Conversation C', 8448, 'Conversation A', 6144)), { kind: 'ram', from: 'A@5120 · retained RAM', target: 2, checkpoint: 'A@5120' })) },
      { title: 'B also returns in a different slot', explanation: 'B’s old slot now holds A. Restore B@6144 into slot 1, preserving C’s borrowed rows before overwriting them. B prefills 768 tokens of its 6,912-token prompt.', prompt: 6912, common: 6400,
        ...withState(routed(view(6144, 'RAM hit · B@6144 → slot 1', 'B moves from slot 2 to slot 1; A’s live state stays in slot 2.', [...savedA, savedB, { ...c8, borrowed: false }, resumedA], slotPair('B · restored', 6144, 'Conversation A', 6144)), { kind: 'ram', from: 'B@6144 · retained RAM', target: 1, checkpoint: 'B@6144' })) },
      { title: 'B extends its own provenance', explanation: 'After restoring B, capture B@6912 and generate 256 tokens. B’s first three full chunks came from B@6144, not from A or C.', prompt: 6912, common: 6400,
        ...withState(routed(view(6144, 'RAM hit · request complete', 'A and B each share chunks only within their own restored computation lineage.', beforeBranch, slotPair('Conversation B', 7168, 'Conversation A', 6144)), { kind: 'ram', from: 'B@6144 · retained RAM', target: 1, checkpoint: 'B@6144' })) },
      { title: 'D is a new conversation that still gets a hit', explanation: 'D replays A’s first 4,096 tokens exactly, then diverges. A’s longer live frontier is not a prefix of D, but A@4096 is. Restore that boundary into slot 1 and prefill D’s 2,048-token task.', prompt: 6144, common: 4096,
        ...withState(routed(view(4096, 'RAM hit · A@4096 serves D', 'No conversation ID is needed for reuse. Exact token prefix and compatible input identity decide the hit.', beforeBranch.map(c => c.id === resumedB.id ? { ...c, borrowed: false } : c), slotPair('D · restored from A', 4096, 'Conversation A', 6144)), { kind: 'ram', from: 'A@4096 · another conversation', target: 1, checkpoint: 'A@4096' })) },
      { title: 'D and A share proven rows across slots', explanation: 'D captures its 6,144-token prompt and generates 256. D’s first two chunks are A’s restored bytes; the third is D’s new computation.', prompt: 6144, common: 4096,
        ...withState(routed(view(4096, 'RAM hit · branch complete', 'Click A:1 in the hybrid pool: A and D checkpoints reference the same physical range.', afterBranch, slotPair('Conversation D', 6400, 'Conversation A', 6144)), { kind: 'ram', from: 'A@4096 · another conversation', target: 1, checkpoint: 'A@4096' })) },
      { title: 'RAM pressure leaves C only on disk', explanation: 'Evict C@8192 from RAM after its durable disk write. Neither live slot holds C; its checkpoint can still be restored from disk.', prompt: 6144, common: 4096,
        ...withState(view(4096, 'Eviction event · last request shown', 'A and D keep their live frontiers. C’s RAM storage is released; its durable disk state remains.', diskOnlyC, slotPair('Conversation D', 6400, 'Conversation A', 6144))) },
      { title: 'C returns: a disk hit across sessions', explanation: 'C’s 8,960-token prompt extends its durable 8,192-token checkpoint. There is no matching RAM checkpoint in this example. Read C’s exact state into slot 1 and prefill 768 tokens.', prompt: 8960, common: 8448,
        ...withState(routed(view(8192, 'Disk hit · C@8192 → slot 1', 'Disk is enabled, the checkpoint is durable, and it fits the configured restore/staging limits. A continues to occupy slot 2.', returningC, slotPair('C · restored from disk', 8192, 'Conversation A', 6144)), { kind: 'disk', from: 'C@8192 · durable disk', target: 1, checkpoint: 'C@8192' })) },
      { title: 'C continues from the restored disk state', explanation: 'Capture C@8960 in RAM, then generate 256 tokens to reach 9,216. The hybrid’s first four full chunks descend from the restored durable C checkpoint.', prompt: 8960, common: 8448,
        ...withState(routed(view(8192, 'Disk hit · request complete', 'The new checkpoint is in RAM; this example does not assume its disk write has completed.', [...returningC, cp('C@8960', 8960, 'U', { shared: 8192, sharedLineage: 'C' })], slotPair('Conversation C', 9216, 'Conversation A', 6144)), { kind: 'disk', from: 'C@8192 · durable disk', target: 1, checkpoint: 'C@8192' })) },
      { title: 'Changed instructions still cause a miss', explanation: 'E changes the beginning of the system prompt or otherwise has incompatible input identity. None of the displayed checkpoints can serve it, despite their token counts. Preserve C before reassigning slot 1 and compute E cold.', prompt: 4096, common: 0,
        ...withState(routed(view(0, 'Miss · no compatible prefix', 'Reuse requires a matching history and compatible inputs, not just an available checkpoint or the same model.', [...returningC, cp('C@8960', 8960, 'U', { shared: 8192, sharedLineage: 'C', borrowed: false })], slotPair('E · starting', 0, 'Conversation A', 6144)), { kind: 'miss', from: 'No compatible state', target: 1 })) },
    ],
  },
  {
    id: 'edit', name: 'Edit an earlier message', caption: 'Common prefix ≠ usable state',
    lesson: 'Matching tokens alone are insufficient for hybrid models. Recurrent state must exist at the exact restore position. Denser checkpoints reduce the gap, subject to memory and record limits. Once restored, the edited branch is an ordinary conversation with its own provenance.',
    steps: [
      { title: 'Keep a few restore points', explanation: 'A is at 8,192 tokens. This example retains exact checkpoints at 4,096, 6,144 and 8,192, sharing full chunks from the same computation.', prompt: 8192, common: 8192,
        state: view(8192, 'Live session', 'An extra boundary costs fixed state, while full chunks are shared.', [a4, a6, a8], slots('Conversation A', 8192)) },
      { title: 'An edit changes token 7,001', explanation: 'The new prompt shares 7,000 tokens with A. Its 8,192-token frontier is no longer a prefix, so the recurrent state cannot simply be truncated to 7,000.', prompt: 8192, common: 7000,
        state: view(6144, 'RAM checkpoint @ 6,144', '6,144 reused; 2,048 prefilled. The extra checkpoint makes the difference.', [a4, a6, a8], slots('Conversation A · old branch', 8192)) },
      { title: 'The edited tail has new provenance', explanation: 'Restore the chosen boundary and compute the edited branch. The new branch shares only the rows it actually restored, including rows before the edit that it otherwise recomputes.', prompt: 8192, common: 7000,
        state: view(6144, 'Branch from 6,144', 'The first three chunks descend from A; the fourth was computed on the new branch.', [a4, a6, edit8], slots('Edited conversation', 8192)) },
      { title: 'The edited branch answers', explanation: 'Generate the reply to the edited request. The live session advances to 8,704, while the edited prompt stays checkpointed at 8,192.', prompt: 8192, common: 7000,
        state: view(6144, 'Branch from 6,144 · request complete', 'The original branch’s live state is gone. Its checkpoints at 4,096 and 6,144 remain available to other edits.', [a4, a6, edit8], slots('Edited conversation', 8704)) },
      { title: 'The new branch continues live', explanation: 'The follow-up extends the edited branch’s 8,704-token live frontier exactly. No restore is needed; only the 512-token question is prefilled.', prompt: 9216, common: 8704,
        state: view(8704, 'Live session · edited branch', 'After an edit, the new branch behaves like any conversation: it continues in place.', [a4, a6, edit8], slots('Edited conversation', 8704)) },
      { title: 'Branch checkpoints share their own rows', explanation: 'Save the 9,216-token prompt, then generate 256 tokens. Edit@9216 references A’s first three chunks and the chunk computed on the edited branch.', prompt: 9216, common: 8704,
        state: view(8704, 'Live session · request complete', 'Edit@8192 and Edit@9216 share chunk E:4. Each keeps its own fixed state and partial tail.', [a4, a6, edit8, cp('Edit@9216', 9216, 'E', { shared: 6144 })], slots('Edited conversation', 9472)) },
    ],
  },
  {
    id: 'fork', name: 'Start a subagent', caption: 'Learn the divergence boundary',
    lesson: 'A learned checkpoint saves recurrent state where histories actually diverge. Later requests restore that state and inherit its KV provenance. Independent cold computations are not automatically merged. An async subagent returns text, not state: its report is appended to the parent’s history and prefilled there.',
    steps: [
      { title: 'A parent has a long history', explanation: 'The parent has 10,000 tokens. A subagent shares the first 6,000, then follows its own task. Only the 4,096 checkpoint is usable below the divergence.', prompt: 8192, common: 6000,
        ...withState(view(4096, 'RAM checkpoint @ 4,096', 'Restore 4,096, then compute the shared gap and the new task.', [a4, cp('Parent@10000', 10000)], slots('Parent', 10000))) },
      { title: 'Capture the actual shared boundary', explanation: 'The subagent stops prefill at 6,000 and captures its recurrent state. Its first 4,096 KV rows came from A; the remaining 1,904 were recomputed.', prompt: 8192, common: 6000,
        ...withState(view(4096, 'Learning @ 6,000', 'A partial chunk holds the tail; its bytes belong to the subagent computation.', [a4, cp('Parent@10000', 10000), cp('Shared@6000', 6000, 'S', { shared: 4096 })], [{ name: 'Parent', position: 10000 }, { name: 'Subagent S', position: 6000 }])) },
      { title: 'The next subagent restores 6,000', explanation: 'A later subagent finds an exact checkpoint at the shared boundary. It restores all 6,000 tokens and prefills only its own 2,192-token task.', prompt: 8192, common: 6000,
        ...withState(view(6000, 'RAM checkpoint @ 6,000', 'The learned boundary improves reuse; checkpoints retain shared KV with its proven computation lineage.', forkCheckpoints, [{ name: 'Parent', position: 10000 }, { name: 'Subagent T', position: 6000 }])) },
      { title: 'S reports back to the parent', explanation: 'S ran asynchronously, so the parent did not wait. Its 768-token report is appended to the parent’s history as a tool result. The parent’s live frontier is still an exact prefix, so only the report needs prefill.', prompt: 10768, common: 10000,
        ...withState(routed(view(10000, 'Live hit · parent in slot 1', 'The parent receives S’s report as text. S’s own KV after token 6,000 belongs to a different history and is not reused here.', forkCheckpoints, [{ name: 'Parent', position: 10000 }, { name: 'Subagent T', position: 8448 }]), { kind: 'live', from: 'Parent live @ 10,000 · slot 1', target: 1 })) },
      { title: 'The parent continues while T works', explanation: 'Save the parent’s 10,768-token prompt, then generate 256 tokens. T is still running in slot 2; neither request waits for the other.', prompt: 10768, common: 10000,
        ...withState(routed(view(10000, 'Live hit · request complete', 'Parent@10000 and Parent@10768 share the parent’s full chunks. The learned 6,000-token checkpoint is unaffected.', [...forkCheckpoints, cp('Parent@10768', 10768)], [{ name: 'Parent', position: 11024 }, { name: 'Subagent T', position: 8704 }]), { kind: 'live', from: 'Parent live continuation', target: 1 })) },
      { title: 'T reports back too', explanation: 'T finishes and its 512-token report is appended the same way. The parent continues live from 11,024, and slot 2 is free for the next subagent.', prompt: 11536, common: 11024,
        ...withState(routed(view(11024, 'Live hit · parent in slot 1', 'Finished subagents leave no live state behind. Shared@6000 stays retained, so the next subagent can restore the shared instructions directly.', [...forkCheckpoints, cp('Parent@10768', 10768)], slotPair('Parent', 11024, 'Free', 0)), { kind: 'live', from: 'Parent live @ 11,024 · slot 1', target: 1 })) },
    ],
  },
  {
    id: 'spill', name: 'Reuse a session slot', caption: 'Borrow → reserve → spill',
    lesson: 'Sessions execute requests; checkpoints remember history. Borrowed rows still reserve spill capacity. Reassigning a session copies needed rows once, and deleting one checkpoint frees only chunks with no remaining references.',
    steps: [
      { title: 'Two checkpoints borrow the same prefix', explanation: 'A has checkpoints at 8,192 and 12,288. The hybrid shares their first four chunks and reserves backing capacity while those rows remain in the live session.', prompt: 12288, common: 12288,
        ...withState(view(12288, 'Live session', 'Select a chunk to see which checkpoints reference it.', [a8, a12], slots('Conversation A', 12288))) },
      { title: 'Another conversation needs that slot', explanation: 'Before B overwrites A, preserve every borrowed row still needed by a checkpoint. The hybrid converts its spill reservation into allocated pool storage.', prompt: 2048, common: 0,
        state: view(0, 'Spill A → shared pool', 'Six chunks are preserved once for both A checkpoints. Borrowed memory was never free in the budget.', [cp('A@8192', 8192, 'A', { borrowed: false }), cp('A@12288', 12288, 'A', { borrowed: false })], slots('Conversation B', 2048)) },
      { title: 'Evict the older checkpoint', explanation: 'Remove A@8192. A@12288 still references all six chunks, so none of those chunks can be freed. Only the older checkpoint’s fixed state becomes unnecessary.', prompt: 2048, common: 0,
        ...withState(view(0, 'Eviction', 'Reference counts fall; shared chunks survive as long as a checkpoint needs them.', [cp('A@12288', 12288, 'A', { borrowed: false })], slots('Conversation B', 2048))) },
      { title: 'A returns on a free session', explanation: 'A now sends 12,800 tokens. Restore A@12288 into another slot and prefill 512 tokens. Contiguous sessions still require a KV copy in the proposed hybrid.', prompt: 12800, common: 12288,
        ...withState(view(12288, 'RAM restore @ 12,288', 'Shared storage saves retention bytes; zero-copy restores would require the optional paged-KV phase.', [cp('A@12288', 12288, 'A', { borrowed: false })], [{ name: 'Conversation B', position: 2048 }, { name: 'Conversation A', position: 12288 }])) },
    ],
  },
  {
    id: 'restart', name: 'Restart the server', caption: 'Queued is not durable',
    lesson: 'A request can complete while disk work is still queued. An abrupt restart loses RAM and unfinished writes. Only durable checkpoints whose dependencies survived can be restored.',
    steps: [
      { title: 'An older checkpoint is durable', explanation: 'Disk has A@8192. A newer A@12288 is still queued. RAM and the live session are ahead of the durable disk frontier.', prompt: 12800, common: 12288,
        ...withState(view(12288, 'Live session', 'Amber entries are waiting for disk; they cannot survive a crash yet.', [cp('A@8192', 8192, 'A', { disk: 'durable' }), cp('A@12288', 12288, 'A', { disk: 'queued' })], slots('Conversation A', 12288))) },
      { title: 'The writer publishes the new checkpoint', explanation: 'Write missing chunks first, then publish the checkpoint manifest with its fixed state and chunk references. A@12288 becomes restorable only after publication is durable.', prompt: 12800, common: 12288,
        state: view(12288, 'Chunks + manifest durable', 'Only two new full chunks and the new fixed state need to be added.', [cp('A@8192', 8192, 'A', { disk: 'durable' }), cp('A@12288', 12288, 'A', { disk: 'durable' })], slots('Conversation A', 12288)) },
      { title: 'Restart after publication', explanation: 'The process loses every live session and RAM record. The durable A@12288 checkpoint restores the prefix, leaving 512 tokens to prefill.', prompt: 12800, common: 12288,
        ...withState(view(12288, 'Disk restore @ 12,288', 'Disk survival is about completed publication, not about when the HTTP response finished.', [cp('A@8192', 8192, 'A', { borrowed: false, ram: false, disk: 'durable' }), cp('A@12288', 12288, 'A', { borrowed: false, ram: false, disk: 'durable' })], slots('Free', 0))) },
      { title: 'What if the restart had been abrupt earlier?', explanation: 'If the process died before the queued write became durable, only A@8192 would survive. The remaining 4,608 prompt tokens must be prefilled in that history.', prompt: 12800, common: 8192, previous: 0,
        ...withState(view(8192, 'Disk restore @ 8,192', 'This is the alternative crash path from step 1. Smaller hybrid writes can reduce the vulnerable window.', [cp('A@8192', 8192, 'A', { borrowed: false, ram: false, disk: 'durable' })], slots('Free', 0))) },
    ],
  },
  {
    id: 'provenance', name: 'Compare identical prompts', caption: 'Same tokens ≠ same KV bytes',
    lesson: 'Token identity decides whether a whole checkpoint may be reused. Provenance decides which physical rows may be shared between checkpoints. Never mix recurrent state with KV from a different computation.',
    steps: [
      { title: 'Two independent cold prefills', explanation: 'A and B compute the same 6,144-token prompt independently, potentially using different prefill shapes. Their token prefixes agree; their KV bytes need not.', prompt: 6144, common: 6144,
        ...withState(view(0, 'Independent cold computations', 'This illustrates simultaneous cold work without a shared-prefix wait or an existing restore point.', [a6, cp('B@6144', 6144, 'B')], [{ name: 'Computation A', position: 6144 }, { name: 'Computation B', position: 6144 }])) },
      { title: 'Keep their physical chunks separate', explanation: 'The hybrid retains three A chunks and three B chunks. A token hash cannot prove that A’s KV is interchangeable with B’s recurrent state.', prompt: 6144, common: 6144,
        state: view(0, 'Two provenances · six chunks', 'Matching row ranges have different origins. Inspect A:1 and B:1.', [a6, cp('B@6144', 6144, 'B')], [{ name: 'Computation A', position: 6144 }, { name: 'Computation B', position: 6144 }]) },
      { title: 'A new branch actually restores A', explanation: 'C restores the entire A checkpoint, then continues to 8,192. Its first three chunks are exactly A’s rows, so it can safely share them; its fourth chunk is new.', prompt: 8192, common: 6144,
        ...withState(view(6144, 'Restore A → continue as C', 'Only an actual restore establishes the inherited provenance shown here.', [a6, cp('C@8192', 8192, 'C', { shared: 6144 })], [{ name: 'Computation A', position: 6144 }, { name: 'Branch C', position: 8192 }])) },
    ],
  },
];

export function uniqueChunks(checkpoints: Checkpoint[]): Chunk[] {
  return [...new Map(checkpoints.flatMap(c => c.chunks).map(c => [c.id, c])).values()];
}
export function storageBytes(checkpoints: Checkpoint[], model: ModelId): number {
  const { fixed, perToken } = cacheModels[model];
  const rows = uniqueChunks(checkpoints).reduce((n, c) => n + c.end - c.start, 0);
  return checkpoints.length * fixed + rows * perToken;
}
export function capacityEstimate(context: number, count: number, budgetGiB: number, model: ModelId) {
  const { fixed: perCheckpoint, perToken } = cacheModels[model];
  // Same-lineage, aligned checkpoints approaching this depth; no partial tails.
  const fixed = count * perCheckpoint;
  const kv = perToken * context;
  const total = fixed + kv;
  const budget = budgetGiB * 2 ** 30;
  return { fixed, kv, total, budget, fits: total <= budget };
}
