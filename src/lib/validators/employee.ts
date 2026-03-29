import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;

export const employeeSchema = z.object({
  firstName:    z.string().min(1, "First name is required"),
  lastName:     z.string().min(1, "Last name is required"),
  email:        z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  phone:        z.string().min(1, "Phone is required"),
  citizenshipId: z.string().optional(),
  address:      z.string().optional(),
  departmentId: z.string().min(1, "Select a department"),
  position:     z.string().min(1, "Position is required"),
  basicSalary:  z.number().min(0, "Salary must be ≥ 0"),
  startDate:    z.string().min(1, "Start date is required"),
  endDate:      z.string().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const payrollRunSchema = z.object({
  month: z.number().int().min(1).max(12),
  year:  z.number().int().min(2020).max(2100),
  notes: z.string().optional(),
});

export type PayrollRunFormValues = z.infer<typeof payrollRunSchema>;

export const payrollItemSchema = z.object({
  deductions: z.number().min(0),
  notes:      z.string().optional(),
});

export type PayrollItemFormValues = z.infer<typeof payrollItemSchema>;
