import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { format } from "date-fns";
import { toNepaliDateString } from "@/lib/nepali-date";
import { PrintTrigger } from "@/components/ui/print-trigger";
import { COMPANY } from "@/lib/company";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await prisma.supplierReturn.findUnique({ where: { id }, select: { returnNumber: true } });
  return { title: r ? `Return ${r.returnNumber} — SSFI` : "Purchase Return — SSFI" };
}

export default async function PrintReturnPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("purchases");
  const { id } = await params;

  const ret = await prisma.supplierReturn.findUnique({
    where: { id, deletedAt: null },
    include: {
      supplier: true,
      purchase: { select: { invoiceNo: true, date: true } },
      items: {
        include: { product: { include: { unit: true, category: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!ret) notFound();

  const totalAmount = Number(ret.totalAmount);
  const subtotal    = ret.items.reduce((s, i) => s + Number(i.grossAmount), 0);
  const vatTotal    = ret.items.reduce((s, i) => s + Number(i.vatAmount), 0);
  const exciseTotal = ret.items.reduce((s, i) => s + Number(i.exciseAmount), 0);
  const returnDate  = new Date(ret.returnDate);
  const invoiceDate = new Date(ret.purchase.date);

  const fmt = (n: number) => `Rs ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
      <PrintTrigger />

      <div className="min-h-screen bg-white p-0">
        <div
          id="invoice"
          className="mx-auto bg-white"
          style={{ width: "210mm", minHeight: "297mm", padding: "16mm 18mm", fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#1a1a1a" }}
        >
          {/* ── Header ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", borderBottom: "2px solid #c0392b", paddingBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ssfi-logo.jpg" alt={COMPANY.nameShort} style={{ width: "56px", height: "56px", objectFit: "contain" }} />
              <div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#c0392b", letterSpacing: "0.5px" }}>{COMPANY.name.toUpperCase()}</div>
                <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>{COMPANY.address}</div>
                <div style={{ fontSize: "10px", color: "#555" }}>Phone: {COMPANY.phone} · PAN: {COMPANY.pan}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#c0392b", letterSpacing: "1px" }}>PURCHASE RETURN NOTE</div>
              <div style={{ fontSize: "13px", fontWeight: "600", marginTop: "4px" }}>{ret.returnNumber}</div>
              <div style={{ fontSize: "10px", color: "#555", marginTop: "4px" }}>
                {toNepaliDateString(returnDate)}<br />
                <span style={{ color: "#888" }}>{format(returnDate, "dd MMMM yyyy")}</span>
              </div>
            </div>
          </div>

          {/* ── Supplier + reference info ── */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            <div style={{ padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "6px", border: "1px solid #eee", flex: 1 }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Return To</div>
              <div style={{ fontWeight: "600", fontSize: "12px" }}>{ret.supplier.name}</div>
              {ret.supplier.contactName && <div style={{ color: "#555", marginTop: "2px" }}>{ret.supplier.contactName}</div>}
              {ret.supplier.phone && <div style={{ color: "#555" }}>{ret.supplier.phone}</div>}
              {ret.supplier.address && <div style={{ color: "#555" }}>{ret.supplier.address}</div>}
              {ret.supplier.pan && <div style={{ color: "#555" }}>PAN: {ret.supplier.pan}</div>}
            </div>
            <div style={{ padding: "12px", backgroundColor: "#f9f9f9", borderRadius: "6px", border: "1px solid #eee", flex: 1 }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Against Invoice</div>
              <div style={{ fontWeight: "600", fontSize: "12px" }}>{ret.purchase.invoiceNo}</div>
              <div style={{ color: "#555", marginTop: "2px" }}>
                {toNepaliDateString(invoiceDate)} <span style={{ color: "#aaa" }}>({format(invoiceDate, "dd MMM yyyy")})</span>
              </div>
              {ret.reason && (
                <>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "10px", marginBottom: "4px" }}>Reason</div>
                  <div style={{ color: "#555" }}>{ret.reason}</div>
                </>
              )}
            </div>
          </div>

          {/* ── Items table ── */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
            <thead>
              <tr style={{ backgroundColor: "#c0392b", color: "white" }}>
                <th style={{ padding: "8px 10px", textAlign: "left",  fontWeight: "600", fontSize: "10px", textTransform: "uppercase" }}>#</th>
                <th style={{ padding: "8px 10px", textAlign: "left",  fontWeight: "600", fontSize: "10px", textTransform: "uppercase" }}>Product</th>
                <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600", fontSize: "10px", textTransform: "uppercase" }}>Qty Returned</th>
                <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600", fontSize: "10px", textTransform: "uppercase" }}>Unit Price</th>
                <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600", fontSize: "10px", textTransform: "uppercase" }}>Gross</th>
                <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600", fontSize: "10px", textTransform: "uppercase" }}>VAT</th>
                <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600", fontSize: "10px", textTransform: "uppercase" }}>Excise</th>
                <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600", fontSize: "10px", textTransform: "uppercase" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {ret.items.map((item, idx) => {
                const gross     = Number(item.grossAmount);
                const vatAmt    = Number(item.vatAmount);
                const exciseAmt = Number(item.exciseAmount);
                const lineTotal = Number(item.lineTotal);
                const isEven    = idx % 2 === 0;
                return (
                  <tr key={item.id} style={{ backgroundColor: isEven ? "#fff" : "#fafafa", borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "8px 10px", color: "#888" }}>{idx + 1}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ fontWeight: "500" }}>{item.product.name}</div>
                      <div style={{ color: "#aaa", fontSize: "10px" }}>
                        {item.product.sku}{item.product.category?.name ? ` · ${item.product.category.name}` : ""}
                      </div>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      {Number(item.quantity).toLocaleString("en-IN", { maximumFractionDigits: 3 })}
                      {item.product.unit?.name && <span style={{ color: "#aaa", fontSize: "10px" }}> {item.product.unit.name}</span>}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(Number(item.unitPrice))}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(gross)}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: vatAmt > 0 ? "#1d4ed8" : "#ccc" }}>
                      {vatAmt > 0 ? fmt(vatAmt) : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", color: exciseAmt > 0 ? "#7c3aed" : "#ccc" }}>
                      {exciseAmt > 0 ? fmt(exciseAmt) : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600" }}>{fmt(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ── Total ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
            <div style={{ width: "260px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", color: "#555" }}>
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {vatTotal > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", color: "#1d4ed8" }}>
                  <span>VAT</span><span>{fmt(vatTotal)}</span>
                </div>
              )}
              {exciseTotal > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", color: "#7c3aed" }}>
                  <span>Excise Duty</span><span>{fmt(exciseTotal)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", backgroundColor: "#c0392b", color: "white", borderRadius: "6px", fontWeight: "700", fontSize: "13px", marginTop: "4px" }}>
                <span>Total Returned</span><span>{fmt(totalAmount)}</span>
              </div>
              <div style={{ color: "#888", fontSize: "10px", marginTop: "6px", textAlign: "right" }}>
                To be credited against invoice {ret.purchase.invoiceNo}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{ borderTop: "1px solid #eee", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
            <div style={{ color: "#aaa", fontSize: "10px" }}>
              Printed on {toNepaliDateString(new Date())} ({format(new Date(), "dd MMM yyyy, HH:mm")}) · {COMPANY.nameShort} ERP
            </div>
            <div style={{ display: "flex", gap: "32px" }}>
              <div style={{ borderTop: "1px solid #333", paddingTop: "4px", fontSize: "10px", color: "#555", width: "140px", textAlign: "center" }}>Returned By</div>
              <div style={{ borderTop: "1px solid #333", paddingTop: "4px", fontSize: "10px", color: "#555", width: "140px", textAlign: "center" }}>Received By (Supplier)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body { margin: 0; }
          #invoice { width: 100% !important; padding: 10mm 12mm !important; }
          button, .no-print { display: none !important; }
        }
        @media screen {
          body { background: #e5e7eb; }
        }
      `}</style>
    </>
  );
}
