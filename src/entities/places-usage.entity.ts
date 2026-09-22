import { Column, Entity, PrimaryColumn } from 'typeorm';

// 구글 장소 검색을 하루에 몇 번 불렀는지. 하루 한도를 넘으면 구글을 부르지 않는다.
// 구글 콘솔의 하루 할당량을 걸 수 없어서 서버에서 센다 — 서버 메모리에 두면 배포할 때마다
// 0 으로 돌아가므로 DB 에 둔다. 날짜는 한국 시간 기준.
@Entity()
export class PlacesUsage {
  @PrimaryColumn({ type: 'date' })
  day: string;

  @Column({ type: 'int', default: 0 })
  count: number;
}
