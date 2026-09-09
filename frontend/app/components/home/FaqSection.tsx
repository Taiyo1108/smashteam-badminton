"use client";

import { memo, useState } from "react";
import { Minus, Plus } from "lucide-react";

type Faq = { q: string; a: string };

function FaqSection({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mt-10 space-y-2">
      {faqs.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className={`rounded-3xl border transition-colors ${
              isOpen ? "border-black/10" : "border-black/5"
            } bg-white shadow-sm`}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="font-medium text-[17px]">{item.q}</span>
              <span className="w-8 h-8 shrink-0 rounded-lg bg-[#f2f2f2] flex items-center justify-center" aria-hidden>
                {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </span>
            </button>
            <div
              id={`faq-panel-${i}`}
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-6 text-[15px] text-black/60 leading-relaxed">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(FaqSection);
