import { Clock, withMinDuration } from './min-duration.js';

/** A clock whose time only moves when work or sleep says so. */
function fakeClock() {
  let time = 0;
  const slept: number[] = [];
  const clock: Clock = {
    now: () => time,
    sleep: async (ms) => {
      slept.push(ms);
      time += ms;
    },
  };
  const takes =
    <T>(ms: number, result: () => T) =>
    async () => {
      time += ms;
      return result();
    };
  return { clock, slept, takes, elapsed: () => time };
}

describe('withMinDuration', () => {
  it('waits for the rest of the floor after fast work', async () => {
    const c = fakeClock();
    await expect(
      withMinDuration(
        c.takes(150, () => 'ok'),
        1000,
        { clock: c.clock },
      ),
    ).resolves.toBe('ok');
    expect(c.slept).toEqual([850]);
    expect(c.elapsed()).toBe(1000);
  });

  it('also holds back errors until the floor', async () => {
    const c = fakeClock();
    const failing = c.takes(100, () => {
      throw new Error('boom');
    });
    await expect(
      withMinDuration(failing, 1000, { clock: c.clock }),
    ).rejects.toThrow('boom');
    expect(c.elapsed()).toBe(1000);
  });

  it('does not wait after slow work, and reports the overrun', async () => {
    const c = fakeClock();
    const overruns: number[] = [];
    await withMinDuration(
      c.takes(1200, () => 'ok'),
      1000,
      {
        clock: c.clock,
        onOverrun: (ms) => overruns.push(ms),
      },
    );
    expect(c.slept).toEqual([]);
    expect(overruns).toEqual([1200]);
  });

  it('is a no-op with a floor of 0', async () => {
    const c = fakeClock();
    const overruns: number[] = [];
    await withMinDuration(
      c.takes(5, () => 'ok'),
      0,
      {
        clock: c.clock,
        onOverrun: (ms) => overruns.push(ms),
      },
    );
    expect(c.slept).toEqual([]);
    expect(overruns).toEqual([]);
  });
});
