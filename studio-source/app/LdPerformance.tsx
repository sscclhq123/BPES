"use client";
import {useState} from "react";
export type PerformanceValues = {
  absorbedKg:number; releasedKg:number; targetKg:number; targetServedPct:number|null;
  waterBalancePct:number|null; netWaterKg:number; specificRegenHeat:number|null;
  regenHeatKWh:number; regenOnHours:number; regenWeatherOutsideHours:number;
  regenWeatherOutsidePct:number|null;
};
type PerformanceHour=[string,number,number,number,number,number,number,number,(number|null)?,(number|null)?];
const weatherLimits=[
  {label:'외기온도 하한 미달',index:8,limit:30.3,low:true,unit:'°C'},
  {label:'외기온도 상한 초과',index:8,limit:36.6,low:false,unit:'°C'},
  {label:'절대습도 하한 미달',index:9,limit:10.5,low:true,unit:'g/kgDA'},
  {label:'절대습도 상한 초과',index:9,limit:22,low:false,unit:'g/kgDA'},
] as const;
export function weatherStats(rows:PerformanceHour[]) {
  const on=rows.filter(r=>r[6]>0);
  return weatherLimits.map(rule=>{
    const valid=on.filter(r=>typeof r[rule.index]==='number'&&Number.isFinite(r[rule.index]));
    const values=valid.map(r=>r[rule.index] as number);
    let hours=0,weighted=0,max=0;
    for(const r of valid){
      const value=r[rule.index] as number;
      const delta=Math.max(0,rule.low?rule.limit-value:value-rule.limit);
      if(delta>1e-9){hours+=r[6];weighted+=delta*r[6];max=Math.max(max,delta);}
    }
    return {...rule,hours,mean:hours>0?weighted/hours:null,max:hours>0?max:null,
      minValue:values.length?Math.min(...values):null,maxValue:values.length?Math.max(...values):null,
      missing:valid.length<on.length};
  });
}
function WeatherCells({rows}:{rows:PerformanceHour[]}) {
  if(!rows.length||rows.some(r=>r.length<10))return <td colSpan={3}>상세 외기값 없음 · 다시 계산</td>;
  if(!rows.some(r=>r[6]>0))return <td colSpan={3}>재생 비가동</td>;
  const stats=weatherStats(rows),outside=stats.filter(s=>s.hours>0);
  const range=(s:typeof stats[number])=>s.minValue===null?'—':s.minValue===s.maxValue?fmt(s.minValue,2):`${fmt(s.minValue,2)}–${fmt(s.maxValue,2)}`;
  return <><td>{range(stats[0])}</td><td>{range(stats[2])}</td><td className="weather-deviation-cell">{outside.map(s=><div key={s.label}>{s.label}: 최대 {fmt(s.max,2)} {s.unit}</div>)}{stats.some(s=>s.missing)&&<div>일부 외기값 누락</div>}{!outside.length&&!stats.some(s=>s.missing)&&'범위 내'}</td></>;
}
export type PerformanceData = {total:PerformanceValues;monthly:(PerformanceValues&{month:number})[];hourlyVersion?:number;hourly?:PerformanceHour[]};
function aggregate(rows:PerformanceHour[]):PerformanceValues {
  const sums=rows.reduce((s,r)=>s.map((v,i)=>v+Number(r[i+1])),Array(7).fill(0) as number[]);
  const [absorbedKg,releasedKg,targetKg,served,regenHeatKWh,regenOnHours,regenWeatherOutsideHours]=sums;
  const ratio=(a:number,b:number)=>b>1e-9?a/b:null;
  return {absorbedKg,releasedKg,targetKg,regenHeatKWh,regenOnHours,regenWeatherOutsideHours,
    targetServedPct:ratio(served*100,targetKg),waterBalancePct:ratio(releasedKg*100,absorbedKg),
    netWaterKg:absorbedKg-releasedKg,specificRegenHeat:ratio(regenHeatKWh,releasedKg),
    regenWeatherOutsidePct:ratio(regenWeatherOutsideHours*100,regenOnHours)};
}
const fmt=(n:number|null|undefined,d=1)=>n==null||!Number.isFinite(n)?'—':n.toLocaleString('ko-KR',{maximumFractionDigits:d});
export default function LdPerformance({data,region}:{data?:PerformanceData;region:string}) {
  const [month,setMonth]=useState<number|null>(null),[day,setDay]=useState<string|null>(null);
  if(!data) return null;
  const hourly=data.hourlyVersion===1||data.hourlyVersion===2?data.hourly||[]:[];
  const selected=hourly.filter(r=>(month===null||Number(r[0].slice(5,7))===month)&&(!day||r[0].slice(0,10)===day));
  const p=day?aggregate(selected):month!==null?data.monthly.find(m=>m.month===month)||data.total:data.total;
  const period=month===null?'전체 선택기간':day?`${month}월 ${Number(day.slice(8,10))}일`:`${month}월`;
  const weatherAvailable=selected.length>0&&selected.every(r=>r.length>=10);
  const weather=weatherStats(selected);
  const daily=new Map<string,PerformanceHour[]>();
  if(month!==null&&!day)for(const r of selected){const key=r[0].slice(0,10);if(!daily.has(key))daily.set(key,[]);daily.get(key)!.push(r);}
  const tableRows=month===null?data.monthly.map(m=>({key:String(m.month),label:`${m.month}월`,value:m,rows:hourly.filter(r=>Number(r[0].slice(5,7))===m.month),select:hourly.length?()=>setMonth(m.month):undefined})):
    !day?Array.from(daily).sort(([a],[b])=>a.localeCompare(b)).map(([date,rows])=>({key:date,label:`${Number(date.slice(8,10))}일`,value:aggregate(rows),rows,select:()=>setDay(date)})):
    selected.map((r,i)=>({key:`${r[0]}-${i}`,label:r[0].slice(11,16),value:aggregate([r]),rows:[r],select:undefined}));
  return <section className="chart-card ld-performance">
    <header><div><span>LD PERFORMANCE · {region}</span><h2>제습·재생 성능 진단</h2><small>선택기간의 적산 수분량·열량 기준입니다. 접촉기 유효도나 전체 시스템 COP와는 다른 지표입니다.</small></div></header>
    <nav className="performance-navigation" aria-label="성능진단 기간"><button onClick={()=>{setMonth(null);setDay(null)}} disabled={month===null}>전체 · 월별</button>{month!==null&&<button onClick={()=>setDay(null)} disabled={!day}>{month}월 · 일별</button>}<strong aria-live="polite">{period}{day?' · 시간별':''}</strong></nav>
    <div className="ld-performance-metrics">
      <article><span>시간별 목표 제습량 충족률</span><strong>{fmt(p.targetServedPct)} %</strong><small>Σ min(실제 제습량, 목표량) / Σ 목표량<br/>다른 시간의 과잉 제습으로 미충족을 상쇄하지 않습니다.</small></article>
      <article><span>흡수 수분 대비 재생 배출량</span><strong>{fmt(p.waterBalancePct)} %</strong><small>재생 배출 {fmt(p.releasedKg)} / 흡수 {fmt(p.absorbedKg)} kg<br/>100%는 기간 수분수지 균형이며 재생 효율 100%라는 뜻은 아닙니다.</small></article>
      <article><span>수분 1 kg당 재생열</span><strong>{fmt(p.specificRegenHeat,3)} kWh/kg</strong><small>재생 열교환기 요구열 / 배출 수분량<br/>팬·펌프 전력과 제습 냉각에너지는 제외합니다.</small></article>
      <article><span>재생 외기 실험범위 이탈 비율</span><strong>{fmt(p.regenWeatherOutsidePct)} %</strong><small>가동시간 {fmt(p.regenOnHours)} h 중 {fmt(p.regenWeatherOutsideHours)} h<br/>외기 30.3–36.6 °C, 절대습도 10.5–22.0 g/kgDA 기준</small></article>
    </div>
    <section className="regen-weather-detail" aria-label="재생 외기범위 이탈 상세">
      <h3>외기조건이 얼마나 벗어났나요?</h3>
      <p>{period} · 재생 가동 중 외기온도와 절대습도를 상한·하한별로 확인합니다. 평균 이탈량은 <b>해당 조건을 벗어난 재생 가동시간</b>으로 가중합니다.</p>
      {!weatherAvailable?<p>이전 계산 결과에는 상세 외기값이 없습니다. 설계 계산을 다시 실행하면 표시됩니다.</p>:<>
        {p.regenOnHours<=0?<p>선택기간에는 재생이 가동되지 않았습니다.</p>:<div className="ld-performance-table"><table><caption>허용 범위와 실제 외기조건 비교 · 미달·초과량은 경계값과의 차이입니다.</caption><thead><tr><th>이탈 항목</th><th>경계값</th><th>가동 중 관측 범위</th><th>이탈 가동시간 (h)</th><th>평균 이탈량</th><th>최대 이탈량</th></tr></thead><tbody>{weather.map(s=><tr key={s.label}><th scope="row">{s.label}</th><td>{s.limit.toFixed(1)} {s.unit}</td><td>{fmt(s.minValue,2)}–{fmt(s.maxValue,2)} {s.unit}{s.missing?' · 일부 누락':''}</td><td>{fmt(s.hours,2)}</td><td>{fmt(s.mean,2)} {s.unit}</td><td>{fmt(s.max,2)} {s.unit}</td></tr>)}</tbody></table></div>}
        <small>온도와 습도가 동시에 이탈할 수 있어 위 시간의 합은 전체 이탈시간과 다를 수 있습니다. 시간별 외기값과 재생 가동비율 기준이며, 재생 비가동 시간은 제외합니다. 이탈이 없으면 평균·최대 이탈량은 —로 표시합니다.</small>
      </>}
    </section>
    <p>순 수분 축적량: <b>{fmt(p.netWaterKg)} kg</b> (흡수 − 배출). 양수이면 용액이 희석되는 방향입니다. 기간 처음·끝의 농도와 함께 해석해야 합니다.</p>
    <div className="ld-performance-table"><table><caption>{month===null?'월별':!day?`${month}월 일별`:`${period} 시간별`} 성능 비교 — {day?'시각은 저장 로그 기준, 비가동 시간도 표시합니다.':'월·날짜 버튼을 누르면 상세 기간을 확인합니다.'} 외기값은 재생 가동 중 최솟값–최댓값입니다. 모바일에서는 표를 좌우로 밀어 확인하세요.</caption><thead><tr><th>{month===null?'월':day?'시각':'일'}</th><th>목표 충족 (%)</th><th>배출/흡수 (%)</th><th>재생열 (kWh/kg)</th><th>외기범위 이탈 (%)</th><th>외기온도 (°C)</th><th>절대습도 (g/kgDA)</th><th>이탈 항목 · 최대 이탈량</th></tr></thead><tbody>{tableRows.map(row=><tr key={row.key}><th scope="row">{row.select?<button aria-label={`${period} ${row.label} 성능 상세 보기`} onClick={row.select}>{row.label} →</button>:row.label}</th><td>{fmt(row.value.targetServedPct)}</td><td>{fmt(row.value.waterBalancePct)}</td><td>{fmt(row.value.specificRegenHeat,3)}</td><td>{fmt(row.value.regenWeatherOutsidePct)}</td><WeatherCells rows={row.rows}/></tr>)}</tbody></table></div>
    {!hourly.length&&<p>이전 계산 결과에는 일·시간별 성능 로그가 없습니다. 설계 계산을 다시 실행하면 상세 기간을 볼 수 있습니다.</p>}
    <details><summary>지표 해석 및 유효도 계산의 한계</summary><p>제습 수분전달 유효도 ε = (w입구 − w출구) / (w입구 − w평형), 재생 유효도 ε = (w출구 − w입구) / (w평형 − w입구)입니다. w평형은 용액 온도·농도에 따른 평형 절대습도입니다. 구동력인 분모가 0 이하이면 정상 전달 유효도로 해석하지 않습니다.</p><p>현재 시간별 저장값은 평균 유량과 마지막 계산시점의 재생 출구상태가 혼재합니다. 이를 조합한 숫자는 정확한 유효도가 아니므로 표시하지 않습니다. 현재 재생 코드의 유효도 0–1 제한도 실험범위 준수를 증명하지 않습니다.</p><p>여기서 범위 이탈은 재생 입구 외기 온도·습도만 점검합니다. 용액 온도·농도·모듈별 유량의 모든 내부 계산시점 검증은 포함하지 않으며, 이탈 0%도 실험식 전체의 검증 완료를 뜻하지 않습니다. 제습부 실험범위 전체 준수율 역시 아직 산출하지 않습니다.</p></details>
  </section>;
}
