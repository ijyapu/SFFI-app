import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

/**
 * Standard ERP page header. Handles three structural variants:
 *   1. backHref only  — flex row: [← back] [title / subtitle]
 *   2. backHref + action — justify-between: [[← back title] subtitle] [action]
 *   3. action only   — justify-between: [title / subtitle] [action]
 *   4. neither       — plain block heading
 */
type Props = {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  action?: ReactNode;
};

export function ERPPageHeader({ title, subtitle, backHref, action }: Props) {
  const hasAction = action != null;

  // variant 1 — back nav, no right action
  if (backHref && !hasAction) {
    return (
      <div className="flex items-center gap-2">
        <Link href={backHref} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
    );
  }

  // variant 2 — back nav + right action
  if (backHref && hasAction) {
    return (
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={backHref} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
          {subtitle && <p className="text-muted-foreground text-sm ml-9">{subtitle}</p>}
        </div>
        {action}
      </div>
    );
  }

  // variant 3 & 4 — no back button
  return (
    <div className={cn(hasAction && "flex items-start justify-between")}>
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
