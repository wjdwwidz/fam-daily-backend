import { MigrationInterface, QueryRunner } from "typeorm";

// 홈 화면 월간 요약(LLM)과 LLM 호출 기록(토큰·비용·건너뛴 횟수)

export class MonthlySummary1790700000000 implements MigrationInterface {
    name = 'MonthlySummary1790700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "monthly_summary" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "groupId" uuid NOT NULL,
                "month" character varying(7) NOT NULL,
                "text" text NOT NULL,
                "activityCount" integer NOT NULL DEFAULT '0',
                "fingerprint" character varying(64) NOT NULL,
                "model" character varying(60),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_monthly_summary_group_month" UNIQUE ("groupId", "month"),
                CONSTRAINT "PK_monthly_summary_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "monthly_summary"
            ADD CONSTRAINT "FK_monthly_summary_group" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            CREATE TABLE "llm_usage" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "feature" character varying(40) NOT NULL,
                "groupId" uuid,
                "status" character varying(12) NOT NULL,
                "model" character varying(60),
                "inputTokens" integer NOT NULL DEFAULT '0',
                "outputTokens" integer NOT NULL DEFAULT '0',
                "costUsd" numeric(10,6) NOT NULL DEFAULT '0',
                "error" character varying(300),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_llm_usage_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_llm_usage_createdAt" ON "llm_usage" ("createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_llm_usage_createdAt"`);
        await queryRunner.query(`DROP TABLE "llm_usage"`);
        await queryRunner.query(`ALTER TABLE "monthly_summary" DROP CONSTRAINT "FK_monthly_summary_group"`);
        await queryRunner.query(`DROP TABLE "monthly_summary"`);
    }

}
