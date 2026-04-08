import { COMPANY } from "@/lib/company";
import { Building2, Phone, Hash, User, Calendar, MapPin, Quote } from "lucide-react";

export const metadata = { title: "Company Info — Settings" };

const Row = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) => (
  <div className="flex items-start gap-4 py-3 border-b last:border-0">
    <div className="flex items-center gap-2 w-44 shrink-0 text-muted-foreground text-sm">
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </div>
    <div className="text-sm font-medium">{value}</div>
  </div>
);

export default function CompanyPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Company Information</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Business profile used across reports, tax summaries, and documents.
        </p>
      </div>

      <div className="rounded-lg border bg-card divide-y-0">
        <div className="px-5 py-4">
          <Row icon={Building2} label="Company Name"  value={COMPANY.name} />
          <Row icon={MapPin}     label="Address"       value={COMPANY.address} />
          <Row icon={Phone}      label="Phone"         value={COMPANY.phone} />
          <Row icon={Hash}       label="PAN Number"    value={COMPANY.pan} />
          <Row icon={User}       label="Owner"         value={COMPANY.owner} />
          <Row icon={Calendar}   label="Established"   value={COMPANY.established} />
          <Row icon={Quote}      label="Slogan"        value={COMPANY.slogan} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        To update company details, edit <code className="font-mono bg-muted px-1 py-0.5 rounded">src/lib/company.ts</code>.
      </p>
    </div>
  );
}
