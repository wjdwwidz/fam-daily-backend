import { MigrationInterface, QueryRunner } from "typeorm";

// 일상 글에 '언제의 일인지' — 시작일(takenFrom)과 며칠이면 끝나는 날(takenTo). 둘 다 비울 수 있다.
export class MediaTakenRange1790086465599 implements MigrationInterface {
    name = 'MediaTakenRange1790086465599'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "media"
            ADD "takenFrom" date
        `);
        await queryRunner.query(`
            ALTER TABLE "media"
            ADD "takenTo" date
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "media" DROP COLUMN "takenTo"
        `);
        await queryRunner.query(`
            ALTER TABLE "media" DROP COLUMN "takenFrom"
        `);
    }

}
