import { MigrationInterface, QueryRunner } from "typeorm";

// 일상 글 댓글 (media_comment). 답글은 parentId 로 한 단계, 글·가족이 지워지면 함께 지워진다.

export class MediaComment1789480000000 implements MigrationInterface {
    name = 'MediaComment1789480000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "media_comment" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "text" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP WITH TIME ZONE,
                "mediaId" uuid NOT NULL,
                "groupId" uuid NOT NULL,
                "parentId" uuid,
                "authorId" uuid,
                CONSTRAINT "PK_06df0ecbcc0ce3e024007aef72f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "media_comment"
            ADD CONSTRAINT "FK_622e80a40a24df97a38fa41a913" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "media_comment"
            ADD CONSTRAINT "FK_f0ddaa40700a7c04470c91762d1" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "media_comment"
            ADD CONSTRAINT "FK_de2ecb938a5623f35b4522e6ede" FOREIGN KEY ("parentId") REFERENCES "media_comment"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "media_comment"
            ADD CONSTRAINT "FK_0ecec242419ad304345e3c085b7" FOREIGN KEY ("authorId") REFERENCES "membership"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "media_comment" DROP CONSTRAINT "FK_0ecec242419ad304345e3c085b7"
        `);
        await queryRunner.query(`
            ALTER TABLE "media_comment" DROP CONSTRAINT "FK_de2ecb938a5623f35b4522e6ede"
        `);
        await queryRunner.query(`
            ALTER TABLE "media_comment" DROP CONSTRAINT "FK_f0ddaa40700a7c04470c91762d1"
        `);
        await queryRunner.query(`
            ALTER TABLE "media_comment" DROP CONSTRAINT "FK_622e80a40a24df97a38fa41a913"
        `);
        await queryRunner.query(`
            DROP TABLE "media_comment"
        `);
    }

}
