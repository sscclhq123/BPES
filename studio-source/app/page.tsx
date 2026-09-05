"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";

type View = "intro" | "overview" | "wizard" | "calculating" | "result";
type HeatmapDay = {day:number;hours:number[]};
type HeatmapWeek = {week:number;hours:number[];days?:HeatmapDay[]};
type HeatmapMonth = {month:number;hours:number[];weeks?:HeatmapWeek[]};
type WeatherMonth = {month:number;outdoorTemp:number;outdoorHumidity:number;irradiation:number};
type ConcentrationHour = {hour:number;value:number};
type ConcentrationDay = {day:number;hours:ConcentrationHour[]};
type ConcentrationMonth = {month:number;days:ConcentrationDay[]};
type CalculationRegion = { key:string; label:string; best:Record<string,number|string|boolean>; monthly:Array<Record<string,number|string>>; weatherMonthly?:WeatherMonth[]; solutionConcentrationDrilldown?:ConcentrationMonth[]; unmetTrend?:Record<string,unknown>; ldUsageHeatmap?:HeatmapMonth[]; regUsageHeatmap?:HeatmapMonth[]; areaResults?:Array<Record<string,unknown>> };
type CalculationSummary = { primaryKey:string; regions:CalculationRegion[]; failedCount:number };
type Design = {
  weatherMode: "standard" | "upload"; weatherDataset: string; weatherDatasets: string[]; analysisPeriod: "annual" | "custom"; simulationMonths: number[];
  buildingInputMode: "template" | "custom"; buildingUse: string; buildingSize: string; mallParking: "no" | "yes";
  buildingArea: number; parkingArea: number; parkingCollectorCoverage: number; operationHours: number; airflow: number;
  targetAbsHumidity: number; targetHumidityTolerance: number; solutionConcentration: number; lgRatio: number; absSolutionTemp:number; regenTemp: number;
  ldDesignMode:"auto"|"manual";
  lgMode:"auto"|"fixed"; absTempMode:"auto"|"fixed"; regenMode:"auto"|"fixed";
  collectorType: string; targetSolarShare: number | ""; tesSupplyTemp: number; tesReturnTemp: number;
};

const initialDesign: Design = {
  weatherMode: "standard", weatherDataset: "seoul_epw", weatherDatasets: ["seoul_epw"], analysisPeriod:"annual", simulationMonths:Array.from({length:12},(_,index)=>index+1), buildingInputMode: "template", buildingUse: "", buildingSize: "", mallParking: "no",
  buildingArea: 4982, parkingArea: 1800, parkingCollectorCoverage: 35, operationHours: 9, airflow: 7745,
  targetAbsHumidity: 10, targetHumidityTolerance: 0.5, solutionConcentration: 38, lgRatio: 1, absSolutionTemp:25, regenTemp: 59.4,
  ldDesignMode:"auto", lgMode:"auto", absTempMode:"auto", regenMode:"auto",
  collectorType: "evacuated", targetSolarShare: "", tesSupplyTemp: 60, tesReturnTemp: 45,
};

const steps = [
  { no: "01", label: "WEATHER", title: "기상데이터를 선택하세요", copy: "표준 TMYx 지역 또는 보유 기상파일을 사용합니다." },
  { no: "02", label: "BUILDING", title: "건물 조건을 설정하세요", copy: "용도와 규모에 따라 최소 외기도입량을 산정합니다." },
  { no: "03", label: "LD DESIGN", title: "LD 산정 방식을 선택하세요", copy: "요구조건만 입력해 자동 산정하거나, 사용자 지정 운전조건을 적용합니다." },
  { no: "04", label: "SOLAR / TES", title: "태양열 목표를 설정하세요", copy: "목표 재생열 커버율과 TES 온도조건을 입력합니다." },
];

export default function Home() {
  const [view, setView] = useState<View>("intro");
  const [step, setStep] = useState(0);
  const [design, setDesign] = useState<Design>(initialDesign);
  const [weatherFile, setWeatherFile] = useState<File | null>(null);
  const [resultSummary, setResultSummary] = useState<CalculationSummary | null>(null);
  const [calculationError, setCalculationError] = useState("");
  const screenRef = useRef<HTMLElement>(null);
  const progress = view === "intro" ? 0 : view === "wizard" ? step + 1 : 4;
  const ldRangeError = design.solutionConcentration<36.4||design.solutionConcentration>39||design.lgRatio<1||design.lgRatio>3||design.absSolutionTemp<20||design.absSolutionTemp>31.4||design.regenTemp<48.5||design.regenTemp>59.4;

  const reset = useCallback(() => { setDesign(initialDesign); setWeatherFile(null); setResultSummary(null); setCalculationError(""); setStep(0); setView("intro"); }, []);
  const moveTo = useCallback((next: View) => {
    setView(next);
  }, []);

  useEffect(() => {
    if (view !== "intro") return;
    const start = (event: KeyboardEvent) => { if (!event.metaKey && !event.ctrlKey && !event.altKey) moveTo("overview"); };
    window.addEventListener("keydown", start, { once:true });
    return () => window.removeEventListener("keydown", start);
  }, [moveTo, view]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animate(".screen-reveal", { opacity:{from:0,to:1}, translateY:{from:16,to:0}, delay:stagger(55), duration:520, ease:"out(4)" });
    animate(".dial-ring-a", { rotate:360, duration:view === "calculating" ? 1500 : 18000, loop:true, ease:"linear" });
    animate(".dial-ring-b", { rotate:-360, duration:view === "calculating" ? 2300 : 24000, loop:true, ease:"linear" });
    animate(".pulse-dot", { scale:[{to:.4,duration:500},{to:1,duration:800}], opacity:[{to:.25,duration:500},{to:1,duration:800}], delay:stagger(70,{from:"center"}), loop:true, ease:"inOut(3)" });
  }, [step, view]);

  useEffect(() => {
    const receiveResult = (event:MessageEvent) => {
      if (event.origin !== "https://saldop.vercel.app") return;
      if (event.data?.type === "saldop:calculation-complete") {
        setResultSummary(event.data.summary as CalculationSummary);
        setCalculationError("");
        setView("result");
      }
      if (event.data?.type === "saldop:calculation-failed") setCalculationError(event.data.message || "계산에 실패했습니다.");
    };
    window.addEventListener("message",receiveResult);
    return ()=>window.removeEventListener("message",receiveResult);
  },[]);

  const update = <K extends keyof Design>(key: K, value: Design[K]) => setDesign((current) => ({ ...current, [key]:value }));
  const startCalculation = () => {
    if (design.targetSolarShare === "" || design.targetSolarShare <= 0 || design.targetSolarShare > 100) return;
    setResultSummary(null); setCalculationError("");
    setView("calculating");
  };
  const appUrl = useMemo(() => {
    const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(design).filter(([k,v])=>!["weatherDatasets","simulationMonths"].includes(k)&&v!=="").map(([k,v]) => [k,String(v)])), autorun:design.weatherMode === "standard" ? "1" : "0" });
    design.weatherDatasets.forEach((dataset)=>params.append("weatherDataset",dataset));
    design.simulationMonths.forEach((month)=>params.append("simulationMonth",String(month)));
    return `https://saldop.vercel.app/engine/?${params.toString()}`;
  }, [design]);

  if (view === "result" && resultSummary) return <ResultOverview summary={resultSummary} design={design} onReset={reset} />;

  if (view === "intro") return (
    <main className="entry intro-screen" ref={screenRef} onClick={() => moveTo("overview")}>
      <Logo reset={reset} />
      <section className="anime-hero screen-reveal">
        <div className="intro-copy">
          <p className="kicker">SOLAR LIQUID DESICCANT SYSTEM DESIGN PROGRAM</p>
          <h1 className="acronym-title">
            <span><em>S</em>olar-<em>A</em>ssisted</span>
            <span><em>L</em>iquid <em>D</em>esiccant</span>
            <span><em>O</em>perational Design <em>P</em>rogram.</span>
          </h1>
          <p className="lede">표준 기상데이터와 건물 용도별 최소 외기도입량을 바탕으로 LD 제습·재생 운전조건을 계산하고, 목표 재생열 커버율에 필요한 태양열 집열기 면적을 제시하는 초기 설계 가이드입니다.</p>
        </div>
        <ProgressDial progress={0} mode="intro" />
      </section>
      <footer className="intro-footer contact-footer screen-reveal">
        <div className="contact-label"><span>CONTACT</span><small>PROJECT INQUIRY</small></div>
        <div className="contact-links">
          <a href="mailto:20231871@edu.hanbat.ac.kr" onClick={(event)=>event.stopPropagation()}>20231871@edu.hanbat.ac.kr ↗</a>
        </div>
        <small>CLICK OR PRESS ANY KEY TO START</small>
      </footer>
    </main>
  );

  if(view==="overview")return <SystemOverview onBack={()=>moveTo("intro")} onNext={()=>moveTo("wizard")} reset={reset}/>;

  const current = steps[step];
  return (
    <main className={`entry wizard-screen${view === "calculating" ? " is-calculating" : ""}`} ref={screenRef}>
      <Logo reset={reset} progress={progress} />
      <section className="wizard-layout">
        {view === "calculating" ? (
          <div className="calculating-copy screen-reveal"><p className="kicker">CALCULATION ENGINE</p><h1>설계 조합을<br /><em>계산하고 있습니다.</em></h1><p>시간별 기상조건과 LD 운전범위, 집열기 면적 후보를 순차적으로 평가합니다.</p></div>
        ) : (
          <div className="step-panel screen-reveal">
            <p className="kicker">STEP {current.no} · {current.label}</p><h1>{current.title}</h1><p className="step-copy">{current.copy}</p>
            <StepFields step={step} design={design} update={update} weatherFile={weatherFile} onWeatherFile={setWeatherFile} />
            <div className="step-actions"><span>{step+1} / 4</span>{step===3?<span className="final-hint">오른쪽 원에서 계산 시작</span>:<span />}</div>
          </div>
        )}
        <ProgressDial progress={progress} mode={view === "calculating" ? "calculating" : step === 3 ? "ready" : "wizard"} onCalculate={startCalculation} calculateEnabled={design.targetSolarShare!==""&&design.targetSolarShare>0&&design.targetSolarShare<=100} onNext={view === "wizard" && step < 3 && (step!==1 || design.buildingInputMode!=="template" || Boolean(design.buildingUse&&design.buildingSize)) && !(step===2&&ldRangeError) ? ()=>setStep(step+1) : undefined} onPrev={view === "wizard" && step > 0 ? ()=>setStep(step-1) : undefined} buildingUse={design.buildingUse} buildingSize={design.buildingSize} ldError={step===2&&ldRangeError} />
      </section>
      {view==="calculating"&&<><iframe className="calculation-frame" title="SALDOP 계산 엔진" src={appUrl} onLoad={(event)=>{if(design.weatherMode==="upload"&&weatherFile)event.currentTarget.contentWindow?.postMessage({type:"saldop:weather-file",file:weatherFile},"https://saldop.vercel.app");}}/><div className={`calculation-error${calculationError?" visible":""}`}>{calculationError}</div></>}
      <nav className="step-rail">{steps.map((item,index)=><button key={item.no} className={index===step&&view==="wizard"?"active":index<progress?"done":""} onClick={()=>{if(view==="wizard")setStep(index)}}><span>{item.no}</span>{item.label}</button>)}</nav>
    </main>
  );
}

