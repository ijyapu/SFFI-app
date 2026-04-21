
import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { productSchema, type ProductFormValues } from "@/lib/validators/product";
import { createProduct, updateProduct, getNextSkuPreview } from "../actions";
import { AlertTriangle } from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  categoryId: string;
  unitId: string;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  piecesPerPacket: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  categories: { id: string; name: string }[];
  units: { id: string; name: string }[];
  onOpenCategories?: () => void;
  onOpenUnits?: () => void;
};

export function ProductForm({ open, onClose, product, categories, units, onOpenCategories, onOpenUnits }: Props) {
  const isEdit = !!product;
  const router = useRouter();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      unitId: "",
      costPrice: 0,
      sellingPrice: 0,
      reorderLevel: 0,
      piecesPerPacket: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku,
        description: product.description ?? "",
        categoryId: product.categoryId,
        unitId: product.unitId,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
        reorderLevel: Number(product.reorderLevel),
        piecesPerPacket: product.piecesPerPacket ?? null,
      });
    } else {
      form.reset({
        name: "", sku: "", description: "", categoryId: "",
        unitId: "", costPrice: 0, sellingPrice: 0, reorderLevel: 0, piecesPerPacket: null,
      });
    }
  }, [open, product, form]);

  const watchedCategoryId = form.watch("categoryId");
  useEffect(() => {
    if (isEdit || !watchedCategoryId) return;
    const cat = categories.find((c) => c.id === watchedCategoryId);
    if (!cat) return;
    getNextSkuPreview(cat.name).then((sku) => {
      form.setValue("sku", sku, { shouldValidate: false });
    }).catch(() => {/* ignore */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCategoryId]);

  async function onSubmit(values: ProductFormValues) {
    try {
      if (isEdit && product) {
        await updateProduct(product.id, values);
        toast.success("Product updated");
      } else {
        await createProduct(values);
        toast.success("Product created");
      }
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "New Product"}</DialogTitle>
        </DialogHeader>

        {/* Setup warnings */}
        {(categories.length === 0 || units.length === 0) && (
          <div className="space-y-2">
            {categories.length === 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  No categories yet.{" "}
                  {onOpenCategories && (
                    <button type="button" onClick={onOpenCategories} className="underline font-medium">
                      Add a category first
                    </button>
                  )}
                </span>
              </div>
            )}
            {units.length === 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  No units of measure yet.{" "}
                  {onOpenUnits && (
                    <button type="button" onClick={onOpenUnits} className="underline font-medium">
                      Add a unit first
                    </button>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Product Name</FormLabel>
                  <FormControl><Input placeholder="e.g. White Sandwich Bread" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="categoryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category">
                          {categories.find(c => c.id === field.value)?.name}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU <span className="text-muted-foreground font-normal text-xs">(auto-generated)</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Select a category first"
                      readOnly
                      className="bg-muted/50 cursor-default select-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="unitId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit">
                          {units.find(u => u.id === field.value)?.name}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="costPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Price (Rs)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0"
                      value={field.value === 0 ? "" : field.value} name={field.name} ref={field.ref} onBlur={field.onBlur}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sellingPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Price (Rs)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0"
                      value={field.value === 0 ? "" : field.value} name={field.name} ref={field.ref} onBlur={field.onBlur}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="reorderLevel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Level</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" min="0"
                      value={field.value === 0 ? "" : field.value} name={field.name} ref={field.ref} onBlur={field.onBlur}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="piecesPerPacket" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Pieces per Packet{" "}
                    <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="e.g. 12"
                      value={field.value ?? ""}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        field.onChange(isNaN(v) ? null : v);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Description <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Short product description..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
