import { LlmService } from './llm.service';

const svc = (env: Record<string, string>) =>
  new LlmService({ get: (k: string) => env[k] } as any);

describe('LLM 공급자 선택', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('기본은 Anthropic, 키가 없으면 준비 안 된 상태', () => {
    const s = svc({});
    expect(s.provider).toBe('anthropic');
    expect(s.isConfigured()).toBe(false);
  });

  it('LLM_PROVIDER=openai 면 OPENAI_API_KEY 로 OpenAI 를 부르고 응답을 같은 모양으로 돌려준다', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-4.1-mini-2025',
        choices: [{ message: { content: ' 요약이에요 ' } }],
        usage: { prompt_tokens: 300, completion_tokens: 50 },
      }),
    });
    global.fetch = fetchMock as any;
    const s = svc({ LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'test-key' });
    expect(s.isConfigured()).toBe(true);
    await expect(s.complete('sys', 'user')).resolves.toEqual({
      text: '요약이에요', model: 'gpt-4.1-mini-2025', inputTokens: 300, outputTokens: 50,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers.authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body).messages[0]).toEqual({ role: 'system', content: 'sys' });
  });

  it('공급자마다 기본 단가로 비용을 추정한다', () => {
    expect(svc({ LLM_PROVIDER: 'openai' }).estimateCostUsd(1_000_000, 0)).toBeCloseTo(0.4);
    expect(svc({}).estimateCostUsd(0, 1_000_000)).toBeCloseTo(5);
  });

  it('실패하면 상태 코드를 담아 던진다', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid key' }) as any;
    await expect(svc({ ANTHROPIC_API_KEY: 'x' }).complete('s', 'u')).rejects.toThrow('Anthropic 401 invalid key');
  });
});
