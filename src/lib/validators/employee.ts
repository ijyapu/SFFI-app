import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;

export const employeeSchema = z.object({
  firstName:     z.string().min(1, "First name is required").max(100),
  lastName:      z.string().min(1, "Last name is required").max(100),
  email:         z.union([z.string().email("Invalid email").max(254), z.literal("")]).optional(),
  phone:         z.string().min(1, "Phone is required").max(20),
  citizenshipId: z.string().max(50).optional(),
  address:       z.string().max(500).optional(),
  departmentId:  z.string().min(1, "Select a department"),
  position:      z.string().min(1, "Position is required").max(100),
  basicSalary:   z.number().min(0, "Salary must be ≥ 0").max(1_000_000),
  startDate:     z.string().min(1, "Start date is required"),
  endDate:       z.string().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const payrollRunSchema = z.object({
  month: z.number().int().min(1).max(12),
  year:  z.number().int().min(2020).max(2100),
  notes: z.string().max(1000).optional(),
});

export type PayrollRunFormValues = z.infer<typeof payrollRunSchema>;

export const payrollItemSchema = z.object({
  deductions: z.number().min(0).max(1_000_000),
  notes:      z.string().max(1000).optional(),
});

export type PayrollItemFormValues = z.infer<typeof payrollItemSchema>;
