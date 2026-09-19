import { MigrationInterface, QueryRunner } from "typeorm";

export class BucketItem1789837553166 implements MigrationInterface {
    name = 'BucketItem1789837553166'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "bucket_item" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "no" integer NOT NULL,
                "text" character varying(30) NOT NULL,
                "doneAt" TIMESTAMP WITH TIME ZONE,
                "doneById" uuid,
                "mediaId" uuid,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "groupId" uuid NOT NULL,
                CONSTRAINT "PK_abbd93ba659e0532b954d54c34b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_52878dac500d967fdb2d24e458" ON "bucket_item" ("groupId", "no")
        `);
        await queryRunner.query(`
            ALTER TABLE "bucket_item"
            ADD CONSTRAINT "FK_0b91ea52092362580c82434f0ed" FOREIGN KEY ("doneById") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bucket_item"
            ADD CONSTRAINT "FK_2d76a33c517cc5fe1b6517b310e" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bucket_item"
            ADD CONSTRAINT "FK_ce5fb0e3c192e92ee9ab0119620" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "bucket_item" DROP CONSTRAINT "FK_ce5fb0e3c192e92ee9ab0119620"
        `);
        await queryRunner.query(`
            ALTER TABLE "bucket_item" DROP CONSTRAINT "FK_2d76a33c517cc5fe1b6517b310e"
        `);
        await queryRunner.query(`
            ALTER TABLE "bucket_item" DROP CONSTRAINT "FK_0b91ea52092362580c82434f0ed"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_52878dac500d967fdb2d24e458"
        `);
        await queryRunner.query(`
            DROP TABLE "bucket_item"
        `);
    }

}
