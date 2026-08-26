const weatherDatasets = {
  custom_coordinate: {
    label: "사용자 입력 좌표",
    source: "위도/경도 직접 입력",
    method: "좌표 기반 Clear-sky 일사량 추정",
    outdoorTemp: 31,
    humidity: 70,
    irradiance: 5.4,
    latitude: 37.56,
    longitude: 126.97,
    suitability: 58,
  },
  upload_weather: {
    label: "개인 기상데이터 업로드",
    source: "사용자 선택 파일",
    method: "업로드 파일 기반",
    outdoorTemp: 31,
    humidity: 70,
    irradiance: 4.2,
    latitude: 37.56,
    longitude: 126.97,
    suitability: 60,
    uploadMode: true,
  },
  seoul_epw: {
    label: "서울 · TMYx 2011–2025",
    source: "KOR_SO_Seoul.WS.471080_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 31,
    humidity: 72,
    irradiance: 4.2,
    latitude: 37.56,
    longitude: 126.97,
    suitability: 64,
  },
  daejeon_tmyx: {
    label: "대전 · TMYx 2011–2025",
    source: "KOR_TJ_Daejeon.WS.471330_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 13, humidity: 65, irradiance: 4.2,
    latitude: 36.3719, longitude: 127.3722, suitability: 62,
  },
  busan_tmyx: {
    label: "부산 · TMYx 2011–2025",
    source: "KOR_PU_Busan-Daecheongdong.WS.471590_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 15, humidity: 66, irradiance: 4.4,
    latitude: 35.1047, longitude: 129.0319, suitability: 68,
  },
  gwangju_tmyx: {
    label: "광주 · TMYx 2011–2025",
    source: "KOR_KJ_Gwangju.471560_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 14, humidity: 68, irradiance: 4.4,
    latitude: 35.1731, longitude: 126.8917, suitability: 67,
  },
  daegu_tmyx: {
    label: "대구 · TMYx 2011–2025",
    source: "KOR_TG_Daegu.471430_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 15, humidity: 63, irradiance: 4.5,
    latitude: 35.8283, longitude: 128.6522, suitability: 64,
  },
  incheon_tmyx: {
    label: "인천 · TMYx 2011–2025",
    source: "KOR_IN_Incheon.WS.471120_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 13, humidity: 70, irradiance: 4.2,
    latitude: 37.4778, longitude: 126.625, suitability: 66,
  },
  jeju_tmyx: {
    label: "제주 · TMYx 2011–2025",
    source: "KOR_CJ_Jeju.WS.471840_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 17, humidity: 73, irradiance: 4.4,
    latitude: 33.5142, longitude: 126.5297, suitability: 73,
  },
  bangkok_tmy: {
    label: "방콕 · TMYx 2011–2025",
    source: "THA_CRG_Bangkok.Metropolis.484550_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 34,
    humidity: 78,
    irradiance: 5.1,
    latitude: 13.75,
    longitude: 100.5,
    suitability: 87,
  },
  manila_tmy: {
    label: "마닐라 · TMYx 2011–2025",
    source: "PHL_NCR_Manila-Aquino.Intl.AP.984290_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 33,
    humidity: 81,
    irradiance: 4.8,
    latitude: 14.6,
    longitude: 120.98,
    suitability: 83,
  },
  cebu_tmyx: {
    label: "세부 · TMYx 2011–2025",
    source: "PHL_CNV_Mactan-Cebu.Intl.AP.986460_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 28, humidity: 81, irradiance: 4.9,
    latitude: 10.3224, longitude: 123.98, suitability: 86,
  },
  chiang_mai_tmyx: {
    label: "치앙마이 · TMYx 2011–2025",
    source: "THA_NRG_Chiang.Mai.Intl.AP.483270_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 26, humidity: 69, irradiance: 5.2,
    latitude: 18.7714, longitude: 98.9692, suitability: 79,
  },
  singapore_tmyx: {
    label: "싱가포르 · TMYx 2011–2025",
    source: "SGP_SG_Singapore-Changi.Intl.AP.486980_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 28, humidity: 82, irradiance: 4.6,
    latitude: 1.3678, longitude: 103.9826, suitability: 90,
  },
  amsterdam_tmyx: {
    label: "암스테르담 · TMYx 2011–2025",
    source: "NLD_NH_Amsterdam-Schipol.AP.062400_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 11, humidity: 78, irradiance: 2.8,
    latitude: 52.3172, longitude: 4.7897, suitability: 42,
  },
  rotterdam_tmyx: {
    label: "로테르담 · TMYx 2011–2025",
    source: "NLD_ZH_Rotterdam.The.Hague.AP.063440_TMYx.2011-2025.epw",
    method: "Climate.OneBuilding TMYx EPW",
    outdoorTemp: 11, humidity: 79, irradiance: 2.9,
    latitude: 51.9606, longitude: 4.4469, suitability: 43,
  },
};

const comparisonRegions = {
  seoul_epw: { label: "서울 · 대한민국", humidity: 65.7, irradiance: 4.91, latitude: 37.5714, suitability: 64 },
  daejeon_tmyx: { label: "대전 · 대한민국", humidity: 69.1, irradiance: 4.93, latitude: 36.3719, suitability: 66 },
  busan_tmyx: { label: "부산 · 대한민국", humidity: 65.7, irradiance: 5.04, latitude: 35.1047, suitability: 68 },
  gwangju_tmyx: { label: "광주 · 대한민국", humidity: 70.1, irradiance: 5.02, latitude: 35.1731, suitability: 69 },
  daegu_tmyx: { label: "대구 · 대한민국", humidity: 63.5, irradiance: 4.87, latitude: 35.8283, suitability: 64 },
  incheon_tmyx: { label: "인천 · 대한민국", humidity: 71.6, irradiance: 4.94, latitude: 37.4778, suitability: 68 },
  jeju_tmyx: { label: "제주 · 대한민국", humidity: 70.8, irradiance: 4.76, latitude: 33.5142, suitability: 73 },
  manila_tmy: { label: "마닐라 · 필리핀", humidity: 77.6, irradiance: 6.15, latitude: 14.509, suitability: 85 },
  cebu_tmyx: { label: "세부 · 필리핀", humidity: 79.8, irradiance: 6.66, latitude: 10.3224, suitability: 88 },
  bangkok_tmy: { label: "방콕 · 태국", humidity: 72.4, irradiance: 6.71, latitude: 13.7264, suitability: 87 },
  chiang_mai_tmyx: { label: "치앙마이 · 태국", humidity: 68.4, irradiance: 6.42, latitude: 18.7714, suitability: 81 },
  singapore_tmyx: { label: "싱가포르 · 싱가포르", humidity: 80.0, irradiance: 6.39, latitude: 1.3678, suitability: 90 },
  amsterdam_tmyx: { label: "암스테르담 · 네덜란드", humidity: 79.9, irradiance: 3.03, latitude: 52.3172, suitability: 42 },
  rotterdam_tmyx: { label: "로테르담 · 네덜란드", humidity: 79.6, irradiance: 3.05, latitude: 51.9606, suitability: 43 },
};

const loadDatasets = {
  office_small: {
    label: "소형 오피스",
    source: "ASHRAE 90.1-2022 OfficeSmall · Miami",
    buildingArea: 511,
    operationHours: 9,
    targetAbsHumidity: 10.0,
    airflow: 795,
    annualRegenNeed: 8550,
    note: "EnergyPlus 출력(.table.htm)에서 면적, 조건부 체적, 존별 설계 외기량을 추출",
  },
  office_medium: {
    label: "중형 오피스",
    source: "ASHRAE 90.1-2022 OfficeMedium · Miami",
    buildingArea: 4982,
    operationHours: 9,
    targetAbsHumidity: 10.0,
    airflow: 7745,
    annualRegenNeed: 84000,
    note: "EnergyPlus 출력(.table.htm)에서 면적, 조건부 체적, 존별 설계 외기량을 추출",
  },
  office_large: {
    label: "대형 오피스",
    source: "ASHRAE 90.1-2022 OfficeLarge · Miami",
    buildingArea: 46320,
    operationHours: 9,
    targetAbsHumidity: 10.0,
    airflow: 72004,
    annualRegenNeed: 805000,
    note: "EnergyPlus 출력(.table.htm)에서 면적, 조건부 체적, 존별 설계 외기량을 추출",
  },
  mall_small: {
    label: "소형 쇼핑몰",
    source: "ASHRAE 90.1-2022 RetailStandalone scaled · Miami",
    buildingArea: 1147,
    operationHours: 12,
    targetAbsHumidity: 10.0,
    airflow: 4486,
    annualRegenNeed: 55000,
    note: "보유한 Stand-alone Retail prototype의 50% 스케일 예비값",
  },
  mall_medium: {
    label: "중형 쇼핑몰",
    source: "ASHRAE 90.1-2022 RetailStandalone · Miami",
    buildingArea: 2294,
    operationHours: 12,
    targetAbsHumidity: 10.0,
    airflow: 8973,
    annualRegenNeed: 110000,
    note: "EnergyPlus 출력(.table.htm)에서 면적, 조건부 체적, 존별 설계 외기량을 추출",
  },
  mall_large: {
    label: "대형 쇼핑몰",
    source: "ASHRAE 90.1-2022 RetailStripmall scaled · Miami",
    buildingArea: 5226,
    operationHours: 12,
    targetAbsHumidity: 10.0,
    airflow: 22220,
    annualRegenNeed: 265000,
    note: "보유한 Strip Mall prototype의 250% 스케일 예비값",
  },
  residential_small: {
    label: "소형 주거",
    source: "ASHRAE 90.1-2022 ApartmentMidRise scaled · Miami",
    buildingArea: 1567,
    operationHours: 24,
    targetAbsHumidity: 10.0,
    airflow: 1517,
    annualRegenNeed: 23000,
    note: "보유한 ApartmentMidRise prototype의 50% 스케일 예비값",
  },
  residential_medium: {
    label: "중형 주거",
    source: "ASHRAE 90.1-2022 ApartmentMidRise · Miami",
    buildingArea: 3135,
    operationHours: 24,
    targetAbsHumidity: 10.0,
    airflow: 3034,
    annualRegenNeed: 46000,
    note: "EnergyPlus 출력(.table.htm)에서 면적, 조건부 체적, 존별 설계 외기량을 추출",
  },
  residential_large: {
    label: "대형 주거",
    source: "ASHRAE 90.1-2022 ApartmentHighRise · Miami",
    buildingArea: 7837,
    operationHours: 24,
    targetAbsHumidity: 10.0,
    airflow: 7519,
    annualRegenNeed: 115000,
    note: "EnergyPlus 출력(.table.htm)에서 면적, 조건부 체적, 존별 설계 외기량을 추출",
  },
  hospital_small: {
    label: "소형 병원",
    source: "ASHRAE 90.1-2022 Hospital scaled · Miami",
    buildingArea: 4487,
    operationHours: 24,
    targetAbsHumidity: 10.0,
    airflow: 12702,
    annualRegenNeed: 380000,
    note: "보유한 Hospital prototype의 20% 스케일 예비값",
  },
  hospital_medium: {
    label: "중형 병원",
    source: "ASHRAE 90.1-2022 Hospital scaled · Miami",
    buildingArea: 11218,
    operationHours: 24,
    targetAbsHumidity: 10.0,
    airflow: 31755,
    annualRegenNeed: 950000,
    note: "보유한 Hospital prototype의 50% 스케일 예비값",
  },
  hospital_large: {
    label: "대형 병원",
    source: "ASHRAE 90.1-2022 Hospital · Miami",
    buildingArea: 22436,
    operationHours: 24,
    targetAbsHumidity: 10.0,
    airflow: 63510,
    annualRegenNeed: 1900000,
    note: "EnergyPlus 출력(.table.htm)에서 면적, 조건부 체적, 존별 설계 외기량을 추출",
  },
  factory_small: {
    label: "소형 공장/산업시설",
    source: "ASHRAE 90.1-2022 Warehouse scaled · Miami",
    buildingArea: 2418,
    operationHours: 12,
    targetAbsHumidity: 10.0,
    airflow: 2707,
    annualRegenNeed: 65000,
    note: "보유한 Warehouse prototype의 50% 스케일 예비값",
  },
  factory_medium: {
    label: "중형 공장/산업시설",
    source: "ASHRAE 90.1-2022 Warehouse · Miami",
    buildingArea: 4835,
    operationHours: 12,
    targetAbsHumidity: 10.0,
    airflow: 5414,
    annualRegenNeed: 130000,
    note: "EnergyPlus 출력(.table.htm)에서 면적, 조건부 체적, 존별 설계 외기량을 추출",
  },
  factory_large: {
    label: "대형 공장/산업시설",
    source: "ASHRAE 90.1-2022 Warehouse scaled · Miami",
    buildingArea: 9670,
    operationHours: 24,
    targetAbsHumidity: 10.0,
    airflow: 10828,
    annualRegenNeed: 260000,
    note: "보유한 Warehouse prototype의 200% 스케일 예비값",
  },
  agriculture_small: {
    label: "소형 농업시설",
    source: "Greenhouse/vertical farm prototype",
    buildingArea: 300,
    operationHours: 24,
    targetAbsHumidity: 10.0,
    airflow: 2500,
    annualRegenNeed: 11200,
    note: "온실/수직농장 계열 고습도 제어 대표 부하 프로파일",
  },
  agriculture_medium: {
    label: "중형 농업시설",
    source: "Greenhouse/vertical farm prototype",
    buildingArea: 1500,
    operationHours: 24,
    targetAbsHumidity: 10.0,
    airflow: 14500,
    annualRegenNeed: 68000,
    note: "작물 증산과 환기 제습을 고려한 농업시설 대표 부하 프로파일",
  },
  agriculture_large: {
    label: "대형 농업시설",
    source: "Greenhouse/vertical farm prototype",
    buildingArea: 6000,
    operationHours: 24,
    targetAbsHumidity: 10.0,
    airflow: 62000,
    annualRegenNeed: 295000,
    note: "대규모 온실/식물공장 대표 부하 프로파일",
  },
};

