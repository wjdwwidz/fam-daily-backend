import { MigrationInterface, QueryRunner } from "typeorm";

// 일정에 '매년 반복' 추가 — 생일·기념일처럼 해마다 돌아오는 일정

export class EventRepeatYearly1790336087079 implements MigrationInterface {
    name = 'EventRepeatYearly1790336087079'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event"
            ADD "repeatYearly" boolean NOT NULL DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event" DROP COLUMN "repeatYearly"
        `);
    }

}
