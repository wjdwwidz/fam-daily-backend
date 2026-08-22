import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// 서버가 발급했지만 아직 글로 확정되지 않은 업로드 자리.
//
// 클라이언트가 스토리지에 직접 올리므로, 서버는 파일 바이트를 보지 못한다.
// 대신 "내가 어떤 경로를 내줬는지"를 여기 남긴다. 이 기록이 있어야
// 커밋되지 않은 채 남은 파일을 나중에 찾아 지울 수 있다(스윕).
//
// 글로 확정되는 순간 이 행은 Media 생성과 같은 트랜잭션에서 사라진다.
// 따라서 여기 남아 있다는 건 "아직 글이 안 됐다"와 정확히 같은 뜻이다.
@Entity()
export class PendingUpload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  path: string; // 버킷 내 경로

  @Column()
  groupId: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  contentType: string;

  // 클라이언트가 알려준 크기 (용량 제한 계산용). 신뢰할 수 없는 값이라 참고용.
  @Column({ type: 'bigint', default: 0 })
  size: string;

  // 오래된 것부터 훑는 쿼리가 주 용도
  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
