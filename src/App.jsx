import React, { useMemo, useRef, useState, useEffect } from "react";

// ==============================
// Spin·Five Deluxe
// - Ultra-sleek roulette with sound, haptics, mini-tools
// - Features: confetti, share, ads, presets, custom lists, history, dice/coin
// ==============================

const PRESETS = {
  "메뉴 뽑기": ["라면","김밥","치킨","피자","버거","비빔밥","쌀국수","돈까스","초밥","떡볶이","샐러드","파스타","삼겹살","마라탕","분식"],
  "공부 과목": ["수학","영어","국어","물리","화학","생명","지구과학","정보","역사","사회","기술가정","체육","음악","미술","자율학습"],
  "음악 장르": ["K-Pop","Hip-Hop","R&B","EDM","Lo-Fi","Jazz","Rock","Ballad","Indie","Classical","City Pop","Metal","House","Trap","Funk"],
  "운동 미션": ["스쿼트 20","푸시업 15","플랭크 60s","버피 10","런지 20","점핑잭 40","스트레칭 5m","벽앉기 60s","윗몸 20","하체 10m","팔굽+스쿼트","플랭크 변형","플랭크 90s","버피 15","산책 15m"],
  "랜덤 선택": ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O"]
};

const DEFAULT_NAME = "메뉴 뽑기";

function cls(...list) { return list.filter(Boolean).join(" "); }

