import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  CreditCard,
  Receipt,
  Calculator,
  BarChart3,
  FileText,
  Settings,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { PermissionKey } from "@/lib/roles";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionKey; // undefined = visible to all authenticated users
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Commerce",
    items: [
      {
        title: "Inventory",
        href: "/inventory",
        icon: Package,
        permission: "inventory",
      },
      {
        title: "Purchases",
        href: "/purchases",
        icon: ShoppingCart,
        permission: "purchases",
      },
      {
        title: "Suppliers",
        href: "/purchases/suppliers",
        icon: Truck,
        permission: "purchases",
      },
      {
        title: "Sales",
        href: "/sales",
        icon: TrendingUp,
        permission: "sales",
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        title: "Employees",
        href: "/employees",
        icon: Users,
        permission: "employees",
      },
      {
        title: "Payroll",
        href: "/payroll",
        icon: CreditCard,
        permission: "payroll",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Expenses",
        href: "/expenses",
        icon: Receipt,
        permission: "expenses",
      },
      {
        title: "Costing",
        href: "/costing",
        icon: Calculator,
        permission: "costing",
      },
      {
        title: "Profit & Loss",
        href: "/profit-loss",
        icon: BarChart3,
        permission: "profitLoss",
      },
      {
        title: "Reports",
        href: "/reports",
        icon: FileText,
        permission: "reports",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        permission: "settings",
      },
    ],
  },
];
