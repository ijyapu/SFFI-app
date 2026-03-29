"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { categorySchema, type CategoryFormValues } from "@/lib/validators/product";
import { createCategory, deleteCategory } from "../actions";

type Props = {
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string }[];
};

export function CategoryDialog({ open, onClose, categories }: Props) {
  const [pending, setPending] = useState<string | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: CategoryFormValues) {
    try {
      await createCategory(values);
      toast.success(`Category "${values.name}" created`);
      form.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleDelete(id: string, name: string) {
    setPending(id);
    try {
      await deleteCategory(id);
      toast.success(`Category "${name}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        {/* Add new category */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="New category name..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" size="icon" disabled={form.formState.isSubmitting}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </Form>

        {/* Existing categories */}
        <ul className="space-y-1 max-h-64 overflow-y-auto">
          {categories.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted">
              <span>{cat.name}</span>
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button variant="ghost" size="icon-sm" disabled={pending === cat.id} />}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete &quot;{cat.name}&quot;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will soft-delete the category. Products assigned to it will not be affected.
                      You cannot delete a category that still has active products.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(cat.id, cat.name)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
