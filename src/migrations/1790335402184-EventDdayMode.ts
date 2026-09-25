import { MigrationInterface, QueryRunner } from "typeorm";

// D-day 세는 방법 — 'dday'(남은 날) · 'count'(지난 날수) · 'week'(주수)

export class EventDdayMode1790335402184 implements MigrationInterface {
    name = 'EventDdayMode1790335402184'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event"
            ADD "ddayMode" character varying(10) NOT NULL DEFAULT 'dday'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "event" DROP COLUMN "ddayMode"
        `);
    }

}
