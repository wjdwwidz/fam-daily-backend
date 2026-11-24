import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// LLM 공급자는 LLM_PROVIDER 로 고른다 (기본 anthropic). 요약 쪽 코드는 어느 쪽인지 모른다.
export type LlmProvider = 'anthropic' | 'openai';

// 작고 싼 모델로 충분하다 (한 가족 한 달 요약). 바꾸려면 ANTHROPIC_MODEL / OPENAI_MODEL.
const PROVIDERS: Record<
  LlmProvider,
  { keyEnv: string; modelEnv: string; defaultModel: string; usdPerMTok: [number, number] }
> = {
  anthropic: {
    keyEnv: 'ANTHROPIC_API_KEY',
    modelEnv: 'ANTHROPIC_MODEL',
    defaultModel: 'claude-haiku-4-5',
    usdPerMTok: [1, 5],
  },
  openai: {
    keyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4.1-mini',
    usdPerMTok: [0.4, 1.6],
  },
};
const TIMEOUT_MS = 30_000;

export type LlmResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

// LLM API 를 직접 부른다 (SDK 없이 fetch 한 번).
// 키는 서버에만 둔다 — 앱에 넣으면 누구나 꺼내 쓸 수 있다.
@Injectable()
export class LlmService {
  constructor(private readonly config: ConfigService) {}

  get provider(): LlmProvider {
    return this.config.get<string>('LLM_PROVIDER') === 'openai' ? 'openai' : 'anthropic';
  }

  get model(): string {
    const p = PROVIDERS[this.provider];
    return this.config.get<string>(p.modelEnv) || p.defaultModel;
  }

  private get key(): string | undefined {
    return this.config.get<string>(PROVIDERS[this.provider].keyEnv) || undefined;
  }

  isConfigured(): boolean {
    return !!this.key;
  }

  // 토큰 수로 추정한 비용(달러). 단가(100만 토큰당 달러)는 공급자 기본값이고,
  // LLM_INPUT_USD_PER_MTOK / LLM_OUTPUT_USD_PER_MTOK 로 덮어쓴다 (모델을 바꾸면 그 가격으로)
  estimateCostUsd(inputTokens: number, outputTokens: number): number {
    const [inDefault, outDefault] = PROVIDERS[this.provider].usdPerMTok;
    const inPrice = Number(this.config.get<string>('LLM_INPUT_USD_PER_MTOK')) || inDefault;
    const outPrice = Number(this.config.get<string>('LLM_OUTPUT_USD_PER_MTOK')) || outDefault;
    return (inputTokens * inPrice + outputTokens * outPrice) / 1_000_000;
  }

  async complete(system: string, user: string, maxTokens = 400): Promise<LlmResult> {
    const key = this.key;
    if (!key) throw new Error(`${PROVIDERS[this.provider].keyEnv} 가 설정되지 않았다`);
    return this.provider === 'openai'
      ? this.openai(key, system, user, maxTokens)
      : this.anthropic(key, system, user, maxTokens);
  }

  private async anthropic(key: string, system: string, user: string, maxTokens: number): Promise<LlmResult> {
    const data = await post<{
      model?: string;
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    }>('Anthropic', 'https://api.anthropic.com/v1/messages', {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    }, {
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    });
    return {
      text: (data.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('')
        .trim(),
      model: data.model ?? this.model,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    };
  }

  private async openai(key: string, system: string, user: string, maxTokens: number): Promise<LlmResult> {
    const data = await post<{
      model?: string;
      choices?: { message?: { content?: string | null } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    }>('OpenAI', 'https://api.openai.com/v1/chat/completions', {
      authorization: `Bearer ${key}`,
    }, {
      model: this.model,
      max_completion_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    return {
      text: (data.choices?.[0]?.message?.content ?? '').trim(),
      model: data.model ?? this.model,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }
}

async function post<T>(name: string, url: string, headers: Record<string, string>, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    // 응답 본문에는 키가 들어 있지 않다. 원인 파악용으로 앞부분만 남긴다
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`${name} ${res.status} ${detail}`);
  }
  return (await res.json()) as T;
}
