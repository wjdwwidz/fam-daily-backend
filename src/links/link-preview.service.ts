import { Injectable, Logger } from '@nestjs/common';
import { lookup } from 'dns';
import { request as httpRequest, IncomingMessage } from 'http';
import { request as httpsRequest } from 'https';
import { isIP, LookupFunction } from 'net';
import { createBrotliDecompress, createGunzip, createInflate } from 'zlib';

// 글에 붙인 링크를 블로그처럼 카드(제목·요약·썸네일)로 보여주기 위한 미리보기.
//
// 앱이 직접 읽지 않고 서버가 읽는다. 웹 앱은 브라우저 보안(CORS) 때문에 남의 사이트를
// 읽을 수 없고, 앱마다 따로 만들면 결과가 달라진다.
//
// 서버가 '사용자가 준 주소'로 접속하는 일이라 조심한다.
//  - http/https 의 기본 포트만, 공인 IP 로만 접속한다 (서버 내부망·클라우드 메타데이터 차단).
//    IP 검사는 실제로 접속하는 순간(lookup)에 해서, 검사 뒤 DNS 가 바뀌어도 새지 않는다.
//  - 리다이렉트는 몇 번까지만, 매번 같은 검사를 다시 한다.
//  - 시간·크기에 한도를 둔다. 미리보기 정보는 <head> 안에 있어서 앞부분만 읽으면 된다.

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

// 한 글에서 카드로 만드는 링크 수
export const MAX_LINKS_PER_POST = 10;

const TIMEOUT_MS = 5000;
// 유튜브처럼 <head> 가 700KB 를 넘는 곳도 있다. 유튜브는 아래 oEmbed 로 따로 읽는다.
const MAX_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 4;
const USER_AGENT =
  'Mozilla/5.0 (compatible; FamDailyLinkPreview/1.0; +https://woorikkiri-jade.vercel.app)';

// 같은 링크를 작성 화면에서 한 번, 저장할 때 한 번 읽지 않도록 잠깐 기억해 둔다
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 300;

// 본문에서 링크 찾기. 문장 끝의 마침표·괄호 같은 것은 주소에서 뺀다.
const URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
const TRAILING_RE = /[.,!?;:)\]}>'"…。、]+$/;

export function extractUrls(text: string): string[] {
  const found = (text || '').match(URL_RE) || [];
  const urls: string[] = [];
  for (const raw of found) {
    const url = raw.replace(TRAILING_RE, '');
    if (!urls.includes(url) && isHttpUrl(url)) urls.push(url);
    if (urls.length >= MAX_LINKS_PER_POST) break;
  }
  return urls;
}

function isHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);
  private readonly cache = new Map<
    string,
    { at: number; value: LinkPreview }
  >();

  // 여러 개를 한 번에. 실패한 링크도 주소만 담긴 카드로 돌려준다 (본문 자리를 지킨다).
  async previewAll(
    urls: string[],
    known: LinkPreview[] = [],
  ): Promise<LinkPreview[]> {
    const byUrl = new Map(known.map((l) => [l.url, l]));
    return Promise.all(
      urls.map((url) => {
        const old = byUrl.get(url);
        // 글을 고칠 때 이미 읽어 둔 링크는 다시 읽지 않는다
        return old && old.title ? Promise.resolve(old) : this.preview(url);
      }),
    );
  }

  async preview(url: string): Promise<LinkPreview> {
    const hit = this.cache.get(url);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

    let value: LinkPreview;
    try {
      value = await this.fetchPreview(url);
    } catch (e) {
      this.logger.warn(
        `[link] ${hostOf(url)} 미리보기 실패: ${(e as Error).message}`,
      );
      value = emptyPreview(url);
    }
    this.remember(url, value);
    return value;
  }

  private remember(url: string, value: LinkPreview) {
    if (this.cache.size >= CACHE_MAX) {
      const [oldest] = this.cache.keys();
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(url, { at: Date.now(), value });
  }

  private async fetchPreview(url: string): Promise<LinkPreview> {
    if (isYoutube(url)) return fetchYoutube(url);
    const { body, finalUrl } = await fetchLimited(
      naverBlogMobile(url) ?? url,
      HTML_TYPE,
    );
    return parsePreview(body, url, finalUrl);
  }
}

