import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

// 앱이 카카오 SDK 로 직접 받은 액세스 토큰. 서버는 이 토큰으로 카카오에 사용자 정보를 물어
// 진짜인지 확인한 뒤 우리 JWT 를 내준다. (웹은 인가 코드 방식이라 이 DTO 를 쓰지 않는다)
export class KakaoAppLoginDto {
  @ApiProperty({ example: 'x1yZ...카카오_액세스_토큰' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  accessToken: string;
}
