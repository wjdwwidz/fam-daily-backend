import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { MembershipsService } from './memberships.service';

// :id(그룹) 라우트 진입 시 "요청자가 그 그룹의 멤버인가"를 한 번에 검사.
// 통과한 요청만 핸들러로 들어오므로, 개별 기능 서비스는 멤버 검사를 반복하지 않아도 됨.
// (JwtAuthGuard 다음에 실행되어 req.user 가 채워져 있음을 전제)
@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(private readonly memberships: MembershipsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string = req.user.id;
    const groupId: string = req.params.id;

    // 멤버가 아니면 ForbiddenException 을 던져 진입 차단
    await this.memberships.assertMember(userId, groupId);
    return true;
  }
}