const defaults = {
  weatherInputMode: "standard",
  weatherDataset: "seoul_epw",
  analysisPeriodMode: "annual",
  solarDataMode: "has_solar",
  buildingInputMode: "template",
  buildingUse: "office",
  buildingSize: "medium",
  mallParking: "no",
  loadDataset: "office_medium",
  latitude: 37.56,
  longitude: 126.97,
  buildingArea: 4982,
  parkingArea: 1800,
  parkingCollectorCoverage: 35,
  operationHours: 9,
  targetAbsHumidity: 10.0,
  targetHumidityTolerance: 0.5,
  airflow: 7745,
  solutionConcentration: 38,
  lgRatio: 1.0,
  absSolutionTemp: 25,
  absTempMode: "auto",
  regenTemp: 59.4,
  collectorType: "evacuated",
  solutionMode: "fixed",
  lgMode: "auto",
  regenMode: "auto",
  targetSolarShare: 50,
  tesSupplyTemp: 75,
  tesReturnTemp: 42,
};

const fallbackWeatherTrend = [
  { month: "1월", temp: -1.5, humidity: 58, solar: 2.3 },
  { month: "2월", temp: 1.2, humidity: 56, solar: 2.9 },
  { month: "3월", temp: 7.1, humidity: 57, solar: 3.5 },
  { month: "4월", temp: 13.5, humidity: 59, solar: 4.0 },
  { month: "5월", temp: 21.5, humidity: 63, solar: 3.9 },
  { month: "6월", temp: 25.1, humidity: 70, solar: 4.2 },
  { month: "7월", temp: 28.4, humidity: 78, solar: 4.4 },
  { month: "8월", temp: 29.5, humidity: 76, solar: 4.2 },
  { month: "9월", temp: 24.2, humidity: 68, solar: 3.5 },
  { month: "10월", temp: 17.5, humidity: 61, solar: 2.9 },
  { month: "11월", temp: 7.2, humidity: 60, solar: 2.4 },
  { month: "12월", temp: 0.2, humidity: 59, solar: 2.1 },
];

const fields = [
  "weatherInputMode",
  "weatherDataset",
  "analysisPeriodMode",
  "solarDataMode",
  "buildingInputMode",
  "buildingUse",
  "buildingSize",
  "mallParking",
  "loadDataset",
  "latitude",
  "longitude",
  "outdoorTemp",
  "humidity",
  "irradiance",
  "buildingArea",
  "parkingArea",
  "parkingCollectorCoverage",
  "operationHours",
  "targetAbsHumidity",
  "targetHumidityTolerance",
  "airflow",
  "solutionConcentration",
  "lgRatio",
  "absSolutionTemp",
  "absTempMode",
  "regenTemp",
  "collectorType",
  "solutionMode",
  "lgMode",
  "regenMode",
  "targetSolarShare",
  "tesSupplyTemp",
  "tesReturnTemp",
];

const $ = (id) => document.getElementById(id);
let activeUploadDataset = "upload_weather";
let latestRegionResults = [];
const selectedRegionComparisonKeys = new Set();

function monthCheckboxes() {
  return [...document.querySelectorAll("#monthSelector input[type='checkbox']")];
}

function regionCheckboxes() {
  return [...document.querySelectorAll("#weatherRegionGrid input[type='checkbox']")];
}

function selectedWeatherDatasetKeys() {
  if ($("weatherInputMode").value !== "standard") return [getCurrentWeatherDatasetKey()];
  return regionCheckboxes().filter((input) => input.checked).map((input) => input.value);
}

function setSelectedWeatherDatasets(keys) {
  const selected = new Set(keys || []);
  regionCheckboxes().forEach((input) => { input.checked = selected.has(input.value); });
  updateSelectedRegionSummary();
}

function updateSelectedRegionSummary() {
  const keys = selectedWeatherDatasetKeys();
  if (keys.length && !keys.includes($("weatherDataset").value)) {
    $("weatherDataset").value = keys[0];
    applyWeatherDataset(keys[0]);
  }
  $("selectedRegionSummary").textContent = `${keys.length}개 지역 선택`;
  renderWeatherTrendRegionOptions();
}

function renderWeatherTrendRegionOptions() {
  const container = $("weatherTrendRegionOptions");
  if (!container) return;
  const keys = $("weatherInputMode").value === "standard" ? selectedWeatherDatasetKeys() : [];
  const activeKey = $("weatherDataset").value;
  container.innerHTML = keys.map((key) => {
    const label = weatherDatasets[key]?.label?.split(" · ")[0] || key;
    return `<button type="button" class="weather-trend-region-button${key === activeKey ? " active" : ""}" data-weather-trend-key="${key}" aria-pressed="${key === activeKey}">${label}</button>`;
  }).join("");
}

function selectWeatherTrendRegion(datasetKey) {
  if (!selectedWeatherDatasetKeys().includes(datasetKey)) return;
  $("weatherDataset").value = datasetKey;
  applyWeatherDataset(datasetKey);
  renderWeatherTrendRegionOptions();
  loadWeatherTrend();
}

function selectedSimulationMonths() {
  if ($("analysisPeriodMode").value === "annual") return Array.from({ length: 12 }, (_, index) => index + 1);
  return monthCheckboxes().filter((input) => input.checked).map((input) => Number(input.value));
}

function setSelectedSimulationMonths(months) {
  const selected = new Set((months || []).map(Number));
  monthCheckboxes().forEach((input) => { input.checked = selected.has(Number(input.value)); });
}

function updateAnalysisPeriodFields() {
  const isAnnual = $("analysisPeriodMode").value === "annual";
  $("monthSelector").classList.toggle("is-hidden", isAnnual);
  const months = selectedSimulationMonths();
  $("selectedMonthSummary").textContent = isAnnual
    ? "1~12월 전체"
    : months.length
      ? `${months.map((month) => `${month}월`).join(", ")} 선택`
      : "선택된 월 없음";
}

function requestJsonViaXhr(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(options.method || "GET", url, true);
    Object.entries(options.headers || {}).forEach(([key, value]) => request.setRequestHeader(key, value));
    request.timeout = 120000;
    request.onload = () => {
      try {
        resolve({
          ok: request.status >= 200 && request.status < 300,
          status: request.status,
          result: JSON.parse(request.responseText || "{}"),
        });
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(new TypeError("계산 기능 연결 실패"));
    request.ontimeout = () => reject(new TypeError("계산 요청 시간 초과"));
    request.send(options.body || null);
  });
}

function requestJson(url, options = {}) {
  return requestJsonViaXhr(url, options);
}

function setDefaults() {
  Object.entries(defaults).forEach(([key, value]) => {
    $(key).value = value;
  });
  setSelectedSimulationMonths(Array.from({ length: 12 }, (_, index) => index + 1));
  setSelectedWeatherDatasets(["seoul_epw"]);
  updateAnalysisPeriodFields();
  activeUploadDataset = "upload_weather";
  applyCurrentWeatherSelection();
  applyBuildingSelection();
}

function getCurrentWeatherDatasetKey() {
  return $("weatherInputMode").value === "upload" ? activeUploadDataset : $("weatherDataset").value;
}

function applyCurrentWeatherSelection() {
  applyWeatherDataset(getCurrentWeatherDatasetKey());
}

function applyWeatherDataset(datasetKey) {
  const dataset = weatherDatasets[datasetKey];
  if (!dataset) {
    return;
  }
  if (dataset.solarDataMode) {
    $("solarDataMode").value = dataset.solarDataMode;
  }
  $("latitude").value = dataset.latitude;
  $("longitude").value = dataset.longitude;
  $("outdoorTemp").value = dataset.outdoorTemp;
  $("humidity").value = dataset.humidity;
  $("irradiance").value =
    needsCoordinateInput(datasetKey)
      ? estimateClearSkyIrradiance(dataset.latitude, dataset.longitude)
      : dataset.irradiance;
  toggleWeatherModeFields();
  toggleCoordinateFields(datasetKey);
  toggleWeatherValueFields(datasetKey);
  updateWeatherNote(datasetKey);
}

function applyLoadDataset(datasetKey) {
  const dataset = loadDatasets[datasetKey];
  if (!dataset) {
    return;
  }
  $("buildingArea").value = dataset.buildingArea;
  const parkingEstimate = estimateInitialParkingArea(datasetKey, dataset.buildingArea);
  $("parkingArea").value = dataset.parkingArea ?? parkingEstimate.area;
  $("parkingBasisNote").textContent = parkingEstimate.note;
  $("operationHours").value = dataset.operationHours;
  $("targetAbsHumidity").value = dataset.targetAbsHumidity ?? 10.0;
  $("airflow").value = dataset.airflow;
  $("loadDataset").value = datasetKey;
  updateBuildingModeFields();
  updateLoadNote(datasetKey);
}

function estimateInitialParkingArea(datasetKey, buildingArea) {
  const use = String(datasetKey).split("_")[0];
  const minimumAreaPerSpace = {
    office: 150,
    mall: 150,
    hospital: 150,
    factory: 350,
  }[use];
  if (!minimumAreaPerSpace) {
    return {
      area: 0,
      note: "주차장 면적을 직접 입력하고, 실제 집열기 설치 가능 범위에 맞게 집열 활용률을 수정하세요.",
    };
  }
  const spaces = Math.ceil(buildingArea / minimumAreaPerSpace);
  const area = Math.round((spaces * 32.5) / 10) * 10;
  return {
    area,
    note: "용도와 규모에 따른 주차장 예비값입니다. 실제 주차장 면적과 집열기 설치 가능 범위에 맞게 수정하세요.",
  };
}

