import os

def update_schema():
    path = "prisma/schema.prisma"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace City model
    old_city = """model City {
  id         String   @id @default(uuid())
  regionId   String
  name       String
  code       String   @unique
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt"""

    new_city = """model City {
  id          String   @id @default(uuid())
  regionId    String
  name        String
  slug        String   @unique
  code        String   @unique
  description String?
  imageUrl    String?
  status      String   @default("ACTIVE") // ACTIVE, INACTIVE, PENDING
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt"""

    content = content.replace(old_city, new_city)

    # Replace Sport model
    old_sport = """model Sport {
  id                String   @id @default(uuid())
  categoryId        String
  name              String   @unique
  code              String   @unique // FOOTBALL, CRICKET, VOLLEYBALL, BADMINTON, TABLE_TENNIS, SNOOKER
  isTeamSport       Boolean
  playersPerTeam    Int      @default(11)
  minPlayersRequired Int     @default(7)
  rulesJson         String?  // Scoring format, max sets/overs, point thresholds
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt"""

    new_sport = """model Sport {
  id                 String   @id @default(uuid())
  categoryId         String
  name               String   @unique
  slug               String   @unique
  code               String   @unique // FOOTBALL, CRICKET, VOLLEYBALL, BADMINTON, TABLE_TENNIS, SNOOKER
  icon               String?  // Emoji or Lucide icon key
  registrationType   String   @default("TEAM") // TEAM, INDIVIDUAL, DUAL
  registrationFee    Float    @default(1000.0)
  description        String?
  isTeamSport        Boolean
  playersPerTeam     Int      @default(11)
  minPlayersRequired Int      @default(7)
  rulesJson          String?  // Scoring format, max sets/overs, point thresholds
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt"""

    content = content.replace(old_sport, new_sport)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("[OK] Updated prisma/schema.prisma")

update_schema()
