"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, AlertTriangle, Plus, Tag } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SortButton } from "@/components/ui/sort-icon";
import { useSortable, compareValues } from "@/hooks/use-sortable";
import { ProductForm } from "./product-form";
import { CategoryDialog } from "./category-dialog";
import { UnitDialog } from "./unit-dialog";
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
  piecesPerPacket: number | null;
  category: { name: string };
  unit: { name: string };
};

type Props = {
  products: Product[];
  categories: { id: string; name: string }[];
  units: { id: string; name: string }[];
};

function isLowStock(p: Product) {
  return p.reorderLevel > 0 && p.currentStock > 0 && p.currentStock <= p.reorderLevel;
}

export function ProductTable({ products, categories, units }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const { sortKey, sortDir, toggle } = useSortable("name");

  const filtered = useMemo(() => products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchCategory = categoryFilter === "all" || p.categoryId === categoryFilter;
    return matchSearch && matchCategory;
  }), [products, search, categoryFilter]);

  // Sort filtered products; within-group order is preserved from this global sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av: Record<string, string | number> = {
        sku: a.sku, name: a.name,
        costPrice: a.costPrice, sellingPrice: a.sellingPrice,
        currentStock: a.currentStock,
      };
      const bv: Record<string, string | number> = {
        sku: b.sku, name: b.name,
        costPrice: b.costPrice, sellingPrice: b.sellingPrice,
        currentStock: b.currentStock,
      };
      return compareValues(av[sortKey], bv[sortKey], sortDir);
    });
  }, [filtered, sortKey, sortDir]);

  // Group into categories; group order is always alphabetical
  const grouped = useMemo(() => {
    const map = new Map<string, { catId: string; catName: string; rows: Product[] }>();
    for (const p of sorted) {
      if (!map.has(p.categoryId)) {
        map.set(p.categoryId, { catId: p.categoryId, catName: p.category.name, rows: [] });
      }
      map.get(p.categoryId)!.rows.push(p);
    }
    return Array.from(map.values()).sort((a, b) => a.catName.localeCompare(b.catName));
  }, [sorted]);

  async function handleDelete(id: string, name: string) {
    try {
      await deleteProduct(id);
      toast.success(`"${name}" removed from inventory`);
      router.refresh();
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

  const sp = { sortKey, sortDir, toggle };
  const totalFiltered = grouped.reduce((s, g) => s + g.rows.length, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
            <SelectTrigger className="w-44">
              <span>
                {categoryFilter === "all"
                  ? "All categories"
                  : (categories.find((c) => c.id === categoryFilter)?.name ?? "All categories")}
              </span>
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
          <Button variant="outline" onClick={() => setUnitDialogOpen(true)}>
            Units
          </Button>
          <Button onClick={() => { setEditProduct(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            New Product
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortButton col="name"         label="Product"    {...sp} /></TableHead>
              <TableHead><SortButton col="sku"          label="SKU"        {...sp} /></TableHead>
              <TableHead>Unit</TableHead>
              <TableHead numeric><SortButton col="costPrice"    label="Cost (Rs)"  {...sp} className="justify-end" /></TableHead>
              <TableHead numeric><SortButton col="sellingPrice" label="Price (Rs)" {...sp} className="justify-end" /></TableHead>
              <TableHead numeric><SortButton col="currentStock" label="Stock"      {...sp} className="justify-end" /></TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {totalFiltered === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  {search || categoryFilter !== "all" ? (
                    <p className="text-muted-foreground">No products match your filters.</p>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="font-medium">No products yet</p>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Start by adding categories and units, then create your first product.
                      </p>
                      <Button className="mt-2" onClick={() => { setEditProduct(null); setFormOpen(true); }}>
                        <Plus className="h-4 w-4" />
                        Add First Product
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}

            {grouped.map(({ catId, catName, rows }) => {
              const lowCount   = rows.filter(isLowStock).length;
              const totalStock = rows.reduce((s, p) => s + p.currentStock * p.costPrice, 0);

              return (
                <React.Fragment key={catId}>
                  {/* Category section header */}
                  <TableRow className="bg-red-700 hover:bg-red-700 border-y border-red-800">
                    <TableCell colSpan={7} className="py-2 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold uppercase tracking-widest text-white">
                            {catName}
                          </span>
                          <span className="text-xs text-red-200/80">
                            {rows.length} {rows.length === 1 ? "product" : "products"}
                          </span>
                          {lowCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-amber-300 font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              {lowCount} low stock
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-red-200 tabular-nums">
                          Value: Rs {totalStock.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Product rows */}
                  {rows.map((product) => {
                    const low = isLowStock(product);
                    return (
                      <TableRow key={product.id}>
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
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {product.sku}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{product.unit.name}</TableCell>
                        <TableCell numeric>
                          {product.costPrice.toFixed(2)}
                        </TableCell>
                        <TableCell numeric>
                          {product.sellingPrice > 0
                            ? product.sellingPrice.toFixed(2)
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell numeric>
                          <div className="flex items-center justify-end gap-1.5">
                            {low && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            <span className={low ? "text-amber-600 font-medium" : ""}>
                              {product.currentStock.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">{product.unit.name}</span>
                          </div>
                          {low && (
                            <div className="text-xs text-amber-500 text-right">
                              reorder ≤ {product.reorderLevel}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(product)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
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
                                  <AlertDialogAction onClick={() => handleDelete(product.id, product.name)}>
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
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {totalFiltered} of {products.length} products
        {grouped.some((g) => g.rows.some(isLowStock)) && (
          <span className="ml-2 text-amber-500">
            · {grouped.reduce((s, g) => s + g.rows.filter(isLowStock).length, 0)} low stock
          </span>
        )}
      </p>

      <ProductForm
        open={formOpen}
        onClose={handleFormClose}
        product={editProduct}
        categories={categories}
        units={units}
        onOpenCategories={() => { setFormOpen(false); setCategoryDialogOpen(true); }}
        onOpenUnits={() => { setFormOpen(false); setUnitDialogOpen(true); }}
      />

      <CategoryDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        categories={categories}
      />

      <UnitDialog
        open={unitDialogOpen}
        onClose={() => setUnitDialogOpen(false)}
        units={units}
      />
    </div>
  );
}
