import {
  EMPTY_TEXT,
  SummaryService,
  SYSTEM_PROMPT,
  buildPrompt,
  fingerprintOf,
  pickForPrompt,
  withRest,
  monthOf,
  monthRange,
  previousMonth,
} from './summary.service';

const item = (over: Partial<any> = {}) => ({
  type: 'post',
  id: 'p1',
  targetId: 'p1',
  text: '주말에 같이 김밥 쌌어요',
  coverUrl: null,
  createdAt: new Date('2026-11-03T03:00:00Z'),
  author: { userId: 'u1', nickname: '엄마', name: '', photoUrl: null },
  ...over,
});

function setup(opts: { items?: any[]; existing?: any; generatedToday?: number; llm?: any; configured?: boolean; env?: Record<string, string> } = {}) {
  const summaries = {
    findOne: jest.fn().mockResolvedValue(opts.existing ?? null),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
    insert: jest.fn(),
  };
  const usage = { insert: jest.fn(), count: jest.fn().mockResolvedValue(opts.generatedToday ?? 0) };
  const groups = { find: jest.fn().mockResolvedValue([{ id: 'g1' }]) };
  const memberships = { findOne: jest.fn().mockResolvedValue({ id: 'm1' }) };
  const activity = { between: jest.fn().mockResolvedValue(opts.items ?? [item()]) };
  const llm = {
    model: 'claude-haiku-4-5',
    isConfigured: jest.fn().mockReturnValue(opts.configured ?? true),
    estimateCostUsd: jest.fn().mockReturnValue(0.0012),
    complete:
      opts.llm ??
      jest.fn().mockResolvedValue({ text: '이번 달엔 김밥을 쌌어요.', model: 'claude-haiku-4-5', inputTokens: 500, outputTokens: 80 }),
  };
  const config = { get: jest.fn((k: string) => opts.env?.[k]) };
  const svc = new SummaryService(
    summaries as any, usage as any, groups as any, memberships as any,
    activity as any, llm as any, config as any,
  );
  return { svc, summaries, usage, llm, activity };
}

describe('한국 시간 달 계산', () => {
  it('UTC 로는 11월 30일이어도 한국 시간이 12월 1일이면 12월', () => {
    expect(monthOf(new Date('2026-11-30T15:30:00Z'))).toBe('2026-12');
  });
  it('1월의 지난달은 작년 12월', () => {
    expect(previousMonth('2027-01')).toBe('2026-12');
  });
  it('달의 범위는 한국 시간 1일 0시부터 다음 달 1일 0시 전까지', () => {
    const { from, to } = monthRange('2026-12');
    expect(from.toISOString()).toBe('2026-11-30T15:00:00.000Z');
    expect(to.toISOString()).toBe('2026-12-31T15:00:00.000Z');
  });
});

describe('LLM 에 보내는 내용', () => {
  it('링크 주소는 빼고, 호칭·종류·날짜와 글만 보낸다', () => {
    const prompt = buildPrompt(
      '2026-11',
      [item({ text: '여기 가보자 https://naver.me/abc123 맛있대' }) as any],
      monthRange('2026-11').to,
      new Date('2026-11-24T00:00:00Z'),
    );
    expect(prompt).not.toContain('https://');
    expect(prompt).toContain('[11/03 엄마 · 게시판 글] 여기 가보자 맛있대');
    expect(prompt).toContain('11월 1일 ~ 11월 24일');
    expect(prompt).toMatch(/<records>[\s\S]*<\/records>/);
  });
});

