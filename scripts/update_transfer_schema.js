const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Update User model relation
schema = schema.replace(
  '  transfersApproved PlayerTransfer[]  @relation("TransferApprover")',
  '  transfersApproved PlayerTransfer[]  @relation("TransferApprover")\n  transfersRequested PlayerTransfer[] @relation("TransferRequester")'
);

// Update PlayerTransfer model
const newPlayerTransfer = `model PlayerTransfer {
  id                      String    @id @default(uuid())
  playerId                String
  sportId                 String
  cityId                  String
  oldTeamId               String
  newTeamId               String
  requesterId             String?
  paymentId               String?   @unique
  status                  String    @default("REQUESTED") // REQUESTED, PENDING_PAYMENT, PAYMENT_SUBMITTED, PENDING_APPROVAL, APPROVED, REJECTED, CANCELLED, COMPLETED
  fee                     Float     @default(100.0)
  reason                  String?
  notes                   String?
  rejectionReason         String?
  releasingApproved       Boolean   @default(false)
  releasingApprovedAt     DateTime?
  receivingApproved       Boolean   @default(false)
  receivingApprovedAt     DateTime?
  paidAt                  DateTime?
  approvedById            String?
  approvedAt              DateTime?
  completedAt             DateTime?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  player                  User      @relation("PlayerTransfers", fields: [playerId], references: [id], onDelete: Restrict)
  requester               User?     @relation("TransferRequester", fields: [requesterId], references: [id], onDelete: SetNull)
  sport                   Sport     @relation(fields: [sportId], references: [id], onDelete: Restrict)
  city                    City      @relation(fields: [cityId], references: [id], onDelete: Restrict)
  oldTeam                 Team      @relation("TransferOldTeam", fields: [oldTeamId], references: [id], onDelete: Restrict)
  newTeam                 Team      @relation("TransferNewTeam", fields: [newTeamId], references: [id], onDelete: Restrict)
  payment                 Payment?  @relation(fields: [paymentId], references: [id], onDelete: SetNull)
  approvedBy              User?     @relation("TransferApprover", fields: [approvedById], references: [id], onDelete: SetNull)

  @@index([playerId])
  @@index([sportId])
  @@index([cityId])
  @@index([status])
}`;

schema = schema.replace(/model PlayerTransfer \{[\s\S]*?\n\}/m, newPlayerTransfer);

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('[OK] Updated PlayerTransfer schema');
