import { FixedWindowCounter } from './fixed-window.js';

describe('FixedWindowCounter', () => {
  it('allows the limit, then refuses until the window ends', () => {
    const counter = new FixedWindowCounter();
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(counter.hit('k', 3, 60_000, t0 + i).allowed).toBe(true);
    }
    expect(counter.hit('k', 3, 60_000, t0 + 10)).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(counter.hit('k', 3, 60_000, t0 + 59_500).retryAfterSeconds).toBe(1);
    // A new window starts once the old one has ended.
    expect(counter.hit('k', 3, 60_000, t0 + 60_000).allowed).toBe(true);
  });

  it('counts keys separately', () => {
    const counter = new FixedWindowCounter();
    expect(counter.hit('a', 1, 60_000, 0).allowed).toBe(true);
    expect(counter.hit('a', 1, 60_000, 1).allowed).toBe(false);
    expect(counter.hit('b', 1, 60_000, 1).allowed).toBe(true);
  });

  it('sweeps ended windows so memory stays bounded', () => {
    const counter = new FixedWindowCounter();
    for (let i = 0; i < 1000; i++) counter.hit(`old-${i}`, 5, 1000, 0);
    expect(counter.size).toBe(1000);
    counter.hit('new', 5, 1000, 5000);
    expect(counter.size).toBe(1);
  });
});
