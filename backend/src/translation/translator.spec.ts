import type { AppConfigService } from '../config/app-config.service.js';
import { batches, GoogleTranslator } from './translator.js';

const config = (key: string) =>
  ({ googleTranslateApiKey: key }) as AppConfigService;

describe('GoogleTranslator', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is disabled without an API key', () => {
    expect(new GoogleTranslator(config('')).enabled).toBe(false);
    expect(new GoogleTranslator(config('k')).enabled).toBe(true);
  });

  it('sends HTML fragments with the key in a header, not the URL', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: { translations: [{ translatedText: 'Xin chào' }] },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await new GoogleTranslator(config('secret-key')).translate(
      ['Hello'],
      'vi',
    );

    expect(result).toEqual(['Xin chào']);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).not.toContain('secret-key');
    expect(init.headers).toMatchObject({ 'X-Goog-Api-Key': 'secret-key' });
    expect(JSON.parse(String(init.body))).toEqual({
      q: ['Hello'],
      source: 'en',
      target: 'vi',
      format: 'html',
    });
  });

  it('throws on provider errors without leaking the key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('denied', { status: 403 })),
    );
    await expect(
      new GoogleTranslator(config('secret-key')).translate(['Hello'], 'vi'),
    ).rejects.toThrow(/^Translation provider answered HTTP 403$/);
  });

  it('throws when the answer does not match the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ data: { translations: [] } })),
    );
    await expect(
      new GoogleTranslator(config('k')).translate(['a', 'b'], 'vi'),
    ).rejects.toThrow('unexpected shape');
  });
});

describe('batches', () => {
  it('splits by segment count and size, keeping order', () => {
    const many = Array.from({ length: 250 }, (_, i) => `t${i}`);
    const result = batches(many);
    expect(result.map((b) => b.length)).toEqual([100, 100, 50]);
    expect(result.flat()).toEqual(many);

    const big = ['x'.repeat(3000), 'y'.repeat(3000), 'z'];
    expect(batches(big).map((b) => b.length)).toEqual([1, 2]);
  });

  it('sends an oversized fragment on its own', () => {
    expect(batches(['x'.repeat(9000)])).toHaveLength(1);
  });
});
