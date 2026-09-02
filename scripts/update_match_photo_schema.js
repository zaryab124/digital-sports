const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
schema = schema.replace(
  `status        String    @default("PENDING_MODERATION") // PENDING_MODERATION, APPROVED, REJECTED`,
  `status        String    @default("PENDING_MODERATION") // PENDING_MODERATION, APPROVED, REJECTED, REPORTED
  isReported    Boolean   @default(false)
  reportReason  String?`
);

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('[OK] Updated MatchPhoto in prisma/schema.prisma');
