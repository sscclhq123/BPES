"use client";
export type TransferRow=[string,number,number,number,number,number,number,number,number];
export type TransferData={version:number;rows:TransferRow[]};
export function transferAggregate(rows:TransferRow[],offset:number){
  const sum=(i:number)=>rows.reduce((s,r)=>s+Number(r[i]),0);
  const denominator=sum(offset+1);
  return {value:denominator>1e-9?100*sum(offset)/denominator:null,invalid:sum(offset+2)/3600,outside:sum(offset+3)/3600};
}
const number=(v:number|null)=>v===null?'—':v.toLocaleString('ko-KR',{maximumFractionDigits:2});
export default function TransferChart({data,groups,period,axis}:{data?:TransferData|null;groups:{key:string;label:string;rows:[string,...unknown[]][];select?:(()=>void)}[];period:string;axis:string}){
  const index=new Map(data?.rows.map(r=>[r[0],r]));
  const points=groups.map(g=>{const rows=g.rows.flatMap(r=>index.has(r[0])?[index.get(r[0])!]:[]);return {...g,abs:transferAggregate(rows,1),reg:transferAggregate(rows,5)};});
  const values=points.flatMap(p=>[p.abs.value,p.reg.value]).filter((v):v is number=>v!==null&&Number.isFinite(v));
  const min=Math.min(0,...values),max=Math.max(100,...values);
  const lo=min<0?Math.floor(min/20)*20:0,hi=max>100?Math.ceil(max/20)*20:100;
  const x=(i:number)=>82+i*680/Math.max(points.length-1,1),y=(v:number)=>270-(v-lo)/(hi-lo)*210;
  const path=(kind:'abs'|'reg')=>{let active=false;return points.map((p,i)=>{const v=p[kind].value;if(v===null){active=false;return '';}const command=active?'L':'M';active=true;return `${command}${x(i)},${y(v)}`;}).join(' ');};
  const invalid=points.reduce((s,p)=>s+p.abs.invalid+p.reg.invalid,0),outside=points.reduce((s,p)=>s+p.abs.outside+p.reg.outside,0);
  return <section className="transfer-chart" aria-label="제습 재생 물질전달 유효도 그래프">
    <h3>제습·재생 효율 <small>물질전달 유효도 ε</small></h3>
    <p>{period} · 실제 수분전달량 / 평형 기준 전달 가능량</p>
    <div className="transfer-formulas"><span>제습 εᴅ = (w입구 − w출구) / (w입구 − w평형)</span><span>재생 εʀ = (w출구 − w입구) / (w평형 − w입구)</span></div>
    {!data||data.version!==1?<p role="status">이전 저장 결과에는 동시점 유효도 로그가 없습니다. 설계 계산을 다시 실행해 그래프를 확인하세요.</p>:<>
      <div className="transfer-legend"><span>━ 제습</span><span>━ 재생</span></div>
      {!values.length&&<p>선택기간에 유효도를 계산할 수 있는 가동 기록이 없습니다. 비가동·구동력 없음은 0%가 아닙니다.</p>}
      <div className="transfer-plot-scroll" tabIndex={0} aria-label="유효도 그래프, 좁은 화면에서 좌우 스크롤 가능"><svg viewBox="0 0 820 340" role="img" aria-label={`${period} 제습 및 재생 물질전달 유효도, 세로축 %, 가로축 ${axis}`}>
        <text x="24" y="27">유효도 (%)</text>
        {[0,1,2,3,4].map(i=>{const v=lo+(hi-lo)*i/4;return <g key={i}><line x1="72" x2="774" y1={y(v)} y2={y(v)} stroke="#dbe5e4"/><text x="62" y={y(v)+6} textAnchor="end">{Math.round(v)}</text></g>;})}
        <line x1="72" x2="72" y1="55" y2="270" stroke="#819b98"/><line x1="72" x2="774" y1="270" y2="270" stroke="#819b98"/>
        {hi>100&&<line x1="72" x2="774" y1={y(100)} y2={y(100)} stroke="#b9574d" strokeDasharray="5 5"/>}
        {(['abs','reg'] as const).map(kind=><g key={kind} stroke={kind==='abs'?'#159fb7':'#cc5148'}><path d={path(kind)} fill="none" strokeWidth="2.5"/>{points.map((p,i)=>p[kind].value===null?null:<circle key={p.key} cx={x(i)} cy={y(p[kind].value!)} r="4" fill="white" strokeWidth="2"><title>{p.label} {kind==='abs'?'제습':'재생'} {number(p[kind].value)}%</title></circle>)}</g>)}
        {points.map((p,i)=>i%Math.max(1,Math.ceil(points.length/12))===0||i===points.length-1?<text key={p.key} x={x(i)} y="296" textAnchor="middle">{p.label}</text>:null)}
        <text x="420" y="329" textAnchor="middle">{axis}</text>
      </svg></div>
      <p className="transfer-note">월·일 버튼을 누르면 세부 기간으로 이동합니다. 모바일에서는 그래프·표를 좌우로 밀어 볼 수 있습니다.</p>
      <div className="ld-performance-table"><table><caption>물질전달 유효도 (%) · 비가동 또는 유효 구동력 없음: —</caption><thead><tr><th>{axis}</th><th>제습 εᴅ (%)</th><th>재생 εʀ (%)</th></tr></thead><tbody>{points.map(p=><tr key={p.key}><th scope="row">{p.select?<button onClick={p.select} aria-label={`${p.label} 유효도 상세`}>{p.label} →</button>:p.label}</th><td>{number(p.abs.value)}</td><td>{number(p.reg.value)}</td></tr>)}</tbody></table></div>
      {(invalid>0||outside>0)&&<p role="status">진단: 분모가 유효하지 않아 제외한 장치 가동시간 합계 {number(invalid)} h. 순간 유효도가 0–100% 밖인 장치 가동시간 합계 {number(outside)} h. 범위 밖 계산값을 임의로 100%로 자르지 않으며, 모델 점검이 필요합니다.</p>}
    </>}
    <p className="transfer-note">각 내부 계산시점에서 입·출구·평형 절대습도를 함께 사용합니다. 시간·일·월 값은 Σ(건공기유량 × 가동시간 × 실제 습도차) / Σ(건공기유량 × 가동시간 × 평형 습도차)입니다. 제습은 바이패스 혼합 전 접촉부 출구 기준이며, 처리 공기유량으로 가중합니다. 재생은 변풍량을 반영합니다. 실험식 외삽 운전의 정확성을 보증하는 지표는 아닙니다.</p>
  </section>;
}
