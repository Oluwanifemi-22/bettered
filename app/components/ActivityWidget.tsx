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
  sleep: { sprite: "/sprite-sleep.png", label: "Lil E is napping. Be the first to get things going!", duration: "1.4s" },
  wave:  { sprite: "/sprite-wave.png",  label: "Lil E is up! People are connecting on BetterEd.",    duration: "0.9s" },
  dance: { sprite: "/sprite-dance.png", label: "Lil E can't stop dancing — the platform is buzzing!", duration: "0.5s" },
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
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-center gap-2 rounded-2xl border border-[#ead7d7] bg-white px-4 py-4 shadow-md w-[130px]">
      <div
        className="lil-e"
        style={{ backgroundImage: `url(${sprite})`, animationDuration: duration }}
      />
      <p className="text-center text-[10px] leading-4 text-neutral-500">
        {label}
      </p>
    </div>
  );
}
