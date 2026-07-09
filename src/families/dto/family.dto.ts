import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string; // 가족 공간 이름 (예: 서연이네 가족)

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  nickname: string; // 내 호칭 (예: 엄마)
}

export class JoinFamilyDto {
  @IsString()
  @MinLength(4)
  code: string; // 초대 코드

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  nickname: string; // 가족 내 호칭
}

export class CreateInviteDto {
  @IsOptional()
  @IsString()
  expiresInDays?: string;
}
