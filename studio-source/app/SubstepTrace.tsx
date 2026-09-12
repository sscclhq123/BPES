"use client";
import {useEffect,useState} from "react";

type Step={tankTempStart?:number;tankTempEnd?:number;absAirFlow?:number;absSolutionFlow?:number;regAirFlow?:number;regSolutionFlow?:number;absAirInTemp?:number;regAirInTemp?:number;absAirOutTemp?:number;regAirOutTemp?:number;absSolutionOutTemp?:number;regSolutionOutTemp?:number;heatBalanceResidualKW?:number;time?:string;outdoorTemp?:number;outdoorHumidity?:number;irradiance?:number;startSeconds:number;endSeconds:number;durationSeconds:number;concentrationStart:number;concentrationEnd:number;saltKg:number;waterStartKg:number;waterEndKg:number;absorbedKg:number;desorbedKg:number;supplyHumidity:number;absFraction:number;regFraction:number;lg:number|null;absTemp:number|null;regTemp:number|null;regenHeatKWh:number;protection:boolean};
type Trace={endTime?:string;clipped?:boolean;time:string;durationSeconds:number;outdoorTemp:number;outdoorHumidity:number;irradiance:number;target:number;upper:number;floor:number;hourSupplyHumidity:number;steps:Step[]};
const f=(v:number|null,d=2)=>v===null?"—":v.toFixed(d);

function Plot({title,unit,series,limit,duration}:{title:string;unit:string;series:{name:string;color:string;points:[number,number][]}[];limit?:number;duration:number}){
 const values=series.flatMap(s=>s.points.map(p=>p[1]));if(limit!==undefined)values.push(limit);
 const lo=Math.min(...values),hi=Math.max(...values),pad=Math.max((hi-lo)*.12,.05),min=lo-pad,max=hi+pad;
 const x=(v:number)=>60+v/duration*320,y=(v:number)=>190-(v-min)/(max-min)*155;
 return <figure className="trace-plot"><figcaption><strong>{title}</strong> <span>({unit})</span></figcaption><div><svg viewBox="0 0 410 245" role="img" aria-label={`${title} 추이, x축 경과 분, y축 ${unit}`} style={{width:"100%",display:"block"}}>
 {[0,1,2,3,4].map(i=>{const v=min+(max-min)*i/4;return <g key={i}><line x1={60} x2={380} y1={y(v)} y2={y(v)} stroke="#d8e2e5"/><text x={53} y={y(v)+5} textAnchor="end" fontSize={13} fill="#344a50">{v.toFixed(2)}</text></g>})}
 <path d="M60 35 V190 H380" stroke="#586c72" fill="none"/>
 {[0,1,2,3,4].map(i=><text key={i} x={x(duration*i/4)} y={213} textAnchor="middle" fontSize={14} fill="#344a50">{(duration*i/240).toFixed(0)}</text>)}<text x={220} y={238} textAnchor="middle" fontSize={14} fill="#344a50">경과 시간 (분)</text>
 {limit!==undefined&&<line x1={60} x2={380} y1={y(limit)} y2={y(limit)} stroke="#786555" strokeDasharray="6 5"/>}
 {series.map(s=><polyline key={s.name} points={s.points.map(([a,b])=>`${x(a)},${y(b)}`).join(" ")} fill="none" stroke={s.color} strokeWidth={2.5}/>)}
 </svg></div><div className="trace-legend">{series.map(s=><span key={s.name} style={{color:s.color,marginRight:20}}>━ {s.name}</span>)}{limit!==undefined&&<span>┄ 기준 {f(limit)} {unit}</span>}</div></figure>;
}

