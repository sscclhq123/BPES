"use client";
import {useMemo,useState} from "react";
import LdFlowPlots,{aggregateFlow,type FlowRow} from "./LdFlowPlots";
import SubstepTrace from "./SubstepTrace";

// Version 1: time, seconds, absorber/regenerator duty, absorber/regenerator LG,
// absorber air/solution ON flow, regenerator air/solution ON flow, ON modules.
export type FlowData={version:number;designMaxAirRatio?:number;rows:[string,number,number,number,number|null,number|null,number|null,number|null,number|null,number|null,number|null][]};
export default function LdFlowDiagnostics({data,region,reference,request}:{data?:FlowData;region:string;reference?:number;request?:Record<string,unknown>}) {
 const [month,setMonth]=useState(""),[day,setDay]=useState(""),[hour,setHour]=useState(""),[trace,setTrace]=useState<string|null>(null);
 const all=useMemo<FlowRow[]>(()=>data?.version===1?data.rows.map(r=>({time:r[0],label:r[0].slice(5,16),seconds:r[1],absDuty:r[2],regDuty:r[3],absLg:r[4],regLg:r[5],absAir:r[6],absSol:r[7],regAir:r[8],regSol:r[9],modules:r[10]})):[],[data]);
 const months=Array.from(new Set(all.map(r=>r.time.slice(5,7)))).sort();
 const days=Array.from(new Set(all.filter(r=>r.time.slice(5,7)===month).map(r=>r.time.slice(8,10)))).sort();
 const filtered=all.filter(r=>(!month||r.time.slice(5,7)===month)&&(!day||r.time.slice(8,10)===day));
 const groups=new Map<string,FlowRow[]>();
 for(const r of filtered){const key=!month?r.time.slice(5,7):!day?r.time.slice(8,10):r.time;groups.set(key,[...(groups.get(key)||[]),r]);}
 const rows=Array.from(groups,([key,items])=>aggregateFlow(items,!month?`${Number(key)}월`:!day?`${Number(key)}일`:items[0].time.slice(11,16)));
 const select=(i:number)=>{setTrace(null);setHour("");if(!month)setMonth(rows[i].time.slice(5,7));else if(!day)setDay(rows[i].time.slice(8,10));else setHour(rows[i].time);};
 return <article className="chart-card ld-flow-card"><header><div><span>LD FLOW &amp; CONTROL · {region.split(" · ")[0]}</span><h2>액기비 및 재생 유량 변화</h2><small>월 → 일 → 시간별 운전 추이를 비교하고, 특정 시간은 60초 상세 계산으로 확인하세요.</small></div></header>
 {!all.length?<p className="chart-empty">이전 결과에는 유량 로그가 없습니다. 설계 계산을 다시 실행하면 그래프가 표시됩니다.</p>:<>
 <div className="ld-flow-tools"><label>월<select aria-label="액기비 분석 월" value={month} onChange={e=>{setMonth(e.target.value);setDay("");setHour("");setTrace(null)}}><option value="">전체 · 월별</option>{months.map(m=><option key={m} value={m}>{Number(m)}월</option>)}</select></label><label>일<select aria-label="액기비 분석 일" value={day} disabled={!month} onChange={e=>{setDay(e.target.value);setHour("");setTrace(null)}}><option value="">전체 · 일별</option>{days.map(d=><option key={d} value={d}>{Number(d)}일</option>)}</select></label><span>{!month?"월별 가동 중 집계":!day?`${Number(month)}월 · 일별 집계`:`${Number(month)}월 ${Number(day)}일 · 시간별 집계`}</span></div>
 <LdFlowPlots rows={rows} rawRows={filtered} designAir={Number(request?.airflow)>0?Number(request?.airflow)/3600*1.2:all.find(r=>r.absAir!=null&&r.absAir>0)?.absAir??undefined} airLimit={data?.designMaxAirRatio} reference={reference} xTitle={!month?"월":!day?"일":"시각 (24시간)"} onSelect={select}/>
 {day&&<div className="ld-flow-trace-action"><label>상세 분석 시각<select aria-label="유량 상세 분석 시각" value={hour} onChange={e=>{setHour(e.target.value);setTrace(null)}}><option value="">시각 선택</option>{filtered.map(r=><option key={r.time} value={r.time}>{r.time.slice(11,16)}</option>)}</select></label><button disabled={!hour} onClick={()=>setTrace(hour)}>선택 시간의 60초별 유량 계산</button><p>선택한 1시간과 앞뒤 30분을 재현합니다. 미충족 여부와 관계없이 분석할 수 있습니다.</p></div>}
 {trace&&<SubstepTrace key={trace} request={request} time={trace} times={[trace]}/>}
 </>}
 </article>;
}
