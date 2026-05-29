"use client";

import { useState } from "react";

interface Props {
  title?: string;
  text?: string;
  url?: string;
  label?: string;
  className?: string;
}

export default function ShareButton({ title, text, url, label = "Share", className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url ?? window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: title ?? "BetterEd", text, url: shareUrl });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Clipboard fallback
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-[#8C1515] hover:text-[#8C1515] ${className}`}
    >
      {copied ? (
        <>
          <span>✓</span>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <span>↗</span>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
