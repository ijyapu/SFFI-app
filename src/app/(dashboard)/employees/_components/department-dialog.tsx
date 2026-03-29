"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { departmentSchema, type DepartmentFormValues } from "@/lib/validators/employee";
import { createDepartment, deleteDepartment } from "../actions";

type Department = { id: string; name: string; _count: { employees: number } };

type Props = {
  open: boolean;
  onClose: () => void;
  departments: Department[];
};

export function DepartmentDialog({ open, onClose, departments }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: DepartmentFormValues) {
    try {
      await createDepartment(values);
      toast.success("Department created");
      form.reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create department");
    }
  }

  async function handleDelete(id: string, name: string) {
    setDeleting(id);
    try {
      await deleteDepartment(id);
      toast.success(`"${name}" removed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete department");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Departments</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input {...field} placeholder="e.g. Quality Control" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </Form>

          {/* List */}
          <div className="divide-y rounded-lg border">
            {departments.length === 0 && (
              <p className="text-center text-muted-foreground py-6 text-sm">
                No departments yet.
              </p>
            )}
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{dept.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {dept._count.employees} employee{dept._count.employees !== 1 ? "s" : ""}
                  </span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove &quot;{dept.name}&quot;?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This department must have no active employees to be removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(dept.id, dept.name)}
                        disabled={deleting === dept.id}
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