function getTemplateLoadDatasetKey() {
  return `${$("buildingUse").value}_${$("buildingSize").value}`;
}

function applyBuildingSelection() {
  const mode = $("buildingInputMode").value;
  if (mode === "custom" || mode === "load_upload") {
    $("loadDataset").value = mode === "load_upload" ? "uploaded_load" : "custom_building";
    updateBuildingModeFields();
    updateLoadNote($("loadDataset").value);
    return;
  }

  applyLoadDataset(getTemplateLoadDatasetKey());
}

function updateBuildingModeFields() {
  const isTemplateMode = $("buildingInputMode").value === "template";
  $("buildingTemplateBox").classList.toggle("is-hidden", !isTemplateMode);
  $("buildingUseLabel").textContent = "용도";
  $("mallParkingBox").classList.toggle("is-hidden", $("buildingInputMode").value === "load_upload");
  $("loadUploadBox").classList.toggle("is-hidden", $("buildingInputMode").value !== "load_upload");
  $("buildingValueNote").textContent = isTemplateMode
    ? "표준 건물 모델에서 불러온 입력값입니다. ASHRAE 출력값과 스케일 예비값이 섞여 있으며 필요하면 아래 값은 직접 보정할 수 있습니다."
    : $("buildingInputMode").value === "load_upload"
      ? "기타 건물은 EnergyPlus/eQuest 등에서 뽑은 시간별 부하 Excel/CSV를 업로드하는 방향입니다. 파서 연결 전까지 아래 대표값으로 예비 계산합니다."
    : "사용자가 입력한 건물 정보로 부하를 추정합니다. 추후 EnergyPlus/eQuest 업로드 부하와 연결할 자리입니다.";
}

function updateLoadNote(datasetKey) {
  const dataset = loadDatasets[datasetKey];
  if (datasetKey === "uploaded_load") {
    $("loadNote").textContent =
      "시간별 부하 데이터 업로드 · 기타 건물은 sensible/latent load와 외기량 컬럼을 기준으로 계산할 예정";
    return;
  }
  if (!dataset) {
    $("loadNote").textContent = "사용자 건물 정보 입력 · 면적, 운전시간, 목표 조건, 처리풍량을 직접 사용";
    return;
  }

  const parkingNote =
    $("mallParking").value === "yes"
      ? " · 주차장/옥외공간 집열기 설치 가능성 반영"
      : "";
  $("loadNote").textContent = `${dataset.source} · ${dataset.note}${parkingNote}`;
}

function readInputs() {
  const data = {};
  fields.forEach((field) => {
    const element = $(field);
    data[field] = element.type === "number" || field === "operationHours" ? Number(element.value) : element.value;
  });
  data.sizingMode = "design";
  data.weatherDataset = getCurrentWeatherDatasetKey();
  data.weatherDatasets = selectedWeatherDatasetKeys();
  data.simulationMonths = selectedSimulationMonths();
  return data;
}

function updateRegeneratorMode() {
  const automatic = $("regenMode").value === "auto";
  $("regenTemp").readOnly = automatic;
  $("regenTemp").classList.toggle("is-readonly", automatic);
  $("regenModeNote").textContent = automatic
    ? "자동제어: 용액 농도 저하량에 따라 실험식 범위 48.5~59.4 °C에서 재생온도를 조절하고, 제습 목표 미달 시 59.4 °C까지 올립니다. 아래 온도값은 자동제어 상한입니다."
    : "입력값 고정: 사용자가 지정한 재생기 입구 용액온도를 전 운전시간에 적용합니다. 현재 실험식 권장 범위는 48.5~59.4 °C입니다.";
}

function validateDesignInputs(input) {
  const checks = [
    ["buildingArea", "적용 면적"],
    ["parkingArea", "주차장 면적"],
    ["parkingCollectorCoverage", "주차장 집열 활용률"],
    ["targetAbsHumidity", "목표 급기 절대습도"],
    ["targetHumidityTolerance", "목표습도 허용편차"],
    ["airflow", "처리풍량"],
    ["solutionConcentration", "용액 농도"],
    ["lgRatio", "L/G"],
    ["absSolutionTemp", "제습부 용액온도"],
    ["regenTemp", "재생기 용액온도"],
    ["targetSolarShare", "월별 최소 재생열 커버율"],
    ["tesSupplyTemp", "TES 공급수온도"],
    ["tesReturnTemp", "TES 환수온도"],
  ];
  const messages = checks
    .filter(([key]) => !Number.isFinite(input[key]) || (["parkingArea", "parkingCollectorCoverage"].includes(key) ? input[key] < 0 : input[key] <= 0))
    .map(([, label]) => `${label}값을 올바른 숫자로 입력하세요.`);

  if (!input.simulationMonths.length) {
    messages.push("월별 다중선택에서는 계산할 월을 하나 이상 선택하세요.");
  }
  if (Number.isFinite(input.parkingCollectorCoverage) && (input.parkingCollectorCoverage < 0 || input.parkingCollectorCoverage > 100)) {
    messages.push("주차장 집열 활용률은 0~100%로 입력하세요.");
  }
  if ($("weatherInputMode").value === "standard" && !input.weatherDatasets.length) {
    messages.push("계산할 표준 기상 지역을 하나 이상 선택하세요.");
  }

  if (Number.isFinite(input.tesReturnTemp) && Number.isFinite(input.tesSupplyTemp) && input.tesReturnTemp >= input.tesSupplyTemp) {
    messages.push("TES 환수온도는 공급수온도보다 낮아야 합니다.");
  }
  if (Number.isFinite(input.airflow) && Number.isFinite(input.lgRatio)) {
    const absorberModules = parallelModuleCount(input.airflow, input.lgRatio, 0.15, 0.73, 0.63, 2.08);
    const regeneratorModules = parallelModuleCount(input.airflow, input.lgRatio, 0.24, 0.4, 0.26, 0.48);
    if (!absorberModules || !regeneratorModules) {
      messages.push("현재 처리풍량과 L/G로는 모듈을 실험식 권장 유량 범위 안에 구성할 수 없습니다.");
    }
  }
  return messages;
}

function renderCalculationIssues(messages) {
  const panel = $("calculationIssuePanel");
  panel.classList.toggle("is-hidden", messages.length === 0);
  $("calculationIssues").innerHTML = messages.map((message) => `<li>${message}</li>`).join("");
}

function estimateClearSkyIrradiance(latitude, longitude) {
  const absLat = Math.abs(latitude);
  const latitudeFactor = clamp(1 - absLat / 115, 0.48, 0.98);
  const subtropicalBonus = absLat >= 10 && absLat <= 30 ? 0.45 : 0;
  const longitudeSeasonBias = Math.sin((longitude / 180) * Math.PI) * 0.12;
  return Number(clamp(6.0 * latitudeFactor + subtropicalBonus + longitudeSeasonBias, 2.4, 6.4).toFixed(1));
}

function updateWeatherNote(datasetKey) {
  const dataset = weatherDatasets[datasetKey];
  const lat = Number($("latitude").value);
  const lon = Number($("longitude").value);
  const needsCoordinates = needsCoordinateInput(datasetKey);

  if (datasetKey === "custom_coordinate") {
    $("weatherNote").textContent =
      `일사/기상 데이터가 없을 때 사용하는 대체 경로 · ${dataset.method} · 위도 ${formatNumber(lat, 2)}°, 경도 ${formatNumber(lon, 2)}°`;
    return;
  }

  if (datasetKey === "upload_weather") {
    $("weatherNote").textContent = needsCoordinates
      ? `개인 기상데이터 업로드 · 일사데이터 없음 · 위도 ${formatNumber(lat, 2)}°, 경도 ${formatNumber(lon, 2)}° 기반 Sky model 적용`
      : "개인 기상데이터 업로드 · 파일 안의 일사데이터를 계산에 사용";
    return;
  }

  if (dataset.uploaded) {
    $("weatherNote").textContent = needsCoordinates
      ? `사용자 업로드 기상데이터 사용 · 일사데이터 없음 · 위도 ${formatNumber(lat, 2)}°, 경도 ${formatNumber(lon, 2)}° 기반 Sky model 적용`
      : `사용자 업로드 기상데이터 사용 · ${dataset.method} · ${dataset.source}`;
    return;
  }

  $("weatherNote").textContent =
    `사전 등록 일사/기상 데이터 사용 · ${dataset.method} · ${dataset.source}`;
}

function syncCoordinateWeather() {
  const datasetKey = getCurrentWeatherDatasetKey();
  if (!needsCoordinateInput(datasetKey)) {
    updateWeatherNote(datasetKey);
    return;
  }

  const lat = Number($("latitude").value);
  const lon = Number($("longitude").value);
  $("irradiance").value = estimateClearSkyIrradiance(lat, lon);
  updateWeatherNote(datasetKey);
}

function needsCoordinateInput(datasetKey) {
  const dataset = weatherDatasets[datasetKey];
  return (
    datasetKey === "custom_coordinate" ||
    ($("weatherInputMode").value === "upload" && $("solarDataMode").value === "missing_solar") ||
    dataset?.solarDataMode === "missing_solar"
  );
}

function toggleWeatherModeFields() {
  const isUploadMode = $("weatherInputMode").value === "upload";
  $("standardWeatherBox").classList.toggle("is-hidden", isUploadMode);
  $("weatherUploadBox").classList.toggle("is-hidden", !isUploadMode);
}

function toggleCoordinateFields(datasetKey) {
  const isCoordinateMode = needsCoordinateInput(datasetKey);
  $("coordinateFields").classList.toggle("is-hidden", !isCoordinateMode);
  $("latitude").disabled = !isCoordinateMode;
  $("longitude").disabled = !isCoordinateMode;
}

