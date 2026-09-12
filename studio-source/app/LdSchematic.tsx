"use client";
import {useEffect, useRef} from "react";
import "./LdSchematic.css";
const colors={solution:"#a3e879",dilute:"#75b8ff",concentrated:"#ffb366",air:"#ffd24c",cold:"#4ee7f0",heat:"#ff8c82"};
type FlowColor=keyof typeof colors;
function Flow({d,color="solution",dashed=false,arrow=true}:{d:string;color?:FlowColor;dashed?:boolean;arrow?:boolean}){
 return <g className={`ldp-flow ${dashed?"ldp-return":""}`} style={{color:colors[color]}}>
  <path d={d} markerEnd={arrow?`url(#ldp-${color})`:undefined}/>
  {[0,1].map(i=><circle key={i} className="ldp-particle" r="3.5" fill="currentColor" aria-hidden="true"><animateMotion path={d} dur="4s" begin={`${-i*2}s`} repeatCount="indefinite" calcMode="paced"/></circle>)}
 </g>;
}
function Unit({regen=false,mobile=false}:{regen?:boolean;mobile?:boolean}){
 const x=mobile?162:64,y=mobile?62:64,w=mobile?248:312,h=mobile?118:142;
 return <g className={regen?"ldp-regen":"ldp-abs"}>
  <rect className={`ldp-equipment ${regen?"heat":"cold"}`} x={x} y={y} width={w} height={h} rx="10"/>
  <text className="ldp-unit-name" x={x+w/2} y={y+32}>{regen?"REGENERATOR":"ABSORBER"}</text>
  <text x={x+w/2} y={y+(mobile?66:80)}>{regen?"수분: 용액 → 공기":"수분: 공기 → 용액"}</text>
  <text className="ldp-note" x={x+w/2} y={y+(mobile?98:116)}>{regen?"농도 ↑ · 공기 습도 ↑":"농도 ↓ · 공기 습도 ↓"}</text>
 </g>;
}
function DesktopLoop({regen=false,x=0}:{regen?:boolean;x?:number}){
 const ret=regen?"concentrated":"dilute",thermal=regen?"heat":"cold";
 return <g transform={`translate(${x} 0)`}>
  <text x="124" y="24">외기 유입</text><text x="316" y="24">{regen?"습윤 배기":"건조 급기"}</text>
  <Flow d="M124 34V59" color="air"/><Flow d="M316 61V34" color={thermal}/>
  <Unit regen={regen}/>
  <Flow d="M96 340V226H126V210"/>
  <Flow d="M316 210V226H344V340" dashed color={ret} arrow={false}/>
  <text className="ldp-route-label" style={{fill:colors.solution}} x="165" y="234">공급</text>
  <text className="ldp-route-label" style={{fill:colors[ret]}} x="290" y="247">{regen?"농축 환수":"희석 환수"}</text>
  <rect className={`ldp-equipment ${thermal}`} x="34" y="256" width="148" height="60" rx="8"/>
  <text x="108" y="280">{regen?"용액 가열":"용액 냉각"}</text><text className="ldp-note" x="108" y="303">열교환기</text>
  <Flow d="M326 282H188" color={thermal}/>
  <text className="ldp-thermal-label" style={{fill:colors[thermal]}} x="260" y="273">{regen?"열 공급":"냉각 공급"}</text>
  <text className="ldp-note" x="260" y="313">{regen?"TES·보조열원":"냉열원"}</text>
 </g>;
}
function Tank({x,y}:{x:number;y:number}){
 return <g className="ldp-common-tank" transform={`translate(${x} ${y})`}><path d="M0 13V69C0 90 220 90 220 69V13Z"/><ellipse cx="110" cy="13" rx="110" ry="13"/><text x="110" y="44">공통 수용액탱크</text><text className="ldp-note" x="110" y="70">LiCl · 완전 혼합</text></g>;
}
export default function LdSchematic({onClose}:{onClose:()=>void}){
 const dialogRef=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const dialog=dialogRef.current!,previousOverflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow="hidden";
  return()=>{dialog.close();document.body.style.overflow=previousOverflow;};
 },[]);
 useEffect(()=>{
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)"),svgs=Array.from(dialogRef.current!.querySelectorAll<SVGSVGElement>(".ldp-diagram")),visible=new Set<SVGSVGElement>();
  const sync=()=>svgs.forEach(svg=>{if(reduced.matches||document.hidden||!visible.has(svg))svg.pauseAnimations();else svg.unpauseAnimations();});
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)visible.add(entry.target as SVGSVGElement);else visible.delete(entry.target as SVGSVGElement);});sync();});
  svgs.forEach(svg=>observer.observe(svg));sync();reduced.addEventListener("change",sync);document.addEventListener("visibilitychange",sync);
  return()=>{observer.disconnect();reduced.removeEventListener("change",sync);document.removeEventListener("visibilitychange",sync);};
 },[]);
 return <dialog ref={dialogRef} className="ldp-dialog" aria-labelledby="ldp-title" onCancel={onClose} onClose={onClose}>
  <header className="ldp-header"><h2 id="ldp-title">LD SYSTEM SCHEMATIC</h2><button autoFocus type="button" className="ldp-close" aria-label="LD 상세 스케메틱 닫기" onClick={onClose}>×</button></header>
  <div className="ldp-content">
   <svg className="ldp-defs" aria-hidden="true"><defs>{Object.entries(colors).map(([name,color])=><marker key={name} id={`ldp-${name}`} markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill={color}/></marker>)}</defs></svg>
   <svg className="ldp-diagram ldp-wide" viewBox="0 0 880 480" role="img" aria-label="하단 공통 탱크에서 제습부와 재생부로 각각 공급. 파란 희석 환수와 주황 농축 환수가 한 탱크에서 혼합됩니다.">
    <DesktopLoop/><DesktopLoop regen x={440}/>
    <Flow d="M330 424H96V340" arrow={false}/><Flow d="M550 424H536V340" arrow={false}/>
    <Flow d="M344 340V355H406V380" dashed color="dilute"/>
    <Flow d="M784 340V355H548Q536 335 524 355H474V380" dashed color="concentrated"/>
    <Tank x={330} y={384}/>
    <text className="ldp-note" x="178" y="461">탱크 → 두 장치 공급</text><text className="ldp-note" x="706" y="461">두 환수액 → 탱크 혼합</text>
   </svg>
   <svg className="ldp-diagram ldp-narrow" viewBox="0 0 440 886" role="img" aria-label="공통 탱크에 연결된 제습·재생 병렬 회로. 아래로 스크롤하면 공통 탱크가 보입니다. 녹색 공급, 파란 희석 환수, 주황 농축 환수.">
    <Flow d="M110 830H10V340H96" arrow={false}/><Flow d="M10 720H96" arrow={false}/>
    <Flow d="M344 340H418V758H245V781" color="dilute" dashed/>
    <Flow d="M344 720H406Q418 700 430 720H432V770H290V781" color="concentrated" dashed/>
    <DesktopLoop/><g transform="translate(0 380)"><DesktopLoop regen/></g>
    <Tank x={110} y={786}/>
   </svg>
  </div>
  <footer className="ldp-footer"><div className="ldp-legend"><span className="solution">용액 공급</span><span className="dilute">희석 환수</span><span className="concentrated">농축 환수</span></div><p>냉각·가열은 열교환기 작용 방향 · 열매체와 용액은 분리</p></footer>
 </dialog>;
}
