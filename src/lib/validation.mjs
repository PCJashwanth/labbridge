import { z } from "zod";

// One analyte (a single measured value) inside a lab panel.
export const analyteSchema = z.object({
  code: z.string().min(1),   // LOINC-style code, e.g. "718-7"
  name: z.string().min(1),   // human name, e.g. "Hemoglobin"
  value: z.number(),
  unit: z.string().min(1),   // e.g. "g/dL"
  refLow: z.number().nullable().optional(),
  refHigh: z.number().nullable().optional(),
});

// A full lab result submitted by a lab for one patient.
export const resultSchema = z.object({
  patientId: z.string().min(1),
  patientEmail: z.string().email(),
  providerId: z.string().min(1),
  testType: z.string().min(1),        // e.g. "CBC"
  collectedAt: z.string().datetime(), // ISO-8601
  analytes: z.array(analyteSchema).min(1),
});

export function validateResult(body) {
  return resultSchema.safeParse(body);
}
