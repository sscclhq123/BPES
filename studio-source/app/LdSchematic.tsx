"use client";

import {useEffect, useRef, useState} from "react";
import "./LdSchematic.css";

const colors = {solution:"#9ee678", air:"#ffd24c", cold:"#4ee7f0", heat:"#ff8c82"};
type FlowColor = keyof typeof colors;

function Flow({d, color="solution", dashed=false, arrow=true}:{d:string;color?:FlowColor;dashed?:boolean;arrow?:boolean}) {
  return <g className={`ldp-flow ${dashed?"ldp-return":""}`} style={{color:colors[color]}}>
    <path d={d} markerEnd={arrow?`url(#ldp-${color})`:undefined}/>
    {[0,1].map(i=><circle key={i} className="ldp-particle" r="4.5" fill="currentColor" aria-hidden="true"><animateMotion path={d} dur="4s" begin={`${-i*2}s`} repeatCount="indefinite" calcMode="paced"/></circle>)}
  </g>;
}

function Loop({regen=false}:{regen?:boolean}) {
  const color = regen?"heat":"cold";
  return <section className={`ldp-loop ${regen?"ldp-regen":"ldp-abs"}`} aria-label={regen?"재생 순환":"제습 순환"}>
    <header><h3>{regen?"재생부":"제습부"}</h3><p>{regen?"재생 부하에 맞춰 공기·용액 유량 조절":"건물에 필요한 외기량 유지"}</p></header>
    <svg viewBox="0 0 440 500" role="img" aria-label={regen?"공통 탱크 용액을 가열한 뒤 재생하고 농축 환수. 외기는 수분을 받아 외부로 배출.":"공통 탱크 용액을 냉각한 뒤 제습하고 희석 환수. 외기는 수분을 잃고 건물로 공급."}>
      <g className="ldp-mobile-rails"><path className="ldp-supply-rail" d="M10 0V500"/><path className="ldp-return-rail" d="M430 0V500"/><path d="M10 480H96"/><path className="ldp-return-rail" d="M344 480H430"/></g>
      <text x="122" y="38">외기 유입</text><text className="ldp-note" x="122" y="65">OUTDOOR AIR</text>
      <text x="316" y="38">{regen?"습윤 배기":"건조 급기"}</text><text className="ldp-note" x="316" y="65">{regen?"외부로 배출":"건물로 공급"}</text>
      <Flow d="M122 78V116" color="air"/><Flow d="M316 118V78" color={color}/>
      <rect className={`ldp-equipment ${color}`} x="62" y="122" width="316" height="192" rx="12"/>
      <text className="ldp-unit-name" x="220" y="158">{regen?"REGENERATOR":"ABSORBER"}</text>
      <path className="ldp-packing" d="M100 181H340M100 198H340M100 215H340"/>
      <text className="ldp-transfer" x="220" y="250">{regen?"수분: 용액 → 공기":"수분: 공기 → 용액"}</text>
      <text className="ldp-note" x="220" y="282">{regen?"용액 농도 ↑ · 공기 습도 ↑":"용액 농도 ↓ · 공기 습도 ↓"}</text>
      <Flow d="M96 480V346H126V318"/>
      <Flow d="M316 318V334H344V480" dashed/>
      <g className="ldp-desktop-ends"><Flow d="M96 500V480" arrow={false}/><Flow d="M344 480V500" dashed arrow={false}/></g>
      <text className="ldp-solution-label" x="180" y="344">공급 ↑</text>
      <text className="ldp-solution-label" x="278" y="362">{regen?"농축 환수 ↓":"희석 환수 ↓"}</text>
      <rect className={`ldp-equipment ${color}`} x="40" y="384" width="152" height="68" rx="10"/>
      <text x="116" y="411">{regen?"용액 가열":"용액 냉각"}</text><text className="ldp-note" x="116" y="436">열교환기</text>
      <Flow d={regen?"M324 421H198":"M198 421H324"} color={color}/>
      <text className="ldp-heat-label" x="262" y="399">{regen?"열 공급":"열 제거"}</text>
      <text className="ldp-note" x="262" y="453">{regen?"TES + 보조열원":"냉각원으로 방출"}</text>
    </svg>
  </section>;
}