function toggleWeatherValueFields(datasetKey) {
  const isCoordinateMode = datasetKey === "custom_coordinate";
  const isUploadMissingSolar = needsCoordinateInput(datasetKey) && datasetKey !== "custom_coordinate";
  $("outdoorTemp").readOnly = !isCoordinateMode;
  $("humidity").readOnly = !isCoordinateMode;
  $("irradiance").readOnly = true;
  $("weatherValueNote").textContent = isCoordinateMode
    ? "기상 데이터가 없는 경우입니다. 외기온도와 상대습도는 대체 기상 가정으로 입력하고, 일사량은 좌표 기반 Sky model 대표값을 사용합니다."
    : isUploadMissingSolar
      ? "업로드 파일에서 외기온도와 상대습도를 읽고, 일사량은 위도/경도 기반 Sky model 대표값을 사용합니다."
    : "선택한 기상 데이터에서 읽은 대표값입니다. 실제 계산은 시간별 기상 데이터를 사용합니다.";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function empiricalWarnings(input) {
  const checks = [
    {
      ok: input.solutionConcentration >= 36.4 && input.solutionConcentration <= 39,
      text: `LiCl 농도 ${formatNumber(input.solutionConcentration, 1)} %는 실험식 권장 범위 36.4~39.0 %를 벗어납니다.`,
    },
    {
      ok: input.absSolutionTemp >= 20 && input.absSolutionTemp <= 31.4,
      text: `제습부 입구 용액 목표온도 ${formatNumber(input.absSolutionTemp, 1)} °C는 Lim 자동제어 범위 20.0~31.4 °C를 벗어납니다.`,
    },
    {
      ok: input.regenTemp >= 48.5 && input.regenTemp <= 59.4,
      text: `재생부 입구 용액 목표온도 ${formatNumber(input.regenTemp, 1)} °C는 실험식 권장 범위 48.5~59.4 °C를 벗어납니다.`,
    },
    {
      ok: input.lgRatio >= 1 && input.lgRatio <= 3,
      text: `L/G ${formatNumber(input.lgRatio, 2)}는 Lim 제어범위 1.0~3.0을 벗어납니다.`,
    },
  ];

  return checks.filter((check) => !check.ok).map((check) => check.text);
}

function renderValidityWarnings(warnings) {
  const panel = $("validityPanel");
  panel.classList.toggle("warning", warnings.length > 0);
  const warningText = (warning) =>
    warning.includes("외삽값") ||
    warning.includes("입력하세요") ||
    warning.includes("클 수 없습니다") ||
    warning.includes("Python 엔진") ||
    warning.includes("실제 병렬 LD 계산")
      ? warning
      : `${warning} 결과는 외삽값으로 해석하세요.`;
  $("validityWarnings").innerHTML =
    warnings.length > 0
      ? warnings.map((warning) => `<li>${warningText(warning)}</li>`).join("")
      : "<li>현재 주요 입력값은 권장 범위 안에 있습니다.</li>";
}

function normalize(value, min, max, top, height) {
  if (max <= min) {
    return top + height / 2;
  }
  return top + height - ((value - min) / (max - min)) * height;
}

function polyline(points, key, min, max, left, top, width, height) {
  return points
    .map((point, index) => {
      const x = points.length === 1 ? left + width / 2 : left + (index / (points.length - 1)) * width;
      const y = normalize(point[key], min, max, top, height);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function renderWeatherTrend(points, source = "대표 월별값") {
  const width = 360;
  const height = 158;
  const plot = { left: 34, top: 10, width: 278, height: 104 };
  const tempValues = points.map((point) => point.temp);
  const rhValues = points.map((point) => point.humidity);
  const solarValues = points.map((point) => point.solar);
  const tempMin = Math.min(...tempValues) - 2;
  const tempMax = Math.max(...tempValues) + 2;
  const rhMin = Math.min(...rhValues) - 6;
  const rhMax = Math.max(...rhValues) + 6;
  const solarMin = Math.min(...solarValues) - 0.4;
  const solarMax = Math.max(...solarValues) + 0.4;
  const gridRows = [0, 0.5, 1];

  $("weatherTrendStatus").textContent = source;
  $("weatherTrendChart").innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img">
      ${gridRows
        .map((ratio) => {
          const y = plot.top + plot.height * ratio;
          return `<line x1="${plot.left}" y1="${y}" x2="${plot.left + plot.width}" y2="${y}" class="grid-line" />`;
        })
        .join("")}
      <line x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${plot.top + plot.height}" class="axis-line" />
      <line x1="${plot.left + plot.width}" y1="${plot.top}" x2="${plot.left + plot.width}" y2="${plot.top + plot.height}" class="axis-line" />
      <line x1="${plot.left}" y1="${plot.top + plot.height}" x2="${plot.left + plot.width}" y2="${plot.top + plot.height}" class="axis-line" />
      <text x="${plot.left - 4}" y="${plot.top + 5}" text-anchor="end">${formatNumber(tempMax, 0)}°/${formatNumber(rhMax, 0)}%</text>
      <text x="${plot.left - 4}" y="${plot.top + plot.height}" text-anchor="end">${formatNumber(tempMin, 0)}°/${formatNumber(rhMin, 0)}%</text>
      <text x="${plot.left + plot.width + 4}" y="${plot.top + 5}" text-anchor="start">${formatNumber(solarMax, 1)}</text>
      <text x="${plot.left + plot.width + 4}" y="${plot.top + plot.height}" text-anchor="start">${formatNumber(solarMin, 1)}</text>
      <polyline class="trend-line trend-temp" points="${polyline(points, "temp", tempMin, tempMax, plot.left, plot.top, plot.width, plot.height)}" />
      <polyline class="trend-line trend-rh" points="${polyline(points, "humidity", rhMin, rhMax, plot.left, plot.top, plot.width, plot.height)}" />
      <polyline class="trend-line trend-solar" points="${polyline(points, "solar", solarMin, solarMax, plot.left, plot.top, plot.width, plot.height)}" />
      ${points
        .map((point, index) => {
          const x = points.length === 1 ? plot.left + plot.width / 2 : plot.left + (index / (points.length - 1)) * plot.width;
          return `<text x="${x}" y="${height - 8}" text-anchor="middle">${point.month}</text>`;
        })
        .join("")}
      <text x="${plot.left}" y="${height - 28}" text-anchor="start" class="axis-caption">좌: °C / %</text>
      <text x="${plot.left + plot.width}" y="${height - 28}" text-anchor="end" class="axis-caption">우: kWh/m²·month</text>
    </svg>
  `;
}

async function loadWeatherTrend() {
  const input = readInputs();
  const fallbackPoints = fallbackWeatherTrend.filter((_, index) => input.simulationMonths.includes(index + 1));

  if (!window.location.protocol.startsWith("http") || needsCoordinateInput(input.weatherDataset)) {
    const source = needsCoordinateInput(input.weatherDataset) ? "Sky model 예비 추세" : "대표 월별값";
    renderWeatherTrend(fallbackPoints.length ? fallbackPoints : fallbackWeatherTrend, source);
    return;
  }

  if (input.weatherDataset === "upload_weather") {
    renderWeatherTrend(fallbackPoints.length ? fallbackPoints : fallbackWeatherTrend, "업로드 대기");
    return;
  }

  try {
    const response = await requestJson("/api/weather-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = response.result;
    if (!response.ok || result.error) {
      throw new Error(result.error || "Weather preview failed");
    }
    if (result.representative) {
      $("outdoorTemp").value = Number(result.representative.outdoorTemp).toFixed(1);
      $("humidity").value = Number(result.representative.humidity).toFixed(0);
      $("irradiance").value = Number(result.representative.irradiance).toFixed(1);
    }
    renderWeatherTrend(result.points, result.source || "기상 데이터 추세");
  } catch (_error) {
    renderWeatherTrend(fallbackPoints.length ? fallbackPoints : fallbackWeatherTrend, "대표 월별값");
  }
}

async function uploadWeatherFile() {
  const fileInput = $("weatherUpload");
  const status = $("weatherUploadStatus");
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    return;
  }

  if (!window.location.protocol.startsWith("http")) {
    status.className = "warning";
    status.textContent = "파일 업로드는 로컬 서버 또는 배포 서버에서만 사용할 수 있습니다.";
    return;
  }

  const formData = new FormData();
  formData.append("weather_file", file);
  formData.append("solar_data_mode", $("solarDataMode").value);
  formData.append("latitude", $("latitude").value);
  formData.append("longitude", $("longitude").value);
  status.className = "";
  status.textContent = "업로드 중...";

  try {
    const response = await requestJson("/api/weather-upload", {
      method: "POST",
      body: formData,
    });
    const result = response.result;
    if (!response.ok || result.error) {
      throw new Error(result.error || "업로드 실패");
    }

    weatherDatasets[result.datasetId] = {
      label: result.label,
      source: result.filename,
      method: result.supported ? "사용자 업로드 기상데이터" : "사용자 업로드 파일",
      outdoorTemp: result.representative?.outdoorTemp ?? Number($("outdoorTemp").value),
      humidity: result.representative?.humidity ?? Number($("humidity").value),
      irradiance:
        $("solarDataMode").value === "missing_solar"
          ? estimateClearSkyIrradiance(Number($("latitude").value), Number($("longitude").value))
          : result.representative?.irradiance ?? Number($("irradiance").value),
      latitude: Number($("latitude").value) || 37.56,
      longitude: Number($("longitude").value) || 126.97,
      suitability: 60,
      uploaded: true,
      solarDataMode: $("solarDataMode").value,
    };

    activeUploadDataset = result.datasetId;
    $("weatherInputMode").value = "upload";
    applyWeatherDataset(activeUploadDataset);
    await loadWeatherTrend();
    markResultsPending();

    status.className = result.supported ? "success" : "warning";
    status.textContent = result.message;
  } catch (error) {
    status.className = "warning";
    status.textContent = `업로드 실패: ${error.message}`;
  } finally {
    fileInput.value = "";
  }
}

function stageLoadFile() {
  const fileInput = $("loadUpload");
  const status = $("loadUploadStatus");
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    return;
  }

  status.className = "success";
  status.textContent = `${file.name} 선택됨 · 시간별 부하 파서는 다음 단계에서 Python 백엔드에 연결`;
  $("buildingInputMode").value = "load_upload";
  applyBuildingSelection();
  markResultsPending();
}

function parallelModuleCount(airflowM3h, lgRatio, airMin, airMax, solutionMin, solutionMax) {
  const totalAir = airflowM3h / 3600 * 1.2;
  const minimumCount = Math.max(1, Math.ceil(totalAir / airMax - 1e-12));
  const maximumCount = Math.floor(totalAir / airMin + 1e-12);
  return minimumCount <= maximumCount ? minimumCount : 0;
}

function renderMetrics(best, input) {
  $("heroResultLabel").textContent = best.targetAchieved ? "목표 커버율 달성 최소 면적" : "입력 범위 내 최대 커버 결과";
  $("optimalDesign").textContent = `${formatNumber(best.collectorArea, 1)} m²`;
  const weatherLabel =
    needsCoordinateInput(input.weatherDataset)
      ? `좌표 ${formatNumber(input.latitude, 2)}°, ${formatNumber(input.longitude, 2)}°`
      : weatherDatasets[input.weatherDataset].label;
  $("designNote").textContent =
    `${weatherLabel}, ${input.collectorType === "evacuated" ? "진공관형" : "평판형"} · 월별 최저 목표 ${formatNumber(input.targetSolarShare, 0)}% · 설계 지배월 ${best.designCriticalMonth || "-"}`;
  $("optimalCollector").textContent = `${formatNumber(best.collectorArea, 1)} m²`;
  $("optimalTes").textContent = "월내 무손실";
  $("optimalTesFlow").textContent = "추후 산정";
  $("solarShare").textContent = `${formatNumber(best.monthlyMinimumCoverage * 100, 1)} %`;
  $("unutilizedSolar").textContent = `${formatNumber(best.unutilizedSolar)} kWh/선택기간`;
  $("auxEnergy").textContent = `${formatNumber(best.auxEnergy)} kWh/선택기간`;
  $("unmetHours").textContent = `${formatNumber(best.unmetHours)} h/선택기간`;
  $("recommendedOps").textContent =
    `흡수기 ${formatNumber(best.absorberModules || 0)}대 · 재생기 ${formatNumber(best.regeneratorModules || 0)}대 · 제습부 ${best.absorberTemperatureMode === "auto" ? `자동 ${formatNumber(best.absorberSolutionTempMin, 1)}~${formatNumber(best.absorberSolutionTempMax, 1)} °C` : `고정 ${formatNumber(input.absSolutionTemp, 1)} °C`} · 재생부 ${best.regeneratorTemperatureMode === "auto" ? `자동 ${formatNumber(best.regeneratorSolutionTempMin, 1)}~${formatNumber(best.regeneratorSolutionTempMax, 1)} °C` : `고정 ${formatNumber(input.regenTemp, 1)} °C`} · L/G ${best.lgMode === "auto" ? `자동 ${formatNumber(best.lgRatioMin, 2)}~${formatNumber(best.lgRatioMax, 2)} (평균 ${formatNumber(best.lgRatioMean, 2)})` : `고정 ${formatNumber(best.lgRatio, 2)}`}`;
}

function renderRegionResults(results) {
  latestRegionResults = results.filter((item) => item?.result);
  const validKeys = new Set(latestRegionResults.map((item) => item.key));
  [...selectedRegionComparisonKeys].forEach((key) => {
    if (!validKeys.has(key)) selectedRegionComparisonKeys.delete(key);
  });
  if (!selectedRegionComparisonKeys.size && latestRegionResults.length) {
    selectedRegionComparisonKeys.add(latestRegionResults[0].key);
  }
  $("cityList").innerHTML = results.map(({ key, result, error }) => {
    const label = weatherDatasets[key]?.label?.replace(" · TMYx 2011–2025", "") || key;
    if (error) {
      return `<tr><td>${label}</td><td colspan="8">계산 실패 · ${error}</td></tr>`;
    }
    const best = result.best;
    return `
      <tr class="region-result-row${selectedRegionComparisonKeys.has(key) ? " comparison-selected" : ""}" data-region-key="${key}" role="button" tabindex="0" aria-label="${label} 월별 재생열 요구량 비교 선택" onclick="toggleRegionComparison('${key}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleRegionComparison('${key}');}">
        <td><button type="button" class="region-compare-button" onclick="event.stopPropagation();toggleRegionComparison('${key}')">${label}</button></td>
        <td>${formatNumber(best.collectorArea)} m²</td>
        <td>${formatNumber(best.monthlyMinimumCoverage * 100, 1)} %</td>
        <td>${formatNumber(best.usefulSolar)} kWh</td>
        <td>${formatNumber(best.unutilizedSolar)} kWh</td>
        <td>${formatNumber(best.auxEnergy)} kWh</td>
        <td>${formatNumber(best.targetDehumidification)} kg</td>
        <td>${formatNumber(best.actualDehumidification)} kg</td>
        <td>${formatNumber(best.dehumidificationAchievement * 100, 1)} %</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="9">선택된 지역 계산 결과가 없습니다.</td></tr>`;

  renderRegionMonthlyComparison(
    latestRegionResults.filter((item) => selectedRegionComparisonKeys.has(item.key)),
  );
  renderRegionAreaComparison(
    latestRegionResults.filter((item) => selectedRegionComparisonKeys.has(item.key)),
  );
  renderDehumidificationComparison(
    latestRegionResults.filter((item) => selectedRegionComparisonKeys.has(item.key)),
  );
  renderUnmetTrend(
    latestRegionResults.filter((item) => selectedRegionComparisonKeys.has(item.key)),
  );
}

function toggleRegionComparison(key) {
  if (!key || !latestRegionResults.some((item) => item.key === key)) return;
  if (selectedRegionComparisonKeys.has(key)) {
    if (selectedRegionComparisonKeys.size > 1) selectedRegionComparisonKeys.delete(key);
  } else {
    selectedRegionComparisonKeys.add(key);
  }
  renderRegionResults(latestRegionResults);
}

function targetAreaNeighborhood(candidates, radius = 2) {
  if (!Array.isArray(candidates) || candidates.length <= radius * 2 + 1) return candidates || [];
  const targetIndex = candidates.findIndex((candidate) => candidate.targetAchieved);
  const centerIndex = targetIndex >= 0 ? targetIndex : candidates.length - 1;
  const windowSize = radius * 2 + 1;
  const start = clamp(centerIndex - radius, 0, candidates.length - windowSize);
  return candidates.slice(start, start + windowSize);
}

function renderCandidateRows(candidates) {
  $("candidateRows").innerHTML = targetAreaNeighborhood(candidates)
    .map(
      (candidate) => `
        <tr class="candidate-row${candidate.targetAchieved ? " active" : ""}">
          <td>${formatNumber(candidate.collectorArea)} m²</td>
          <td>${formatNumber(candidate.regenNeed)} kWh</td>
          <td>${formatNumber(candidate.usefulSolar)} kWh</td>
          <td>${formatNumber(candidate.monthlyMinimumCoverage * 100, 1)} %</td>
          <td>${formatNumber(candidate.unutilizedSolar)} kWh</td>
          <td>${formatNumber(candidate.auxEnergy)} kWh</td>
          <td>${candidate.targetAchieved ? "충족" : "-"}</td>
          <td>${formatNumber(candidate.targetDehumidification)} kg</td>
          <td>${formatNumber(candidate.actualDehumidification)} kg</td>
          <td>${formatNumber(candidate.dehumidificationAchievement * 100, 1)} %</td>
        </tr>
      `,
    )
    .join("") || `<tr class="empty-result-row"><td colspan="10">면적별 계산 결과가 없습니다.</td></tr>`;
}

const monthlyComparisonColors = ["#173f73", "#e18424", "#147d91", "#2f855a", "#c84b4b", "#7157a5", "#2f64a3", "#9a6b16", "#b04f86", "#5f7f35", "#bd6b35", "#3f7f88", "#7b5c3f", "#5964a9"];

function regionComparisonColor(key) {
  const index = Math.max(0, latestRegionResults.findIndex((item) => item.key === key));
  return monthlyComparisonColors[index % monthlyComparisonColors.length];
}

function renderRegionAreaComparison(entries) {
  if (!entries.length) return;
  const rows = entries.flatMap((item) => {
    const label = weatherDatasets[item.key]?.label?.replace(" · TMYx 2011–2025", "") || item.key;
    const color = regionComparisonColor(item.key);
    const candidates = item.result.areaResults || item.result.candidates || [item.result.best];
    return targetAreaNeighborhood(candidates).map((candidate) => `
      <tr class="candidate-row region-area-row${candidate.targetAchieved ? " active" : ""}" style="--region-color:${color}">
        <td><span class="region-area-label"><i style="background:${color}"></i>${label}</span><br>${formatNumber(candidate.collectorArea)} m²</td>
        <td>${formatNumber(candidate.regenNeed)} kWh</td>
        <td>${formatNumber(candidate.usefulSolar)} kWh</td>
        <td>${formatNumber(candidate.monthlyMinimumCoverage * 100, 1)} %</td>
        <td>${formatNumber(candidate.unutilizedSolar)} kWh</td>
        <td>${formatNumber(candidate.auxEnergy)} kWh</td>
        <td>${candidate.targetAchieved ? "충족" : "-"}</td>
        <td>${formatNumber(candidate.targetDehumidification)} kg</td>
        <td>${formatNumber(candidate.actualDehumidification)} kg</td>
        <td>${formatNumber(candidate.dehumidificationAchievement * 100, 1)} %</td>
      </tr>
    `);
  });
  $("candidateRows").innerHTML = rows.join("");
  const labels = entries.map((item) => weatherDatasets[item.key]?.label?.replace(" · TMYx 2011–2025", "") || item.key);
  $("areaBasisSummary").textContent = `${labels.join(", ")} 실제 기상계산 기준 · 목표 커버율 충족 면적과 전·후 2개 면적만 표시`;
}

function renderRegionMonthlyComparison(entries) {
  if (!entries.length || !entries.every((item) => item.result?.monthly?.length)) return;
  const series = entries.map((item, index) => ({
    ...item,
    color: regionComparisonColor(item.key),
    label: weatherDatasets[item.key]?.label?.replace(" · TMYx 2011–2025", "") || item.key,
  }));
  const months = series[0].result.monthly;
  const maxValue = Math.max(...months.map((_, monthIndex) => Math.max(
    ...series.flatMap((item) => [
      Number(item.result.monthly[monthIndex]?.load) || 0,
      Number(item.result.monthly[monthIndex]?.solar) || 0,
      Number(item.result.monthly[monthIndex]?.unusedSolar) || 0,
    ]),
  )), 1);
  const barWidth = Math.max(3, Math.min(11, 72 / (series.length * 3)));
  $("monthlyChart").style.setProperty("--month-count", Math.max(months.length, 1));
  $("monthlyChart").innerHTML = months.map((month, monthIndex) => {
    const bars = series.map((item) => {
      const load = Number(item.result.monthly[monthIndex]?.load) || 0;
      const solar = Number(item.result.monthly[monthIndex]?.solar) || 0;
      const unused = Number(item.result.monthly[monthIndex]?.unusedSolar) || 0;
      const loadHeight = clamp((load / maxValue) * 210, 5, 210);
      const solarHeight = clamp((solar / maxValue) * 210, 5, 210);
      const unusedHeight = clamp((unused / maxValue) * 210, unused > 0 ? 5 : 0, 210);
      return `
        <div class="bar comparison-series" style="height:${loadHeight}px;width:${barWidth}px;background:${item.color}" title="${item.label} 재생열 요구량: ${formatNumber(load)} kWh"><span class="sr-only">${item.label} 재생열 요구량 ${formatNumber(load)} kWh</span></div>
        <div class="bar solar comparison-series region-solar-bar" style="height:${solarHeight}px;width:${barWidth}px;--region-color:${item.color}" title="${item.label} 태양열 실사용: ${formatNumber(solar)} kWh"><span class="sr-only">${item.label} 태양열 실사용 ${formatNumber(solar)} kWh</span></div>
        <div class="bar comparison-series unused-solar-bar" style="height:${unusedHeight}px;width:${barWidth}px;--region-color:${item.color}" title="${item.label} 미활용 태양열: ${formatNumber(unused)} kWh"><span class="sr-only">${item.label} 미활용 태양열 ${formatNumber(unused)} kWh</span></div>`;
    }).join("");
    return `<div class="month-group"><div class="bars">${bars}</div><div class="month-label">${month.month}</div></div>`;
  }).join("");
  $("monthlyLegend").innerHTML = series.map((item) =>
    `<span><i style="background:${item.color}"></i>${item.label} 재생열 요구량</span><span><i class="region-solar-swatch" style="--region-color:${item.color}"></i>${item.label} 태양열 실사용</span><span><i class="unused-solar-swatch" style="--region-color:${item.color}"></i>${item.label} 미활용 태양열</span>`,
  ).join("");
  $("seasonSummary").textContent = `${series.length}개 지역 비교 · 미활용 태양열은 월 총생산 중 같은 달 재생부하에도 사용되지 못한 열`;
}

function renderDehumidificationComparison(entries) {
  const chart = $("dehumidificationChart");
  const rows = $("dehumidificationRows");
  if (!chart || !rows) return;
  if (!entries.length || !entries.every((item) => item.result?.monthly?.length)) {
    chart.innerHTML = `<p class="result-empty">비교할 지역 계산 결과가 없습니다.</p>`;
    rows.innerHTML = `<tr><td colspan="7">비교할 데이터가 없습니다.</td></tr>`;
    return;
  }
  const series = entries.map((item) => ({
    ...item,
    color: regionComparisonColor(item.key),
    label: weatherDatasets[item.key]?.label?.replace(" · TMYx 2011–2025", "") || item.key,
  }));
  const months = series[0].result.monthly;
  const maxValue = Math.max(...series.flatMap((item) => item.result.monthly.flatMap((month) => [
    Number(month.targetDehumidification) || 0,
    Number(month.actualDehumidification) || 0,
  ])), 1);
  const barWidth = Math.max(3, Math.min(12, 64 / (series.length * 2)));
  chart.style.setProperty("--month-count", Math.max(months.length, 1));
  chart.innerHTML = months.map((month, monthIndex) => {
    const bars = series.map((item) => {
      const data = item.result.monthly[monthIndex] || {};
      const target = Number(data.targetDehumidification) || 0;
      const actual = Number(data.actualDehumidification) || 0;
      const targetHeight = clamp((target / maxValue) * 210, target > 0 ? 5 : 0, 210);
      const actualHeight = clamp((actual / maxValue) * 210, actual > 0 ? 5 : 0, 210);
      return `
        <div class="bar comparison-series dehumid-target-bar" style="height:${targetHeight}px;width:${barWidth}px;--region-color:${item.color}" title="${item.label} 목표 제습량: ${formatNumber(target)} kg" data-value="${formatNumber(target)}"><span class="sr-only">${item.label} 목표 제습량 ${formatNumber(target)} kg</span></div>
        <div class="bar comparison-series" style="height:${actualHeight}px;width:${barWidth}px;background:${item.color}" title="${item.label} 실제 제습량: ${formatNumber(actual)} kg" data-value="${formatNumber(actual)}"><span class="sr-only">${item.label} 실제 제습량 ${formatNumber(actual)} kg</span></div>`;
    }).join("");
    return `<div class="month-group"><div class="bars">${bars}</div><div class="month-label">${month.month}</div></div>`;
  }).join("");
  $("dehumidificationLegend").innerHTML = series.map((item) => `
    <span><i class="dehumid-target-swatch" style="--region-color:${item.color}"></i>${item.label} 목표</span>
    <span><i style="background:${item.color}"></i>${item.label} 실제</span>
  `).join("");
  rows.innerHTML = months.flatMap((month, monthIndex) => series.map((item) => {
    const data = item.result.monthly[monthIndex] || {};
    const achievement = data.dehumidificationAchievement;
    const achievementText = achievement == null ? "해당 없음" : `${formatNumber(Number(achievement) * 100, 1)} %`;
    const acceptedText = data.dehumidificationAccepted == null ? "해당 없음" : (data.dehumidificationAccepted ? "달성" : "미달");
    return `<tr><td>${month.month}</td><td>${item.label}</td><td>${formatNumber(data.targetDehumidification)} kg</td><td>${formatNumber(data.acceptableMinDehumidification)} kg</td><td>${formatNumber(data.actualDehumidification)} kg</td><td>${achievementText}</td><td>${acceptedText}</td></tr>`;
  })).join("");
  const totals = series.map((item) => item.result.best);
  $("dehumidificationSummary").textContent = totals.map((best, index) =>
    `${series[index].label} 실제 ${formatNumber(best.actualDehumidification)} kg · 목표 ${formatNumber(best.targetDehumidification)} kg · 허용 최소 ${formatNumber(best.acceptableMinDehumidification)} kg (${formatNumber(best.dehumidificationAchievement * 100, 1)}%) · ${best.dehumidificationAccepted ? "달성" : "미달"} · 허용 ${formatNumber(best.targetSupplyHumidity, 1)}~${formatNumber(best.acceptedUpperHumidity, 1)} g/kg`,
  ).join(" · ");
}

function renderUnmetTrend(entries) {
  const chart = $("unmetTrendChart");
  const cards = $("unmetTrendCards");
  const rows = $("unmetEventRows");
  if (!chart || !cards || !rows) return;
  const series = entries.map((item) => ({
    ...item,
    color: regionComparisonColor(item.key),
    label: weatherDatasets[item.key]?.label?.replace(" · TMYx 2011–2025", "") || item.key,
    trend: item.result?.unmetTrend || { totalHours: 0, maxHumidityExcess: 0, averageHumidityExcess: 0, daily: [], events: [] },
  }));
  if (!series.length) {
    cards.innerHTML = "";
    chart.innerHTML = `<p class="result-empty">비교할 지역 계산 결과가 없습니다.</p>`;
    rows.innerHTML = `<tr><td colspan="8">비교할 데이터가 없습니다.</td></tr>`;
    return;
  }
  cards.innerHTML = series.map((item) => `
    <article class="unmet-summary-card" style="--region-color:${item.color}">
      <strong>${item.label}</strong>
      <span>${formatNumber(item.trend.totalHours, 1)} h</span>
      <small>미충족 평균 급기 ${formatNumber(Number(item.result.best.acceptedUpperHumidity) + Number(item.trend.averageHumidityExcess), 2)} g/kg · 최대 ${formatNumber(Number(item.result.best.acceptedUpperHumidity) + Number(item.trend.maxHumidityExcess), 2)} g/kg</small>
    </article>
  `).join("");
  const events = series.flatMap((item) => item.trend.events.map((event) => ({ ...event, key: item.key, label: item.label, color: item.color })));
  const plotEvents = series.flatMap((item) => item.trend.events.map((event) => ({ ...event, key: item.key, label: item.label, color: item.color })));
  if (plotEvents.length) {
    const parsedTimes = plotEvents.map((event) => new Date(event.time.replace(" ", "T")).getTime());
    const minTime = Math.min(...parsedTimes);
    const maxTime = Math.max(...parsedTimes);
    const acceptedUppers = series.map((item) => Number(item.result.best.acceptedUpperHumidity) || 10.5);
    const minY = Math.max(0, Math.min(...acceptedUppers) - 0.5);
    const maxY = Math.max(...plotEvents.map((event) => Number(event.supplyHumidity) || 0), ...acceptedUppers) + 0.5;
    const width = Math.max(920, Math.min(1800, ((maxTime - minTime) / 86400000) * 4));
    const height = 330;
    const margin = { left: 58, right: 24, top: 28, bottom: 42 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const x = (time) => margin.left + ((time - minTime) / Math.max(maxTime - minTime, 1)) * plotWidth;
    const y = (value) => margin.top + (1 - (value - minY) / Math.max(maxY - minY, 0.1)) * plotHeight;
    const yTicks = Array.from({ length: 6 }, (_, index) => minY + (maxY - minY) * index / 5);
    const xTicks = Array.from({ length: 7 }, (_, index) => minTime + (maxTime - minTime) * index / 6);
    const grid = yTicks.map((tick) => `<line x1="${margin.left}" y1="${y(tick)}" x2="${width - margin.right}" y2="${y(tick)}" class="humidity-grid"/><text x="${margin.left - 8}" y="${y(tick) + 4}" text-anchor="end">${formatNumber(tick, 1)}</text>`).join("");
    const xLabels = xTicks.map((tick) => `<text x="${x(tick)}" y="${height - 14}" text-anchor="middle">${new Date(tick).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</text>`).join("");
    const lines = series.map((item) => {
      const itemEvents = item.trend.events;
      if (!itemEvents.length) return "";
      const path = itemEvents.map((event, index) => `${index ? "L" : "M"}${x(new Date(event.time.replace(" ", "T")).getTime()).toFixed(1)},${y(Number(event.supplyHumidity)).toFixed(1)}`).join(" ");
      const upper = Number(item.result.best.acceptedUpperHumidity) || 10.5;
      const averageSupply = upper + Number(item.trend.averageHumidityExcess || 0);
      return `<path d="${path}" fill="none" stroke="${item.color}" stroke-width="2.2"/><line x1="${margin.left}" y1="${y(averageSupply)}" x2="${width - margin.right}" y2="${y(averageSupply)}" stroke="${item.color}" class="humidity-average-line"/><text x="${width - margin.right - 4}" y="${y(averageSupply) - 5}" text-anchor="end" fill="${item.color}">${item.label} 평균 ${formatNumber(averageSupply, 2)}</text>`;
    }).join("");
    const upper = Math.min(...acceptedUppers);
    const legend = series.map((item) => `<span style="color:${item.color}"><i style="background:${item.color}"></i>${item.label} 급기 절대습도</span>`).join("");
    chart.style.minWidth = `${width}px`;
    chart.innerHTML = `<div class="humidity-line-legend">${legend}<span><i class="upper-limit-swatch"></i>허용상한 ${formatNumber(upper, 1)} g/kg</span><span><i class="average-line-swatch"></i>미충족 평균</span></div><svg viewBox="0 0 ${width} ${height}" role="img"><text x="12" y="16" class="humidity-axis-title">g/kgDA</text>${grid}${xLabels}<line x1="${margin.left}" y1="${y(upper)}" x2="${width - margin.right}" y2="${y(upper)}" class="humidity-upper-line"/>${lines}</svg>`;
  } else {
    chart.style.minWidth = "720px";
    chart.innerHTML = `<p class="result-empty">선택한 조건에서는 목표 제습 미충족 시간이 없습니다.</p>`;
  }
  const formatEventTime = (value) => {
    const date = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getMonth() + 1}월 ${date.getDate()}일 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };
  rows.innerHTML = events.length ? events.map((event) => `
    <tr><td style="color:${event.color};font-weight:800">${event.label}</td><td>${formatEventTime(event.time)}</td><td>${formatNumber(event.durationHours, 2)} h</td><td>${formatNumber(event.outdoorTemp, 1)} °C</td><td>${formatNumber(event.outdoorHumidity, 2)} g/kgDA</td><td>${formatNumber(event.supplyHumidity, 2)} g/kgDA</td><td>${formatNumber(event.humidityExcess, 2)} g/kgDA</td></tr>
  `).join("") : `<tr><td colspan="7">미충족 구간이 없습니다.</td></tr>`;
  $("unmetTrendSummary").textContent = `시간별 급기 절대습도와 허용상한·미충족 평균 비교 · ${events.length}개 미충족 구간`;
}

function renderCandidateMonthlyComparison(selections) {
  if (!selections.length || !selections.every((item) => item.candidate?.monthly?.length)) return;
  const comparison = selections.map((item, index) => ({
    ...item,
    color: monthlyComparisonColors[index % monthlyComparisonColors.length],
  }));
  const months = comparison[0].candidate.monthly;
  $("monthlyChart").style.setProperty("--month-count", Math.max(months.length, 1));
  const maxValue = Math.max(
    ...months.map((item, monthIndex) => Math.max(
      Number(item.load) || 0,
      ...comparison.map((selection) => Number(selection.candidate.monthly[monthIndex]?.solar) || 0),
      ...comparison.map((selection) => Number(selection.candidate.monthly[monthIndex]?.unusedSolar) || 0),
    )),
    1,
  );
  const seriesWidth = Math.max(3, Math.min(11, 72 / (comparison.length * 2)));

  $("monthlyChart").innerHTML = months.map((item, monthIndex) => {
    const loadHeight = clamp(((Number(item.load) || 0) / maxValue) * 210, 5, 210);
    const solarBars = comparison.map((selection) => {
      const solar = Number(selection.candidate.monthly[monthIndex]?.solar) || 0;
      const unused = Number(selection.candidate.monthly[monthIndex]?.unusedSolar) || 0;
      const height = clamp((solar / maxValue) * 210, 5, 210);
      const unusedHeight = clamp((unused / maxValue) * 210, unused > 0 ? 5 : 0, 210);
      return `<div class="bar solar comparison-series" style="height:${height}px;width:${seriesWidth}px;background:${selection.color}" data-value="${formatNumber(solar / 1000, 1)}" title="${selection.label} 태양열 실사용: ${formatNumber(solar)} kWh"><span class="sr-only">${selection.label} 태양열 실사용</span></div><div class="bar comparison-series unused-solar-bar" style="height:${unusedHeight}px;width:${seriesWidth}px;--region-color:${selection.color}" title="${selection.label} 미활용 태양열: ${formatNumber(unused)} kWh"><span class="sr-only">${selection.label} 미활용 태양열</span></div>`;
    }).join("");
    return `
      <div class="month-group">
        <div class="bars">
          <div class="bar need" style="height:${loadHeight}px" data-value="${formatNumber((Number(item.load) || 0) / 1000, 1)}"></div>
          ${solarBars}
        </div>
        <div class="month-label">${item.month}</div>
      </div>
    `;
  }).join("");

  $("monthlyLegend").innerHTML = `
    <span><i style="background:var(--navy)"></i>재생열 요구량</span>
    ${comparison.map((selection) => `<span><i style="background:${selection.color}"></i>${selection.label} 실사용</span><span><i class="unused-solar-swatch" style="--region-color:${selection.color}"></i>${selection.label} 미활용</span>`).join("")}
  `;
  const totals = comparison.map((selection) => selection.candidate.monthly.reduce(
    (sum, item) => sum + (Number(item.solar) || 0),
    0,
  ));
  $("seasonSummary").textContent = comparison.length === 1
    ? `${comparison[0].label} · 태양열 공급 ${formatNumber(totals[0])} kWh · 보조열원 ${formatNumber(comparison[0].candidate.auxEnergy)} kWh`
    : `${comparison.length}개 설계안 비교 · 태양열 공급 ${formatNumber(Math.min(...totals))}~${formatNumber(Math.max(...totals))} kWh`;
}

function bindCandidateRows(chart, candidates, onActivate) {
  const activateCandidate = (index, shouldScroll = false) => {
    $("candidateRows").querySelectorAll(".candidate-row").forEach((row) => {
      row.classList.toggle("active", Number(row.dataset.candidateIndex) === index);
    });
    chart.querySelectorAll(".candidate-point-group").forEach((point) => {
      point.classList.toggle("active", Number(point.dataset.candidateIndex) === index);
    });
    if (shouldScroll) {
      const row = $("candidateRows").querySelector(`[data-candidate-index="${index}"]`);
      row?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
    onActivate?.(candidates[index], index);
  };

  chart.onclick = (event) => {
    const point = event.target.closest(".candidate-point-group");
    if (point) activateCandidate(Number(point.dataset.candidateIndex), true);
  };
  chart.onkeydown = (event) => {
    const point = event.target.closest(".candidate-point-group");
    if (point && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      activateCandidate(Number(point.dataset.candidateIndex), true);
    }
  };
}

function renderCandidates(candidates, hierarchy = []) {
  const visibleCandidates = candidates.slice(0, 8);
  const drilldown = $("refinementDrilldown");
  const stageOneChart = $("stageOneChart");
  const stageTwoChart = $("candidateChart");
  const selectedCandidates = new Map();
  let parentCandidates = [];
  let currentChildren = [];

  const selectionKey = (level, candidate) =>
    `${level}:${candidate.collectorArea}:${candidate.tesVolume}:${candidate.tesDesignFlow}`;
  const selectionLabel = (level, candidate) => level === "coarse"
    ? `1차 ${formatNumber(candidate.collectorArea)} m²`
    : `2차 ${formatNumber(candidate.collectorArea)} m² · ${formatNumber(candidate.tesVolume, 1)} m³ · ${formatNumber(candidate.tesDesignFlow, 2)} m³/h`;
  const syncSelectionStyles = () => {
    stageOneChart.querySelectorAll(".candidate-point-group").forEach((point) => {
      const candidate = parentCandidates[Number(point.dataset.candidateIndex)];
      point.classList.toggle("comparison-selected", Boolean(candidate && selectedCandidates.has(selectionKey("coarse", candidate))));
    });
    stageTwoChart.querySelectorAll(".candidate-point-group").forEach((point) => {
      const candidate = currentChildren[Number(point.dataset.candidateIndex)];
      point.classList.toggle("comparison-selected", Boolean(candidate && selectedCandidates.has(selectionKey("refined", candidate))));
    });
    $("candidateRows").querySelectorAll(".candidate-row").forEach((row) => {
      const candidate = currentChildren[Number(row.dataset.candidateIndex)];
      row.classList.toggle("comparison-selected", Boolean(candidate && selectedCandidates.has(selectionKey("refined", candidate))));
    });
    $("selectionStatus").textContent = `${selectedCandidates.size}개 선택 · 다시 누르면 선택 해제`;
  };
  const updateComparison = () => {
    renderCandidateMonthlyComparison([...selectedCandidates.values()]);
    syncSelectionStyles();
  };
  const addSelection = (level, candidate) => {
    const key = selectionKey(level, candidate);
    selectedCandidates.set(key, { candidate, label: selectionLabel(level, candidate) });
    updateComparison();
  };
  const toggleSelection = (level, candidate) => {
    const key = selectionKey(level, candidate);
    if (selectedCandidates.has(key)) {
      if (selectedCandidates.size > 1) selectedCandidates.delete(key);
    } else {
      selectedCandidates.set(key, { candidate, label: selectionLabel(level, candidate) });
    }
    updateComparison();
  };

  const renderStageTwo = (group) => {
    const children = (group?.children || []).slice(0, 8);
    currentChildren = children;
    $("stageTwoTitle").textContent = `2차 세분화 · ${formatNumber(group.parent.collectorArea)} m² 주변`;
    $("stageTwoNote").textContent = children.length
      ? `${children.length}개 Pareto 상세안 · TES 용량, 설계유량 및 보조열원 비교`
      : "이 1차 후보에 연결된 2차 상세안이 없습니다.";
    renderCandidateChart(children, stageTwoChart);
    renderCandidateRows(children);
    bindCandidateRows(stageTwoChart, children, (candidate) => toggleSelection("refined", candidate));
    stageTwoChart.querySelectorAll(".candidate-point-group").forEach((point) => point.classList.remove("active"));
    $("candidateRows").querySelectorAll(".candidate-row").forEach((row) => row.classList.remove("active"));
    syncSelectionStyles();
  };

  if (hierarchy.length) {
    drilldown.classList.remove("is-hidden");
    parentCandidates = hierarchy.map((group) => group.parent);
    renderCandidateChart(parentCandidates, stageOneChart, { xMetric: "collectorArea" });
    const activateParent = (index, toggle = true) => {
      stageOneChart.querySelectorAll(".candidate-point-group").forEach((point) => {
        point.classList.toggle("active", Number(point.dataset.candidateIndex) === index);
      });
      renderStageTwo(hierarchy[index]);
      if (toggle) toggleSelection("coarse", hierarchy[index].parent);
    };
    stageOneChart.onclick = (event) => {
      const point = event.target.closest(".candidate-point-group");
      if (point) activateParent(Number(point.dataset.candidateIndex));
    };
    stageOneChart.onkeydown = (event) => {
      const point = event.target.closest(".candidate-point-group");
      if (point && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        activateParent(Number(point.dataset.candidateIndex));
      }
    };
    activateParent(0, false);
    addSelection("coarse", hierarchy[0].parent);
    return;
  }

  drilldown.classList.add("is-hidden");
  stageOneChart.innerHTML = "";
  currentChildren = visibleCandidates;
  renderCandidateChart(visibleCandidates, stageTwoChart);
  renderCandidateRows(visibleCandidates);
  bindCandidateRows(stageTwoChart, visibleCandidates, (candidate) => toggleSelection("refined", candidate));
  if (visibleCandidates[0]?.monthly?.length) addSelection("refined", visibleCandidates[0]);
}

function renderCandidateChart(candidates, chart = $("candidateChart"), options = {}) {
  if (!candidates.length) {
    chart.innerHTML = "";
    return;
  }

  const width = 860;
  const height = 320;
  const margin = { top: 22, right: 28, bottom: 58, left: 82 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const volumes = candidates.map((candidate) => Number(candidate.tesVolume) || 0);
  const auxiliary = candidates.map((candidate) => Number(candidate.auxEnergy) || 0);
  const collectorAreas = candidates.map((candidate) => Number(candidate.collectorArea) || 0);
  const xUsesCollectorArea = options.xMetric === "collectorArea";
  const xValues = xUsesCollectorArea ? collectorAreas : volumes;
  const radiusValues = xUsesCollectorArea ? volumes : collectorAreas;
  const xMinRaw = Math.min(...xValues);
  const xMaxRaw = Math.max(...xValues);
  const yMinRaw = Math.min(...auxiliary);
  const yMaxRaw = Math.max(...auxiliary);
  const xPadding = Math.max((xMaxRaw - xMinRaw) * 0.12, Math.max(xMaxRaw, 1) * 0.04);
  const yPadding = Math.max((yMaxRaw - yMinRaw) * 0.14, Math.max(yMaxRaw, 1) * 0.025);
  const xMin = Math.max(0, xMinRaw - xPadding);
  const xMax = xMaxRaw + xPadding;
  const yMin = Math.max(0, yMinRaw - yPadding);
  const yMax = yMaxRaw + yPadding;
  const radiusMin = Math.min(...radiusValues);
  const radiusMax = Math.max(...radiusValues);
  const xScale = (value) => margin.left + ((value - xMin) / Math.max(xMax - xMin, 1e-9)) * plotWidth;
  const yScale = (value) => margin.top + plotHeight - ((value - yMin) / Math.max(yMax - yMin, 1e-9)) * plotHeight;
  const radiusScale = (value) => 9 + ((value - radiusMin) / Math.max(radiusMax - radiusMin, 1e-9)) * 9;
  const tickCount = 5;

  const grid = Array.from({ length: tickCount }, (_, index) => {
    const ratio = index / (tickCount - 1);
    const x = margin.left + ratio * plotWidth;
    const y = margin.top + ratio * plotHeight;
    const xValue = xMin + ratio * (xMax - xMin);
    const yValue = yMax - ratio * (yMax - yMin);
    return `
      <line class="grid-line" x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + plotHeight}" />
      <line class="grid-line" x1="${margin.left}" y1="${y}" x2="${margin.left + plotWidth}" y2="${y}" />
      <text x="${x}" y="${height - 34}" text-anchor="middle">${formatNumber(xValue, 1)}</text>
      <text x="${margin.left - 12}" y="${y + 4}" text-anchor="end">${formatNumber(yValue / 1000, 1)}</text>
    `;
  }).join("");

  const points = candidates.map((candidate, index) => {
    const x = xScale(xUsesCollectorArea ? Number(candidate.collectorArea) || 0 : Number(candidate.tesVolume) || 0);
    const y = yScale(Number(candidate.auxEnergy) || 0);
    const radius = radiusScale(xUsesCollectorArea ? Number(candidate.tesVolume) || 0 : Number(candidate.collectorArea) || 0);
    const stage = candidate.searchStage === "refined" ? "refined" : "coarse";
    const stageLabel = stage === "refined" ? "2차 세분화" : "1차 세분화";
    const pointClass = `candidate-point stage-${stage}${index === 0 ? " selected-design" : ""}`;
    const description = `순위 ${index + 1}, ${stageLabel}: 집열기 ${formatNumber(candidate.collectorArea)} m², TES ${formatNumber(candidate.tesVolume, 1)} m³, 설계유량 ${formatNumber(candidate.tesDesignFlow || 0, 2)} m³/h, 보조열원 ${formatNumber(candidate.auxEnergy)} kWh`;
    return `
      <g class="candidate-point-group${index === 0 ? " active" : ""}" data-candidate-index="${index}" role="button" tabindex="0" aria-label="${description}">
        <circle class="${pointClass}" cx="${x}" cy="${y}" r="${radius}"><title>${description}</title></circle>
        <text class="point-rank" x="${x}" y="${y}">${index + 1}</text>
      </g>
    `;
  }).join("");

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      ${grid}
      <line class="axis-line" x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" />
      <line class="axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" />
      ${points}
      <text class="axis-title" x="${margin.left + plotWidth / 2}" y="${height - 8}" text-anchor="middle">${xUsesCollectorArea ? "집열기 면적 (m²)" : "TES 용량 (m³)"}</text>
      <text class="axis-title" x="18" y="${margin.top + plotHeight / 2}" text-anchor="middle" transform="rotate(-90 18 ${margin.top + plotHeight / 2})">보조열원 (MWh/선택기간)</text>
    </svg>
  `;
}

function renderBackendChart(monthly) {
  $("monthlyChart").style.setProperty("--month-count", Math.max(monthly.length, 1));
  const maxValue = Math.max(...monthly.map((item) => Math.max(item.load || 0, item.solar || 0, item.unusedSolar || 0, item.aux || 0)), 1);

  $("monthlyChart").innerHTML = monthly
    .map((item) => {
      const loadHeight = clamp(((item.load || 0) / maxValue) * 210, 5, 210);
      const solarHeight = clamp(((item.solar || 0) / maxValue) * 210, 5, 210);
      const unusedHeight = clamp(((item.unusedSolar || 0) / maxValue) * 210, item.unusedSolar > 0 ? 5 : 0, 210);
      return `
        <div class="month-group">
          <div class="bars">
            <div class="bar need" style="height:${loadHeight}px" data-value="${formatNumber((item.load || 0) / 1000, 1)}"></div>
            <div class="bar solar" style="height:${solarHeight}px" data-value="${formatNumber((item.solar || 0) / 1000, 1)}"></div>
            <div class="bar unused-solar-bar" style="height:${unusedHeight}px" data-value="${formatNumber((item.unusedSolar || 0) / 1000, 1)}"></div>
          </div>
          <div class="month-label">${item.month}</div>
        </div>
      `;
    })
    .join("");
  $("monthlyLegend").innerHTML = `<span><i style="background:var(--navy)"></i>재생열 요구량</span><span><i style="background:var(--amber)"></i>태양열 실사용</span><span><i class="unused-solar-swatch"></i>미활용 태양열</span>`;
}

function renderPythonResult(result, input) {
  const best = result.best;
  renderValidityWarnings(result.warnings || empiricalWarnings(input));
  renderMetrics(best, input);
  renderBackendChart(result.monthly);
  renderDehumidificationComparison([{ key: input.weatherKey || "selected", result }]);
  renderUnmetTrend([{ key: input.weatherKey || "selected", result }]);
  $("seasonSummary").textContent =
    `Python 엔진 · 요구 재생열 ${formatNumber(best.regenNeed)} kWh · TES 실사용 ${formatNumber(best.usefulSolar)} kWh · 실사용 커버율 ${formatNumber(best.solarUseCoverage * 100, 1)} %`;
  renderCandidateRows(result.areaResults || result.candidates || [best]);
}

function animateFlow() {
  const cards = [...document.querySelectorAll(".flow-card")];
  cards.forEach((card) => card.classList.remove("active"));
  cards.forEach((card, index) => {
    window.setTimeout(() => card.classList.add("active"), index * 90);
  });
}

function estimateCalculation(input) {
  const candidateCount = 30;
  const daysByMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const weatherHours = input.simulationMonths.reduce((hours, month) => hours + daysByMonth[month - 1] * 24, 0);
  const centerSeconds = 2 + candidateCount * 0.003 * Math.max(weatherHours / 4392, 0.08);
  const lowSeconds = Math.max(3, Math.round(centerSeconds * 0.75));
  const highSeconds = Math.max(lowSeconds + 2, Math.ceil(centerSeconds * 1.5));
  return { candidateCount, weatherHours, lowSeconds, highSeconds };
}

function clearResultOutputs(message = "입력값을 확인한 뒤 계산을 실행하세요.") {
  $("heroResultLabel").textContent = "계산 대기";
  $("optimalDesign").textContent = "-";
  $("designNote").textContent = message;
  ["optimalCollector", "optimalTes", "optimalTesFlow", "solarShare", "unutilizedSolar", "auxEnergy", "unmetHours", "recommendedOps"]
    .forEach((id) => { $(id).textContent = "-"; });
  $("seasonSummary").textContent = message;
  $("monthlyLegend").innerHTML = "";
  $("monthlyChart").innerHTML = `<div class="result-empty">계산 후 월별 결과가 표시됩니다.</div>`;
  $("cityList").innerHTML = `<tr><td colspan="5">계산 후 선택 지역의 실제 결과가 표시됩니다.</td></tr>`;
  $("candidateRows").innerHTML = `<tr class="empty-result-row"><td colspan="6">계산 결과가 없습니다.</td></tr>`;
}

function markResultsPending() {
  const input = readInputs();
  const validationMessages = validateDesignInputs(input);
  renderCalculationIssues(validationMessages);
  renderValidityWarnings(empiricalWarnings(input));
  clearResultOutputs();
  if (validationMessages.length > 0) {
    $("statusPill").textContent = "입력 오류";
    $("calculationTiming").textContent = "입력값 수정 필요";
    return;
  }
  const estimate = estimateCalculation(input);
  $("statusPill").textContent = "계산 필요";
  $("calculationTiming").textContent =
    `예상 ${estimate.lowSeconds}~${estimate.highSeconds}초 · ${formatNumber(estimate.candidateCount)}개 조합`;
}

function restoreCalculationInputs(input) {
  Object.entries(input || {}).forEach(([key, value]) => {
    const element = $(key);
    if (element && element.type !== "file") {
      element.value = value;
    }
  });
  if (String(input?.weatherDataset || "").startsWith("uploaded:")) {
    activeUploadDataset = input.weatherDataset;
  }
  setSelectedSimulationMonths(input?.simulationMonths || Array.from({ length: 12 }, (_, index) => index + 1));
  updateAnalysisPeriodFields();
  toggleWeatherModeFields();
  toggleCoordinateFields(getCurrentWeatherDatasetKey());
  toggleWeatherValueFields(getCurrentWeatherDatasetKey());
  updateBuildingModeFields();
}

async function runCalculation() {
  const input = readInputs();
  const validationMessages = validateDesignInputs(input);
  renderCalculationIssues(validationMessages);
  if (validationMessages.length > 0) {
    $("statusPill").textContent = "입력 오류";
    renderValidityWarnings(empiricalWarnings(input));
    $("seasonSummary").textContent = validationMessages.join(" ");
    return;
  }

  const estimate = estimateCalculation(input);
  $("statusPill").textContent = "계산 중";
  $("runButton").disabled = true;
  $("runButton").textContent = "계산 중";
  $("calculationTiming").textContent =
    `지역별 계산 준비 · ${input.weatherDatasets.length}개 지역`;
  animateFlow();

  const datasetKeys = input.weatherDatasets;
  const results = new Array(datasetKeys.length);
  let nextIndex = 0;
  let completed = 0;
  const worker = async () => {
    while (nextIndex < datasetKeys.length) {
      const index = nextIndex++;
      const key = datasetKeys[index];
      try {
        const response = await requestJson("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, weatherDataset: key }),
        });
        if (!response.ok || response.result.error) {
          throw new Error(response.result.error || `HTTP ${response.status}`);
        }
        results[index] = { key, result: response.result };
      } catch (error) {
        results[index] = { key, error: error.message };
      }
      completed += 1;
      $("calculationTiming").textContent = `${completed}/${datasetKeys.length}개 지역 계산 완료`;
      renderRegionResults(results.filter(Boolean));
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(3, datasetKeys.length) }, () => worker()));
    const successful = results.filter((item) => item?.result);
    if (!successful.length) throw new Error("선택한 모든 지역의 계산에 실패했습니다.");
    const detailed = successful.find((item) => item.key === input.weatherDataset) || successful[0];
    if (detailed.key !== $("weatherDataset").value) {
      $("weatherDataset").value = detailed.key;
      applyWeatherDataset(detailed.key);
    }
    renderCalculationIssues([]);
    renderPythonResult(detailed.result, { ...input, weatherDataset: detailed.key });
    selectedRegionComparisonKeys.clear();
    selectedRegionComparisonKeys.add(detailed.key);
    renderRegionResults(results);
    const failedCount = results.filter((item) => item?.error).length;
    $("statusPill").textContent = failedCount ? "일부 완료" : "계산 완료";
    $("calculationTiming").textContent = `${successful.length}/${datasetKeys.length}개 지역 완료 · 지역당 ${formatNumber(estimate.candidateCount)}개 조합`;
  } catch (error) {
    clearResultOutputs(`계산 실패 · ${error.message}`);
    $("statusPill").textContent = "계산 실패";
    $("calculationTiming").textContent = error.message;
  } finally {
    $("runButton").disabled = false;
    $("runButton").textContent = "계산 실행";
  }
}

function bindEvents() {
  $("weatherInputMode").addEventListener("change", () => {
    applyCurrentWeatherSelection();
    loadWeatherTrend();
    markResultsPending();
  });
  $("weatherDataset").addEventListener("change", (event) => {
    const checkbox = regionCheckboxes().find((input) => input.value === event.target.value);
    if (checkbox) checkbox.checked = true;
    updateSelectedRegionSummary();
    applyWeatherDataset(event.target.value);
    loadWeatherTrend();
    markResultsPending();
  });
  regionCheckboxes().forEach((checkbox) => checkbox.addEventListener("change", () => {
    updateSelectedRegionSummary();
    loadWeatherTrend();
    markResultsPending();
  }));
  $("weatherTrendRegionOptions").addEventListener("click", (event) => {
    const button = event.target.closest("[data-weather-trend-key]");
    if (button) selectWeatherTrendRegion(button.dataset.weatherTrendKey);
  });
  $("selectAllRegions").addEventListener("click", () => {
    setSelectedWeatherDatasets(regionCheckboxes().map((input) => input.value));
    markResultsPending();
  });
  $("clearRegions").addEventListener("click", () => {
    setSelectedWeatherDatasets([]);
    markResultsPending();
  });
  $("analysisPeriodMode").addEventListener("change", () => {
    updateAnalysisPeriodFields();
    loadWeatherTrend();
    markResultsPending();
  });
  monthCheckboxes().forEach((input) => input.addEventListener("change", () => {
    updateAnalysisPeriodFields();
    loadWeatherTrend();
    markResultsPending();
  }));
  $("solarDataMode").addEventListener("change", () => {
    const datasetKey = getCurrentWeatherDatasetKey();
    toggleCoordinateFields(datasetKey);
    toggleWeatherValueFields(datasetKey);
    syncCoordinateWeather();
    loadWeatherTrend();
    markResultsPending();
  });
  $("latitude").addEventListener("input", () => {
    syncCoordinateWeather();
    loadWeatherTrend();
    markResultsPending();
  });
  $("longitude").addEventListener("input", () => {
    syncCoordinateWeather();
    loadWeatherTrend();
    markResultsPending();
  });
  $("buildingInputMode").addEventListener("change", () => {
    applyBuildingSelection();
    markResultsPending();
  });
  $("buildingUse").addEventListener("change", () => {
    applyBuildingSelection();
    markResultsPending();
  });
  $("buildingSize").addEventListener("change", () => {
    applyBuildingSelection();
    markResultsPending();
  });
  $("mallParking").addEventListener("change", () => {
    applyBuildingSelection();
    markResultsPending();
  });
  $("regenMode").addEventListener("change", () => {
    updateRegeneratorMode();
    markResultsPending();
  });
  $("weatherUpload").addEventListener("change", uploadWeatherFile);
  $("loadUpload").addEventListener("change", stageLoadFile);
  $("runButton").addEventListener("click", runCalculation);
  $("resetButton").addEventListener("click", () => {
    setDefaults();
    updateRegeneratorMode();
    markResultsPending();
  });
  fields.forEach((field) => {
    $(field).addEventListener("input", markResultsPending);
  });
}

const calculationBootstrap = window.__CALCULATION_BOOTSTRAP__;
setDefaults();
updateRegeneratorMode();
if (calculationBootstrap?.input) {
  restoreCalculationInputs(calculationBootstrap.input);
  updateRegeneratorMode();
}
bindEvents();
loadWeatherTrend();
if (calculationBootstrap) {
  window.history.replaceState({}, "", "/");
  const input = readInputs();
  const estimate = estimateCalculation(input);
  if (calculationBootstrap.error) {
    const message = `계산 실패 · ${calculationBootstrap.error}`;
    clearResultOutputs(message);
    $("statusPill").textContent = "계산 실패";
    $("calculationTiming").textContent =
      `실제 ${formatNumber(calculationBootstrap.elapsedSeconds || 0, 1)}초 후 중단`;
  } else {
    renderCalculationIssues([]);
    renderPythonResult(calculationBootstrap.result, input);
    $("statusPill").textContent = "계산 완료";
    $("calculationTiming").textContent =
      `실제 ${formatNumber(calculationBootstrap.elapsedSeconds || 0, 1)}초 · ${formatNumber(calculationBootstrap.result.best.evaluatedDesignCombinations || estimate.candidateCount)}개 조합 × 약 ${formatNumber(estimate.weatherHours)}시간`;
  }
} else {
  markResultsPending();
}