function Logo({ reset, progress=0 }:{ reset:()=>void; progress?:number }) { return <header className="intro-nav screen-reveal"><button className="logo-button" onClick={(event)=>{event.stopPropagation();reset();}}>SALDOP<span>°</span></button><p>Solar + LD<br />Design engine</p><div><span>{String(progress).padStart(2,"0")}</span><i style={{"--progress":`${progress*25}%`} as React.CSSProperties}/><span>04</span></div></header>; }

function SystemOverview({onBack,onNext,reset}:{onBack:()=>void;onNext:()=>void;reset:()=>void}) {
  const schematicDetails = [
    {no:"01",label:"외기·기상",title:"외기·기상 데이터",body:"TMYx 또는 사용자 EPW의 시간별 건구온도, 상대·절대습도와 일사량을 읽습니다. 이 데이터로 LD 유입공기의 수분부하와 집열기 입사에너지를 같은 시간축에서 계산합니다."},
    {no:"02",label:"건물",title:"건물·최소 외기도입량",body:"건물 용도, 연면적, 재실밀도와 운전 스케줄을 적용합니다. 면적 기준 외기량과 인원 기준 외기량을 합산해 DOAS가 실제 처리해야 할 최소 외기도입량을 산정합니다."},
    {no:"03",label:"LD 외조기",title:"LD 제습·용액 재생",body:"제습부는 외기를 목표 급기 절대습도와 허용상한 이내로 처리합니다. 전체 외기량은 권장 장치 유량에 맞춰 병렬 분배하며, 제습 성능은 L/G와 제습부 입구 용액온도로 제어합니다. 재생부 입구 용액온도는 흡습으로 희석된 LiCl 용액을 목표 농도까지 회복하도록 제어합니다."},
    {no:"04",label:"집열기",title:"태양열 집열기",body:"경사면 일사량, 집열기 면적과 효율곡선을 이용해 시간별 유효 집열량을 산정합니다. 목표 재생열 커버율을 만족하는 최소 집열기 면적을 반복 탐색합니다."},
    {no:"05",label:"TES",title:"TES·보조열원",body:"집열된 열을 TES에 충전하고 LD 재생 요구가 발생하면 방전합니다. 동일 시간대의 공급·수요를 우선 대응하며, 부족분은 보조열원, 저장 한계를 넘는 생산량은 미활용·잉여열로 구분합니다."}
  ];
  const [activeDetail,setActiveDetail] = useState(0);
  const detail = schematicDetails[activeDetail];
  return <main className="entry overview-screen"><Logo reset={reset}/><section className="system-overview screen-reveal"><header><div><span>SYSTEM DEFINITION</span><h2>SYSTEM SCHEMATIC</h2></div><small>INTRODUCTION · 00 / 04</small></header>
    <div className="system-scene" aria-label="SALDOP 시스템 구성도">
      <div className="scene-visual">
      <svg className="scene-art" viewBox="-120 0 1360 560" role="img" aria-label="외기, 건물, LD 외조기, 태양열 집열기와 축열조의 연결 구성">
        <defs>
          <linearGradient id="buildingFace" x1="0" x2="1"><stop stopColor="#343833"/><stop offset="1" stopColor="#20231f"/></linearGradient>
          <linearGradient id="roofFace" x1="0" y1="1"><stop stopColor="#343833"/><stop offset="1" stopColor="#4a4e47"/></linearGradient>
          <filter id="sceneGlow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <marker id="airArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#ffd24c"/></marker>
          <marker id="coolArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#4ee7f0"/></marker>
          <marker id="intakeArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#a9ff41"/></marker>
          <marker id="heatArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#ff4f50"/></marker>
        </defs>
        <g className="scene-content" transform="translate(-40 0)">
        <g className="scene-sun" transform="translate(560 72)"><circle r="29"/><g>{Array.from({length:12}).map((_,i)=><line key={i} x1="0" y1="-42" x2="0" y2="-58" transform={`rotate(${i*30})`}/>)}</g></g>
        <g className="solar-beams" aria-hidden="true"><path d="M574 102C592 119 612 132 641 143"/><path d="M588 91C616 108 641 120 676 134"/><path d="M576 115C596 132 611 141 628 151"/></g>
        <g className="scene-cloud" transform="translate(126 210)"><path d="M0 30C0 8 20 1 37 12C47-15 92-8 94 22C123 18 134 58 104 65H20C-4 65-12 42 0 30Z"/></g>
        <g className="scene-ground"><path d="M210 450L625 286L1080 430L650 548Z"/><path d="M210 450L650 548L650 558L210 461Z"/></g>
        <g className="scene-building">
          <path className="building-left" d="M512 225L690 285V493L512 438Z"/>
          <path className="building-front" d="M690 285L909 213V420L690 493Z"/>
          <path className="building-roof" d="M512 225L730 158L909 213L690 285Z"/>
          {[0,1,2].map(row=>[0,1,2].map(col=><path key={`l${row}${col}`} className="scene-window" d={`M${540+col*48} ${274+row*54}l28 9v27l-28-9z`}/>))}
          {[0,1,2].map(row=>[0,1,2,3].map(col=><path key={`f${row}${col}`} className="scene-window" d={`M${720+col*43} ${304+row*48}l27-9v28l-27 9z`}/>))}
        </g>
        <g className="scene-collector" transform="translate(615 151)">{[0,1,2].map(i=><g key={i} transform={`translate(${i*70} ${i*5})`}><path d="M0 0L62-19L91-10L29 10Z"/><path d="M6-1L29 6M27-8L50-1M48-14L72-7"/></g>)}</g>
        <g className="scene-doas" transform="translate(327 320)"><path className="unit-top" d="M0 0L118-38L196-14L77 24Z"/><path className="unit-left" d="M0 0L77 24V112L0 88Z"/><path className="unit-front" d="M77 24L196-14V74L77 112Z"/><circle cx="117" cy="51" r="24"/><path d="M117 29V73M95 51H139"/></g>
        <g className="scene-tes" transform="translate(967 309)"><ellipse cx="44" cy="12" rx="43" ry="13"/><path d="M1 12V113C1 131 87 131 87 113V12"/><ellipse cx="44" cy="113" rx="43" ry="13"/><path className="tes-level" d="M8 61V111C8 123 80 123 80 111V61C60 70 28 70 8 61Z"/><text x="24" y="52">TES</text></g>
        <path className="flow-line flow-air" markerEnd="url(#airArrow)" d="M165 274C220 274 252 337 322 353"/>
        <path className="flow-line flow-supply" markerEnd="url(#coolArrow)" d="M465 350C520 398 560 396 606 341"/>
        <path className="flow-line flow-intake" markerEnd="url(#intakeArrow)" d="M594 257C559 207 493 219 477 306"/>
        <path className="flow-line flow-solar" markerEnd="url(#heatArrow)" d="M786 159C895 149 1012 196 1016 295"/>
        <path className="flow-line flow-heat" markerEnd="url(#heatArrow)" d="M968 360C820 349 648 267 472 333"/>
        <text className="flow-label" x="182" y="262">OUTDOOR AIR</text><text className="flow-label intake" x="492" y="218">OUTDOOR AIR INTAKE</text><text className="flow-label cool" x="500" y="445">DRY SUPPLY AIR</text><text className="flow-label heat" x="836" y="139">SOLAR HEAT</text>
        </g>
      </svg>
      {schematicDetails.map((item,index)=><button key={item.no} className={`scene-hotspot hotspot-${["weather","building","ld","solar","tes"][index]}${activeDetail===index?" selected":""}`} aria-label={`${item.no} ${item.label}`} onMouseEnter={()=>setActiveDetail(index)} onFocus={()=>setActiveDetail(index)} onClick={()=>setActiveDetail(index)}><b>{item.no}</b><em>{item.label}</em></button>)}
      <div className="scene-hint">설비 위에 커서를 올려 세부 계산 범위를 확인하세요</div>
      </div>
      <aside className="scene-detail-panel" aria-live="polite"><b>{detail.no}</b><div><span>{detail.label}</span><h3>{detail.title}</h3><p>{detail.body}</p></div></aside>
    </div>
    <div className="overview-grid"><article><span>USER INPUT</span><h3>사용자가 정하는 요구조건</h3><p>지역과 분석기간, 건물 용도·규모, 목표 급기 절대습도와 허용상한, 목표 재생열 커버율, TES 공급·환수온도</p></article><article><span>PROGRAM OUTPUT</span><h3>프로그램이 산정하는 설계값</h3><p>최소 외기도입량, LD 병렬 대수, 목표를 만족하는 L/G·용액온도 운전조건, 제습 미충족 지표, 재생열 요구량과 최소 집열기 면적</p></article></div><div className="storyboard"><span>USE SCENARIO</span><ol><li><b>1</b><p>LD 시스템 개발자가 적용 건물과 기후를 선택합니다.</p></li><li><b>2</b><p>프로그램이 외기부하와 LD 운전 가능 범위를 시간별로 계산합니다.</p></li><li><b>3</b><p>목표 커버율을 만족하는 최소 집열기 면적과 에너지 부족분을 비교합니다.</p></li><li><b>4</b><p>면적 증가에 따른 열 확보와 설치 부담 사이의 설계 판단자료로 활용합니다.</p></li></ol></div><p className="scope-note"><b>현재 설계 범위</b> DOAS 방식의 외기 제습부하와 태양열 재생 시스템을 대상으로 하는 초기 설계 가이드입니다. 경제성 최적화와 상세 TES 성층화 해석은 현재 범위에 포함하지 않습니다.</p><footer className="overview-actions"><button onClick={onBack}>← 인트로로</button><button onClick={onNext}>기상데이터 선택 시작 <i>→</i></button></footer></section></main>;
}

