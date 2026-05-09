import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Flat card surface used for all named sections throughout the ERP.
 * Renders: rounded-lg border bg-card overflow-hidden
 * With optional sticky header bar: px-4 py-3 border-b bg-muted/30
 *
 * Pass `header` for a fully-custom header node (title + optional icon/action).
 * Children are rendered directly — caller controls inner padding.
 */
type Props = {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ERPSection({ header, children, className }: Props) {
  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      {header != null && (
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          {header}
        </div>
      )}
      {children}
    </div>
  );
}
