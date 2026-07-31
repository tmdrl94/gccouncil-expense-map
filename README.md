# 과천시의회 업무추진비 — 자주 이용한 식당·카페 지도

과천시의회 업무추진비 집행내역(2025.07~2026.06, 27개 게시물·38개 엑셀)을 집계해
자주 이용한 식당·카페를 카카오맵 위에 표시하고 음식점/카페(베이커리 포함)로 필터링하는 정적 사이트입니다.

- 원자료: [과천시의회 업무추진비 현황 공개 게시판](https://www.gccouncil.go.kr/kr/costBBS.do)
- 데이터: `data/places.csv` (식당별 방문 횟수·집행액·분류·좌표)
- 지도: 카카오맵 JavaScript SDK

## 1. GitHub / Vercel 현재 상태

- **GitHub**: [github.com/tmdrl94/gccouncil-expense-map](https://github.com/tmdrl94/gccouncil-expense-map) — 이미 만들어져 있고, 지금까지의 모든 변경사항이 커밋·푸시되어 있습니다.
- **Vercel**: 프로젝트 `seunggi2/gccouncil-expense-map`, 실서비스 도메인 `https://gccouncil-expense-map.vercel.app` 로 이미 배포되어 있습니다.
- **단, 이 둘은 서로 연결되어 있지 않습니다.** Vercel 프로젝트가 GitHub 저장소를 Import해서 만들어진 게 아니라
  `vercel` CLI로 로컬에서 직접 만든 프로젝트라서, **GitHub에 push한다고 자동으로 Vercel에 재배포되지 않습니다.**
  (연동을 시도했을 때 "GitHub 계정에 Login Connection을 먼저 추가해야 한다"는 오류가 나서 CLI 직접 배포 방식으로 진행했습니다.)
  그래서 지금까지의 배포는 매번 ①`git push`(GitHub, 이력 보존용) → ②`vercel --prod`(로컬 `dist/`를 직접 업로드해 실배포) 두 단계를 함께 수행하는 방식이었습니다.

### 코드를 수정한 뒤 배포하는 법 (현재 방식)

```bash
# 1) 수정 후 GitHub에 기록
git add -A
git commit -m "설명"
git push

# 2) Vercel에 실제로 반영 (이 명령을 실행해야만 사이트에 반영됩니다)
export NODE_OPTIONS="--use-system-ca"   # 사내망 SSL 검사 프록시 우회용
vercel --prod --yes
```

### 앞으로 GitHub push만으로 자동 배포되게 하려면

Vercel 대시보드 → 프로젝트 → **Settings → Git** 에서 GitHub 저장소를 연결하면 됩니다.
(먼저 Vercel 계정 설정에서 GitHub Login Connection을 추가해야 Import가 가능했던 문제였으니, 그 부분만 해결하면 연결 자체는 어렵지 않습니다.)
연결하고 나면 `git push`만으로 Vercel이 알아서 빌드·배포하게 되고, 위 2단계 중 `vercel --prod`는 더 이상 필요 없어집니다.

## 2. 카카오 개발자센터에 도메인 등록 (필수)

지도가 뜨려면 **배포된 실제 도메인**을 카카오 앱에 등록해야 합니다.

1. [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → 해당 앱 선택
2. **앱 설정 → 플랫폼 → Web 플랫폼 등록**
3. 사이트 도메인에 `https://gccouncil-expense-map.vercel.app` (실제 배포 도메인) 추가
4. **제품 설정 → 지도(Maps) / 카카오맵** 활성화(ON) 확인 — 도메인 등록과 별개로 이 토글이 꺼져있으면 지도가 안 뜹니다
5. 로컬에서 미리보려면 `http://localhost:5500` 등 로컬 서버 주소도 함께 등록하세요.

> JavaScript 키는 git에 커밋하지 않습니다. `KAKAO_JS_KEY` 환경변수로만 관리하세요 (참고: 이 키는 도메인 제한으로 보호되는 클라이언트용 공개 키라 배포된 페이지 소스에는 어차피 그대로 노출됩니다 — git 저장소에 남기지 않는 것은 위생 차원의 조치입니다).

## 3. 좌표 채우기 (지오코딩)

`data/places.csv`에는 식당별 위도/경도/분류가 이미 채워져 있습니다 (최초 1회, 카카오 키워드 장소검색으로 생성).
좌표를 못 찾은 몇몇 항목은 `lat`/`lng`/`address`/`place_url` 칸이 비어 있는데, 이 칸을 채우면 지도에 마커로 표시됩니다
(주소만 채우고 좌표를 비워두면 지도엔 안 뜨고 표에만 남습니다). 좌표는 map.kakao.com에서 장소를 우클릭하면 복사할 수 있습니다.

> 좌표를 자동으로 채워주는 `tools/geocode.html` 도구는 실서비스 키 남용(quota 소진) 위험을 줄이기 위해 배포 후 제거했습니다.
> 필요하면 로컬에서만 임시로 만들어 쓰고, 사용 후 다시 지우는 걸 권장합니다.

## 로컬에서 미리보기

```bash
KAKAO_JS_KEY=발급받은키 node build.js   # dist/ 생성 (실제 키가 주입됨)
cd dist && python -m http.server 5500
```
(카카오 지도는 등록된 도메인에서만 동작하므로 로컬 확인 시 `http://localhost:5500`을 카카오 개발자센터에 미리 등록해두세요.)

## 데이터 처리 메모

- 각 엑셀의 "사용장소" 열을 원문 그대로 사용하되, 한 셀에 여러 상호가 쉼표로 함께 적힌 경우 상호별로 분리하고 금액은 균등 배분했습니다.
- 직원 경조사비·군장병 위문금·물품구매(SSG·쿠팡 등 식당이 아닌 항목)는 집계에서 제외했습니다.
- 같은 업체가 다른 표기(예: "더 호" / "더호", "맛찬들" / "맛찬들왕소금구이")로 따로 집계된 경우, 카카오맵 `place_url`(장소 고유 ID)이 같으면 하나로 합쳤습니다 — URL의 `http`/`https` 차이는 무시하고 숫자 ID만 비교합니다.
