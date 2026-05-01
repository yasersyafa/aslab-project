import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import Duck from "./Duck";

type Step = {
  number: number;
  text: string;
  sub?: string;
};

const LAB_STEPS: Step[] = [
  { number: 1, text: "Chat Becky on Telegram!", sub: "@aslabGT_bot" },
  { number: 2, text: "Tell what lab you need" },
  { number: 3, text: "Tell who you are" },
  { number: 4, text: "Send a request via /pinjam" },
  { number: 5, text: "Wait for our aslab to approve" },
  { number: 6, text: "Enjoy the lab! 🏫" },
  { number: 7, text: "Return it with /pengembalian + photo" },
];

const ITEM_STEPS: Step[] = [
  { number: 1, text: "Chat Becky on Telegram!", sub: "@aslabGT_bot" },
  { number: 2, text: "Tell what items you need" },
  { number: 3, text: "Tell who you are" },
  { number: 4, text: "Send a request via /pinjam" },
  { number: 5, text: "Wait for our aslab to approve" },
  { number: 6, text: "Use /ambil — photo item condition when picking up 📸" },
  { number: 7, text: "Return it with /pengembalian" },
  { number: 8, text: "Photo item condition when returning 📸" },
];

type TabKey = "lab" | "items";

const TABS: { key: TabKey; emoji: string; label: string; steps: Step[] }[] = [
  { key: "lab", emoji: "🏫", label: "Borrow a Lab", steps: LAB_STEPS },
  { key: "items", emoji: "📦", label: "Borrow Items", steps: ITEM_STEPS },
];

function Timeline({ steps, color }: { steps: Step[]; color: string }) {
  return (
    <ol className="relative flex flex-col gap-0">
      {steps.map((step, idx) => (
        <li key={step.number} className="flex gap-4">
          {/* line + dot */}
          <div className="flex flex-col items-center">
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full border-2 border-black font-bold text-sm shrink-0 ${color}`}
            >
              {step.number}
            </div>
            {idx < steps.length - 1 && (
              <div className="w-0.5 flex-1 bg-black my-1 min-h-6" />
            )}
          </div>
          {/* text */}
          <div className="pb-6 pt-1">
            <p className="font-heading text-base leading-snug">{step.text}</p>
            {step.sub && (
              <p className="text-sm font-base opacity-60 mt-0.5">{step.sub}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HowToLendSection() {
  const [tab, setTab] = useState<TabKey>("lab");
  const active = TABS.find((t) => t.key === tab)!;
  const panelWrapRef = useRef<HTMLDivElement>(null);

  return (
    <section id="how-to-borrow" className="py-24 px-5">
      <div className="container mx-auto">
        {/* heading */}
        <div className="mb-10 text-center">
          <h2 className="font-extrabold text-4xl sm:text-5xl mb-4">
            How to Borrow
          </h2>
          <p className="text-lg max-w-xl mx-auto font-base opacity-70">
            Pick the flow you need — both start with a chat to Becky on
            Telegram.
          </p>
        </div>

        {/* tab bar */}
        <div
          role="tablist"
          aria-label="How to borrow flows"
          className="flex justify-center gap-4 mb-8 flex-wrap"
        >
          {TABS.map((t) => {
            const isActive = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${t.key}`}
                id={`tab-${t.key}`}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-6 py-3 rounded-base border-2 border-border font-heading text-base cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black",
                  isActive
                    ? "bg-main text-main-foreground shadow-shadow"
                    : "bg-background text-foreground shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none"
                )}
              >
                <span className="mr-2">{t.emoji}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* tab panel + walking duck */}
        <div ref={panelWrapRef} className="relative max-w-2xl mx-auto">
          <Duck containerRef={panelWrapRef} />
          <div
            key={tab}
            role="tabpanel"
            id={`panel-${active.key}`}
            aria-labelledby={`tab-${active.key}`}
            className="bg-secondary-background border-2 border-black rounded-base shadow-shadow p-8 animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="text-3xl">{active.emoji}</span>
              <h3 className="font-extrabold text-2xl">{active.label}</h3>
            </div>
            <Timeline
              steps={active.steps}
              color="bg-main text-main-foreground"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
