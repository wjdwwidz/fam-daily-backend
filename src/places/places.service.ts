import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

// 구글 장소 검색 (Places API (New) · Text Search).
//
// 앱이 구글을 직접 부르지 않고 이 서버를 거친다. 키를 앱에 넣으면 번들에서 꺼내
// 남이 쓸 수 있고, 그 요금은 우리에게 나온다. 서버에 두면 로그인한 가족만 쓴다.
//
// 해외도 찾을 수 있게 지역을 한국으로 묶지 않는다. 이름·주소는 한국어로 받는다
// (한국어 이름이 없는 곳은 현지 이름이 온다).
const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
// 필요한 칸만 받는다 — 받는 칸에 따라 요금 등급이 달라진다
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location';
const MAX_RESULTS = 8;
// 하루 검색 한도. 150 × 31일 = 4,650회 — 구글 무료 한도(월 5,000회)를 넘지 않는다.
// 구글 콘솔에서 하루 할당량을 걸 수 없어 서버에서 막는다. PLACES_DAILY_LIMIT 로 바꿀 수 있다.
const DEFAULT_DAILY_LIMIT = 150;

export type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

type SearchTextResponse = {
  places?: {
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  }[];
};

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // 오늘(한국 시간) 횟수에 1 을 더하고, 더한 뒤의 값을 돌려준다.
  // 한 문장으로 더하고 읽어서, 가족이 동시에 검색해도 한 번씩 정확히 센다.
  private async countToday(): Promise<number> {
    const rows: { count: number }[] = await this.dataSource.query(
      `INSERT INTO "places_usage" ("day", "count")
       VALUES ((now() AT TIME ZONE 'Asia/Seoul')::date, 1)
       ON CONFLICT ("day") DO UPDATE SET "count" = "places_usage"."count" + 1
       RETURNING "count"`,
    );
    return Number(rows[0]?.count ?? 0);
  }

  async search(query: string): Promise<PlaceResult[]> {
    const q = (query || '').trim().slice(0, 100);
    if (!q) return [];
    const key = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (!key) {
      throw new ServiceUnavailableException(
        '장소 검색이 아직 준비되지 않았어요.',
      );
    }
    // 구글을 부르기 전에 센다 — 한도를 넘으면 부르지 않으니 요금도 없다
    const limit =
      Number(this.config.get<string>('PLACES_DAILY_LIMIT')) ||
      DEFAULT_DAILY_LIMIT;
    const used = await this.countToday();
    if (used > limit) {
      if (used === limit + 1) {
        this.logger.warn(`[places] 오늘 검색 한도(${limit}회)를 다 썼다`);
      }
      throw new HttpException(
        '오늘은 장소 검색을 다 썼어요. 내일 다시 찾아주세요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const res = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: q,
        languageCode: 'ko',
        pageSize: MAX_RESULTS,
      }),
    });
    if (!res.ok) {
      // 키 제한·결제 미등록 등. 자세한 이유는 로그로만 (응답에 키 관련 내용을 흘리지 않는다)
      this.logger.warn(`[places] 검색 실패 ${res.status} ${await res.text()}`);
      throw new BadGatewayException(
        '장소를 찾지 못했어요. 잠시 후 다시 시도해주세요.',
      );
    }
    const data = (await res.json()) as SearchTextResponse;
    return (data.places ?? []).map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
    }));
  }
}
