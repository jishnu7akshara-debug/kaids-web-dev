import { z } from 'zod';

export const allowedServices = [
  'Application Assistance',
  'Land Allotment Documentation',
  'Dispute Solutions & Ownership Transfer',
  'KIADB Dispute Solutions and Arbitration',
  'Transfer of Ownership',
  'Building Plan Sanction and Approvals',
  'NOC and Approvals (PCB and Fire)',
  'Environmental Clearances & Compliance',
  'Environmental Clearances',
  'Statutory Compliance Documentation',
  'Warehouse & Industrial Shed Construction',
  'Boundary Compound Wall Construction',
  'Warehouse, Building and Boundary Compound Construction',
  'Building Demolition & Metal Scrap Purchase',
  'Building Demolition and Metal Scrap Purchase',
  'Sewage and Effluent Treatment Plant',
  'Fire Rescue Installation',
  'Solar Panel Installation',
  'Loan Sanction',
  'Legal Documentation',
  'Project Report Preparation',
  'Not sure yet'
] as const;

// Helper to normalise Indian and international phone numbers to E.164
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 13) return `+${digits}`;
  return `+91${digits.slice(-10)}`;
}

export const enquirySchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Enter your name.')
    .max(120, 'Name must be 120 characters or fewer.'),
  phone: z.string()
    .trim()
    .refine(val => {
      const d = val.replace(/\D/g, '');
      return d.length >= 10 && d.length <= 13;
    }, 'Enter a phone number with at least 10 digits.')
    .transform(normalisePhone),
  email: z.string()
    .trim()
    .email('Check the email address, or leave it empty.')
    .optional()
    .or(z.literal(''))
    .transform(val => val ? val.toLowerCase() : null),
  company: z.string()
    .trim()
    .max(160, 'Company name is too long.')
    .optional()
    .or(z.literal(''))
    .transform(val => val || null),
  service: z.string()
    .optional()
    .or(z.literal(''))
    .refine(val => !val || (allowedServices as readonly string[]).includes(val), 'Invalid service selected.')
    .transform(val => val || null),
  message: z.string()
    .trim()
    .max(2000, 'Details must be 2000 characters or fewer.')
    .optional()
    .or(z.literal(''))
    .transform(val => val || null),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Tick the box to let us use your details to reply.' })
  }),
  website: z.string().optional().default(''), // Honeypot field
  startedAt: z.number().optional(),           // Focus timestamp for timing bot check
  page: z.string().max(200).startsWith('/', 'Invalid page path.').default('/index.html'),
  turnstileToken: z.string().optional()
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
