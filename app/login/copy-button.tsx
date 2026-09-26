"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }}
      className="shrink-0 rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
