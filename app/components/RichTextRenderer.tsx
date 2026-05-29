import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface Props {
  content: string;
  className?: string;
}

export default function RichTextRenderer({ content, className = "" }: Props) {
  return (
    <div className={`prose prose-sm max-w-none text-neutral-700 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Keep links safe — open in new tab
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#8C1515] hover:underline">
              {children}
            </a>
          ),
          // Inline code styling
          code: ({ children, className: cls }) => (
            <code className={`rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs text-neutral-800 ${cls ?? ""}`}>
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