function emptyPreview(url: string): LinkPreview {
  return {
    url,
    title: null,
    description: null,
    image: null,
    siteName: hostOf(url),
  };
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ── 사이트별 ─────────────────────────────────────────────────────────

// 유튜브 페이지는 1MB 가 넘고 제목이 뒤쪽에 있어, 유튜브가 공개한 oEmbed(JSON)로 읽는다.
const YOUTUBE_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
];

function isYoutube(url: string) {
  try {
    return YOUTUBE_HOSTS.includes(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

async function fetchYoutube(url: string): Promise<LinkPreview> {
  const api = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  const { body } = await fetchLimited(api, /application\/json/i);
  const j = JSON.parse(body) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
  };
  return {
    url,
    title: cut(j.title?.trim() || null, 120),
    description: cut(j.author_name?.trim() || null, 200), // 채널 이름
    image: absoluteHttp(j.thumbnail_url ?? null, api),
    siteName: 'YouTube',
  };
}

// 네이버 블로그 PC 주소는 본문을 iframe 으로 감싼 빈 틀이라 요약·썸네일이 없다.
// 같은 글의 모바일 주소에는 다 있으므로 그쪽을 읽는다 (카드의 주소는 원래 주소 그대로).
function naverBlogMobile(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.toLowerCase() !== 'blog.naver.com') return null;
    u.hostname = 'm.blog.naver.com';
    return u.toString();
  } catch {
    return null;
  }
}

// ── 안전하게 읽기 ─────────────────────────────────────────────────────

const HTML_TYPE = /text\/html|application\/xhtml/i;

async function fetchLimited(
  url: string,
  typeRe: RegExp,
): Promise<{ body: string; finalUrl: string }> {
  let current = url;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await get(current);
    const status = res.statusCode ?? 0;
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume();
      current = new URL(res.headers.location, current).toString();
      continue;
    }
    if (status < 200 || status >= 300) {
      res.resume();
      throw new Error(`HTTP ${status}`);
    }
    const type = String(res.headers['content-type'] || '');
    if (!typeRe.test(type)) {
      res.resume();
      throw new Error(`읽을 수 없는 형식 (${type || '종류 없음'})`);
    }
    const body = await readLimited(res);
    return { body: decode(body, type), finalUrl: current };
  }
  throw new Error('리다이렉트가 너무 많음');
}

function get(url: string): Promise<IncomingMessage> {
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return Promise.reject(new Error('http/https 만 허용'));
  }
  if (u.port && u.port !== '80' && u.port !== '443') {
    return Promise.reject(new Error('기본 포트만 허용'));
  }
  if (u.username || u.password) {
    return Promise.reject(new Error('계정이 담긴 주소는 허용하지 않음'));
  }
  // IP 로 적은 주소는 lookup 을 거치지 않고 바로 접속하므로 여기서 막는다
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && isPrivateIp(host)) {
    return Promise.reject(new Error('내부 주소는 허용하지 않음'));
  }
  const request = u.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = request(
      u,
      {
        method: 'GET',
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.6',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      },
      resolve,
    );
    req.on('timeout', () => req.destroy(new Error('시간 초과')));
    req.on('error', reject);
    req.end();
  });
}

// 접속할 IP 를 고르는 순간에 검사한다. 사설·예약 대역이면 접속하지 않는다.
const safeLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 0);
    const list = addresses;
    if (!list.length || list.some((a) => isPrivateIp(a.address))) {
      return callback(new Error('내부 주소는 허용하지 않음'), '', 0);
    }
    if (options.all) {
      return callback(null, list);
    }
    callback(null, list[0].address, list[0].family);
  });
};

