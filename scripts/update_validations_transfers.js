const fs = require('fs');

let val = fs.readFileSync('src/lib/validations.ts', 'utf8');

const transferSchemas = `
export const transferRequestSchema = z.object({
  sportId: z.string().min(1, 'Sport selection is required'),
  newTeamId: z.string().min(1, 'Target team is required'),
  playerId: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const createTransferSchema = transferRequestSchema;

export const transferPaymentSchema = z.object({
  paymentMethod: z.enum(['EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CASH']),
  transactionReference: z.string().min(2, 'Transaction ID / Reference is required'),
  proofImageUrl: z.string().url().optional().or(z.literal('')),
  remarks: z.string().optional(),
});

export const transferActionSchema = z.object({
  action: z.enum(['RELEASE_APPROVE', 'RECEIVING_APPROVE', 'ADMIN_VERIFY', 'REJECT', 'CANCEL']),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
});
`;

val = val.replace(/export const transferRequestSchema[\s\S]*?export const createTransferSchema = transferRequestSchema;\n?/m, transferSchemas.trim() + '\n');

fs.writeFileSync('src/lib/validations.ts', val, 'utf8');
console.log('Updated validations.ts with transfer schemas');
