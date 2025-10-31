import React from "react";

export default function PolicyLayout({ title, children, updated = "August 10, 2025" }) {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#E5C870]">
          {title}
        </h1>
        <p className="text-white/70 mt-1 text-sm">Last updated: {updated}</p>
        <div className="prose prose-invert mt-8 max-w-none">
          {children}
        </div>
      </div>
    </div>
  );
}