export function isPrivateIp(ip: string): boolean {
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // 통신사 NAT
      (a === 169 && b === 254) || // 링크 로컬 · 클라우드 메타데이터
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // 멀티캐스트·예약
    );
  }
  const x = ip.toLowerCase();
  return (
    x === '::' ||
    x === '::1' ||
    x.startsWith('fc') ||
    x.startsWith('fd') || // 사설 (fc00::/7)
    /^fe[89ab]/.test(x) || // 링크 로컬 (fe80::/10)
    x.startsWith('ff') // 멀티캐스트
  );
}

// 앞부분만 읽는다. </head> 를 만나거나 한도에 닿으면 그만 받는다.
function readLimited(res: IncomingMessage): Promise<Buffer> {
  const enc = String(res.headers['content-encoding'] || '').toLowerCase();
  const stream =
    enc === 'gzip'
      ? res.pipe(createGunzip())
      : enc === 'deflate'
        ? res.pipe(createInflate())
        : enc === 'br'
          ? res.pipe(createBrotliDecompress())
          : res;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const done = () => {
      res.destroy();
      resolve(Buffer.concat(chunks));
    };
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size >= MAX_BYTES || chunk.toString('latin1').includes('</head>'))
        done();
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (e) => (size > 0 ? done() : reject(e)));
  });
}

// 한국 사이트는 아직 EUC-KR 인 곳이 있다. 헤더 → <meta charset> 순으로 찾는다.
function decode(body: Buffer, contentType: string): string {
  const head = body.subarray(0, 4096).toString('latin1');
  const charset =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ||
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ||
    'utf-8';
  try {
    return new TextDecoder(charset.toLowerCase()).decode(body);
  } catch {
    return new TextDecoder('utf-8').decode(body);
  }
}

// ── 읽은 HTML 에서 카드 정보 꺼내기 ──────────────────────────────────

function parsePreview(
  html: string,
  url: string,
  finalUrl: string,
): LinkPreview {
  const head = html.slice(0, MAX_BYTES);
  const metas = new Map<string, string>();
  for (const tag of head.match(/<meta\b[^>]*>/gi) || []) {
    const key = attr(tag, 'property') || attr(tag, 'name');
    const content = attr(tag, 'content');
    if (key && content && !metas.has(key.toLowerCase())) {
      metas.set(key.toLowerCase(), content);
    }
  }
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = metas.get(k);
      if (v && v.trim()) return clean(v);
    }
    return null;
  };

  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1];
  const image = pick(
    'og:image',
    'og:image:url',
    'twitter:image',
    'twitter:image:src',
  );
  return {
    url,
    title: cut(
      pick('og:title', 'twitter:title') || (titleTag ? clean(titleTag) : null),
      120,
    ),
    description: cut(
      pick('og:description', 'twitter:description', 'description'),
      200,
    ),
    image: absoluteHttp(image, finalUrl),
    siteName:
      cut(pick('og:site_name', 'application-name'), 40) || hostOf(finalUrl),
  };
}

function attr(tag: string, name: string): string | null {
  const m = new RegExp(
    `\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  ).exec(tag);
  return m ? (m[2] ?? m[3] ?? m[4] ?? null) : null;
}

function clean(s: string): string {
  return decodeEntities(s).replace(/\s+/g, ' ').trim();
}

function cut(s: string | null, max: number): string | null {
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// 썸네일은 http(s) 주소만 (상대 주소는 페이지 기준으로 푼다)
function absoluteHttp(src: string | null, base: string): string | null {
  if (!src) return null;
  try {
    const u = new URL(src, base);
    return u.protocol === 'http:' || u.protocol === 'https:'
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
};
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code =
        e[1] === 'x' || e[1] === 'X'
          ? parseInt(e.slice(2), 16)
          : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}