function ProgressDial({progress,mode,onCalculate,calculateEnabled=true,onNext,onPrev,buildingUse,buildingSize,ldError=false}:{progress:number;mode:string;onCalculate?:()=>void;calculateEnabled?:boolean;onNext?:()=>void;onPrev?:()=>void;buildingUse?:string;buildingSize?:string;ldError?:boolean}) {
  const stageIcons = ["SALDOP", "☼", "▦", "◉", "☀"];
  const buildingIcons:Record<string,string> = {office:"🏢",mall:"🏬",residential:"🏠",hospital:"🏥",factory:"🏭",agriculture:"🌿"};
  const buildingLabels:Record<string,string> = {office:"OFFICE",mall:"RETAIL",residential:"RESIDENTIAL",hospital:"HOSPITAL",factory:"INDUSTRIAL",agriculture:"AGRICULTURE"};
  return <div className={`energy-dial dial-${mode} screen-reveal`} style={{"--filled":progress} as React.CSSProperties}>
    <div className="dial-glow"/><div className="dial-ring dial-ring-a"/><div className="dial-ring dial-ring-b"/><div className="dial-ticks"/>
    <div className="progress-arcs">{[0,1,2,3].map(index=><i key={index} className={index<progress?"filled":""}/>)}</div>
    {onPrev&&<button type="button" className="dial-sector-nav dial-sector-prev" onClick={onPrev} aria-label="이전 단계로 이동"><span><i>←</i> 이전 단계</span></button>}
    {onNext&&<button type="button" className="dial-sector-nav dial-sector-next" onClick={onNext} aria-label="다음 단계로 이동"><span>다음 단계 <i>→</i></span></button>}
    <div className="dial-core">{Array.from({length:20}).map((_,i)=><span className="pulse-dot" key={i}/>)}
      {mode === "ready" ? <button className="calculate-button" disabled={!calculateEnabled} onClick={onCalculate}><b>{calculateEnabled?"계산 시작":"커버율 입력"}</b><small>{calculateEnabled?"RUN CALCULATION":"ENTER TARGET SHARE"}</small></button> : mode === "calculating" ? <div className="wait-status"><b>CALCULATING</b><small>예상 대기시간 6~12초</small><em>900개 설계 조합</em></div> : ldError?<div className="dial-status stage-icon ld-error-icon"><b>!</b><small>RANGE ERROR</small></div>:<div className={`dial-status stage-icon stage-icon-${progress}${progress===2?` building-symbol size-${buildingSize||"none"}`:""}`}><b>{progress===2?(buildingIcons[buildingUse||""]||"?"):stageIcons[progress]}</b><small>{progress===2?(buildingLabels[buildingUse||""]||"SELECT BUILDING"):progress ? steps[progress-1].label : "START"}</small></div>}
    </div>
    <span className={`dial-label label-a${progress===1?" active":""}`}>WEATHER</span><span className={`dial-label label-building${progress===2?" active":""}`}>BUILDING</span><span className={`dial-label label-b${progress===3?" active":""}`}>LD CONTROL</span><span className={`dial-label label-c${progress===4?" active":""}`}>SOLAR / TES</span>
  </div>;
}