export default function SubstepTrace({request,time,times,data}:{request?:Record<string,unknown>;time:string;times?:string[];data?:Trace}){
 const [windows,setWindows]=useState<Trace[]|null>(null);
 const [trace,setTrace]=useState<Trace|null>(data||null),[error,setError]=useState(""),[attempt,setAttempt]=useState(0);
 useEffect(()=>{if(data)return;setWindows(null);const controller=new AbortController();setTrace(null);setError("");
  if(!request){setError("상세 계산 조건이 없는 이전 결과입니다. 설계 계산을 다시 실행하세요.");return;}
  fetch("/api/substep-trace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(times?{request,times}:{request,time}),signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok||data.error)throw Error(data.error||"상세 계산 요청 실패");return data;}).then(data=>{if(!controller.signal.aborted){if(data.traces)setWindows(data.traces);else setTrace(data)}}).catch(e=>{if(!controller.signal.aborted)setError(String(e.message))});
  return ()=>controller.abort();
 },[request,time,times,data,attempt]);
 const box={marginTop:24,padding:24,border:"1px solid #cbdcdf",borderRadius:16,background:"#f8fbfc",color:"#233c43"};
 if(windows)return <div>{windows.map(w=><SubstepTrace key={w.time} time={w.time} data={w}/> )}</div>;
 if(error)return <section style={box} role="alert"><p>{error}</p><button type="button" onClick={()=>setAttempt(a=>a+1)}>다시 시도</button></section>;
 if(!trace)return <section style={box} role="status" aria-busy="true">{time.slice(5)} 상세 계산 중… 이전 탱크 상태부터 이어서 재현합니다.</section>;
 const steps=trace.steps;
 if(!steps.length)return <section style={box}>이 시점의 내부 계산 기록이 없습니다.</section>;
 const staircase=(key:"supplyHumidity"|"absorbedKg"|"desorbedKg")=>steps.flatMap(s=>{const value=key==="supplyHumidity"?s[key]:s[key]*3600/s.durationSeconds;return [[s.startSeconds,value],[s.endSeconds,value]] as [number,number][]});
 return <section style={box} aria-label="선택 시점 내부 계산 상세"><h3>{time.slice(5)}{trace.endTime?" ~ "+trace.endTime.slice(5):""} · 내부 계산 상세</h3>
 <p>계산 간격 {f(steps[0].durationSeconds,0)}초 · 외기 {f(trace.outdoorTemp,1)}℃ / {f(trace.outdoorHumidity)} g/kgDA · 집열면 일사강도 {f(trace.irradiance,0)} W/m²</p>
 <p>외기는 원본 기상자료의 매 시간마다 변경됩니다. 급기습도는 각 내부 구간의 부분운전을 포함한 평균, 농도는 구간 끝 상태입니다. 제습 제한 시 미처리 공기도 평균에 포함됩니다. 그래프는 선택 구간과 앞뒤 여유 구간 전체를 표시합니다. 상세 결과표는 좌우로 밀어 확인할 수 있습니다.</p>
 {trace.clipped&&<p>분석 기간 경계로 인해 앞뒤 30분 중 데이터가 있는 범위만 표시합니다.</p>}<div className="trace-plots"><Plot title="급기 절대습도" unit="g/kgDA" duration={trace.durationSeconds} limit={trace.upper} series={[{name:"내부 구간 평균",color:"#098ea4",points:staircase("supplyHumidity")},{name:`구간 평균 ${f(trace.hourSupplyHumidity)}`,color:"#53666f",points:[[0,trace.hourSupplyHumidity],[trace.durationSeconds,trace.hourSupplyHumidity]]}]}/>
 <Plot title="탱크 LiCl 농도" unit="wt%" duration={trace.durationSeconds} limit={trace.floor} series={[{name:"탱크 농도",color:"#098ea4",points:[[0,steps[0].concentrationStart],...steps.map(s=>[s.endSeconds,s.concentrationEnd] as [number,number])]}]}/>
 <Plot title="수분 흡수·제거율" unit="kg/h" duration={trace.durationSeconds} series={[{name:"제습 흡수율",color:"#098ea4",points:staircase("absorbedKg")},{name:"재생 제거율",color:"#c74b40",points:staircase("desorbedKg")}]}/>
 </div><details><summary style={{cursor:"pointer",padding:12}}>입출구 상태 · 공기/용액 유량 · 열수지 확인</summary>
 <p>공용 완전혼합 용액탱크에서 두 접촉기로 분기합니다. 아래는 가동 중 순간 질량유량(kg/s)과 입출구 온도(℃)입니다. 제습 공기량은 건물 요구량으로 고정합니다.</p>
 <p>단열 접촉기: 공기 유입 엔탈피 + 용액 유입 엔탈피 = 공기 유출 엔탈피 + 용액 유출 엔탈피.<br/>재생 가열열 = 용액 유량 × (가열 후 엔탈피 − 탱크 엔탈피) = TES 공급열 + 보조열원.</p>
 <p>열수지 잔차는 LD 부하 계산 단계 기준입니다. 실제 태양열·TES 배분은 별도의 시간별 에너지 계산 결과이며, 이 표를 분 단위 태양열 배분으로 해석하지 않습니다.</p>
 <div style={{overflowX:"auto",maxHeight:420}}><table style={{minWidth:1600,width:"100%",fontSize:14}}><thead><tr>{["시각","탱크 시작→끝 ℃","제습 공기 kg/s","제습 용액 kg/s","제습 공기 입→출 ℃","제습 용액 입→출 ℃","재생 공기 kg/s","재생 용액 kg/s","재생 L/G","재생 공기 입→출 ℃","재생 용액 입→출 ℃","가열열 수지잔차 kW"].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{steps.map((s,i)=><tr key={i}>{[s.time?.slice(5),f(s.tankTempStart??null,1)+" → "+f(s.tankTempEnd??null,1),f(s.absAirFlow??null,3),f(s.absSolutionFlow??null,3),f(s.absAirInTemp??null,1)+" → "+f(s.absAirOutTemp??null,1),f(s.absTemp,1)+" → "+f(s.absSolutionOutTemp??null,1),f(s.regAirFlow??null,3),f(s.regSolutionFlow??null,3),s.regAirFlow?f((s.regSolutionFlow||0)/s.regAirFlow):"—",f(s.regAirInTemp??null,1)+" → "+f(s.regAirOutTemp??null,1),f(s.regTemp,1)+" → "+f(s.regSolutionOutTemp??null,1),f(s.heatBalanceResidualKW??null,6)].map((v,j)=><td key={j} style={{padding:10,borderBottom:"1px solid #d9e3e6"}}>{v}</td>)}</tr>)}</tbody></table></div></details>
 <details><summary style={{cursor:"pointer",padding:12}}>계산식과 {steps.length}개 구간 결과표 펼치기</summary>
 <p>종료 수분량 = 시작 수분량 + 흡수량 − 제거량<br/>종료 농도 = 염 질량 ÷ (염 질량 + 종료 수분량) × 100<br/>급기 절대습도 = 외기 절대습도 − 구간 흡수량 ÷ (공기 질량유량 × 구간 초) × 1000</p>
 <p>흡수·제거량은 해당 구간의 kg이며, 위 그래프는 kg/h로 환산합니다. 재생열은 요구량으로, 태양열·보조열원의 분 단위 배분을 뜻하지 않습니다.</p>
 <div style={{overflowX:"auto",maxHeight:480}}><table style={{borderCollapse:"collapse",minWidth:1250,width:"100%",fontSize:15}}><thead><tr>{["시각","외기 ℃ / g/kgDA / W/m²","경과 분","농도 시작→끝 wt%","수분 시작→끝 kg","흡수 kg","제거 kg","급기 g/kgDA","제습/재생 %","L/G","제습/재생 ℃","재생열 kWh","농도 보호"].map(t=><th key={t} scope="col" style={{padding:10,textAlign:"left",background:"#e4eef1"}}>{t}</th>)}</tr></thead><tbody>{steps.map((s,i)=><tr key={i} style={{background:i%2?"#edf4f6":"white"}}>{[s.time?.slice(5)||"—",`${f(s.outdoorTemp??null,1)} / ${f(s.outdoorHumidity??null)} / ${f(s.irradiance??null,0)}`,`${f(s.startSeconds/60,1)}–${f(s.endSeconds/60,1)}`,`${f(s.concentrationStart,3)} → ${f(s.concentrationEnd,3)}`,`${f(s.waterStartKg,3)} → ${f(s.waterEndKg,3)}`,f(s.absorbedKg,3),f(s.desorbedKg,3),f(s.supplyHumidity),`${f(s.absFraction*100,0)} / ${f(s.regFraction*100,0)}`,f(s.lg),`${f(s.absTemp,1)} / ${f(s.regTemp,1)}`,f(s.regenHeatKWh,3),s.protection?"제습 제한":"—"].map((v,j)=><td key={j} style={{padding:10,borderBottom:"1px solid #d9e3e6"}}>{v}</td>)}</tr>)}</tbody></table></div></details>
 </section>;
}
