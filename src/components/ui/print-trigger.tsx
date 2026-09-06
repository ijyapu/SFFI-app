"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

/**
 * Floating "Print / Close" controls for a print-preview page. Positioned below
 * the dashboard header's height (h-12) so it never overlaps the notification
 * bell / user menu that the print route still renders underneath it.
 */
export function PrintTrigger() {
  useEffect(() => {
    // Wait for all resources (logo image, fonts) before triggering print
    function tryPrint() { window.print(); }
    if (document.readyState === "complete") {
      const t = setTimeout(tryPrint, 150);
      return () => clearTimeout(t);
    }
    window.addEventListener("load", tryPrint);
    return () => window.removeEventListener("load", tryPrint);
  }, []);

  return (
    <div className="no-print fixed top-16 right-4 z-[60] flex gap-2 print:hidden">
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
