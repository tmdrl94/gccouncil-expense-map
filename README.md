# 과천시의회 업무추진비 — 자주 이용한 식당·카페 지도

과천시의회 업무추진비 집행내역(2025.07~2026.06, 27개 게시물·38개 엑셀)을 집계해
자주 이용한 식당·카페를 카카오맵 위에 표시하고 음식점/카페(베이커리 포함)로 필터링하는 정적 사이트입니다.

- 원자료: [과천시의회 업무추진비 현황 공개 게시판](https://www.gccouncil.go.kr/kr/costBBS.do)
- 데이터: `data/places.csv` (식당별 방문 횟수·집행액·분류·좌표)
- 지도: 카카오맵 JavaScript SDK

## 1. GitHub에 올리기

이 폴더가 이미 git 저장소로 초기화되어 있습니다 (`git log`로 확인). GitHub에 새 저장소를 만든 뒤 아래처럼 푸시하세요.

```bash
cd gccouncil-expense-map
git remote add origin https://github.com/<your-id>/gccouncil-expense-map.git
git branch -M main
git push -u origin main
```

## 2. Vercel에 배포하기

1. [vercel.com](https://vercel.com) → **Add New → Project** → 방금 만든 GitHub 저장소 Import
2. Framework Preset: **Other** (정적 파일이라 빌드 명령 없이 그대로 배포됩니다)
3. 배포 완료 후 프로젝트 이름을 `gccouncil-expense-map`으로 설정하면 기본 도메인이
   `https://gccouncil-expense-map.vercel.app` 이 됩니다. (이름이 이미 사용 중이면 Vercel이 다른 이름을 제안합니다 — 실제 배정된 도메인을 확인하세요.)

## 3. 카카오 개발자센터에 도메인 등록 (필수)

지도가 뜨려면 **배포된 실제 도메인**을 카카오 앱에 등록해야 합니다.

1. [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → 해당 앱 선택
2. **앱 설정 → 플랫폼 → Web 플랫폼 등록**
3. 사이트 도메인에 `https://gccouncil-expense-map.vercel.app` (실제 배포 도메인) 추가
4. 로컬에서 미리보려면 `http://localhost:5500` 등 로컬 서버 주소도 함께 등록하세요.

이미 사용 중인 JavaScript 키(`d1048fcfff5bdb47502b6cb3f7a2b4b8`)는 `index.html`, `tools/geocode.html`에 이미 반영되어 있습니다.

## 4. 좌표 채우기 (지오코딩, 최초 1회)

`data/places.csv`에는 아직 위도/경도/분류가 비어 있습니다. 도메인 등록이 끝난 뒤:

1. 배포된 사이트에서 `/tools/geocode.html` 접속
2. **지오코딩 시작** 클릭 → 카카오 키워드 장소검색으로 160개 항목을 순차 조회 (약 20~30초)
3. 완료되면 화면의 텍스트박스 내용을 전체 복사하거나 **CSV 다운로드** 클릭
4. 그 내용으로 `data/places.csv`를 덮어쓰고 다시 커밋 → 푸시하면 Vercel이 자동 재배포합니다

검색에 실패한 항목(폐업·상호 변경 등)은 표에 `FAIL`로 표시되며 `category`가 "미확인"으로 남습니다 — 필요하면 CSV에서 수동으로 좌표를 채워주세요.

## 로컬에서 미리보기

빌드 과정이 없는 순수 정적 사이트라 아무 정적 서버로 열면 됩니다.

```bash
npx serve .
# 또는
python -m http.server 5500
```
(단, 카카오 지도는 등록된 도메인에서만 동작하므로 로컬 확인 시 `http://localhost:5500`을 카카오 개발자센터에 미리 등록해두세요.)

## 데이터 처리 메모

- 각 엑셀의 "사용장소" 열을 원문 그대로 사용하되, 한 셀에 여러 상호가 쉼표로 함께 적힌 경우 상호별로 분리하고 금액은 균등 배분했습니다.
- 직원 경조사비·군장병 위문금·물품구매(SSG·쿠팡 등 식당이 아닌 항목)는 집계에서 제외했습니다.
- 표기 차이(예: "더 호" / "더호", "청계산도토리" / "청계산 도토리")는 별도 정규화하지 않아 별개 항목으로 남아있을 수 있습니다.