function StepFields({step,design,update,weatherFile,onWeatherFile}:{step:number;design:Design;update:<K extends keyof Design>(key:K,value:Design[K])=>void;weatherFile:File|null;onWeatherFile:(file:File|null)=>void}) {
  if(step===0) {
    const regions = [["seoul_epw","서울"],["daejeon_tmyx","대전"],["busan_tmyx","부산"],["gwangju_tmyx","광주"],["daegu_tmyx","대구"],["incheon_tmyx","인천"],["jeju_tmyx","제주"],["manila_tmy","마닐라"],["cebu_tmyx","세부"],["bangkok_tmy","방콕"],["chiang_mai_tmyx","치앙마이"],["singapore_tmyx","싱가포르"],["amsterdam_tmyx","암스테르담"],["rotterdam_tmyx","로테르담"]];
    const toggleRegion = (key:string) => {
      const selected = design.weatherDatasets.includes(key) ? design.weatherDatasets.filter(item=>item!==key) : [...design.weatherDatasets,key];
      if (!selected.length) return;
      update("weatherDatasets",selected);
      update("weatherDataset",selected[0]);
    };
    const toggleMonth=(month:number)=>{const selected=design.simulationMonths.includes(month)?design.simulationMonths.filter(item=>item!==month):[...design.simulationMonths,month].sort((a,b)=>a-b);if(selected.length)update("simulationMonths",selected)};
    return <div className="field-stack"><div className="choice-pills"><button className={design.weatherMode==="standard"?"selected":""} onClick={()=>update("weatherMode","standard")}>표준 기상데이터</button><button className={design.weatherMode==="upload"?"selected":""} onClick={()=>update("weatherMode","upload")}>개인 기상데이터</button></div>{design.weatherMode==="standard"?<fieldset className="region-selector"><legend>지역 선택 <span>{design.weatherDatasets.length}개 선택</span></legend><div>{regions.map(([key,label])=><label key={key} className={design.weatherDatasets.includes(key)?"selected":""}><input type="checkbox" checked={design.weatherDatasets.includes(key)} onChange={()=>toggleRegion(key)}/><i/>{label}</label>)}</div></fieldset>:<label className="weather-file-field">개인 기상파일<span className="weather-file-drop"><input type="file" accept=".xlsx,.xls,.csv,.txt,.epw" onChange={event=>onWeatherFile(event.target.files?.[0]||null)} /><b>{weatherFile?.name||"Excel, CSV 또는 EPW 파일 선택"}</b><i>UPLOAD ↗</i></span><small>지원 형식 · XLSX / XLS / CSV / TXT / EPW</small></label>}<div className="period-control"><label>분석 기간<select value={design.analysisPeriod} onChange={e=>{const mode=e.target.value as Design["analysisPeriod"];update("analysisPeriod",mode);if(mode==="annual")update("simulationMonths",Array.from({length:12},(_,index)=>index+1))}}><option value="annual">1년 전체</option><option value="custom">월별 다중선택</option></select></label>{design.analysisPeriod==="custom"&&<fieldset className="month-selector"><legend>계산할 월 <span>{design.simulationMonths.length}개월</span></legend><div>{Array.from({length:12},(_,index)=>index+1).map(month=><button type="button" key={month} className={design.simulationMonths.includes(month)?"selected":""} onClick={()=>toggleMonth(month)}>{month}월</button>)}</div></fieldset>}</div></div>;
  }
  if(step===1) {
    const defaults:Record<string,[number,number,number]> = {office_small:[511,795,9],office_medium:[4982,7745,9],office_large:[46320,72004,9],mall_small:[1147,4486,12],mall_medium:[2294,8973,12],mall_large:[5226,22220,12],residential_small:[1567,1517,24],residential_medium:[3135,3034,24],residential_large:[7837,7519,24],hospital_small:[4487,12702,24],hospital_medium:[11218,31755,24],hospital_large:[22436,63510,24],factory_small:[2418,2707,12],factory_medium:[4835,5414,12],factory_large:[9670,10828,24],agriculture_small:[300,2500,24],agriculture_medium:[1500,14500,24],agriculture_large:[6000,62000,24]};
    const applyTemplate = (use:string,size:string) => {const value=defaults[`${use}_${size}`];if(!value)return;update("buildingArea",value[0]);update("airflow",value[1]);update("operationHours",value[2]);};
    const setUse=(use:string)=>{update("buildingUse",use);applyTemplate(use,design.buildingSize)}; const setSize=(size:string)=>{update("buildingSize",size);applyTemplate(design.buildingUse,size)};
    const baseValueFields=<div className="field-grid"><NumberField label="건축면적" unit="m²" value={design.buildingArea} step={10} onChange={v=>update("buildingArea",v)}/><NumberField label="처리풍량" unit="m³/h" value={design.airflow} step={10} onChange={v=>update("airflow",v)}/><label>운전 스케줄<select value={design.operationHours} onChange={e=>update("operationHours",Number(e.target.value))}><option value="9">09:00–18:00</option><option value="12">09:00–21:00</option><option value="24">24시간</option></select></label></div>;
    const parkingValueFields=<div className="field-grid parking-fields"><NumberField label="주차장·옥외공간 면적" unit="m²" value={design.parkingArea} step={10} onChange={v=>update("parkingArea",v)}/><NumberField label="집열기 설치 활용률" unit="%" value={design.parkingCollectorCoverage} step={1} onChange={v=>update("parkingCollectorCoverage",v)}/></div>;
    return <div className="field-stack"><label>건물 입력 방식<select value={design.buildingInputMode} onChange={e=>update("buildingInputMode",e.target.value as Design["buildingInputMode"])}><option value="template">표준 건물 모델</option><option value="custom">사용자 건물 정보 입력</option></select></label>{design.buildingInputMode==="template"&&<><div className="field-grid"><label>건물 용도<select value={design.buildingUse} onChange={e=>setUse(e.target.value)}><option value="" disabled>용도를 선택하세요</option><option value="office">오피스</option><option value="mall">쇼핑몰</option><option value="residential">주택</option><option value="hospital">병원</option><option value="factory">공장·산업시설</option><option value="agriculture">농업시설</option></select></label><label>규모<select value={design.buildingSize} onChange={e=>setSize(e.target.value)}><option value="" disabled>규모를 선택하세요</option><option value="small">소형</option><option value="medium">중형</option><option value="large">대형</option></select></label></div><label>주차장·옥외공간 집열기 활용<select value={design.mallParking} onChange={e=>update("mallParking",e.target.value as Design["mallParking"])}><option value="no">활용 안 함</option><option value="yes">활용함</option></select></label>{design.buildingUse&&design.buildingSize&&<div className="building-values">{baseValueFields}{design.mallParking==="yes"&&parkingValueFields}</div>}</>}{design.buildingInputMode==="custom"&&<div className="building-values">{baseValueFields}{parkingValueFields}</div>}</div>;
  }
  if(step===2) {
    const selectMode=(mode:Design["ldDesignMode"])=>{update("ldDesignMode",mode);if(mode==="auto"){update("lgMode","auto");update("absTempMode","auto");update("regenMode","auto")}};
    return <div className="ld-fields"><section className="ld-requirements"><b>USER REQUIREMENTS</b><h3>목표 제습조건</h3><div className="field-grid"><NumberField label="목표 급기 절대습도" unit="g/kgDA" value={design.targetAbsHumidity} step={.1} onChange={v=>update("targetAbsHumidity",v)}/><NumberField label="허용상한 여유" unit="g/kgDA" value={design.targetHumidityTolerance} step={.1} onChange={v=>update("targetHumidityTolerance",v)}/></div></section><div className="ld-design-mode"><button type="button" className={design.ldDesignMode==="auto"?"selected":""} onClick={()=>selectMode("auto")}><b>PROGRAM SIZING</b><strong>운전조건 자동 산정</strong><small>실험식 범위에서 목표 습도를 만족하는 L/G와 용액온도를 계산합니다.</small></button><button type="button" className={design.ldDesignMode==="manual"?"selected":""} onClick={()=>selectMode("manual")}><b>USER DEFINED</b><strong>사용자 운전조건 적용</strong><small>사용자가 지정한 조건을 고정하거나 선택 변수만 자동 조정합니다.</small></button></div>{design.ldDesignMode==="auto"?<div className="ld-auto-scope"><span>AUTO DESIGN RANGE</span><div><p><b>LiCl</b> 38.0% 초기값</p><p><b>L/G</b> 1.0–3.0</p><p><b>제습부</b> 20.0–31.4 °C</p><p><b>재생부</b> 48.5–59.4 °C</p></div><small>산정된 운전조건과 범위는 결과 화면에 출력됩니다. LD 대수는 목표 습도를 맞추기 위한 변수가 아니라 전체 외기도입량을 처리하도록 병렬 산정됩니다.</small></div>:<><div className="field-grid"><NumberField label="LiCl 초기 농도" unit="%" value={design.solutionConcentration} step={.1} min={36.4} max={39} onChange={v=>update("solutionConcentration",v)}/><NumberField label="초기 L/G" unit="-" value={design.lgRatio} step={.1} min={1} max={3} onChange={v=>update("lgRatio",v)}/><NumberField label="제습부 용액온도" unit="°C" value={design.absSolutionTemp} step={.1} min={20} max={31.4} onChange={v=>update("absSolutionTemp",v)}/><NumberField label="재생기 용액온도" unit="°C" value={design.regenTemp} step={.1} min={48.5} max={59.4} onChange={v=>update("regenTemp",v)}/></div><div className="ld-mode-grid"><label>L/G 제어<select value={design.lgMode} onChange={e=>update("lgMode",e.target.value as Design["lgMode"])}><option value="auto">자동조정</option><option value="fixed">입력값 고정</option></select></label><label>제습부 온도 제어<select value={design.absTempMode} onChange={e=>update("absTempMode",e.target.value as Design["absTempMode"])}><option value="auto">자동조정</option><option value="fixed">입력값 고정</option></select></label><label>재생기 온도 제어<select value={design.regenMode} onChange={e=>update("regenMode",e.target.value as Design["regenMode"])}><option value="auto">자동조정</option><option value="fixed">입력값 고정</option></select></label></div><p className="ld-guidance"><b>제어 순서</b> L/G → 제습부 용액온도 → 재생기 용액온도. 고정으로 선택한 변수는 반복계산 중 변경하지 않습니다.</p></>}</div>;
  }
  return <div className="field-grid"><label>집열기 종류<select value={design.collectorType} onChange={e=>update("collectorType",e.target.value)}><option value="evacuated">진공관형</option><option value="flat">평판형</option></select></label><label>목표 재생열 커버율<span className="number-wrap"><input type="number" min="1" max="100" step="1" placeholder="1–100" value={design.targetSolarShare} onChange={e=>update("targetSolarShare",e.target.value===""?"":Number(e.target.value))}/><i>%</i></span></label><NumberField label="TES 공급온도" unit="°C" value={design.tesSupplyTemp} step={1} onChange={v=>update("tesSupplyTemp",v)}/><NumberField label="TES 환수온도" unit="°C" value={design.tesReturnTemp} step={1} onChange={v=>update("tesReturnTemp",v)}/></div>;
}