function useWindowSize() {
  const [size, set] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const on = () => set({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

// --- Sound hook ---
function useSound(url) {
  const ref = useRef(null);
  useEffect(() => { ref.current = new Audio(url); }, [url]);
  return () => { ref.current && ref.current.play().catch(()=>{}); };
}

export default function App() {
  const [presetName, setPresetName] = useState(DEFAULT_NAME);
  const [items, setItems] = useState(PRESETS[DEFAULT_NAME]);
  const [spinning, setSpinning] = useState(false);
  const [duration, setDuration] = useState(5);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [customInput, setCustomInput] = useState("");
  const [adReady, setAdReady] = useState(false);
  const wheelRef = useRef(null);
  const size = useWindowSize();
  const tick = useSound("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg");
  const fanfare = useSound("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg");

  const normalizedItems = useMemo(() => {
    const seen = new Set();
    return items
      .map((s)=>s?.toString().trim())
      .filter((s)=>s && !seen.has(s) && s.length<=30)
      .slice(0,30);
  }, [items]);

  const segCount = Math.max(2, normalizedItems.length);
  const perSeg = 360 / segCount;

  const spin = () => {
    if (spinning || segCount < 2) return;
    setResult(null);
    setSpinning(true);

    const last = history[0]?.value;
    const candidates = normalizedItems.filter((s)=>s!==last);
    const choice = (candidates.length?candidates:normalizedItems)[
      Math.floor(Math.random()* (candidates.length?candidates.length:normalizedItems.length))
    ];
    const idx = normalizedItems.indexOf(choice);

    const turns = 6+Math.random()*2;
    const targetAngle = 90;
    const segmentCenter = idx*perSeg+perSeg/2;
    const finalDeg = turns*360 + (360-(segmentCenter-targetAngle));

    const el = wheelRef.current;
    if(!el) return;
    el.style.transition = `transform ${duration}s cubic-bezier(0.12,0.85,0.09,1)`;
    el.style.transform = `rotate(${finalDeg}deg)`;

    const onEnd = () => {
      el.removeEventListener("transitionend", onEnd);
      setSpinning(false);
      setResult({ index: idx, value: choice });
      setHistory((h)=>[{ index: idx,value: choice,at: Date.now()},...h].slice(0,10));
      burst();
      fanfare();
      if (navigator.vibrate) navigator.vibrate([80,50,80]);
    };
    el.addEventListener("transitionend", onEnd, { once:true });

    // ticking sound
    let step=0;
    const interval=setInterval(()=>{
      tick();
      step++;
      if(step>duration*10) clearInterval(interval);
    }, duration*100);
  };

  const burst = () => {
    const container=document.createElement("div");
    container.className="pointer-events-none fixed inset-0 z-[60] overflow-hidden";
    document.body.appendChild(container);
    const icons=["🎉","✨","💫","⭐","🎊"];
    for(let i=0;i<20;i++){
      const s=document.createElement("div");
      s.textContent=icons[i%5];
      s.className="absolute text-2xl select-none";
      s.style.left=`${50+(Math.random()*20-10)}%`;
      s.style.top=`${35+(Math.random()*10-5)}%`;
      s.style.transition="transform 900ms ease-out,opacity 900ms ease-out";
      container.appendChild(s);
      requestAnimationFrame(()=>{
        s.style.transform=`translate(${(Math.random()*2-1)*200}px,${100+Math.random()*200}px)`;
        s.style.opacity="0";
      });
    }
    setTimeout(()=>container.remove(),980);
  };

  const handlePreset = (name)=>{
    setPresetName(name);
    setItems(PRESETS[name]);
    setResult(null);
    if(wheelRef.current){
      wheelRef.current.style.transition="none";
      wheelRef.current.style.transform="rotate(0deg)";
    }
  };
  const addItem = ()=>{
    const v=customInput.trim();
    if(!v)return;
    setItems((arr)=>[...arr,v]);
    setCustomInput("");
  };
  const importList=(text)=>{
    const arr=text.split(/[\n,]/).map((s)=>s.trim()).filter(Boolean);
    if(arr.length>=2) setItems(arr);
  };
  const share=async()=>{
    const payload={items:normalizedItems,name:presetName};
    const str=encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
    const url=`${location.origin}${location.pathname}#${str}`;
    try{
      await navigator.clipboard.writeText(url);
      alert("링크 복사됨!");
    }catch{
      prompt("링크",url);
    }
  };

  useEffect(()=>{
    if(location.hash.length>1){
      try{
        const json=decodeURIComponent(escape(atob(decodeURIComponent(location.hash.slice(1)))));
        const obj=JSON.parse(json);
        if(Array.isArray(obj.items)&&obj.items.length>=2){
          setItems(obj.items);
          setPresetName(obj.name||"커스텀");
        }
      }catch{}
    }
    const adTimer=setTimeout(()=>setAdReady(true),800);
    return ()=>clearTimeout(adTimer);
  },[]);

  const wheelSize=Math.min(520,Math.floor(Math.min(size.w,size.h)*0.82));

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-black via-zinc-900 to-neutral-900 text-white">
      <header className="sticky top-0 z-40 backdrop-blur bg-white/5 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-sky-300">
            Spin·Five Deluxe
          </h1>
          <div className="flex gap-2">
            <button onClick={share} className="px-3 py-1.5 rounded-xl bg-white/10 text-sm">공유</button>
            <a href="#ad" className="px-3 py-1.5 rounded-xl bg-white/10 text-sm">광고</a>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <h2 className="text-sm font-semibold mb-2">프리셋</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(PRESETS).map((name)=>(
                <button
                  key={name}
                  onClick={()=>handlePreset(name)}
                  className={cls(
                    "px-3 py-2 rounded-xl text-sm border",
                    presetName===name? "bg-white/15 border-white/20" : "bg-white/5 hover:bg-white/10 border-white/10"
                  )}
                >{name}</button>
              ))}
            </div>
            <div className="mt-4">
              <input
                value={customInput}
                onChange={(e)=>setCustomInput(e.target.value)}
                onKeyDown={(e)=>e.key==="Enter"&&addItem()}
                placeholder="예: 냉모밀"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
              />
              <button onClick={addItem} className="mt-2 px-3 py-2 rounded-xl bg-white/10 text-sm">추가</button>
            </div>
            <textarea
              onBlur={(e)=>importList(e.target.value)}
              placeholder={"떡볶이\n라면\n피자"}
              className="mt-3 w-full h-20 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
            />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs">스핀 시간 {duration}s</span>
              <input type="range" min={3} max={10} value={duration} onChange={(e)=>setDuration(Number(e.target.value))}/>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <h3 className="text-sm font-semibold mb-2">최근 결과</h3>
            <ul className="space-y-1 max-h-40 overflow-auto">
              {history.map((h,i)=>(
                <li key={i} className="text-sm flex justify-between">
                  <span>{h.value}</span>
                  <span className="text-xs opacity-50">{new Date(h.at).toLocaleTimeString()}</span>
                </li>
              ))}
              {history.length===0 && <li className="text-xs opacity-50">없음</li>}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <h3 className="text-sm font-semibold mb-2">미니 도구</h3>
            <button
              onClick={()=>alert(Math.random()<0.5?"앞면":"뒷면")}
              className="px-3 py-2 rounded-xl bg-white/10 text-sm mr-2"
            >동전 던지기</button>
            <button
              onClick={()=>alert(`주사위: ${1+Math.floor(Math.random()*6)}`)}
              className="px-3 py-2 rounded-xl bg-white/10 text-sm"
            >주사위</button>
          </div>
        </aside>
        <section className="lg:col-span-6">
          <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col items-center">
            <div className="relative" style={{width:wheelSize,height:wheelSize}}>
              {/* Pointer */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[18px] border-b-white"/>
              </div>
              {/* Wheel */}
              <div
                ref={wheelRef}
                className="absolute inset-0 rounded-full"
                style={{transform:"rotate(0deg)"}}
              >
                <SVGWheel items={normalizedItems}/>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={spin}
                disabled={spinning||segCount<2}
                className="px-6 py-3 rounded-2xl bg-white text-black font-semibold"
              >
                {spinning? "스핀 중…" : "스핀!"}
              </button>
              <button
                onClick={()=>{
                  if(wheelRef.current){
                    wheelRef.current.style.transition="none";
                    wheelRef.current.style.transform="rotate(0deg)";
                  }
                  setResult(null);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 text-sm"
              >
                초기화
              </button>
            </div>

            {result && (
              <div className="mt-4 p-4 rounded-2xl border border-white/10 bg-white/10">
                <div className="text-sm">결과</div>
                <div className="text-2xl font-bold">{result.value}</div>
              </div>
            )}
          </div>
        </section>

        <aside className="lg:col-span-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold mb-2">수익화 팁</h3>
            <ul className="text-sm opacity-80 space-y-1">
              <li>• 음식 뽑기 → 배달앱 링크</li>
              <li>• 공부 뽑기 → 노션/광고</li>
              <li>• 결과 공유 → SNS 바이럴</li>
            </ul>
            <div
              id="ad"
              className="h-32 mt-4 rounded-xl border border-dashed border-white/15 bg-black/30 flex items-center justify-center text-xs"
            >
              {adReady? "[광고]" : "광고 준비중"}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
// ==============================
// SVG Wheel Component
// - Text kept horizontal via counter-rotation
// - Elegant HSL sweep
// ==============================
function SVGWheel({ items }){
  const n=Math.max(2,items.length);
  const per=360/n;
  const r=240;
  const cx=250, cy=250;

  const segs=Array.from({length:n}).map((_,i)=>{
    const a0=(i*per-90)*(Math.PI/180);
    const a1=((i+1)*per-90)*(Math.PI/180);
    const x0=cx+r*Math.cos(a0);
    const y0=cy+r*Math.sin(a0);
    const x1=cx+r*Math.cos(a1);
    const y1=cy+r*Math.sin(a1);
    const large=per>180?1:0;
    const path=`M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
    const hue=Math.round((i/n)*300+20);
    const fill=`hsl(${hue} 70% 52%)`;
    return {i,path,fill,angle:i*per+per/2};
  });

  return (
    <svg viewBox="0 0 500 500" className="w-full h-full select-none">
      {/* Outer rim */}
      <circle cx={cx} cy={cy} r={r+6} fill="#00000088" stroke="rgba(255,255,255,0.18)" strokeWidth="2"/>
      {segs.map(({i,path,fill,angle})=>(
        <g key={i}>
          <path d={path} fill={fill} opacity="0.95"/>
          {/* Label (kept horizontal) */}
          <g transform={`rotate(${angle} ${cx} ${cy})`}>
            <g transform={`rotate(${-angle} ${cx} ${cy})`}>
              <text
                x={cx}
                y={cy-(r*0.62)}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize={items[i].length>10?14:16}
                fontWeight="600"
                fill="rgba(255,255,255,0.95)"
              >
                {items[i]}
              </text>
            </g>
          </g>
        </g>
      ))}
      {/* Inner bevel */}
      <circle cx={cx} cy={cy} r={r-6} fill="transparent" stroke="rgba(255,255,255,0.15)" strokeWidth="2"/>
    </svg>
  );
}

