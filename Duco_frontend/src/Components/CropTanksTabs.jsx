// CropTanksTabs.jsx
import React, { useEffect, useRef, useState } from "react";

const TABS = [
  {
    key: "desc",
    label: "Description",
    content: (
      <div className="space-y-6 leading-7 text-slate-800">
        <p>
          Crop tanks are a comfortable summer staple for women. Start selling
          crop tanks to increase your brand’s style quotient. Explore the option
          to sell crop tanks with print-on-demand using your own brand name—no
          inventory, printing, or logistics hassles. Qikink takes care of
          printing and fulfilment. Get creative and design for your audience.
          Our crop tanks are made of 180 GSM super-combed bio-washed fabric with
          double-stitched seam and folded neck.
        </p>
        <p>
          We maintain benchmark quality tanks your customers will appreciate.
          They’re pre-shrunk with a regular fit and offer excellent color
          fastness. Fabrics are specially made for direct-to-garment printing,
          suitable for print-on-demand drop shipping. All mélange colors are 90%
          cotton and 10% mélange mix. Available in trending color options.
          Qikink also offers screen-printing options for crop tank printing with
          drop-shipping options. Get in touch with us to know more.
        </p>
      </div>
    ),
  },
  {
    key: "guide",
    label: "Design Guidelines",
    content: (
      <ul className="list-disc pl-6 space-y-2 text-slate-800">
        <li>Recommended print size: 12″ × 16″ (300 DPI).</li>
        <li>Upload PNG with transparent background.</li>
        <li>Keep key elements 0.25″ inside the safe area.</li>
        <li>Convert texts to shapes to avoid font issues.</li>
      </ul>
    ),
  },
  {
    key: "brand",
    label: "Custom Branding",
    content: (
      <ul className="list-disc pl-6 space-y-2 text-slate-800">
        <li>Inside neck branding (single-color) available.</li>
        <li>Custom hang tags and size stickers on request.</li>
        <li>MOQ for woven labels: 100 pcs per size.</li>
      </ul>
    ),
  },
  {
    key: "wash",
    label: "Wash Care",
    content: (
      <ul className="list-disc pl-6 space-y-2 text-slate-800">
        <li>Machine wash cold, inside out, gentle cycle.</li>
        <li>Do not bleach. Tumble dry low or hang dry.</li>
        <li>Do not iron directly on the print.</li>
      </ul>
    ),
  },
];

export default function CropTanksTabs() {
  const [active, setActive] = useState("desc");
  const tabRefs = useRef({});
  const railRef = useRef(null);
  const indicatorRef = useRef(null);

  // Move the underline indicator to the active tab
  const positionIndicator = () => {
    const btn = tabRefs.current[active];
    const rail = railRef.current;
    const ind = indicatorRef.current;
    if (!btn || !rail || !ind) return;

    const b = btn.getBoundingClientRect();
    const r = rail.getBoundingClientRect();
    const left = b.left - r.left;

    ind.style.width = `${b.width}px`;
    ind.style.transform = `translateX(${left}px)`;
  };

  useEffect(() => {
    positionIndicator();
    window.addEventListener("resize", positionIndicator);
    return () => window.removeEventListener("resize", positionIndicator);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14"
      style={{ ["--accent"]: "#E5C870" }}
    >
      {/* Title */}
      <h1 className="text-center text-3xl md:text-5xl font-extrabold tracking-tight text-white">
        Print On Demand
      </h1>

      {/* Tabs */}
      <div className="mt-10">
        <div className="relative">
          <div
            ref={railRef}
            className="relative border-b border-slate-200 max-w-4xl mx-auto"
          >
            <div className="flex justify-between md:justify-center md:gap-14">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  ref={(el) => (tabRefs.current[t.key] = el)}
                  onClick={() => setActive(t.key)}
                  className={`relative px-1 pb-3 text-base md:text-xl font-semibold transition-colors
                    ${
                      active === t.key
                        ? "text-[var(--accent)]"
                        : "text-slate-400 hover:text-slate-900"
                    }`}
                  role="tab"
                  aria-selected={active === t.key}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Sliding underline */}
            <span
              ref={indicatorRef}
              className="pointer-events-none absolute -bottom-[2px] left-0 h-[3px] bg-[var(--accent)] rounded-full transition-transform duration-300 ease-out"
              style={{ width: 0, transform: "translateX(0px)" }}
            />
          </div>
        </div>
      </div>

      {/* Panel */}
      <div className="mt-10">
        <div className="rounded-2xl border border-[#FFE7C2] bg-[#FFF7EC] p-6 md:p-8 shadow-sm">
          {TABS.find((t) => t.key === active)?.content}
        </div>
      </div>
    </div>
  );
}
