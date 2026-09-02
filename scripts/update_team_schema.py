import os

path = "prisma/schema.prisma"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Update Ground model
old_ground = """  city            City     @relation(fields: [cityId], references: [id], onDelete: Cascade)
  matches         Match[]

  @@index([cityId])
}"""

new_ground = """  city            City     @relation(fields: [cityId], references: [id], onDelete: Cascade)
  matches         Match[]
  teams           Team[]   @relation("TeamHomeGround")

  @@index([cityId])
}"""
content = content.replace(old_ground, new_ground)

# Update Team model
old_team = """model Team {
  id          String   @id @default(uuid())
  cityId      String
  sportId     String
  captainId   String
  name        String
  code        String
  logoUrl     String?
  status      String   @default("PENDING_PAYMENT") // DRAFT, PENDING_PAYMENT, PAYMENT_SUBMITTED, PENDING_APPROVAL, ACTIVE, SUSPENDED
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  city        City     @relation(fields: [cityId], references: [id], onDelete: Restrict)
  sport       Sport    @relation(fields: [sportId], references: [id], onDelete: Restrict)
  captain     User     @relation("TeamCaptain", fields: [captainId], references: [id], onDelete: Restrict)"""

new_team = """model Team {
  id                 String   @id @default(uuid())
  cityId             String
  sportId            String
  captainId          String
  name               String
  code               String
  logoUrl            String?
  description        String?
  homeGroundId       String?
  contactPhone       String?
  contactEmail       String?
  playerRequirements String?
  status             String   @default("DRAFT") // DRAFT, PENDING_PAYMENT, PAYMENT_SUBMITTED, PENDING_APPROVAL, ACTIVE, REJECTED, SUSPENDED
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  city        City     @relation(fields: [cityId], references: [id], onDelete: Restrict)
  sport       Sport    @relation(fields: [sportId], references: [id], onDelete: Restrict)
  captain     User     @relation("TeamCaptain", fields: [captainId], references: [id], onDelete: Restrict)
  homeGround  Ground?  @relation("TeamHomeGround", fields: [homeGroundId], references: [id], onDelete: SetNull)"""

content = content.replace(old_team, new_team)

# Update TeamInvitation model
old_inv = """model TeamInvitation {
  id        String   @id @default(uuid())
  teamId    String
  playerId  String
  invitedById String
  status    String   @default("PENDING") // PENDING, ACCEPTED, DECLINED, EXPIRED
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt"""

new_inv = """model TeamInvitation {
  id          String   @id @default(uuid())
  teamId      String
  playerId    String
  invitedById String
  role        String   @default("PLAYER")
  message     String?
  status      String   @default("PENDING") // PENDING, ACCEPTED, DECLINED, EXPIRED
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt"""

content = content.replace(old_inv, new_inv)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] Updated schema.prisma for Team Management")
