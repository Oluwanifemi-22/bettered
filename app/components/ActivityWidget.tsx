"use client";

import { useEffect, useState } from "react";
import { listenToRecentEventCount } from "@/src/lib/analytics";

type Stage = "sleep" | "wave" | "dance";

function getStage(count: number): Stage {
  if (count >= 36) return "dance";
  if (count >= 11) return "wave";
  return "sleep";
}

const STAGES: Record<Stage, { sprite: string; label: string; duration: string }> = {
  sleep: { sprite: "/sprite-sleep.png", label: "Pretty quiet right now",  duration: "1.4s" },
  wave:  { sprite: "/sprite-wave.png",  label: "Students are active",     duration: "0.9s" },
  dance: { sprite: "/sprite-dance.png", label: "Buzzing right now!",      duration: "0.5s" },
};

export default function ActivityWidget() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const unsub = listenToRecentEventCount(12, setCount);
    return unsub;
  }, []);

  if (count === null) return null;

  const stage = getStage(count);
  const { sprite, label, duration } = STAGES[stage];

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 rounded-2xl border border-[#ead7d7] bg-white px-4 py-3 shadow-md">
      <div
        className="lil-e"
        style={{ backgroundImage: `url(${sprite})`, animationDuration: duration }}
        title={`Platform activity: ${count} events in the last 12 hours`}
      />
      <div>
        <p className="text-xs font-bold text-neutral-900">Lil E</p>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-[10px] font-semibold text-[#8C1515]">{count} interactions · 12h</p>
      </div>
    </div>
  );
}
