import { useEffect, useRef, useState } from "react";
import L1 from "@/assets/sprite/L1.png";
import L2 from "@/assets/sprite/L2.png";
import L3 from "@/assets/sprite/L3.png";
import L4 from "@/assets/sprite/L4.png";
import R1 from "@/assets/sprite/R1.png";
import R2 from "@/assets/sprite/R2.png";
import R3 from "@/assets/sprite/R3.png";
import R4 from "@/assets/sprite/R4.png";

const L_FRAMES = [L1, L2, L3, L4];
const R_FRAMES = [R1, R2, R3, R4];

const REMINDERS = [
  "Use tools carefully! 🛠️",
  "Keep the lab clean 🧼",
  "Don't forget /pengembalian!",
  "Return on time ⏰",
  "No food in the lab 🚫🍕",
  "Quack! Read the manual first 📖",
  "Put tools back where they belong!",
  "Tidy bench = happy aslab 🦆",
];

const DUCK_W = 56;
const SPEED_PX_PER_SEC = 60;
const FRAME_MS = 140;

type Props = {
  containerRef: React.RefObject<HTMLDivElement | null>;
};

export default function Duck({ containerRef }: Props) {
  const [pos, setPos] = useState(20);
  const [target, setTarget] = useState(20);
  const [dir, setDir] = useState<"L" | "R">("R");
  const [moving, setMoving] = useState(false);
  const [frame, setFrame] = useState(0);
  const [bubble, setBubble] = useState<string | null>(null);
  const prevRef = useRef(20);

  // pick a new random target after a short idle pause
  useEffect(() => {
    if (moving) return;
    const wait = 600 + Math.random() * 1400;
    const id = setTimeout(() => {
      const w = containerRef.current?.offsetWidth ?? 600;
      const maxX = Math.max(0, w - DUCK_W);
      const next = Math.random() * maxX;
      prevRef.current = pos;
      setDir(next > pos ? "R" : "L");
      setTarget(next);
      setPos(next);
      setMoving(true);
    }, wait);
    return () => clearTimeout(id);
  }, [moving, pos, containerRef]);

  // cycle sprite frames while walking
  useEffect(() => {
    if (!moving) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % 4), FRAME_MS);
    return () => clearInterval(id);
  }, [moving]);

  // independent bubble loop
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    function next() {
      if (cancelled) return;
      timer = setTimeout(() => {
        if (cancelled) return;
        setBubble(REMINDERS[Math.floor(Math.random() * REMINDERS.length)]);
        timer = setTimeout(() => {
          if (cancelled) return;
          setBubble(null);
          next();
        }, 2500 + Math.random() * 1500);
      }, 2500 + Math.random() * 4000);
    }
    next();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const distance = Math.abs(target - prevRef.current);
  const durationMs = moving ? (distance / SPEED_PX_PER_SEC) * 1000 : 0;
  const src = dir === "L" ? L_FRAMES[frame] : R_FRAMES[frame];

  return (
    <div
      className="absolute -top-14 pointer-events-none select-none z-10"
      style={{
        left: target,
        width: DUCK_W,
        transition: `left ${durationMs}ms linear`,
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === "left") setMoving(false);
      }}
      aria-hidden
    >
      {bubble && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 max-w-[80vw] sm:max-w-xs whitespace-normal text-center bg-background border-2 border-border rounded-base shadow-shadow px-3 py-1.5 text-xs font-heading animate-in fade-in zoom-in duration-200">
          {bubble}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-border" />
        </div>
      )}
      <img
        src={src}
        alt=""
        draggable={false}
        className="w-full h-auto"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