export default function LdSchematic({onClose}:{onClose:()=>void}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [paused,setPaused] = useState(false);
  useEffect(()=>{
    const dialog=dialogRef.current!;
    const previousOverflow=document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow="hidden";
    return()=>{dialog.close();document.body.style.overflow=previousOverflow;};
  },[]);
  useEffect(()=>{
    const root=contentRef.current!;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
    const svgs=Array.from(root.querySelectorAll("svg"));
    const visible=new Set<SVGSVGElement>();
    const sync=()=>svgs.forEach(svg=>{
      if(paused||reduced.matches||document.hidden||!visible.has(svg))svg.pauseAnimations();
      else svg.unpauseAnimations();
    });
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{
      if(entry.isIntersecting)visible.add(entry.target as SVGSVGElement);
      else visible.delete(entry.target as SVGSVGElement);
    });sync();},{root});
    svgs.forEach(svg=>observer.observe(svg));sync();
    reduced.addEventListener("change",sync);document.addEventListener("visibilitychange",sync);
    return()=>{observer.disconnect();reduced.removeEventListener("change",sync);document.removeEventListener("visibilitychange",sync);};
  },[paused]);
  return <dialog ref={dialogRef} className="ldp-dialog" aria-labelledby="ldp-title" onCancel={onClose} onClose={onClose}>
    <header className="ldp-header"><div><span>LIQUID DESICCANT · TWO PARALLEL LOOPS</span><h2 id="ldp-title">공통 수용액탱크와 제습·재생 순환</h2></div><button autoFocus type="button" className="ldp-close" aria-label="LD 상세 스케메틱 닫기" onClick={onClose}>×</button></header>
    <div className="ldp-content" ref={contentRef}>
      <div className="ldp-intro"><p>한 탱크에서 두 장치로 각각 공급하고, 희석·농축된 환수액을 다시 혼합합니다.</p><button type="button" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?"흐름 재생":"흐름 일시정지"}</button></div>
      <svg className="ldp-defs" aria-hidden="true"><defs>{Object.entries(colors).map(([name,color])=><marker key={name} id={`ldp-${name}`} markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0 0L12 6L0 12Z" fill={color}/></marker>)}</defs></svg>
      <div className="ldp-circuits"><Loop/><Loop regen/></div>
      <div className="ldp-tank" aria-label="두 루프가 공유하는 하나의 완전 혼합 수용액탱크">
        <svg className="ldp-tank-wide" viewBox="0 0 880 210" role="img" aria-label="제습과 재생 용액 공급 및 환수가 하나의 하단 탱크에 연결">
          <Flow d="M340 130H96V0" arrow={false}/><Flow d="M540 130H536V0" arrow={false}/>
          <Flow d="M344 0V46H406V76" dashed/>
          <Flow d="M784 0V46H548Q536 26 524 46H474V76" dashed/>
          <Tank x={330} y={78}/>
          <text className="ldp-note" x="175" y="170">공통 탱크 → 제습부</text><text className="ldp-note" x="697" y="170">공통 탱크 → 재생부</text>
        </svg>
        <svg className="ldp-tank-narrow" viewBox="0 0 440 250" role="img" aria-label="하단 공통 수용액탱크. 왼쪽은 두 장치 공급, 오른쪽은 두 장치 환수">
          <Flow d="M110 142H10V0" arrow={false}/><Flow d="M430 0V36H220V76" dashed/>
          <Tank x={110} y={78}/>
          <text className="ldp-note" x="220" y="226">두 환수액 혼합 · 하나의 농도와 온도</text>
        </svg>
      </div>
      <div className="ldp-legend"><span className="solution">실선: 용액 공급</span><span className="solution return">점선: 용액 환수</span><span className="cold">냉각·건조 급기</span><span className="heat">가열·습윤 배기</span></div>
      <div className="ldp-notes"><p><b>물질교환</b> 제습부는 외기의 수분을 용액에 흡수하고, 재생부는 용액의 수분을 외기로 내보냅니다.</p><p><b>열교환</b> 냉각원은 제습 용액의 열을 제거하고, 태양열–TES·보조열원은 재생 용액을 가열합니다. 열매체와 LiCl 용액은 섞이지 않습니다.</p><p><b>독립 운전</b> 두 루프는 직렬이 아닙니다. 재생 풍량·용액유량은 제습 풍량과 별도로 제어하며, 애니메이션 속도는 실제 유량을 나타내지 않습니다.</p></div>
    </div>
  </dialog>;
}

function Tank({x,y}:{x:number;y:number}) {
  return <g className="ldp-common-tank" transform={`translate(${x} ${y})`}><path d="M0 16V100C0 124 220 124 220 100V16Z"/><ellipse cx="110" cy="16" rx="110" ry="16"/><text x="110" y="54">공통 수용액탱크</text><text className="ldp-note" x="110" y="83">LiCl · 완전 혼합</text></g>;
}
