// 스토어 등록에 필요한 공개 문서 — 개인정보 처리방침, 계정 삭제 요청 안내.
//
// 내용은 실제 코드 동작과 맞춰 적는다. 수집 항목·보관 기간·삭제 범위가 바뀌면
// (예: Apple 로그인 출시, 새 입력 항목 추가) 이 파일도 함께 고친다.

export interface LegalContact {
  owner: string; // 개인정보 보호책임자 / 개발자 이름
  email: string; // 문의·삭제 요청 이메일
}

const APP_NAME = '우리끼리';
const EFFECTIVE_DATE = '2026년 9월 14일';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// 연락처가 아직 설정되지 않았으면 빈칸 대신 준비 중으로 보여준다
const contactLine = (c: LegalContact) =>
  c.email
    ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`
    : '(준비 중)';

function layout(title: string, body: string) {
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ${APP_NAME}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;
    max-width:720px;margin:0 auto;padding:32px 20px 64px;color:#17303B;line-height:1.7;font-size:15px;background:#fff}
  h1{font-size:24px;margin:0 0 4px} h2{font-size:17px;margin:32px 0 8px}
  .meta{color:#6A7E88;font-size:13px;margin-bottom:24px}
  table{border-collapse:collapse;width:100%;font-size:14px;margin:8px 0}
  th,td{border:1px solid #E4E7EC;padding:8px;text-align:left;vertical-align:top}
  th{background:#FFF6FB} ol,ul{padding-left:20px} a{color:#FF5E8A}
  .box{background:#FFF6FB;border:1px solid #FFE1EC;border-radius:12px;padding:12px 16px}
  .scroll{overflow-x:auto}
</style></head><body>${body}</body></html>`;
}

export function privacyPage(c: LegalContact) {
  return layout(
    '개인정보 처리방침',
    `
<h1>개인정보 처리방침</h1>
<div class="meta">${APP_NAME} · 시행일 ${EFFECTIVE_DATE}</div>

<p>${APP_NAME}(이하 "서비스")는 가족끼리 사진과 이야기를 나누는 앱입니다. 서비스는 이용자의 개인정보를 소중히 다루며, 필요한 최소한의 정보만 처리합니다.</p>

<h2>1. 처리하는 개인정보</h2>
<div class="scroll"><table>
<tr><th>구분</th><th>항목</th><th>수집 방법</th></tr>
<tr><td>카카오 로그인</td><td>카카오 회원번호, 닉네임<br>프로필 사진·이메일 (카카오에서 제공에 동의한 경우)</td><td>로그인 시 카카오로부터 전달</td></tr>
<tr><td>프로필</td><td>이름, 프로필 사진</td><td>이용자가 직접 입력</td></tr>
<tr><td>가족 공간</td><td>가족 공간 이름, 가족 내 호칭, 오늘의 한마디, 사진·영상과 글, 가족 사전 단어(사진 포함), 문답 질문·답변</td><td>이용자가 직접 입력·업로드</td></tr>
<tr><td>자동 생성</td><td>서버 접속 기록(IP 주소, 요청 시각)</td><td>서비스 이용 과정에서 자동 생성</td></tr>
</table></div>
<p>사진첩 접근 권한은 이용자가 고른 사진·영상을 올릴 때만 사용하며, 고르지 않은 사진은 서버로 전송되지 않습니다.</p>

<h2>2. 처리 목적</h2>
<ul>
<li>회원 식별과 로그인 유지</li>
<li>가족 공간 만들기·초대·참여, 사진·단어·문답 기능 제공</li>
<li>문의 응대와 서비스 오류 확인</li>
</ul>

<h2>3. 보관 기간과 파기</h2>
<ul>
<li><b>회원 탈퇴 시 지체 없이 파기</b>합니다. 계정 정보(카카오 회원번호, 이름, 프로필 사진, 카카오 연결 정보)와 오늘의 한마디가 삭제됩니다.</li>
<li>가족 공간에 남긴 사진·영상, 단어, 문답은 함께 쓰던 가족의 기록이므로 삭제하지 않고 <b>가족 내 호칭(예: 엄마)만 표시된 채</b> 남습니다. 이 기록은 탈퇴한 계정과의 연결이 끊겨 누구의 계정인지 식별할 수 없습니다.</li>
<li>탈퇴 시 혼자 남아 있던 가족 공간은 안의 사진·영상 파일까지 모두 삭제됩니다.</li>
<li>업로드를 시작했지만 게시하지 않은 파일은 6시간이 지나면 자동으로 삭제됩니다.</li>
<li>서버 접속 기록은 최대 7일 보관 후 삭제됩니다.</li>
</ul>

<h2>4. 개인정보의 공유</h2>
<p>이용자가 가족 공간에 올린 정보는 <b>같은 가족 공간 구성원에게만</b> 보입니다. 가족 공간에는 초대 코드를 받은 사람만 참여할 수 있습니다. 서비스는 이용자의 개인정보를 제3자에게 판매하거나 제공하지 않습니다. 다만 법령에 따라 요구되는 경우는 예외로 합니다.</p>

<h2>5. 처리 위탁 및 국외 이전</h2>
<p>서비스 운영을 위해 아래 업체에 처리를 맡기고 있으며, 일부는 해외 서버에 저장됩니다. 정보는 서비스를 이용할 때 암호화된 네트워크(HTTPS)로 전송되고, 회원 탈퇴 또는 위탁 계약 종료 시까지 보관됩니다.</p>
<div class="scroll"><table>
<tr><th>업체</th><th>맡기는 일</th><th>이전 항목</th><th>국가</th></tr>
<tr><td>Supabase, Inc.</td><td>데이터베이스·사진 파일 저장</td><td>1번의 모든 항목(접속 기록 제외)</td><td>일본</td></tr>
<tr><td>Railway Corporation</td><td>서버 운영</td><td>1번의 모든 항목</td><td>미국</td></tr>
<tr><td>(주)카카오</td><td>로그인 인증</td><td>카카오 회원번호</td><td>대한민국</td></tr>
</table></div>

<h2>6. 이용자의 권리</h2>
<ul>
<li>앱의 <b>내 프로필</b>에서 이름·사진·호칭을 언제든 고칠 수 있습니다.</li>
<li>앱에서 직접 <b>회원 탈퇴</b>할 수 있습니다. 앱을 쓸 수 없다면 <a href="/account-deletion">계정 삭제 요청 안내</a>를 따라 요청해 주세요.</li>
<li>내 정보 열람·정정·삭제·처리 정지는 아래 연락처로 요청할 수 있습니다.</li>
</ul>

<h2>7. 만 14세 미만 아동</h2>
<p>서비스는 만 14세 미만 아동의 회원가입을 받지 않습니다.</p>

<h2>8. 안전성 확보 조치</h2>
<ul>
<li>모든 통신은 HTTPS로 암호화합니다.</li>
<li>가족 공간의 정보는 해당 공간 구성원만 조회할 수 있도록 서버에서 권한을 확인합니다.</li>
<li>데이터베이스와 파일 저장소 접근 권한은 운영자에게만 부여합니다.</li>
</ul>

<h2>9. 개인정보 보호책임자</h2>
<div class="box">
책임자: ${c.owner ? esc(c.owner) : '(준비 중)'}<br>
연락처: ${contactLine(c)}
</div>

<h2>10. 변경</h2>
<p>이 방침이 바뀌면 시행 7일 전부터 이 페이지에 알립니다.</p>
`,
  );
}

