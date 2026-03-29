"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Trash2, AlertTriangle, Plus, Tag } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ProductForm } from "./product-form";
import { CategoryDialog } from "./category-dialog";
import { deleteProduct } from "../actions";

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
  currentStock: number;
  category: { name: string };
  unit: { name: string };
};

type Props = {
  products: Product[];
  categories: { id: string; name: string }[];
  units: { id: string; name: string }[];
};

export function ProductTable({ products, categories, units }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "all" || p.categoryId === categoryFilter;
    return matchSearch && matchCategory;
  });

  function isLowStock(p: Product) {
    return Number(p.currentStock) <= Number(p.reorderLevel);
  }

  async function handleDelete(id: string, name: string) {
    try {
      await deleteProduct(id);
      toast.success(`"${name}" removed from inventory`);
    } catch {
      toast.error("Failed to delete product");
    }
  }

  function handleEdit(product: Product) {
    setEditProduct(product);
    setFormOpen(true);
  }

  function handleFormClose() {
    setFormOpen(false);
    setEditProduct(null);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCategoryDialogOpen(true)}>
            <Tag className="h-4 w-4" />
            Categories
          </Button>
          <Button onClick={() => { setEditProduct(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            New Product
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Cost (Rs)</TableHead>
              <TableHead className="text-right">Price (Rs)</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  {search || categoryFilter !== "all" ? "No products match your filters." : "No products yet."}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((product) => {
              const low = isLowStock(product);
              return (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                  <TableCell>
                    <Link
                      href={`/inventory/products/${product.id}`}
                      className="font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                    {product.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-48">
                        {product.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.category.name}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.unit.name}</TableCell>
                  <TableCell className="text-right">
                    {Number(product.costPrice).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(product.sellingPrice) > 0
                      ? Number(product.sellingPrice).toFixed(2)
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {low && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span className={low ? "text-amber-600 font-medium" : ""}>
                        {Number(product.currentStock).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">{product.unit.name}</span>
                    </div>
                    {low && (
                      <div className="text-xs text-amber-500 text-right">
                        reorder ≤ {Number(product.reorderLevel)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={<Button variant="ghost" size="icon-sm" />}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove &quot;{product.name}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will soft-delete the product. Existing stock movements and
                              order history will be preserved.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(product.id, product.name)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {products.length} products
        {filtered.some(isLowStock) && (
          <span className="ml-2 text-amber-500">
            · {filtered.filter(isLowStock).length} low stock
          </span>
        )}
      </p>

      <ProductForm
        open={formOpen}
        onClose={handleFormClose}
        product={editProduct}
        categories={categories}
        units={units}
      />

      <CategoryDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        categories={categories}
      />
    </div>
  );
}
