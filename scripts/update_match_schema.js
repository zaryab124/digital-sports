const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Update User relations
if (!schema.includes('matchesAdminApproved')) {
  schema = schema.replace(
    '  matchesLocked    Match[]            @relation("MatchLocker")',
    '  matchesLocked    Match[]            @relation("MatchLocker")\n  matchesAdminApproved Match[]       @relation("MatchAdminApprover")'
  );
}

// Update Match model
const newMatchModel = `model Match {
  id                      String    @id @default(uuid())
  cityId                  String
  sportId                 String
  homeTeamId              String
  awayTeamId              String
  groundId                String?
  requestedById           String
  scheduledAt             DateTime
  homeScore               Int       @default(0)
  awayScore               Int       @default(0)
  winnerTeamId            String?
  status                  String    @default("REQUESTED") // DRAFT, REQUESTED, OPPONENT_REVIEW, ACCEPTED, NEGOTIATION, PENDING_ADMIN_APPROVAL, APPROVED, SCHEDULED, LIVE, COMPLETED, RESULT_PENDING_VERIFICATION, OFFICIAL, LOCKED, CANCELLED
  rules                   String?
  format                  String?   // e.g. T20, 50-OVERS, 90-MINS, 7-A-SIDE, BEST_OF_5, BEST_OF_7
  notes                   String?
  negotiationNotes        String?
  homeCaptainApproved     Boolean   @default(false)
  homeCaptainApprovedAt   DateTime?
  awayCaptainApproved     Boolean   @default(false)
  awayCaptainApprovedAt   DateTime?
  adminApproved           Boolean   @default(false)
  adminApprovedAt         DateTime?
  adminApprovedById       String?
  isLocked                Boolean   @default(false)
  lockedAt                DateTime?
  lockedById              String?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  city                    City      @relation(fields: [cityId], references: [id], onDelete: Restrict)
  sport                   Sport     @relation(fields: [sportId], references: [id], onDelete: Restrict)
  homeTeam                Team      @relation("HomeTeam", fields: [homeTeamId], references: [id], onDelete: Restrict)
  awayTeam                Team      @relation("AwayTeam", fields: [awayTeamId], references: [id], onDelete: Restrict)
  ground                  Ground?   @relation(fields: [groundId], references: [id], onDelete: SetNull)
  requestedBy             User      @relation("MatchRequester", fields: [requestedById], references: [id], onDelete: Restrict)
  winnerTeam              Team?     @relation("MatchWinner", fields: [winnerTeamId], references: [id], onDelete: SetNull)
  adminApprovedBy         User?     @relation("MatchAdminApprover", fields: [adminApprovedById], references: [id], onDelete: SetNull)
  lockedBy                User?     @relation("MatchLocker", fields: [lockedById], references: [id], onDelete: SetNull)

  participants            MatchParticipant[]
  officials               MatchOfficial[]
  scorebook               Scorebook?
  scoreEvents             ScoreEvent[]
  teamStats               TeamMatchStatistic[]
  playerStats             PlayerMatchStatistic[]
  photos                  MatchPhoto[]

  @@index([cityId])
  @@index([sportId])
  @@index([status])
  @@index([scheduledAt])
}`;

schema = schema.replace(/model Match \{[\s\S]*?\n\}/m, newMatchModel);

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('[OK] Updated Match schema with comprehensive scheduling fields');
