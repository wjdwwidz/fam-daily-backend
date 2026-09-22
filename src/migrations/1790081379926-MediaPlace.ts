import { MigrationInterface, QueryRunner } from "typeorm";

// 일상 글에 장소 — 구글 장소 검색에서 고른 곳 (이름·주소·placeId·좌표)
export class MediaPlace1790081379926 implements MigrationInterface {
    name = 'MediaPlace1790081379926'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "media"
            ADD "place" jsonb
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "media" DROP COLUMN "place"
        `);
    }

}