function ResultOverview({summary,design,onReset}:{summary:CalculationSummary;design:Design;onReset:()=>void}) {
  const [showOptions,setShowOptions]=useState(false);
  const [selectedDetail,setSelectedDetail]=useState<""|"dehum"|"unmet"|"area">("");
  const [heatmapRegionKey,setHeatmapRegionKey]=useState(summary.primaryKey);
  const [weatherRegionKey,setWeatherRegionKey]=useState(summary.primaryKey);
  const [heatmapMode,setHeatmapMode]=useState<"abs"|"reg">("abs");
  const primary=summary.regions.find(item=>item.key===summary.primaryKey)||summary.regions[0];
  const heatmapRegion=summary.regions.find(item=>item.key===heatmapRegionKey)||primary;
  const weatherRegion=summary.regions.find(item=>item.key===weatherRegionKey)||primary;
  const n=(value:unknown)=>Number(value)||0; const best=primary.best;
  const coverage=n(best.monthlyMinimumCoverage)*100; const dehum=n(best.dehumidificationAchievement)*100;
  const monthly=primary.monthly||[]; const monthlyMax=Math.max(1,...monthly.flatMap(item=>[n(item.load),n(item.solar)]));
  const monthlyTicks=Array.from({length:5},(_,index)=>monthlyMax*(4-index)/4);
  const regionMax=Math.max(1,...summary.regions.map(item=>n(item.best.collectorArea)));
  const unmet=primary.unmetTrend||{}; const averageExcess=n(unmet.averageHumidityExcess); const heatmap=(heatmapMode==="abs"?heatmapRegion.ldUsageHeatmap:heatmapRegion.regUsageHeatmap)||[];
  const [selectedHeatmapMonth,setSelectedHeatmapMonth]=useState<number|null>(null);
  const heatmapRows=selectedHeatmapMonth===null?heatmap.map(row=>({label:`${row.month}월`,hours:row.hours,month:row.month})):((heatmap.find(row=>row.month===selectedHeatmapMonth)?.weeks)||[]).map(row=>({label:`${row.week}주차`,hours:row.hours,month:selectedHeatmapMonth}));
  const heatmapHours=heatmapMode==="reg"||design.operationHours===24?Array.from({length:24},(_,hour)=>hour):Array.from({length:Math.min(design.operationHours,15)},(_,index)=>9+index);
  const heatmapColumns=`42px repeat(${heatmapHours.length},minmax(15px,1fr))`;
  return <main className="result-screen">
    <header className="result-nav"><button onClick={onReset}>SALDOP<span>°</span></button><div><strong>CALCULATION COMPLETE</strong><small>{summary.regions.length}개 지역 분석 완료{summary.failedCount?` · ${summary.failedCount}개 실패`:""}</small></div></header>
    <section className="result-heading"><div><p>DESIGN OUTPUT · {primary.label}</p><h1>설계 결과 <em>요약</em></h1></div><p>핵심 성능과 월별 에너지 흐름을 요약했습니다. 아래 결과 항목을 선택하면 이 화면 안에서 상세 그래프와 시간별 데이터를 이어서 확인할 수 있습니다.</p></section>
    <section className="metric-grid">
      <article><span>REQUIRED AREA</span><b>{n(best.collectorArea).toLocaleString(undefined,{maximumFractionDigits:1})}</b><small>m² · 최소 집열기 면적</small></article>
      <article><span>MIN. COVERAGE</span><b>{coverage.toFixed(1)}</b><small>% · 월별 최저 커버율</small></article>
      <article><span>DEHUMIDIFICATION</span><b>{dehum.toFixed(1)}</b><small>% · 목표 제습 달성률</small></article>
      <article><span>UNMET HOURS</span><b>{n(best.unmetHours).toLocaleString()}</b><small>h · 허용상한 초과시간</small></article>
      <article><span>AVERAGE EXCESS</span><b>{averageExcess.toFixed(2)}</b><small>g/kgDA · 미충족 시간 평균 초과</small></article>
    </section>
    <section className="ld-output-strip"><header><span>CALCULATED LD OPERATING CONDITIONS</span><h2>요구조건을 만족하도록 산정된 LD 운전조건</h2></header><div><article><small>LiCl 초기 농도</small><b>{n(best.solutionConcentration).toFixed(1)}%</b></article><article><small>평균 L/G</small><b>{n(best.lgRatioMean||best.lgRatio).toFixed(2)}</b></article><article><small>평균 제습부 용액온도</small><b>{n(best.absorberSolutionTempMean||best.absSolutionTemp).toFixed(1)} °C</b></article><article><small>평균 재생부 용액온도</small><b>{n(best.regeneratorSolutionTempMean||best.regenTemp).toFixed(1)} °C</b></article><article><small>병렬 모듈</small><b>{n(best.absorberModules).toFixed(0)} / {n(best.regeneratorModules).toFixed(0)}대</b></article></div><p>앞 숫자는 제습부, 뒤 숫자는 재생부입니다. 모듈 대수는 전체 외기도입량 처리용이며 목표 습도 제어변수로 사용하지 않습니다.</p></section>
    <section className="result-dashboard">
      <article className="chart-card monthly-card"><header><div><span>MONTHLY ENERGY FLOW</span><h2>재생열 요구량과 태양열 공급</h2></div><div className="chart-legend"><i/>요구량 <i/>태양열 실사용</div></header><div className="bar-axis-layout"><div className="bar-y-title">에너지 (kWh)</div><div className="bar-y-ticks">{monthlyTicks.map(value=><span key={value}>{Math.round(value).toLocaleString()}</span>)}</div><div className="monthly-bars">{monthly.map((item,index)=><div className="month-group" key={index}><div><i data-value={n(item.load)>0?(n(item.load)>=1000?`${(n(item.load)/1000).toFixed(1)}k`:Math.round(n(item.load))):undefined} style={{height:`${n(item.load)/monthlyMax*100}%`}} title={`요구량 ${n(item.load).toFixed(0)} kWh`}/><i data-value={n(item.solar)>0?(n(item.solar)>=1000?`${(n(item.solar)/1000).toFixed(1)}k`:Math.round(n(item.solar))):undefined} style={{height:`${n(item.solar)/monthlyMax*100}%`}} title={`태양열 ${n(item.solar).toFixed(0)} kWh`}/></div><span>{String(item.month||index+1).replace("월","")}월</span></div>)}</div><div className="bar-x-title">월</div></div></article>
      <article className="chart-card balance-card"><header><div><span>ENERGY BALANCE</span><h2>선택기간 에너지 구성</h2></div></header><div className="balance-ring" style={{"--coverage":`${Math.min(100,n(best.solarUseCoverage)*100)}%`} as React.CSSProperties}><div><b>{(n(best.solarUseCoverage)*100).toFixed(1)}%</b><small>실사용 커버율</small></div></div><dl><div><dt>재생열 요구량</dt><dd>{n(best.regenNeed).toLocaleString()} kWh</dd></div><div><dt>태양열 실사용</dt><dd>{n(best.usefulSolar).toLocaleString()} kWh</dd></div><div><dt>보조열원</dt><dd>{n(best.auxEnergy).toLocaleString()} kWh</dd></div></dl></article>
      <article className={`chart-card heatmap-card ${heatmapMode==="reg"?"regeneration":"dehumidification"}`}><header><div><span>LD OPERATION HEATMAP</span><h2>{selectedHeatmapMonth===null?`월·시간대별 ${heatmapMode==="abs"?"제습":"재생"} 가동률`:`${selectedHeatmapMonth}월 주차·시간대별 ${heatmapMode==="abs"?"제습":"재생"} 가동률`}</h2><small>{selectedHeatmapMonth===null?(heatmapMode==="abs"?"설정한 제습 운전시간만 확대 표시합니다. 월을 누르면 주차별 상세를 확인할 수 있습니다.":"운전 종료 후 재생을 포함해 24시간을 표시합니다. 월을 누르면 주차별 상세를 확인할 수 있습니다."):"1주차 1~7일 · 2주차 8~14일 · 3주차 15~21일 · 4주차 22일~말일"}</small></div><div className="heatmap-tools"><div className="heatmap-mode"><button className={heatmapMode==="abs"?"selected":""} onClick={()=>{setHeatmapMode("abs");setSelectedHeatmapMonth(null)}}>제습 가동률</button><button className={heatmapMode==="reg"?"selected":""} onClick={()=>{setHeatmapMode("reg");setSelectedHeatmapMonth(null)}}>재생 가동률</button></div>{summary.regions.length>1&&<label>지역<select value={heatmapRegionKey} onChange={e=>{setHeatmapRegionKey(e.target.value);setSelectedHeatmapMonth(null)}}>{summary.regions.map(region=><option key={region.key} value={region.key}>{region.label.split(" · ")[0]}</option>)}</select></label>}{selectedHeatmapMonth!==null&&<button onClick={()=>setSelectedHeatmapMonth(null)}>월별 보기</button>}<div className="heatmap-scale">0% <i/> 100%</div></div></header><div className="usage-heatmap"><div className="heatmap-hours" style={{gridTemplateColumns:heatmapColumns}}>{heatmapHours.map(hour=><span key={hour}>{hour}시</span>)}</div>{heatmapRows.map(row=><button className="heatmap-row" style={{gridTemplateColumns:heatmapColumns}} key={row.label} onClick={()=>selectedHeatmapMonth===null&&setSelectedHeatmapMonth(row.month)} aria-label={`${heatmapRegion.label} ${row.label} 상세 히트맵 보기`}><b>{row.label}</b>{heatmapHours.map(hour=>{const value=row.hours[hour]||0,ratio=Math.max(0,Math.min(1,value/100));return <i key={hour} title={`${heatmapRegion.label.split(" · ")[0]} · ${selectedHeatmapMonth===null?row.label:`${selectedHeatmapMonth}월 ${row.label}`} ${hour}시 · ${heatmapMode==="abs"?"제습":"재생"} 가동률 ${value.toFixed(1)}%`} style={{backgroundColor:heatmapMode==="abs"?`hsl(${188+ratio*38} 88% ${74-ratio*30}%)`:`hsl(${8-ratio*8} 82% ${78-ratio*34}%)`,opacity:.14+ratio*.86}}/>})}</button>)}</div></article>
      <HeatmapDrilldown regions={summary.regions} primaryKey={summary.primaryKey} operationHours={design.operationHours}/>
      <WeatherChart region={weatherRegion} regions={summary.regions} selectedKey={weatherRegionKey} onSelect={setWeatherRegionKey}/>
      <ConcentrationChart monthly={monthly} drilldown={primary.solutionConcentrationDrilldown||[]} region={primary.label}/>
      <article className="chart-card region-card"><header><div><span>REGIONAL COMPARISON</span><h2>지역별 최소 집열기 면적</h2></div></header><div className="region-bars">{summary.regions.map((item,index)=><div key={item.key}><span>{item.label.split(" · ")[0]}</span><i><b style={{width:`${n(item.best.collectorArea)/regionMax*100}%`,"--region":index} as React.CSSProperties}/></i><strong>{n(item.best.collectorArea).toLocaleString(undefined,{maximumFractionDigits:0})} m²</strong></div>)}</div></article>
      <article className="chart-card decision-card"><span>DESIGN DECISION</span><h2>목표 커버율 {design.targetSolarShare}% 기준</h2><p>{Boolean(best.targetAchieved)?"입력한 목표를 만족하는 최소 집열기 면적을 찾았습니다.":"설정 조건에서 목표를 완전히 만족하지 못했습니다. 상세 결과에서 지배월과 보조열원을 확인하세요."}</p><button onClick={()=>setShowOptions(value=>!value)}>확인할 상세 결과 선택 <i>{showOptions?"−":"＋"}</i></button></article>
    </section>
    {showOptions&&<section className="result-options"><header><div><span>DETAIL OPTIONS</span><h2>추가로 확인할 결과를 선택하세요.</h2></div><button onClick={()=>setShowOptions(false)}>닫기 ×</button></header><div><button onClick={()=>{setSelectedDetail("dehum");setShowOptions(false)}}><b>01</b><strong>월별 목표·실제 제습량</strong><small>목표, 허용 최소, 실제 제습량과 달성률 비교</small><i>↓</i></button><button onClick={()=>{setSelectedDetail("unmet");setShowOptions(false)}}><b>02</b><strong>목표 제습 미충족 추이</strong><small>급기 절대습도, 평균·최대 초과량과 발생시각</small><i>↓</i></button><button onClick={()=>{setSelectedDetail("area");setShowOptions(false)}}><b>03</b><strong>집열기 면적별 재생열 커버율</strong><small>면적 후보별 실사용 커버율과 보조열원 비교</small><i>↓</i></button><button disabled><b>04</b><strong>TES 용량 및 시간별 상태</strong><small>성층화·손실·용량 산정 모델 추후 업데이트</small><i>SOON</i></button></div></section>}
    {selectedDetail&&<InlineDetail type={selectedDetail} region={primary} onClose={()=>setSelectedDetail("")} />}
  </main>;
}

