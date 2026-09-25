import { MigrationInterface, QueryRunner } from "typeorm";

// 홈에 D-day 로 띄울 일정 표시

export class EventDday1790335227849 implements MigrationInterface {
    name = 'EventDday1790335227849'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event"
            ADD "isDday" boolean NOT NULL DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event" DROP COLUMN "isDday"
        `);
    }

}
