import { MigrationInterface, QueryRunner } from "typeorm";

// 카카오 닉네임을 앱 이름(name)과 따로 둔다 — 프로필 화면의 '기본 이름'.
// 기존 가입자는 이름을 고친 적이 있을 수 있어 name 으로 채우지 않는다. 다음 로그인 때 채워진다.
export class UserKakaoName1790012651232 implements MigrationInterface {
    name = 'UserKakaoName1790012651232'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user"
            ADD "kakaoName" character varying(100)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user" DROP COLUMN "kakaoName"
        `);
    }

}
