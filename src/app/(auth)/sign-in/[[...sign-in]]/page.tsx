import Image from "next/image";
import { SignIn } from "@clerk/nextjs";
import { ShieldCheck, BarChart3, Package, Lock, TrendingUp } from "lucide-react";

export const metadata = { title: "Sign In — Shanti Special Food Industry ERP" };

const FEATURES = [
  { icon: Package,    text: "Inventory and stock tracking" },
  { icon: TrendingUp, text: "Sales, purchases, and reporting" },
  { icon: ShieldCheck, text: "Role-based access control" },
  { icon: BarChart3,  text: "Financial reports and analytics" },
];

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT: Branding panel ── */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col bg-[#111318] px-14 py-12 overflow-hidden">

        {/* Background texture */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(220,38,38,0.08)_0%,_transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(220,38,38,0.05)_0%,_transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        {/* Top: brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative h-9 w-9 shrink-0 rounded-md overflow-hidden bg-white/10 ring-1 ring-white/10">
            <Image src="/ssfi-logo.jpg" alt="SSFI" fill className="object-contain p-0.5" priority />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight tracking-wide">Shanti Special Food Industry</p>
            <p className="text-red-400/60 text-[9px] tracking-widest uppercase">Enterprise Resource Planning</p>
          </div>
        </div>

        {/* Centre: hero */}
        <div className="relative z-10 flex flex-col justify-center flex-1 space-y-10">

          {/* Large logo */}
          <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 shadow-2xl">
            <Image src="/ssfi-logo.jpg" alt="SSFI" fill className="object-contain p-2" />
          </div>

          <div className="space-y-4 max-w-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-red-400 text-xs font-medium tracking-wide">Enterprise Portal</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Welcome to<br />
              <span className="text-red-400">SHANTI SPECIAL FOOD INDUSTRY</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              A secure, unified workspace for managing your entire
              business — from inventory and purchasing to sales
              and financial reporting.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-500/10">
                  <Icon className="h-3 w-3 text-red-400" />
                </div>
                <span className="text-slate-400 text-xs leading-snug">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: security note */}
        <div className="relative z-10 border-t border-white/[0.06] pt-5 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-slate-600 shrink-0" />
          <p className="text-slate-600 text-xs">
            Authorized personnel only · Access requires administrator approval
          </p>
        </div>
      </div>

      {/* ── RIGHT: Auth panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-8 py-14">

        {/* Mobile brand */}
        <div className="flex lg:hidden items-center gap-3 mb-10">
          <div className="relative h-9 w-9 rounded-md overflow-hidden">
            <Image src="/ssfi-logo.jpg" alt="SSFI" fill className="object-contain" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Shanti Special Food Industry</p>
            <p className="text-red-500 text-[9px] tracking-widest uppercase">Enterprise Portal</p>
          </div>
        </div>

        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[1.6rem] font-bold text-gray-900 tracking-tight leading-snug">
              Welcome to SFFI ERP
            </h2>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              Sign in with your Google account to access the ERP portal.
            </p>
          </div>

          {/* Clerk SignIn */}
          <SignIn
            forceRedirectUrl="/auth-callback"
            signUpForceRedirectUrl="/auth-callback"
            appearance={{
              elements: {
                rootBox:                       "w-full",
                card:                          "shadow-none p-0 w-full bg-transparent",
                headerTitle:                   "hidden",
                headerSubtitle:                "hidden",
                form:                          "hidden",
                dividerRow:                    "hidden",
                formFieldRow:                  "hidden",
                alternativeMethodsBlockButton: "hidden",
                socialButtonsBlockButton:
                  "w-full flex items-center justify-center gap-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow py-3",
                socialButtonsBlockButtonText:  "font-semibold text-gray-800",
                footer:                        "hidden",
              },
            }}
          />

          {/* Divider */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-400 tracking-widest uppercase">Access</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Approval note */}
          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5">
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-700">New users require admin approval</span> before
              accessing the portal. Your account will be reviewed after sign-in.
            </p>
          </div>

          {/* Contact */}
          <div className="mt-5 text-center">
            <p className="text-xs text-gray-400">Need access? Contact your administrator</p>
            <a
              href="mailto:shrestha.bikas23@gmail.com"
              className="mt-0.5 inline-block text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
            >
              shrestha.bikas23@gmail.com
            </a>
          </div>

          {/* Footer */}
          <div className="mt-10 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-gray-300" />
            <p className="text-xs text-gray-300">
              Secure, role-based access · Shanti Special Food Industry Pvt. Ltd.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
