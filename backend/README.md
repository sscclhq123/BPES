# Solar-Assisted Liquid Desiccant Python Engine

MATLAB 최신 기준 파일을 Python으로 재구성한 계산 엔진입니다.

## 기준 MATLAB 파일

- 평판형: `LABmeeting_code_flatplate_ASOS2025.m`
- 진공관형: `LABmeeting_code_evacuate_ASOS2025.m`

두 MATLAB 파일은 집열기 모델과 계수만 다르고 나머지 LD, TES, 재생 제어 로직은 동일합니다. Python에서는 `collector_type` 설정으로 분기합니다.

## 실행

```bash
python3 backend/run_collectors.py --outdir backend/outputs
```

## 생성 파일

- `backend/outputs/python_flat_plate_ASOS2025.xlsx`
- `backend/outputs/python_evacuated_tube_ASOS2025.xlsx`

## 검증 기준

기존 `collector_solar_cover_ASOS2025_summary.csv`의 핵심 요약값과 맞춰 확인했습니다.

- 평판형 집열기 출력: 약 `931.281 kWh`
- 평판형 TES 재생 공급: 약 `644.517 kWh`
- 진공관형 집열기 출력: 약 `1278.358 kWh`
- 진공관형 TES 재생 공급: 약 `802.825 kWh`