function HeatmapDrilldown({regions,primaryKey,operationHours}:{regions:CalculationRegion[];primaryKey:string;operationHours:number}) {
  const [regionKey,setRegionKey]=useState(primaryKey),[mode,setMode]=useState<"abs"|"reg">("abs"),[month,setMonth]=useState<number|null>(null),[week,setWeek]=useState<number|null>(null);
  const region=regions.find(item=>item.key===regionKey)||regions[0];
  const heatmap=(mode==="abs"?region.ldUsageHeatmap:region.regUsageHeatmap)||[];
  const monthData=month===null?undefined:heatmap.find(item=>item.month===month),weekData=week===null?undefined:monthData?.weeks?.find(item=>item.week===week);
  const dayNames=["월","화","수","목","금","토","일"];
  const rows=month===null?heatmap.map(item=>({label:`${item.month}월`,hours:item.hours,month:item.month,week:null})):week===null?(monthData?.weeks||[]).map(item=>({label:`${item.week}주차`,hours:item.hours,month,week:item.week})):(weekData?.days||[]).map(item=>({label:dayNames[item.day],hours:item.hours,month,week}));
  const hours=mode==="reg"||operationHours===24?Array.from({length:24},(_,hour)=>hour):Array.from({length:Math.min(operationHours,15)},(_,index)=>9+index),columns=`68px repeat(${hours.length},minmax(20px,1fr))`;
  const resetDepth=()=>{setMonth(null);setWeek(null)};
  const title=month===null?`월·시간대별 ${mode==="abs"?"제습":"재생"} 가동률`:week===null?`${month}월 주차·시간대별 ${mode==="abs"?"제습":"재생"} 가동률`:`${month}월 ${week}주차 요일·시간대별 ${mode==="abs"?"제습":"재생"} 가동률`;
  const average=rows.length&&hours.length?rows.reduce((sum,row)=>sum+hours.reduce((hourSum,hour)=>hourSum+(row.hours[hour]||0),0),0)/(rows.length*hours.length):0;
  return <article className={`chart-card heatmap-card heatmap-v2 ${mode==="reg"?"regeneration":"dehumidification"}`}><header><div><span>LD OPERATION HEATMAP</span><h2>{title}</h2><small>{month===null?(mode==="abs"?"설정한 제습 운전시간만 확대 표시합니다. 월을 눌러 상세를 확인하세요.":"운전 종료 후 재생을 포함해 24시간을 표시합니다. 월을 눌러 상세를 확인하세요."):week===null?"주차를 누르면 해당 주의 월~일 가동률을 확인할 수 있습니다.":"선택 주의 월요일부터 일요일까지 시간대별 가동률입니다."}</small></div><div className="heatmap-tools"><div className="heatmap-mode"><button className={mode==="abs"?"selected":""} onClick={()=>{setMode("abs");resetDepth()}}>제습</button><button className={mode==="reg"?"selected":""} onClick={()=>{setMode("reg");resetDepth()}}>재생</button></div>{regions.length>1&&<label>지역<select value={regionKey} onChange={event=>{setRegionKey(event.target.value);resetDepth()}}>{regions.map(item=><option value={item.key} key={item.key}>{item.label.split(" · ")[0]}</option>)}</select></label>}{week!==null&&<button onClick={()=>setWeek(null)}>주차별</button>}{month!==null&&<button onClick={resetDepth}>월별</button>}</div></header><div className="heatmap-summary"><div><small>표시 지역</small><b>{region.label.split(" · ")[0]}</b></div><div><small>평균 가동률</small><b>{average.toFixed(1)}%</b></div><div><small>표시 범위</small><b>{hours[0]}:00–{hours[hours.length-1]}:00</b></div><div className="heatmap-scale"><small>가동률</small><span>0%</span><i/><span>100%</span></div></div><div className="heatmap-scroll"><div className="heatmap-axis-caption"><b>{month===null?"월":week===null?"주차":"요일"}</b><span>시간대 (시) →</span></div><div className="usage-heatmap"><div className="heatmap-hours" style={{gridTemplateColumns:columns}}><span/>{hours.map(hour=><span key={hour}>{hour}</span>)}</div>{rows.map(row=><button className="heatmap-row" style={{gridTemplateColumns:columns}} key={row.label} onClick={()=>{if(month===null)setMonth(row.month);else if(week===null&&row.week!==null)setWeek(row.week)}}><b>{row.label}</b>{hours.map(hour=>{const value=row.hours[hour]||0,ratio=Math.max(0,Math.min(1,value/100));return <i key={hour} title={`${region.label.split(" · ")[0]} · ${row.label} ${hour}시 · ${mode==="abs"?"제습":"재생"} 가동률 ${value.toFixed(1)}%`} style={{"--heat":ratio} as React.CSSProperties}/>})}</button>)}</div></div></article>;
}