describe('요약 만들기', () => {
  it('기록이 어제와 그대로면 LLM 을 부르지 않고 건너뛴다', async () => {
    const items = [item()];
    const { svc, llm, usage } = setup({ items, existing: { id: 's1', fingerprint: fingerprintOf(items as any) } });
    await expect(svc.refresh('g1', '2026-11')).resolves.toMatchObject({ status: 'skipped' });
    expect(llm.complete).not.toHaveBeenCalled();
    expect(usage.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'skipped' }));
  });

  it('글을 고치면 지문이 바뀌어 다시 만든다', () => {
    expect(fingerprintOf([item()] as any)).not.toBe(fingerprintOf([item({ text: '고친 글' })] as any));
  });

  it('이번 달 활동이 없으면 LLM 없이 정해진 문구를 둔다', async () => {
    const { svc, llm, summaries } = setup({ items: [] });
    await expect(svc.refresh('g1', '2026-11')).resolves.toMatchObject({ status: 'empty' });
    expect(llm.complete).not.toHaveBeenCalled();
    expect(summaries.insert).toHaveBeenCalledWith(expect.objectContaining({ text: EMPTY_TEXT, activityCount: 0 }));
  });

  it('새로 만들면 요약을 저장하고 토큰·비용을 기록한다', async () => {
    const { svc, summaries, usage } = setup();
    await expect(svc.refresh('g1', '2026-11')).resolves.toMatchObject({ status: 'generated' });
    expect(summaries.insert).toHaveBeenCalledWith(
      expect.objectContaining({ text: '이번 달엔 김밥을 쌌어요.', activityCount: 1 }),
    );
    expect(usage.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'generated', inputTokens: 500, outputTokens: 80, costUsd: '0.001200' }),
    );
  });

  it('LLM 이 실패하면 이전 요약을 건드리지 않고 실패를 기록한다', async () => {
    const { svc, summaries, usage } = setup({
      existing: { id: 's1', fingerprint: 'old' },
      llm: jest.fn().mockRejectedValue(new Error('Anthropic 529 overloaded')),
    });
    await expect(svc.refresh('g1', '2026-11')).resolves.toMatchObject({ status: 'failed' });
    expect(summaries.update).not.toHaveBeenCalled();
    expect(summaries.insert).not.toHaveBeenCalled();
    expect(usage.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error: 'Anthropic 529 overloaded' }),
    );
  });

  it('오늘 한도를 다 쓰면 LLM 을 부르지 않는다', async () => {
    const { svc, llm } = setup({ generatedToday: 50 });
    await expect(svc.refresh('g1', '2026-11')).resolves.toMatchObject({ status: 'limited' });
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('API 키가 없으면 아무것도 저장하지 않는다', async () => {
    const { svc, llm, summaries } = setup({ configured: false });
    await expect(svc.refresh('g1', '2026-11')).resolves.toMatchObject({ status: 'disabled' });
    expect(llm.complete).not.toHaveBeenCalled();
    expect(summaries.insert).not.toHaveBeenCalled();
  });
});

describe('홈에서 읽기', () => {
  it('진행 중인 이번 달이 아니라 지난달 요약을 돌아보기로 보여준다', async () => {
    const { svc, summaries } = setup();
    summaries.findOne.mockResolvedValueOnce({ month: '2026-11', text: '11월 요약', activityCount: 12, updatedAt: new Date() });
    const res = await svc.get('u1', 'g1', new Date('2026-12-15T01:00:00Z'));
    expect(summaries.findOne).toHaveBeenCalledWith({ where: { groupId: 'g1', month: '2026-11' } });
    expect(res.summary).toMatchObject({ month: '2026-11', isPreviousMonth: true });
  });

  it('새벽 배치는 지난달만 만든다', async () => {
    const { svc, activity } = setup();
    const res = await svc.refreshAll(new Date('2026-12-15T01:00:00Z'));
    expect(res.map((r) => r.month)).toEqual(['2026-11']);
    expect(activity.between).toHaveBeenCalledTimes(1);
  });
});

describe('미리보기', () => {
  it('저장하지 않고 보낸 내용과 요약을 돌려주며, 비용은 기록한다', async () => {
    const { svc, summaries, usage } = setup();
    const res: any = await svc.preview('g1', '2026-11');
    expect(res).toMatchObject({ text: '이번 달엔 김밥을 쌌어요.', activityCount: 1, saved: false });
    expect(res.prompt).toContain('<records>');
    expect(summaries.insert).not.toHaveBeenCalled();
    expect(summaries.update).not.toHaveBeenCalled();
    expect(usage.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'preview' }));
  });
});

