"use client";

import { useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

// Wraps the current textarea selection with a prefix and suffix.
// If nothing is selected, inserts placeholder text between them.
function wrapSelection(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
  placeholder: string,
  onChange: (v: string) => void
) {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
  onChange(next);
  // Restore focus and position cursor inside the new markup
  setTimeout(() => {
    textarea.focus();
    const cursor = start + prefix.length + selected.length;
    textarea.setSelectionRange(cursor, cursor);
  }, 0);
}

const TOOLS = [
  { label: "B",      title: "Bold",            prefix: "**",   suffix: "**",   placeholder: "bold text",   className: "font-bold" },
  { label: "I",      title: "Italic",           prefix: "*",    suffix: "*",    placeholder: "italic text", className: "italic" },
  { label: "</>",    title: "Inline code",      prefix: "`",    suffix: "`",    placeholder: "code",        className: "font-mono text-xs" },
  { label: "$",      title: "Inline LaTeX",     prefix: "$",    suffix: "$",    placeholder: "x^2",         className: "font-mono text-xs" },
  { label: "$$",     title: "Block LaTeX",      prefix: "$$\n", suffix: "\n$$", placeholder: "\\frac{a}{b}", className: "font-mono text-xs" },
];

export default function RichTextEditor({ value, onChange, placeholder, rows = 8 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white transition focus-within:border-[#8C1515]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-neutral-100 px-3 py-2">
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            title={tool.title}
            onClick={() => ref.current && wrapSelection(ref.current, tool.prefix, tool.suffix, tool.placeholder, onChange)}
            className={`rounded-md px-2 py-1 text-xs text-neutral-600 transition hover:bg-[#f3e7e7] hover:text-[#8C1515] ${tool.className}`}
          >
            {tool.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-neutral-400">Markdown + LaTeX supported</span>
      </div>

      {/* Editor */}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-b-xl bg-transparent px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none font-mono"
      />
    </div>
  );
}
