import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private readonly config: ConfigService) {}

  async search(query: string): Promise<PlaceResult[]> {
    const q = (query || '').trim().slice(0, 100);
    if (!q) return [];
    const key = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (!key) {
      throw new ServiceUnavailableException(
        '장소 검색이 아직 준비되지 않았어요.',
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
