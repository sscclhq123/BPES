"use client";
import {useEffect,useRef,useState} from "react";
import "./LdFlow.css";

export type FlowRow = {time:string;label:string;seconds:number;absDuty:number;regDuty:number;absLg:number|null;regLg:number|null;absAir:number|null;absSol:number|null;regAir:number|null;regSol:number|null;modules:number|null};
export const flowFormat=(v:number|null|undefined, digits=3)=>v==null||!Number.isFinite(v)?"—":v.toFixed(digits);
const ratio=(l:number|null,g:number|null)=>l!=null&&g!=null&&g>0?l/g:null;
export function aggregateFlow(rows:FlowRow[],label:string):FlowRow {
 const seconds=rows.reduce((n,r)=>n+r.seconds,0);
 const weighted=(field:keyof FlowRow,side:"absDuty"|"regDuty")=>{
  const valid=rows.filter(r=>typeof r[field]==="number"&&r[side]>0);
  const t=valid.reduce((n,r)=>n+r.seconds*r[side],0);
  return t?valid.reduce((n,r)=>n+Number(r[field])*r.seconds*r[side],0)/t:null;
 };
 const regAir=weighted("regAir","regDuty"),regSol=weighted("regSol","regDuty");
 return {time:rows[0].time,label,seconds,absDuty:rows.reduce((n,r)=>n+r.absDuty*r.seconds,0)/seconds,regDuty:rows.reduce((n,r)=>n+r.regDuty*r.seconds,0)/seconds,
  absLg:weighted("absLg","absDuty"),regLg:ratio(regSol,regAir),absAir:weighted("absAir","absDuty"),absSol:weighted("absSol","absDuty"),regAir,regSol,modules:weighted("modules","regDuty")};
}

type Series={name:string;color:string;values:(number|null)[];dash?:boolean};
function Plot({title,unit,rows,series,xTitle,onSelect}:{title:string;unit:string;rows:FlowRow[];series:Series[];xTitle:string;onSelect?:(i:number)=>void}) {
 const container=useRef<HTMLDivElement>(null),[width,setWidth]=useState(580);
 useEffect(()=>{if(!container.current)return;const observer=new ResizeObserver(entries=>setWidth(Math.max(240,entries[0].contentRect.width)));observer.observe(container.current);return()=>observer.disconnect()},[]);
 const vals=series.flatMap(s=>s.values.filter((v):v is number=>v!==null&&Number.isFinite(v)));
 const max=Math.max(.2,...vals)*1.15,right=width-20,x=(i:number)=>56+(i+.5)*(right-56)/Math.max(rows.length,1),y=(v:number)=>204-v/max*158;
 const tickCount=Math.max(2,Math.min(rows.length,Math.floor((right-56)/55)));
 const tickIndices=Array.from(new Set(Array.from({length:tickCount},(_,i)=>Math.round(i*(rows.length-1)/Math.max(1,tickCount-1)))));
 const path=(values:(number|null)[])=>values.map((v,i)=>v===null?"":`${i===0||values[i-1]===null?"M":"L"}${x(i)} ${y(v)}`).join(" ");
 return <figure className="ld-flow-plot"><figcaption><strong>{title}</strong><span>{unit}</span></figcaption><div className="ld-flow-legend">{series.map(s=><span key={s.name}><i style={{borderColor:s.color,borderTopStyle:s.dash?"dashed":"solid"}}/>{s.name}</span>)}</div><div className="ld-flow-scroll" ref={container}><div className="ld-flow-canvas">
 <svg viewBox={`0 0 ${width} 225`} role="img" aria-label={`${title} · 가로축 ${xTitle} · 세로축 ${unit}`}>
 {[0,1,2,3,4].map(i=>{const v=max*i/4;return <g key={i}><line x1={56} x2={right} y1={y(v)} y2={y(v)} stroke="#d9e4e7"/><text x={47} y={y(v)+5} textAnchor="end" fontSize={14} fill="#354f59">{v.toFixed(2)}</text></g>})}
 <path d={`M56 46 V204 H${right}`} fill="none" stroke="#84979e"/>
 {series.map(s=><g key={s.name}><path d={path(s.values)} stroke={s.color} strokeWidth={2.3} strokeDasharray={s.dash?"6 5":undefined} fill="none"/>{!s.dash&&s.values.map((v,i)=>v!==null&&Number.isFinite(v)?<circle key={i} cx={x(i)} cy={y(v)} r={rows.length>60?1.8:3} fill={s.color}><title>{rows[i].label} · {s.name} {flowFormat(v)} {unit}</title></circle>:null)}</g>)}
 </svg><div className="ld-flow-xlabels">{tickIndices.map(i=><button key={i} disabled={!onSelect} onClick={()=>onSelect?.(i)} style={{left:`${x(i)/width*100}%`}}>{rows[i].label}</button>)}</div></div></div><p className="ld-flow-xtitle">{xTitle}</p></figure>;
}

