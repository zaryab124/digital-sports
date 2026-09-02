const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
schema = schema.replace(
  `model Notification {
  id        String   @id @default(uuid())
  userId    String
  title     String
  message   String
  type      String   @default("INFO") // INFO, SUCCESS, WARNING, ACTION_REQUIRED
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}`,
  `model Notification {
  id               String   @id @default(uuid())
  userId           String
  title            String
  message          String
  type             String   @default("INFO") // INFO, SUCCESS, WARNING, ACTION_REQUIRED
  notificationType String   @default("INFO") // TEAM_APPROVED, TEAM_REJECTED, MATCH_REQUEST, MATCH_ACCEPTED, MATCH_REJECTED, MATCH_APPROVED, MATCH_CANCELLED, TRANSFER_REQUEST, TRANSFER_APPROVED, TRANSFER_REJECTED, PAYMENT_SUBMITTED, PAYMENT_VERIFIED, MATCH_RESULT_VERIFIED, RANKING_UPDATED
  linkUrl          String?
  metadataJson     String?
  isRead           Boolean  @default(false)
  createdAt        DateTime @default(now())

  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([notificationType])
}`
);

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('[OK] Updated Notification model in prisma/schema.prisma');
