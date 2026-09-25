import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// 세는 방법 — 남은 날 / 지난 날수 / 주수
export const DDAY_MODES = ['dday', 'count', 'week'] as const;

// 'YYYY-MM-DD' — 시각 없는 날짜만 받는다 (시각이 붙으면 시간대에 따라 하루가 밀린다)
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const YMD_MSG = '날짜는 YYYY-MM-DD 형식이어야 합니다.';

export class CreateEventDto {
  @ApiProperty({ example: '할머니 생신' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: '2026-10-03' })
  @Matches(YMD, { message: YMD_MSG })
  startDate: string;

  @ApiPropertyOptional({
    example: '2026-10-05',
    description: '며칠 동안이면 끝나는 날',
  })
  @IsOptional()
  @Matches(YMD, { message: YMD_MSG })
  endDate?: string | null;

  @ApiPropertyOptional({
    example: '기념일',
    description: '일정 종류 (색 구분)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  category?: string | null;

  @ApiPropertyOptional({
    example: true,
    description: '해마다 같은 날 돌아오는 일정인지',
  })
  @IsOptional()
  @IsBoolean()
  repeatYearly?: boolean;

  @ApiPropertyOptional({ example: true, description: '홈에 D-day 로 띄울지' })
  @IsOptional()
  @IsBoolean()
  isDday?: boolean;

  @ApiPropertyOptional({
    enum: DDAY_MODES,
    example: 'dday',
    description: 'dday=남은 날, count=지난 날수, week=주수',
  })
  @IsOptional()
  @IsIn(DDAY_MODES)
  ddayMode?: string;
}

// 보낸 것만 바뀐다. endDate 를 null 로 보내면 '하루짜리' 가 된다.
export class UpdateEventDto {
  @ApiPropertyOptional({ example: '할머니 생신' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ example: '2026-10-03' })
  @IsOptional()
  @Matches(YMD, { message: YMD_MSG })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-05', nullable: true })
  @IsOptional()
  @Matches(YMD, { message: YMD_MSG })
  endDate?: string | null;

  @ApiPropertyOptional({ example: '기념일', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  category?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  repeatYearly?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDday?: boolean;

  @ApiPropertyOptional({ enum: DDAY_MODES, example: 'dday' })
  @IsOptional()
  @IsIn(DDAY_MODES)
  ddayMode?: string;
}
