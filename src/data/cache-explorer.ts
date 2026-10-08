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
export type CacheStep = {
  title: string; explanation: string; prompt: number; common: number;
  state: CacheView;
};
export type CacheScenario = { id: string; name: string; caption: string; lesson: string; steps: CacheStep[] };
export type ConversationPoint = { role: 'user' | 'assistant' | 'tool' | 'event'; speaker: string; text: string; boundary: string };

// Abbreviated example messages, not the recorded benchmark conversations.
// Each point corresponds to the same-index cache step, including lifecycle events.
export const cacheConversations: Record<string, { setup: string; points: ConversationPoint[] }> = {
  continuation: {
    setup: 'A coding assistant has a system prompt and tool definitions. The client replays assistant messages exactly.',
    points: [
      { role: 'user', speaker: 'You', text: 'Find the cache entry points and explain how a request gets a session.', boundary: 'Prompt arrives · 4,096 tokens total' },
      { role: 'assistant', speaker: 'Gufo', text: 'The request leases a session. Its prompt state is checkpointed before generation continues.', boundary: '+512 generated tokens · live frontier 4,608' },
      { role: 'user', speaker: 'You', text: 'Now follow the next turn. Which part of this conversation is reused?', boundary: 'Next prompt arrives · 5,120 tokens total' },
      { role: 'assistant', speaker: 'Gufo', text: 'The previous live frontier is reused. The new prompt boundary is saved for later turns.', boundary: '+256 generated tokens · live frontier 5,376' },
      { role: 'user', speaker: 'You', text: 'Read the checkpoint capture code. What is saved before generation starts?', boundary: 'Next prompt · 5,888 tokens total' },
      { role: 'assistant', speaker: 'Gufo · tool call', text: 'I’ll read the capture path and the model’s snapshot interface.', boundary: '+256 generated tokens · live frontier 6,144' },
      { role: 'tool', speaker: 'Read file · result', text: 'The source contains fixed recurrent state, position metadata and the attention KV payload. Here are the relevant definitions…', boundary: 'Tool output appended · prompt 7,680' },
      { role: 'assistant', speaker: 'Gufo', text: 'Fixed state belongs to an exact boundary. The proposed hybrid can share KV chunks, while each checkpoint still needs its own fixed state.', boundary: '+512 generated tokens · live frontier 8,192' },
      { role: 'user', speaker: 'You', text: 'Check the disk writer too. When is a checkpoint safe after a restart?', boundary: 'Next prompt · 8,704 tokens total' },
      { role: 'assistant', speaker: 'Gufo · tool call', text: 'I’ll inspect the publication order and the durability checks.', boundary: '+512 generated tokens · live frontier 9,216' },
      { role: 'tool', speaker: 'Read file · result', text: 'The proposed writer persists missing chunks before publishing the checkpoint manifest. Queued writes have not reached that boundary yet…', boundary: 'Tool output appended · prompt 10,240' },
      { role: 'assistant', speaker: 'Gufo', text: 'A finished response does not imply a durable checkpoint. After a crash, only successfully published state can be restored.', boundary: '+512 generated tokens · live frontier 10,752' },
      { role: 'user', speaker: 'You', text: 'Put the live-session, RAM and disk paths together in a short explanation.', boundary: 'Final prompt · 11,264 tokens total' },
      { role: 'assistant', speaker: 'Gufo', text: 'Continue live when the exact history is still available; otherwise restore an exact checkpoint and prefill the remaining suffix. Durable disk state also survives a restart.', boundary: '+256 generated tokens · live frontier 11,520' },
    ],
  },
  sessions: {
    setup: 'Three independent conversations, A/B/C, rotate through two execution slots. D later branches from A’s exact 4,096-token prefix. Disk caching is enabled. Slot choices and retained boundaries are illustrative; clients replay history rather than naming an execution slot.',
    points: [
      { role: 'user', speaker: 'A · you', text: 'Review the cache request path and explain the first request.', boundary: 'A arrives · prompt 4,096 · slot 1' },
      { role: 'assistant', speaker: 'A · Gufo', text: 'The initial prompt is computed. Its checkpoint is retained while this response extends the live state.', boundary: 'A@4096 saved · live frontier 4,608' },
      { role: 'user', speaker: 'B · you', text: 'Start a separate review of the tokenizer, with different instructions and history.', boundary: 'B arrives · prompt 6,144 · slot 2' },
      { role: 'assistant', speaker: 'B · Gufo', text: 'The tokenizer review is ready. A’s live state is still in the other slot.', boundary: 'B@6144 saved · live frontier 6,400' },
      { role: 'user', speaker: 'A · you', text: 'Continue the cache review. Which tokens can we avoid computing?', boundary: 'A returns · prompt 5,120 · live hit in slot 1' },
      { role: 'assistant', speaker: 'A · Gufo', text: 'This turn continues from the live frontier. We also save its new prompt boundary.', boundary: 'A@5120 saved · live frontier 5,376' },
      { role: 'user', speaker: 'C · you', text: 'Start a third, unrelated conversation to inspect model loading.', boundary: 'C arrives · prompt 8,192 · reassign slot 1' },
      { role: 'assistant', speaker: 'C · Gufo', text: 'Model loading is explained. A’s checkpoints survived the slot change; this prompt’s checkpoint has also finished its disk write.', boundary: 'C@8192 durable · live frontier 8,448' },
      { role: 'user', speaker: 'A · you', text: 'Return to the cache review and inspect checkpoint eviction.', boundary: 'A returns · prompt 5,888 · RAM hit → slot 2' },
      { role: 'assistant', speaker: 'A · Gufo', text: 'A resumed in a different slot. The frozen checkpoint did not include all of the previous response, so that suffix was computed again.', boundary: 'A@5888 saved · live frontier 6,144' },
      { role: 'user', speaker: 'B · you', text: 'Continue the tokenizer review with the edge cases.', boundary: 'B returns · prompt 6,912 · RAM hit → slot 1' },
      { role: 'assistant', speaker: 'B · Gufo', text: 'B’s history was restored after its old execution slot was reused by A.', boundary: 'B@6912 saved · live frontier 7,168' },
      { role: 'user', speaker: 'D · new branch', text: 'Use A’s original instructions and context, but investigate cancellation instead.', boundary: 'Different conversation · shared prefix 4,096 · prompt 6,144' },
      { role: 'assistant', speaker: 'D · Gufo', text: 'This branch starts from A’s checkpoint. Its first two full chunks inherit A’s physical rows; its new suffix belongs to D.', boundary: 'D@6144 saved · live frontier 6,400' },
      { role: 'event', speaker: 'Cache · RAM pressure', text: 'Evict C’s checkpoint from RAM. Its completed disk copy remains available, and A and D keep their live slots.', boundary: 'C@8192 becomes disk-only' },
      { role: 'user', speaker: 'C · you', text: 'Continue the model-loading discussion from the earlier response.', boundary: 'C returns · prompt 8,960 · disk hit → slot 1' },
      { role: 'assistant', speaker: 'C · Gufo', text: 'Restore the durable prefix, compute the remaining 768 tokens, then continue generating.', boundary: 'C@8960 saved in RAM · live frontier 9,216' },
      { role: 'user', speaker: 'E · changed instructions', text: 'Begin with a different system prompt. Can the old review state still be used?', boundary: 'Changed input identity/prefix · prompt 4,096 · cache miss' },
    ],
  },
  edit: {
    setup: 'The conversation has reached 8,192 tokens. An earlier user message sits after token 7,000.',
    points: [
      { role: 'assistant', speaker: 'Gufo · original history', text: 'I have finished the first analysis. The conversation now has several possible restore points.', boundary: 'Before the edit · live frontier 8,192' },
      { role: 'user', speaker: 'You · edited message', text: 'Change that earlier request: inspect disk persistence instead of RAM retention.', boundary: 'Edit at token 7,001 · new prompt 8,192' },
      { role: 'event', speaker: 'Cache · edited branch ready', text: 'Restore an earlier exact boundary, then compute the rewritten suffix. The recomputed rows have new provenance.', boundary: 'After prefill · new branch frontier 8,192' },
    ],
  },
  fork: {
    setup: 'A parent agent has a 10,000-token history. Its system prompt and tools occupy a shared 6,000-token prefix.',
    points: [
      { role: 'user', speaker: 'Subagent S · first task', text: 'Using the shared instructions and tools, investigate cache performance.', boundary: 'First fork arrives · 8,192-token prompt' },
      { role: 'event', speaker: 'Cache · shared boundary reached', text: 'Pause at token 6,000 and save the exact state where the shared instructions end.', boundary: 'New learned checkpoint · token 6,000' },
      { role: 'user', speaker: 'Subagent T · second task', text: 'Using those same instructions and tools, investigate cache correctness.', boundary: 'Next fork arrives · reuse the 6,000-token boundary' },
    ],
  },
  spill: {
    setup: 'Two independent conversations share a small execution pool. Checkpoints can outlive the session that computed them.',
    points: [
      { role: 'assistant', speaker: 'Gufo · conversation A', text: 'The long analysis is ready. We can return to this conversation later.', boundary: 'A pauses · checkpoints at 8,192 and 12,288' },
      { role: 'user', speaker: 'You · conversation B', text: 'Start a separate task with a different history.', boundary: 'B takes A’s slot · preserve A before overwrite' },
      { role: 'event', speaker: 'Cache · memory pressure', text: 'Remove A’s older checkpoint. Its chunks remain needed by the newer checkpoint.', boundary: 'Evict A@8192 · shared rows remain referenced' },
      { role: 'user', speaker: 'You · back in conversation A', text: 'Continue the earlier analysis from where we left off.', boundary: 'A returns · 12,800-token prompt' },
    ],
  },
  restart: {
    setup: 'Disk caching is enabled. The newest response can finish before its checkpoint is durable.',
    points: [
      { role: 'assistant', speaker: 'Gufo · conversation A', text: 'The latest turn is complete. The disk writer is still catching up.', boundary: '12,288 in RAM · only 8,192 durable on disk' },
      { role: 'event', speaker: 'Disk writer · publication complete', text: 'The checkpoint and all its dependencies are durable. It can now survive a process restart.', boundary: '12,288 becomes durable' },
      { role: 'user', speaker: 'You · after restart', text: 'Continue the conversation using the same history.', boundary: 'Restore durable state · 12,800-token prompt' },
      { role: 'event', speaker: 'Alternative · crash before publication', text: 'Rewind to the first point: what if the server died while the newest write was unfinished?', boundary: 'Alternative crash path · only 8,192 survives' },
    ],
  },
  provenance: {
    setup: 'Two clients submit identical tokens independently. A later client actually restores one of their checkpoints.',
    points: [
      { role: 'user', speaker: 'Clients A and B', text: 'Review the same source tree using the same instructions.', boundary: 'Two independent cold prompts · 6,144 tokens each' },
      { role: 'event', speaker: 'Cache · preserve both computations', text: 'The tokens match, but independent prefill shapes can produce different bytes. Keep A’s state and B’s state separate.', boundary: 'Two provenances · six full chunks in the hybrid' },
      { role: 'user', speaker: 'Client C · extends A', text: 'Continue A’s review and investigate the next module.', boundary: 'Restore A’s 6,144 tokens · new prompt 8,192' },
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
      { title: 'Ask for a source inspection', explanation: 'A’s 5,376-token live frontier is an exact prefix of this 5,888-token request. The next user message adds 512 tokens.', prompt: 5888, common: 5376,
        ...withState(view(5376, 'Live session · no restore', 'Only the new user message needs prefill.', [a4, cp('A@5120', 5120)], slots('Conversation A', 5376))) },
      { title: 'A tool call is generated history too', explanation: 'Save the prompt at 5,888, then generate 256 tokens containing the assistant’s tool call. The live state reaches 6,144.', prompt: 5888, common: 5376,
        ...withState(view(5376, 'Live session · no restore', 'Exact replay includes tool calls as well as ordinary assistant text.', [a4, cp('A@5120', 5120), cp('A@5888', 5888)], slots('Conversation A', 6144))) },
      { title: 'Append a large tool result', explanation: 'The file-reading result adds 1,536 tokens. Gufo can reuse the 6,144 tokens already executed and prefill just the appended result.', prompt: 7680, common: 6144,
        ...withState(view(6144, 'Live session · no restore', 'Tool output is new input. The preceding tool call is already in the live frontier.', [a4, cp('A@5120', 5120), cp('A@5888', 5888)], slots('Conversation A', 6144))) },
      { title: 'Explain the captured state', explanation: 'Capture the 7,680-token prompt, then generate 512 tokens. Multiple checkpoints now remember this same computation history.', prompt: 7680, common: 6144,
        ...withState(view(6144, 'Live session · no restore', 'Full chunks share provenance; each checkpoint keeps its own partial tail and fixed state.', [a4, cp('A@5120', 5120), cp('A@5888', 5888), cp('A@7680', 7680)], slots('Conversation A', 8192))) },
      { title: 'Start another investigation', explanation: 'The next user message extends the 8,192-token live frontier by 512 tokens. The older checkpoint depth does not limit this live hit.', prompt: 8704, common: 8192,
        ...withState(view(8192, 'Live session · no restore', 'The retained prompt boundary is 7,680; the live frontier also includes the assistant’s response.', [a4, cp('A@5120', 5120), cp('A@5888', 5888), cp('A@7680', 7680)], slots('Conversation A', 8192))) },
      { title: 'Issue the second tool call', explanation: 'Checkpoint the 8,704-token prompt. The next generated tool call extends the live session to 9,216.', prompt: 8704, common: 8192,
        ...withState(view(8192, 'Live session · no restore', 'Growing history increases retained bytes even when execution continues without a restore.', [a4, cp('A@5120', 5120), cp('A@5888', 5888), cp('A@7680', 7680), cp('A@8704', 8704)], slots('Conversation A', 9216))) },
      { title: 'The disk-writer source returns', explanation: 'Another 1,024-token tool result extends the live history. This request reaches 10,240 tokens, with just 1,024 requiring prefill.', prompt: 10240, common: 9216,
        ...withState(view(9216, 'Live session · no restore', 'A long conversation can alternate user turns and tool results while continuing in the same slot.', [a4, cp('A@5120', 5120), cp('A@5888', 5888), cp('A@7680', 7680), cp('A@8704', 8704)], slots('Conversation A', 9216))) },
      { title: 'Keep another exact boundary', explanation: 'Retain the prompt at 10,240, then generate 512 tokens. Older restore points remain in this illustrative checkpoint set.', prompt: 10240, common: 9216,
        ...withState(view(9216, 'Live session · no restore', 'These checkpoints share complete chunks from this uninterrupted history; fixed state and partial tails remain private.', [a4, cp('A@5120', 5120), cp('A@5888', 5888), cp('A@7680', 7680), cp('A@8704', 8704), cp('A@10240', 10240)], slots('Conversation A', 10752))) },
      { title: 'Ask for the final explanation', explanation: 'A’s 10,752 executed tokens match the new prompt exactly. Only the final 512-token user message needs prefill.', prompt: 11264, common: 10752,
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
    lesson: 'Matching tokens alone are insufficient for hybrid models. Recurrent state must exist at the exact restore position. Denser checkpoints reduce the gap, subject to memory and record limits.',
    steps: [
      { title: 'Keep a few restore points', explanation: 'A is at 8,192 tokens. This example retains exact checkpoints at 4,096, 6,144 and 8,192, sharing full chunks from the same computation.', prompt: 8192, common: 8192,
        state: view(8192, 'Live session', 'An extra boundary costs fixed state, while full chunks are shared.', [a4, a6, a8], slots('Conversation A', 8192)) },
      { title: 'An edit changes token 7,001', explanation: 'The new prompt shares 7,000 tokens with A. Its 8,192-token frontier is no longer a prefix, so the recurrent state cannot simply be truncated to 7,000.', prompt: 8192, common: 7000,
        state: view(6144, 'RAM checkpoint @ 6,144', '6,144 reused; 2,048 prefilled. The extra checkpoint makes the difference.', [a4, a6, a8], slots('Conversation A · old branch', 8192)) },
      { title: 'The edited tail has new provenance', explanation: 'Restore the chosen boundary and compute the edited branch. The new branch shares only the rows it actually restored, including rows before the edit that it otherwise recomputes.', prompt: 8192, common: 7000,
        state: view(6144, 'Branch from 6,144', 'The first three chunks descend from A; the fourth was computed on the new branch.', [a4, a6, cp('Edit@8192', 8192, 'E', { shared: 6144, borrowed: false })], slots('Edited conversation', 8192)) },
    ],
  },
  {
    id: 'fork', name: 'Start a subagent', caption: 'Learn the divergence boundary',
    lesson: 'A learned checkpoint saves recurrent state where histories actually diverge. Later requests restore that state and inherit its KV provenance. Independent cold computations are not automatically merged.',
    steps: [
      { title: 'A parent has a long history', explanation: 'The parent has 10,000 tokens. A subagent shares the first 6,000, then follows its own task. Only the 4,096 checkpoint is usable below the divergence.', prompt: 8192, common: 6000,
        ...withState(view(4096, 'RAM checkpoint @ 4,096', 'Restore 4,096, then compute the shared gap and the new task.', [a4, cp('Parent@10000', 10000)], slots('Parent', 10000))) },
      { title: 'Capture the actual shared boundary', explanation: 'The subagent stops prefill at 6,000 and captures its recurrent state. Its first 4,096 KV rows came from A; the remaining 1,904 were recomputed.', prompt: 8192, common: 6000,
        ...withState(view(4096, 'Learning @ 6,000', 'A partial chunk holds the tail; its bytes belong to the subagent computation.', [a4, cp('Parent@10000', 10000), cp('Shared@6000', 6000, 'S', { shared: 4096 })], [{ name: 'Parent', position: 10000 }, { name: 'Subagent S', position: 6000 }])) },
      { title: 'The next subagent restores 6,000', explanation: 'A later subagent finds an exact checkpoint at the shared boundary. It restores all 6,000 tokens and prefills only its own 2,192-token task.', prompt: 8192, common: 6000,
        ...withState(view(6000, 'RAM checkpoint @ 6,000', 'The learned boundary improves reuse; checkpoints retain shared KV with its proven computation lineage.', [a4, cp('Parent@10000', 10000), cp('Shared@6000', 6000, 'S', { shared: 4096, borrowed: false })], [{ name: 'Parent', position: 10000 }, { name: 'Subagent T', position: 6000 }])) },
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
      { title: 'What if the restart had been abrupt earlier?', explanation: 'If the process died before the queued write became durable, only A@8192 would survive. The remaining 4,608 prompt tokens must be prefilled in that history.', prompt: 12800, common: 8192,
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
