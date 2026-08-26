# 주차장 면적 및 태양열 집열 활용면적 산정 근거

## 결론

홈페이지의 `주차장 면적`에는 실제 배치도에서 확인한 주차장 전체 면적을 우선 입력한다.
실제 면적이 없는 초기 단계에서만 아래 순서로 추정한다.

1. 건물 용도별 최소 주차대수를 산정한다.
2. 주차대수에 통로·회차를 포함한 계획면적 원단위를 곱한다.
3. 태양열 집열 가능면적은 실제 캐노피 배치면적 또는 보수적인 활용률로 제한한다.

## 1. 법정 최소 주차대수

「주차장법 시행령」 별표 1의 국가 최소기준은 다음과 같다.

| 홈페이지 용도 | 대응 시설 | 국가 최소기준 |
|---|---|---:|
| 오피스 | 업무시설 | 시설면적 150 m²당 1대 |
| 쇼핑몰 | 판매시설 | 시설면적 150 m²당 1대 |
| 병원 | 의료시설 | 시설면적 150 m²당 1대 |
| 공장 | 공장 | 시설면적 350 m²당 1대 |
| 창고를 별도 적용할 때 | 창고시설 | 시설면적 400 m²당 1대 |
| 주거 | 공동주택 | 주택건설기준 및 지역 조례에 따라 별도 산정 |
| 농업시설 | 동물·식물 관련 시설 | 국가기준상 부설주차장 설치 제외 가능; 지역 조례 확인 |

지방자치단체는 주차수요를 고려해 국가기준을 강화하거나 완화할 수 있으므로 실제 프로젝트는 해당 지역 조례를 우선 확인해야 한다.

## 2. 한 대당 주차장 면적

- 법정 일반형 주차구획: 2.5 m × 5.0 m = 12.5 m²/대
- 이는 자동차를 세우는 구획만의 면적이며 통로·회차·출입구·보행공간은 포함하지 않는다.
- 초기계획 원단위: 약 350 ft²/대 = 32.5 m²/대
  - SUDAS Urban Design Standard Manual은 일반 계획에서 차로, 회전 및 주차구획을 포함하여 약 350 ft²/대를 제시한다.
  - 실제 값은 주차각도, 통로방향, 조경, 장애인구획 및 대지형상에 따라 달라진다.

초기 추정식:

```text
최소 주차대수 N = ceil(시설면적 / 용도별 기준면적)
추정 주차장 총면적 A_parking = N × 32.5 m²/대
```

## 3. 태양열 집열 가능면적

집열기가 주차 캐노피처럼 주차구획 상부에만 설치된다면, 단순 기하학적 상한은 다음과 같다.

```text
주차구획 상부면적 = N × 12.5 m²/대
기하학적 활용률 = 12.5 / 32.5 ≈ 38.5%
```

홈페이지 기본값 35%는 38.5%보다 낮게 잡아 구조기둥, 가장자리, 음영 및 비정형 배치를 고려한 보수적 초기설계 가정이다. 법령이나 논문에서 정한 고정비율은 아니다.

```text
집열 가능면적 A_available
= 건축면적 + 주차장 총면적 × 주차장 집열 활용률
```

실제 설계에서는 총 주차장 면적에 임의 비율을 곱하는 방식보다, 캐노피가 덮는 주차열(row)의 길이와 폭을 도면에서 직접 산정하는 것이 우선이다. NREL의 carport 사례도 주차장 전체 포장면적이 아니라 캐노피가 덮는 주차구획 면적을 사용하도록 안내한다.

## 참고자료

1. 국가법령정보센터, 「주차장법 시행령」 별표 1, 부설주차장의 설치대상 시설물 종류 및 설치기준.
   https://law.go.kr/LSW/flDownload.do?flNm=%EB%B6%80%EC%84%A4%EC%A3%BC%EC%B0%A8%EC%9E%A5%EC%9D%98+%EC%84%A4%EC%B9%98%EB%8C%80%EC%83%81+%EC%8B%9C%EC%84%A4%EB%AC%BC+%EC%A2%85%EB%A5%8F+%EB%B0%8F+%EC%84%A4%EC%B9%98%EA%B8%B0%EC%A4%80%28%EC%A0%9C6%EC%A1%B0%EC%A0%9C1%ED%95%AD+%EA%B4%80%EB%A0%A8%29&flSeq=143537229
2. 국가법령정보센터, 「주차장법 시행규칙」 제3조, 평행주차형식 외 일반형 주차구획 2.5 m × 5.0 m.
   https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=0&chrClsCd=010202&efYd=20241202&joNo=000500&lsiSeq=256413&urlMode=lsInfoP
3. Iowa SUDAS, Urban Design Standard Manual, Chapter 12 Parking Lots, preliminary planning allowance of approximately 350 ft² per car including lanes, turns and stalls.
   https://www.intrans.iastate.edu/wp-content/uploads/sites/15/2020/10/SUDAS_Design_2011_Edition.pdf
4. NREL, Net Zero: Guide to Renewable ECIP Projects (2015), carport area calculation based on parking-space canopy area rather than the entire parking lot.
   https://www.nrel.gov/docs/fy15osti/62947.pdf
