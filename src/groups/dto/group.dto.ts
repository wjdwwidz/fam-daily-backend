import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: '서연이네 그룹', minLength: 1, maxLength: 40 })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string; // 그룹 공간 이름 (예: 서연이네 그룹)

  @ApiProperty({ example: '엄마', minLength: 1, maxLength: 20 })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  nickname: string; // 내 호칭 (예: 엄마)
}

export class JoinGroupDto {
  @ApiProperty({ example: 'A1B2C3', minLength: 4 })
  @IsString()
  @MinLength(4)
  code: string; // 초대 코드

  @ApiProperty({ example: '아빠', minLength: 1, maxLength: 20 })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  nickname: string; // 그룹 내 호칭
}

export class CreateInviteDto {
  @ApiPropertyOptional({ example: '7', description: '초대 코드 만료 일수' })
  @IsOptional()
  @IsString()
  expiresInDays?: string;
}
