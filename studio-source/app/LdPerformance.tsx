export type PerformanceValues = {
  absorbedKg:number; releasedKg:number; targetKg:number; targetServedPct:number|null;
  waterBalancePct:number|null; netWaterKg:number; specificRegenHeat:number|null;
  regenHeatKWh:number; regenOnHours:number; regenWeatherOutsideHours:number;
  regenWeatherOutsidePct:number|null;
};
export type PerformanceData = {total:PerformanceValues;monthly:(PerformanceValues&{month:number})[]};
const fmt=(n:number|null|undefined,d=1)=>n==null||!Number.isFinite(n)?'—':n.toLocaleString('ko-KR',{maximumFractionDigits:d});
export default function LdPerformance({data,region}:{data?:PerformanceData;region:string}) {
  if(!data) return null;
  const p=data.total;
  return <section className="chart-card ld-performance">
    <header><div><span>LD PERFORMANCE · {region}</span><h2>제습·재생 성능 진단</h2><small>선택기간의 적산 수분량·열량 기준입니다. 접촉기 유효도나 전체 시스템 COP와는 다른 지표입니다.</small></div></header>
    <div className="ld-performance-metrics">
      <article><span>시간별 목표 제습량 충족률</span><strong>{fmt(p.targetServedPct)} %</strong><small>Σ min(실제 제습량, 목표량) / Σ 목표량<br/>다른 시간의 과잉 제습으로 미충족을 상쇄하지 않습니다.</small></article>
      <article><span>흡수 수분 대비 재생 배출량</span><strong>{fmt(p.waterBalancePct)} %</strong><small>재생 배출 {fmt(p.releasedKg)} / 흡수 {fmt(p.absorbedKg)} kg<br/>100%는 기간 수분수지 균형이며 재생 효율 100%라는 뜻은 아닙니다.</small></article>
      <article><span>수분 1 kg당 재생열</span><strong>{fmt(p.specificRegenHeat,3)} kWh/kg</strong><small>재생 열교환기 요구열 / 배출 수분량<br/>팬·펌프 전력과 제습 냉각에너지는 제외합니다.</small></article>
      <article><span>재생 외기 실험범위 이탈 비율</span><strong>{fmt(p.regenWeatherOutsidePct)} %</strong><small>가동시간 {fmt(p.regenOnHours)} h 중 {fmt(p.regenWeatherOutsideHours)} h<br/>외기 30.3–36.6 °C, 절대습도 10.5–22.0 g/kgDA 기준</small></article>
    </div>
    <p>순 수분 축적량: <b>{fmt(p.netWaterKg)} kg</b> (흡수 − 배출). 양수이면 용액이 희석되는 방향입니다. 기간 처음·끝의 농도와 함께 해석해야 합니다.</p>
    <div className="ld-performance-table"><table><caption>월별 성능 비교 — 범위 이탈률은 재생 가동시간으로 가중</caption><thead><tr><th>월</th><th>목표 충족 (%)</th><th>배출/흡수 (%)</th><th>재생열 (kWh/kg)</th><th>외기범위 이탈 (%)</th></tr></thead><tbody>{data.monthly.map(m=><tr key={m.month}><th>{m.month}월</th><td>{fmt(m.targetServedPct)}</td><td>{fmt(m.waterBalancePct)}</td><td>{fmt(m.specificRegenHeat,3)}</td><td>{fmt(m.regenWeatherOutsidePct)}</td></tr>)}</tbody></table></div>
    <details><summary>지표 해석 및 유효도 계산의 한계</summary><p>제습 수분전달 유효도 ε = (w입구 − w출구) / (w입구 − w평형), 재생 유효도 ε = (w출구 − w입구) / (w평형 − w입구)입니다. w평형은 용액 온도·농도에 따른 평형 절대습도입니다. 구동력인 분모가 0 이하이면 정상 전달 유효도로 해석하지 않습니다.</p><p>현재 시간별 저장값은 평균 유량과 마지막 계산시점의 재생 출구상태가 혼재합니다. 이를 조합한 숫자는 정확한 유효도가 아니므로 표시하지 않습니다. 현재 재생 코드의 유효도 0–1 제한도 실험범위 준수를 증명하지 않습니다.</p><p>여기서 범위 이탈은 재생 입구 외기 온도·습도만 점검합니다. 용액 온도·농도·모듈별 유량의 모든 내부 계산시점 검증은 포함하지 않으며, 이탈 0%도 실험식 전체의 검증 완료를 뜻하지 않습니다. 제습부 실험범위 전체 준수율 역시 아직 산출하지 않습니다.</p></details>
  </section>;
}