describe('기록이 많을 때 고르기', () => {
  const at = (d: number) => new Date(Date.UTC(2026, 10, d, 3));
  const many = [
    ...Array.from({ length: 4 }, (_, i) => item({ type: 'comment', id: `c${i}`, createdAt: at(1 + i) })),
    ...Array.from({ length: 3 }, (_, i) => item({ type: 'mood', id: `m${i}`, createdAt: at(5 + i) })),
    ...Array.from({ length: 3 }, (_, i) => item({ type: 'word', id: `w${i}`, createdAt: at(8 + i) })),
    ...Array.from({ length: 3 }, (_, i) => item({ type: 'post', id: `p${i}`, createdAt: at(11 + i) })),
    ...Array.from({ length: 3 }, (_, i) => item({ type: 'media', id: `d${i}`, createdAt: at(14 + i) })),
  ] as any[];

  it('사진 → 게시판 → 사전 → 한마디 순으로 10개를 고르고, 나머지 수를 센다', () => {
    const { picked, restCount } = pickForPrompt(many, 10);
    expect(picked.map((p) => p.type)).toEqual([
      'media', 'media', 'media', 'post', 'post', 'post', 'word', 'word', 'word', 'mood',
    ]);
    expect(restCount).toBe(6);
  });

  it('한 종류가 자리를 넘치면 그 종류의 최신 것부터 고른다', () => {
    const { picked } = pickForPrompt(many, 2);
    expect(picked.map((p) => p.id)).toEqual(['d1', 'd2']);
  });

  it('담지 못한 기록은 끝에 "그 외 n건" 으로 붙이고, 없으면 그대로 둔다', () => {
    expect(withRest('요약이에요.', 6)).toBe('요약이에요. 그 외 6건의 새로운 소식이 있었어요!');
    expect(withRest('요약이에요.', 0)).toBe('요약이에요.');
  });

  it('저장되는 요약에도 남은 수가 붙고, LLM 에는 고른 것만 보낸다', async () => {
    const { svc, summaries, llm } = setup({ items: many });
    await svc.refresh('g1', '2026-11');
    expect(summaries.insert).toHaveBeenCalledWith(
      expect.objectContaining({ text: '이번 달엔 김밥을 쌌어요. 그 외 6건의 새로운 소식이 있었어요!', activityCount: 16 }),
    );
    const prompt = (llm.complete as jest.Mock).mock.calls[0][1] as string;
    expect(prompt).toContain('활동 10건');
    expect(prompt).not.toContain('일상 댓글');
  });

  it('부정적인 뉘앙스를 피하라는 규칙이 들어 있다', () => {
    expect(SYSTEM_PROMPT).toContain('특별한 일은 없었지만');
    expect(SYSTEM_PROMPT).toContain('다른 달과의 비교는 쓰지 않는다');
  });
});

describe('지난 요약 모아보기', () => {
  it('활동이 있던 달만 최근 달부터 돌려준다', async () => {
    const { svc, summaries } = setup();
    summaries.find.mockResolvedValue([
      { month: '2026-11', text: '11월', activityCount: 3, updatedAt: new Date() },
      { month: '2026-10', text: '10월', activityCount: 5, updatedAt: new Date() },
    ]);
    const res = await svc.history('u1', 'g1', 12, new Date('2026-12-15T01:00:00Z'));
    expect(res.items.map((i) => i.month)).toEqual(['2026-11', '2026-10']);
    const where = summaries.find.mock.calls[0][0].where;
    expect(where.groupId).toBe('g1');
    expect(summaries.find.mock.calls[0][0].order).toEqual({ month: 'DESC' });
  });
});

describe('로컬에서 이번 달 요약 확인', () => {
  const now = new Date('2026-11-24T01:00:00Z');
  it('기본은 끝난 달만 (이번 달 제외)', async () => {
    const { svc, summaries } = setup();
    await svc.history('u1', 'g1', 12, now);
    const month = summaries.find.mock.calls[0][0].where.month;
    expect(month._type).toBe('lessThan');
    expect(month._value).toBe('2026-11');
  });
  it('SUMMARY_SHOW_CURRENT_MONTH=true 면 이번 달도 넣고, 진행 중 표시를 붙인다', async () => {
    const { svc, summaries } = setup({ env: { SUMMARY_SHOW_CURRENT_MONTH: 'true' } });
    summaries.find.mockResolvedValue([{ month: '2026-11', text: '11월', activityCount: 1, updatedAt: now }]);
    const res = await svc.history('u1', 'g1', 12, now);
    expect(summaries.find.mock.calls[0][0].where.month._type).toBe('lessThanOrEqual');
    expect(res.items[0]).toMatchObject({ month: '2026-11', inProgress: true });
  });
});
