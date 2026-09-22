import { MigrationInterface, QueryRunner } from "typeorm";

// 구글 장소 검색 하루 호출 횟수 — 하루 한도를 넘으면 구글을 부르지 않는다 (요금 상한)
export class PlacesUsage1790090649685 implements MigrationInterface {
    name = 'PlacesUsage1790090649685'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "places_usage" (
                "day" date NOT NULL,
                "count" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_places_usage_day" PRIMARY KEY ("day")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "places_usage"
        `);
    }

}