function WeatherChart({region,regions,selectedKey,onSelect}:{region:CalculationRegion;regions:CalculationRegion[];selectedKey:string;onSelect:(key:string)=>void}) {
  const rows=region.weatherMonthly||[];
  const temps=rows.map(row=>Number(row.outdoorTemp)||0), humidity=rows.map(row=>Number(row.outdoorHumidity)||0), solar=rows.map(row=>Number(row.irradiation)||0);
  const bounds=(values:number[])=>{const min=Math.min(...values,0),max=Math.max(...values,1);return {min,max,range:Math.max(max-min,1)}};
  const tb=bounds(temps),hb=bounds(humidity),sb=bounds(solar);const y=(value:number,b:{min:number;range:number})=>88-(value-b.min)/b.range*76;const x=(index:number)=>rows.length>1?index/(rows.length-1)*100:50;
  const tempPoints=temps.map((value,index)=>`${x(index)},${y(value,tb)}`).join(" "),humidityPoints=humidity.map((value,index)=>`${x(index)},${y(value,hb)}`).join(" ");
  return <article className="chart-card weather-card"><header><div><span>WEATHER &amp; SOLAR INPUT</span><h2>월별 날씨 및 일사 데이터</h2><small>서로 다른 단위의 세 계열을 0–100% 상대범위로 정규화했습니다. 실제값은 범례와 데이터 포인트에서 확인할 수 있습니다.</small></div>{regions.length>1&&<label className="weather-region-select">지역<select value={selectedKey} onChange={e=>onSelect(e.target.value)}>{regions.map(item=><option value={item.key} key={item.key}>{item.label.split(" · ")[0]}</option>)}</select></label>}</header><div className="weather-combo-legend"><span><i className="temp"/><span>외기온도<small>월평균</small></span><b>{tb.min.toFixed(1)}–{tb.max.toFixed(1)} °C</b></span><span><i className="humidity"/><span>절대습도<small>월평균</small></span><b>{hb.min.toFixed(1)}–{hb.max.toFixed(1)} g/kgDA</b></span><span><i className="solar"/><span>집열면 일사량<small>월 누적</small></span><b>{sb.min.toFixed(0)}–{sb.max.toFixed(0)} kWh/m²</b></span></div><div className="weather-axis-layout"><div className="weather-y-title">계열별 상대범위 (%)</div><div className="weather-y-ticks" aria-hidden="true"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="weather-combo-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`${region.label} 월별 날씨 및 일사 복합 그래프`}>{[12,31,50,69,88].map(v=><line key={v} x1="0" x2="100" y1={v} y2={v} className="weather-gridline"/>)}{solar.map((value,index)=>{const width=rows.length?55/rows.length:5;const barY=y(value,sb);return <rect key={index} x={x(index)-width/2} y={barY} width={width} height={88-barY} className="weather-solar-bar"><title>{rows[index]?.month}월 · 일사량 {value.toFixed(1)} kWh/m²</title></rect>})}<polyline points={tempPoints} className="weather-temp-line"/><polyline points={humidityPoints} className="weather-humidity-line"/>{temps.map((value,index)=><circle key={`t${index}`} cx={x(index)} cy={y(value,tb)} r="1.2" className="weather-temp-dot"><title>{rows[index]?.month}월 · 외기온도 {value.toFixed(1)} °C</title></circle>)}{humidity.map((value,index)=><circle key={`h${index}`} cx={x(index)} cy={y(value,hb)} r="1.2" className="weather-humidity-dot"><title>{rows[index]?.month}월 · 절대습도 {value.toFixed(1)} g/kgDA</title></circle>)}</svg><div className="weather-month-axis">{rows.map(row=><span key={row.month}>{row.month}월</span>)}</div><div className="weather-x-title">월</div></div></div></article>;
}

function ConcentrationChart({monthly,drilldown,region}:{monthly:Array<Record<string,number|string>>;drilldown:ConcentrationMonth[];region:string}) {
  const [selectedMonth,setSelectedMonth]=useState<number|null>(null);
  const [selectedDay,setSelectedDay]=useState<number|null>(null);
  const annualRows=monthly.map((item,index)=>({key:index+1,label:`${index+1}월`,mean:Number(item.solutionConcentrationMean)||0,min:Number(item.solutionConcentrationMin)||0,max:Number(item.solutionConcentrationMax)||0})).filter(item=>item.mean>0);
  const monthData=selectedMonth===null?undefined:drilldown.find(item=>item.month===selectedMonth);
  const dayRows=(monthData?.days||[]).map(item=>{const values=item.hours.map(hour=>Number(hour.value)).filter(Number.isFinite);return {key:item.day,label:`${item.day}일`,mean:values.reduce((sum,value)=>sum+value,0)/Math.max(values.length,1),min:Math.min(...values),max:Math.max(...values)}});
  const dayData=selectedDay===null?undefined:monthData?.days.find(item=>item.day===selectedDay);
  const hourRows=(dayData?.hours||[]).map(item=>({key:item.hour,label:`${item.hour}시`,mean:Number(item.value),min:Number(item.value),max:Number(item.value)}));
  const rows=selectedMonth===null?annualRows:selectedDay===null?dayRows:hourRows;
  useEffect(()=>{setSelectedMonth(null);setSelectedDay(null)},[region]);
  if(!rows.length)return <article className="chart-card concentration-card"><header><div><span>LD SOLUTION STATE</span><h2>월별 LiCl 농도 변화</h2></div></header><p className="chart-empty">농도 시계열 결과를 불러오는 중입니다.</p></article>;
  const rawMin=Math.min(...rows.map(item=>item.min)),rawMax=Math.max(...rows.map(item=>item.max));
  const plotMin=Math.floor((rawMin-.2)*10)/10,plotMax=Math.ceil((rawMax+.2)*10)/10,range=Math.max(plotMax-plotMin,.5);
  const x=(index:number)=>rows.length>1?index/(rows.length-1)*100:50,y=(value:number)=>88-(value-plotMin)/range*76;
  const ticks=Array.from({length:5},(_,index)=>plotMax-range*index/4);
  const meanPoints=rows.map((item,index)=>`${x(index)},${y(item.mean)}`).join(" ");
  const bandPoints=[...rows.map((item,index)=>`${x(index)},${y(item.max)}`),...rows.map((item,index)=>`${x(rows.length-1-index)},${y(rows[rows.length-1-index].min)}`)].join(" ");
  const title=selectedMonth===null?"월별 LiCl 농도 변화":selectedDay===null?`${selectedMonth}월 일별 LiCl 농도 변화`:`${selectedMonth}월 ${selectedDay}일 시간별 LiCl 농도 변화`;
  const description=selectedMonth===null?"월평균과 월간 최소–최대 범위 · 월을 누르면 일별 추이를 확인합니다.":selectedDay===null?"일평균과 일간 최소–최대 범위 · 일을 누르면 시간별 추이를 확인합니다.":"선택한 날의 시간별 용액탱크 LiCl 농도";
  const selectPoint=(key:number)=>{if(selectedMonth===null&&drilldown.some(item=>item.month===key)){setSelectedMonth(key);setSelectedDay(null)}else if(selectedMonth!==null&&selectedDay===null){setSelectedDay(key)}};
  return <article className="chart-card concentration-card"><header><div><span>LD SOLUTION STATE · {region.split(" · ")[0]}</span><h2>{title}</h2><small>{description}</small></div><div className="concentration-tools">{selectedDay!==null&&<button onClick={()=>setSelectedDay(null)}>← 일별 보기</button>}{selectedMonth!==null&&<button onClick={()=>{setSelectedMonth(null);setSelectedDay(null)}}>← 월별 보기</button>}<div className="concentration-legend"><i/>평균 농도 <span/>최소–최대 범위</div></div></header><div className="concentration-layout"><div className="concentration-y-title">LiCl 농도 (wt%)</div><div className="concentration-y-axis">{ticks.map(value=><span key={value} style={{top:`${y(value)}%`}}>{value.toFixed(1)}</span>)}</div><div className="concentration-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`${region} ${title}`}>{ticks.map(value=><line key={value} x1="0" x2="100" y1={y(value)} y2={y(value)} className="concentration-grid"/>)}<polygon points={bandPoints} className="concentration-band"/><polyline points={meanPoints} className="concentration-line"/>{rows.map((item,index)=><circle tabIndex={selectedDay===null?0:undefined} role={selectedDay===null?"button":undefined} onClick={()=>selectPoint(item.key)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" ")selectPoint(item.key)}} key={item.key} cx={x(index)} cy={y(item.mean)} r="1.4" className={`concentration-dot${selectedDay===null?" clickable":""}`}><title>{item.label} · 평균 {item.mean.toFixed(2)} wt% · 범위 {item.min.toFixed(2)}–{item.max.toFixed(2)} wt%</title></circle>)}</svg><div className={`concentration-x-axis axis-${selectedMonth===null?"months":selectedDay===null?"days":"hours"}`} style={{gridTemplateColumns:`repeat(${rows.length},minmax(32px,1fr))`}}>{rows.map(item=><button disabled={selectedDay!==null} onClick={()=>selectPoint(item.key)} key={item.key}>{item.label}</button>)}</div><div className="concentration-x-title">{selectedMonth===null?"월":selectedDay===null?"일":"시각"}</div></div></div></article>;
}

