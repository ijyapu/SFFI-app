"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveCompanyInfo, type CompanyInfo } from "../actions";

const schema = z.object({
  name:        z.string().min(1, "Required"),
  nameShort:   z.string().min(1, "Required"),
  slogan:      z.string().min(1, "Required"),
  address:     z.string().min(1, "Required"),
  phone:       z.string().min(1, "Required"),
  pan:         z.string().min(1, "Required"),
  owner:       z.string().min(1, "Required"),
  established: z.number().int().min(1900),
});

export function CompanyForm({ info, isAdmin }: { info: CompanyInfo; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CompanyInfo>({
    resolver: zodResolver(schema),
    defaultValues: info,
  });

  async function onSubmit(data: CompanyInfo) {
    try {
      await saveCompanyInfo(data);
      toast.success("Company info updated");
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }

  function cancel() {
    reset(info);
    setEditing(false);
  }

  if (!editing) {
    return isAdmin ? (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="h-3.5 w-3.5 mr-1.5" />
        Edit
      </Button>
    ) : null;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border bg-card">
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Company Name" error={errors.name?.message}>
            <Input {...register("name")} />
          </Field>
          <Field label="Short Name / Abbreviation" error={errors.nameShort?.message}>
            <Input {...register("nameShort")} />
          </Field>
          <Field label="Slogan" error={errors.slogan?.message} className="sm:col-span-2">
            <Input {...register("slogan")} />
          </Field>
          <Field label="Address" error={errors.address?.message} className="sm:col-span-2">
            <Input {...register("address")} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} />
          </Field>
          <Field label="PAN Number" error={errors.pan?.message}>
            <Input {...register("pan")} />
          </Field>
          <Field label="Owner / Proprietor" error={errors.owner?.message}>
            <Input {...register("owner")} />
          </Field>
          <Field label="Established Year" error={errors.established?.message}>
            <Input
              {...register("established", { valueAsNumber: true })}
              type="number"
            />
          </Field>
        </div>
      </div>

      <div className="px-5 py-3 border-t flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={isSubmitting}>
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {isSubmitting ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label, error, children, className,
}: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
