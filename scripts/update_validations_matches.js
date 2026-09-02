const fs = require('fs');

let val = fs.readFileSync('src/lib/validations.ts', 'utf8');

const matchSchemas = `
export const createMatchScheduleSchema = z.object({
  sportId: z.string().min(1, 'Sport selection is required'),
  cityId: z.string().optional(),
  homeTeamId: z.string().min(1, 'Home squad is required'),
  awayTeamId: z.string().min(1, 'Away squad is required'),
  groundId: z.string().optional().nullable(),
  scheduledAt: z.string().min(1, 'Proposed match date and time is required'),
  format: z.string().optional().nullable(),
  rules: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isDraft: z.boolean().optional().default(false),
});

export const proposeMatchSchema = createMatchScheduleSchema;

export const matchActionSchema = z.object({
  action: z.enum([
    'ACCEPT',
    'NEGOTIATE',
    'ADMIN_APPROVE',
    'ADMIN_REJECT',
    'START_LIVE',
    'COMPLETE_MATCH',
    'VERIFY_RESULT',
    'LOCK_MATCH',
    'CANCEL'
  ]),
  counterScheduledAt: z.string().optional(),
  counterGroundId: z.string().optional(),
  negotiationNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
});
`;

val = val.replace(/export const proposeMatchSchema[\s\S]*?scheduledAt: z\.string\(\),\n\}\);/m, matchSchemas.trim());

fs.writeFileSync('src/lib/validations.ts', val, 'utf8');
console.log('[OK] Updated validations.ts with match scheduling schemas');
