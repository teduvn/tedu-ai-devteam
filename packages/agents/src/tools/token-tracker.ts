/**
 * Per-ticket, in-process token usage accumulator.
 *
 * Each concurrent agent worker uses a different ticketId so the Map is safe
 * for parallel runs within the same Node.js process.
 */

interface TokenCount {
  input: number;
  output: number;
}

const _store = new Map<string, TokenCount>();

export function addTokens(ticketId: string, input: number, output: number): void {
  const existing = _store.get(ticketId) ?? { input: 0, output: 0 };
  _store.set(ticketId, { input: existing.input + input, output: existing.output + output });
}

export function getTokens(ticketId: string): TokenCount {
  return _store.get(ticketId) ?? { input: 0, output: 0 };
}

export function clearTokens(ticketId: string): void {
  _store.delete(ticketId);
}