export default function LdFlowPlots({rows,rawRows=rows,reference,xTitle,onSelect,compact=false}:{rows:FlowRow[];rawRows?:FlowRow[];reference?:number;xTitle:string;onSelect?:(i:number)=>void;compact?:boolean}) {
 const [average,setAverage]=useState(false);
 const tested=rawRows.filter(r=>r.regDuty>0&&r.regLg!==null&&ratio(r.regSol,r.regAir)!==null);
 const deviations=tested.map(r=>Math.abs(r.regLg!-ratio(r.regSol,r.regAir)!));
 const absTested=rawRows.filter(r=>r.absDuty>0&&r.absLg!==null&&ratio(r.absSol,r.absAir)!==null);
 const absDeviation=absTested.length?Math.max(...absTested.map(r=>Math.abs(r.absLg!-ratio(r.absSol,r.absAir)!))):null;
 const difference=deviations.length?Math.max(...deviations):null;
 const refDiff=reference!=null&&tested.length?Math.max(...tested.map(r=>Math.abs(ratio(r.regSol,r.regAir)!-reference))):null;
 const massFlow=(r:FlowRow,key:"regAir"|"regSol")=>average?(r[key]??0)*r.regDuty:r[key];
 return <div className="ld-flow-diagnostics">
 <p className="ld-flow-definition"><b>L/G = 용액 질량유량 ÷ 공기 질량유량 (kg/kg).</b> 아래 유량은 병렬 장치 전체의 입구 합계입니다. 정지 중 L/G는 정의하지 않아 선을 끊습니다. 재생 L/G를 고정해도 두 유량과 가동 대수는 함께 변할 수 있습니다.</p>
 <div className="ld-flow-checks" aria-live="polite"><div><small>제습 L/G · 유량 역산 최대 차이</small><b>{flowFormat(absDeviation,6)}</b></div><div><small>재생 L/G · 유량 역산 최대 차이</small><b>{flowFormat(difference,6)}</b></div><div><small>재생 고정값 {flowFormat(reference,2)} 대비 최대 차이</small><b>{flowFormat(refDiff,6)}</b></div></div>
 <p className="ld-flow-note">차이는 표시 기간의 원본 로그에서 확인합니다. 유량 집계·전달의 일관성 검사이며 실험식의 정확성이나 실험범위 충족을 검증하는 지표는 아닙니다. 재생 기록 L/G 자체도 누적 질량비로 산출됩니다.</p>
 <div className={compact?"ld-flow-grid compact":"ld-flow-grid"}>
 <Plot title="제습·재생 액기비 변화" unit="kg/kg" xTitle={xTitle} rows={rows} onSelect={onSelect} series={[{name:"제습 L/G",color:"#098ea4",values:rows.map(r=>r.absLg)},{name:"재생 L/G",color:"#c74b40",values:rows.map(r=>r.regLg)},...(reference!=null?[{name:`재생 고정값 ${reference.toFixed(2)}`,color:"#6c7f86",dash:true,values:rows.map(()=>reference)}]:[])]}/>
 <div><label className="ld-flow-basis">재생 유량 표시 기준<select value={average?"period":"on"} onChange={e=>setAverage(e.target.value==="period")}><option value="on">가동 중 평균</option><option value="period">정지시간 포함 평균</option></select></label><Plot title="재생부 공기·용액 유량 변화" unit="kg/s" xTitle={xTitle} rows={rows} onSelect={onSelect} series={[{name:"외기 질량유량",color:"#098ea4",values:rows.map(r=>massFlow(r,"regAir"))},{name:"용액 질량유량",color:"#c74b40",values:rows.map(r=>massFlow(r,"regSol"))}]}/></div>
 </div><p className="ld-flow-note">가동 중 평균 = 누적 통과 질량 ÷ 실제 가동 초. 정지시간 포함 평균 = 누적 통과 질량 ÷ 전체 구간 초이며 정지는 0으로 표시합니다. 공기는 엔진의 질량유량 값으로, m³/h와 직접 나누지 않습니다.</p>
 <details className="ld-flow-table"><summary>액기비·유량 계산값 표 ({rows.length}개 구간)</summary><div><table><caption>유량은 가동 중 평균 · 가동률은 해당 구간 기준</caption><thead><tr>{["기간","제습 L/G","재생 L/G","재생 유량 역산 L/G","재생 외기 kg/s","재생 용액 kg/s","제습 가동률 %","재생 가동률 %","재생 가동 대수 평균"].map(s=><th scope="col" key={s}>{s}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}><th scope="row">{r.label}</th>{[flowFormat(r.absLg),flowFormat(r.regLg),flowFormat(ratio(r.regSol,r.regAir)),flowFormat(r.regAir),flowFormat(r.regSol),flowFormat(r.absDuty*100,1),flowFormat(r.regDuty*100,1),flowFormat(r.modules,2)].map((s,j)=><td key={j}>{s}</td>)}</tr>)}</tbody></table></div></details>
 </div>;
}