function InlineDetail({type,region,onClose}:{type:"dehum"|"unmet"|"area";region:CalculationRegion;onClose:()=>void}) {
  const n=(value:unknown)=>Number(value)||0;
  const [selectedUnmetEvents,setSelectedUnmetEvents]=useState<Set<number>>(()=>new Set());
  useEffect(()=>setSelectedUnmetEvents(new Set()),[type,region.key]);
  const toggleUnmetEvent=(index:number)=>setSelectedUnmetEvents(current=>{const next=new Set(current);if(next.has(index))next.delete(index);else next.add(index);return next});
  if(type==="dehum") {const max=Math.max(1,...region.monthly.flatMap(item=>[n(item.targetDehumidification),n(item.actualDehumidification)]));const ticks=Array.from({length:5},(_,index)=>max*(4-index)/4);return <section className="inline-detail"><DetailHeader index="01" title="월별 목표·실제 제습량" region={region.label} onClose={onClose}/><div className="bar-axis-layout detail-axis-layout"><div className="bar-y-title">제습량 (kg)</div><div className="bar-y-ticks">{ticks.map(value=><span key={value}>{Math.round(value).toLocaleString()}</span>)}</div><div className="detail-dehum-chart">{region.monthly.map((item,index)=><div key={index}><div><i data-value={n(item.targetDehumidification)>0?(n(item.targetDehumidification)>=1000?`${(n(item.targetDehumidification)/1000).toFixed(1)}k`:Math.round(n(item.targetDehumidification))):undefined} style={{height:`${n(item.targetDehumidification)/max*100}%`}} title={`목표 ${n(item.targetDehumidification).toFixed(0)} kg`}/><i data-value={n(item.actualDehumidification)>0?(n(item.actualDehumidification)>=1000?`${(n(item.actualDehumidification)/1000).toFixed(1)}k`:Math.round(n(item.actualDehumidification))):undefined} style={{height:`${n(item.actualDehumidification)/max*100}%`}} title={`실제 ${n(item.actualDehumidification).toFixed(0)} kg`}/></div><span>{item.month}</span><small>{Math.round(n(item.dehumidificationAchievement)*100)}%</small></div>)}</div><div className="bar-x-title">월</div></div><div className="detail-legend"><i/>목표 제습량 <i/>실제 제습량</div></section>}
  if(type==="unmet") {
    const trend=region.unmetTrend||{};
    const events=((trend.events as Array<Record<string,unknown>>)||[]).slice(0,120);
    const concentrationByTime=new Map<string,number>();
    (region.solutionConcentrationDrilldown||[]).forEach(month=>month.days.forEach(day=>day.hours.forEach(hour=>concentrationByTime.set(`${String(month.month).padStart(2,"0")}-${String(day.day).padStart(2,"0")} ${String(hour.hour).padStart(2,"0")}`,hour.value))));
    const eventConcentration=(item:Record<string,unknown>)=>{
      const direct=Number(item.solutionConcentration);
      if(Number.isFinite(direct)&&direct>0)return direct;
      const time=String(item.time||"");
      return concentrationByTime.get(`${time.slice(5,10)} ${time.slice(11,13)}`)??0;
    };
    const accepted=n(region.best.acceptedUpperHumidity);
    const averageSupply=accepted+n(trend.averageHumidityExcess);
    const values=events.map(item=>n(item.supplyHumidity));
    const plotMin=Math.max(0,Math.floor((Math.min(accepted,...values)-.5)*2)/2);
    const plotMax=Math.max(plotMin+1,Math.ceil((Math.max(averageSupply,...values)+.5)*2)/2);
    const range=plotMax-plotMin;
    const y=(value:number)=>(value-plotMin)/range*96+2;
    const x=(index:number)=>events.length>1?1.5+index/(events.length-1)*97:50;
    const ticks=Array.from({length:5},(_,i)=>plotMax-range*i/4);
    const xIndexes=events.length?[0,Math.round((events.length-1)/3),Math.round((events.length-1)*2/3),events.length-1]:[];
    return <section className="inline-detail"><DetailHeader index="02" title="목표 제습 미충족 추이" region={region.label} onClose={onClose}/><div className="unmet-summary"><div><b>{n(trend.totalHours).toFixed(1)} h</b><small>상한 초과시간</small></div><div><b>{n(trend.averageHumidityExcess).toFixed(2)} g/kgDA</b><small>평균 초과량</small></div><div><b>{n(trend.maxHumidityExcess).toFixed(2)} g/kgDA</b><small>최대 초과량</small></div></div><div className="unmet-chart"><div className="unmet-y-title">급기 절대습도 (g/kgDA)</div><div className="unmet-y-axis">{ticks.map(tick=><span key={tick} style={{bottom:`${y(tick)}%`}}>{tick.toFixed(1)}</span>)}</div><div className="unmet-points">{ticks.map(tick=><em key={tick} style={{bottom:`${y(tick)}%`}}/>)}{events.map((item,index)=><button type="button" key={index} className={selectedUnmetEvents.has(index)?"selected":""} aria-pressed={selectedUnmetEvents.has(index)} aria-label={`${item.time} 급기 절대습도 ${n(item.supplyHumidity).toFixed(2)} g/kgDA`} title={`${item.time} · ${n(item.supplyHumidity).toFixed(2)} g/kgDA`} onClick={()=>toggleUnmetEvent(index)} style={{left:`${x(index)}%`,bottom:`${y(n(item.supplyHumidity))}%`}}/>)}<span className="unmet-upper-line" style={{bottom:`${y(accepted)}%`}}>허용상한 {accepted.toFixed(1)} g/kgDA</span><span className="unmet-average-line" style={{bottom:`${y(averageSupply)}%`}}>미충족 평균 {averageSupply.toFixed(2)} g/kgDA</span></div><div className="unmet-x-axis">{xIndexes.map(index=><span key={index} style={{left:`${x(index)}%`}}>{String(events[index]?.time||"").slice(5,16)}</span>)}</div><div className="unmet-x-title">발생 시각 (월-일 시:분)</div></div><div className="event-table event-table-detailed"><div><b>발생시각</b><b>외기조건</b><b>LiCl 농도</b><b>급기 절대습도</b><b>상한 초과</b></div>{events.map((item,index)=><button type="button" key={index} className={selectedUnmetEvents.has(index)?"selected":""} aria-pressed={selectedUnmetEvents.has(index)} onClick={()=>toggleUnmetEvent(index)}><span>{String(item.time||"").slice(5)}</span><span className="outdoor-condition"><b>{n(item.outdoorTemp).toFixed(1)} °C</b><small>{n(item.outdoorHumidity).toFixed(2)} g/kgDA</small></span><span>{eventConcentration(item)>0?`${eventConcentration(item).toFixed(2)} wt%`:"–"}</span><span>{n(item.supplyHumidity).toFixed(2)} g/kgDA</span><span>+{n(item.humidityExcess).toFixed(2)}</span></button>)}</div></section>;
  }
  const candidates=region.areaResults||[];const maxArea=Math.max(1,...candidates.map(item=>n(item.collectorArea)));return <section className="inline-detail"><DetailHeader index="03" title="집열기 면적별 재생열 커버율" region={region.label} onClose={onClose}/><div className="area-detail-bars">{candidates.map((item,index)=><div key={index}><span>{n(item.collectorArea).toLocaleString()} m²</span><i><b style={{width:`${n(item.monthlyMinimumCoverage)*100}%`}}/></i><strong>{(n(item.monthlyMinimumCoverage)*100).toFixed(1)}%</strong><small style={{width:`${n(item.collectorArea)/maxArea*100}%`}}/></div>)}</div></section>;
}
function DetailHeader({index,title,region,onClose}:{index:string;title:string;region:string;onClose:()=>void}) {return <header className="inline-detail-heading"><div><span>DETAIL {index} · {region}</span><h2>{title}</h2></div><button onClick={onClose}>닫기 ×</button></header>}
function NumberField({label,unit,value,step,min,max,onChange}:{label:string;unit:string;value:number;step:number;min?:number;max?:number;onChange:(v:number)=>void}) {const invalid=(min!==undefined&&value<min)||(max!==undefined&&value>max);return <label className={invalid?"field-invalid":""}>{label}<span className="number-wrap"><input type="number" value={value} step={step} min={min} max={max} onChange={e=>onChange(Number(e.target.value))} onBlur={()=>onChange(Math.min(max??Infinity,Math.max(min??-Infinity,value)))}/><i>{unit}</i></span>{invalid&&<small>{min}–{max} 범위로 입력</small>}</label>; }