export function accountDeletionPage(c: LegalContact) {
  return layout(
    '계정 삭제 요청',
    `
<h1>계정 삭제 요청</h1>
<div class="meta">${APP_NAME}${c.owner ? ` · 개발자 ${esc(c.owner)}` : ''}</div>

<h2>앱에서 바로 삭제하기</h2>
<ol>
<li>${APP_NAME} 앱에 로그인합니다.</li>
<li>아래 <b>가족</b> 탭 → <b>내 프로필 설정하기</b>를 누릅니다.</li>
<li>화면 맨 아래 <b>회원 탈퇴</b>를 누르고 확인합니다.</li>
</ol>
<p>탈퇴는 즉시 처리되며 되돌릴 수 없습니다.</p>

<h2>앱 없이 삭제 요청하기</h2>
<p>앱을 삭제했거나 로그인할 수 없다면 아래 이메일로 요청해 주세요. 본인 확인 후 <b>7일 이내</b>에 삭제하고 결과를 회신합니다.</p>
<div class="box">
받는 곳: ${contactLine(c)}<br>
제목: ${APP_NAME} 계정 삭제 요청<br>
적어주실 내용: 카카오 닉네임, 참여 중인 가족 공간 이름과 호칭
</div>

<h2>삭제되는 정보</h2>
<ul>
<li>계정 정보: 카카오 회원번호, 이름, 프로필 사진, 카카오 연결 정보</li>
<li>모든 가족 공간의 오늘의 한마디</li>
<li>혼자 남아 있던 가족 공간과 그 안의 사진·영상·단어·문답 전체</li>
</ul>

<h2>남는 정보</h2>
<ul>
<li>다른 가족이 함께 쓰는 공간에 올린 사진·영상, 단어, 문답은 가족의 기록이므로 <b>가족 내 호칭(예: 엄마)만 표시된 채</b> 남습니다. 탈퇴한 계정과의 연결은 끊기며, 다시 가입해도 이 기록을 수정·삭제할 수 없습니다.</li>
<li>서버 접속 기록은 최대 7일 뒤 자동 삭제됩니다.</li>
</ul>

<p>자세한 내용은 <a href="/privacy">개인정보 처리방침</a>을 확인해 주세요.</p>
`,
  );
}
