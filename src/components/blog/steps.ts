// Shared helpers for blog figures that step through a short scenario.
//
// Every frame is rendered on the server. Each element that belongs to only some
// frames gets a `data-show` range ("2", "2-3" or "3-"); StepControls toggles
// `data-off` on it as the reader steps. Without JavaScript the server marks the
// elements outside the last frame as off, so the figure shows its final state.

const inRange = (range: string, step: number) => {
  const [from, to] = range.split('-');
  const lo = Number(from);
  const hi = to === undefined ? lo : to === '' ? Infinity : Number(to);
  return step >= lo && hi >= step;
};

/** Returns a function that turns a frame range into the attributes for an element. */
export const frames = (count: number) => (range: string) => ({
  'data-show': range,
  'data-off': inRange(range, count) ? undefined : '',
});
