"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export function PrintTrigger() {
  useEffect(() => {
    // Small delay to let the page render fully before printing
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="no-print fixed top-4 right-4 z-50 flex gap-2 print:hidden">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-red-700 transition-colors"
      >
        <Printer className="h-4 w-4" />
        Print / Save as PDF
      </button>
      <button
        onClick={() => window.close()}
        className="flex items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg hover:bg-gray-50 transition-colors"
      >
        Close
      </button>
    </div>
  );
}
