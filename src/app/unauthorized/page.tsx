import Link from "next/link";
import { ShieldOff } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center">
      <ShieldOff className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Access Denied</h1>
      <p className="text-muted-foreground max-w-sm">
        You don&apos;t have permission to view this page. Contact your administrator
        if you believe this is a mistake.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
