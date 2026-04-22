"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { salesmanSchema, type SalesmanFormValues } from "@/lib/validators/sales";
import { createSalesman, updateSalesman } from "../../actions";

type Salesman = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  citizenshipNo: string | null;
  openingBalance: number;
  commissionPct: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  salesman: Salesman | null;
};

const EMPTY: SalesmanFormValues = {
  name: "", email: "", phone: "", address: "",
  citizenshipNo: "", openingBalance: 0, commissionPct: 25,
};

export function SalesmanForm({ open, onClose, salesman }: Props) {
  const form = useForm<SalesmanFormValues>({
    resolver: zodResolver(salesmanSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        salesman
          ? {
              name:           salesman.name,
              email:          salesman.email ?? "",
              phone:          salesman.phone ?? "",
              address:        salesman.address ?? "",
              citizenshipNo:  salesman.citizenshipNo ?? "",
              openingBalance: salesman.openingBalance ?? 0,
              commissionPct:  salesman.commissionPct ?? 25,
            }
          : EMPTY
      );
    }
  }, [open, salesman, form]);

  async function onSubmit(values: SalesmanFormValues) {
    try {
      if (salesman) {
        await updateSalesman(salesman.id, values);
        toast.success("Salesman updated");
      } else {
        await createSalesman(values);
        toast.success("Salesman added");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save salesman");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{salesman ? "Edit Salesman" : "New Salesman"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Ram Bahadur Shrestha" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="citizenshipNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Citizenship No.</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. 12-34-567890" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="salesman@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="98XXXXXXXX" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Tole, Municipality/City, District, Province" rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="openingBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Balance (Rs)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={field.value === 0 ? "" : field.value}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commissionPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        placeholder="25"
                        value={field.value === 0 ? "0" : (field.value ?? "")}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Commission % is applied automatically to every new sales order for this salesman.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : salesman ? "Save Changes" : "Add Salesman"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
