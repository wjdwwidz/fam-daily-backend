import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { PendingUpload } from '../entities/pending-upload.entity';
import { StorageService } from '../uploads/storage.service';

// 커밋되지 않고 남은 업로드 자리를 청소한다.
//
// 왜 필요한가: 클라이언트가 스토리지에 파일을 올린 뒤 커밋을 하지 않으면
// (앱 종료·네트워크 끊김·그냥 뒤로가기) 서버에서는 아무 일도 일어나지 않는다.
// 에러가 난 게 아니라 요청이 안 온 것이라, 보상 삭제가 실행될 계기가 없다.
// 서버가 "안 오는 중"과 "영영 안 옴"을 구분할 수 있는 단서는 시간뿐이다.
//
// 여유(GRACE_MS)를 길게 잡는 이유: 느린 회선에서 큰 영상을 올리는 중일 수 있다.
// 진행 중인 업로드의 파일을 지워버리면 커밋이 '파일 없음'으로 실패한다.
const GRACE_MS = 6 * 60 * 60 * 1000; // 6시간
const BATCH = 200;

@Injectable()
export class SweepService {
  private readonly logger = new Logger(SweepService.name);

  constructor(
    @InjectRepository(PendingUpload)
    private readonly pending: Repository<PendingUpload>,
    private readonly storage: StorageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async scheduled() {
    await this.sweep();
  }

  async sweep(): Promise<{ removed: number }> {
    const cutoff = new Date(Date.now() - GRACE_MS);
    const abandoned = await this.pending.find({
      where: { createdAt: LessThan(cutoff) },
      order: { createdAt: 'ASC' },
      take: BATCH,
    });
    if (!abandoned.length) return { removed: 0 };

    let removed = 0;
    for (const row of abandoned) {
      // 파일부터 지우고 기록을 지운다. 이 순서라면 중간에 죽어도
      // 기록이 남아 다음 스윕에서 다시 시도한다(반대면 파일이 미아가 된다).
      await this.storage.removeByPath(row.path);
      await this.pending.remove(row);
      removed += 1;
    }
    this.logger.log(`버려진 업로드 ${removed}건 정리 (기준: ${cutoff.toISOString()})`);
    return { removed };
  }
}
