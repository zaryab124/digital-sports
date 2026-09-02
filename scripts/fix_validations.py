import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Updated validations:', path)

write_file('src/lib/validations.ts', """import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  cnic: z.string().optional(),
  homeCityId: z.string().min(1, 'Please select your official home city'),
  initialRole: z.enum(['PLAYER', 'CAPTAIN', 'OFFICIAL', 'FAN']),
  primarySportId: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  
  jerseyNumber: z.number().int().optional(),
  playingPosition: z.string().optional(),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
  officialType: z.enum(['REFEREE', 'UMPIRE', 'SCORER', 'LINE_JUDGE']).optional(),
  badgeNumber: z.string().optional(),
  experienceYears: z.number().int().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  cnic: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable().or(z.literal('')),
  homeCityId: z.string().optional(),
  
  playerProfile: z.object({
    primarySportId: z.string().optional().nullable(),
    secondarySports: z.array(z.string()).optional(),
    jerseyNumber: z.number().int().optional().nullable(),
    position: z.string().optional().nullable(),
    battingStyle: z.string().optional().nullable(),
    bowlingStyle: z.string().optional().nullable(),
    dominantFoot: z.string().optional().nullable(),
    heightCm: z.number().optional().nullable(),
    weightKg: z.number().optional().nullable(),
    bio: z.string().optional().nullable(),
  }).optional(),

  captainProfile: z.object({
    experienceYears: z.number().int().optional(),
    certification: z.string().optional().nullable(),
    bio: z.string().optional().nullable(),
  }).optional(),

  officialProfile: z.object({
    officialType: z.enum(['REFEREE', 'UMPIRE', 'SCORER', 'LINE_JUDGE']).optional(),
    badgeNumber: z.string().optional().nullable(),
    licenseLevel: z.string().optional(),
    experienceYears: z.number().int().optional(),
    bio: z.string().optional().nullable(),
  }).optional(),

  fanProfile: z.object({
    favoriteCityId: z.string().optional().nullable(),
    favoriteSportId: z.string().optional().nullable(),
    cheerBio: z.string().optional().nullable(),
  }).optional(),
});

export const assignRoleSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  roleCode: z.enum([
    'SUPER_ADMIN',
    'REGIONAL_ADMIN',
    'CITY_ADMIN',
    'SPORTS_ADMIN',
    'OFFICIAL',
    'CAPTAIN',
    'PLAYER',
    'FAN',
  ]),
  regionId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  sportId: z.string().optional().nullable(),
});

export const createTeamSchema = z.object({
  name: z.string().min(3, 'Team name must be at least 3 characters'),
  code: z.string().min(2, 'Team code must be at least 2 characters').max(6),
  sportId: z.string().min(1, 'Sport selection is required'),
  cityId: z.string().min(1, 'City selection is required'),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

export const createCitySchema = z.object({
  name: z.string().min(2, 'City name must be at least 2 characters'),
  code: z.string().min(2, 'City code must be at least 2 characters').max(5),
  regionId: z.string().min(1, 'Region selection is required'),
  isActive: z.boolean().optional().default(true),
});

export const updateCitySchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).max(5).optional(),
  isActive: z.boolean().optional(),
});

export const createSportSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  categoryId: z.string().min(1),
  isTeamSport: z.boolean().default(true),
  playersPerTeam: z.number().int().default(11),
  minPlayersRequired: z.number().int().default(7),
  isActive: z.boolean().optional().default(true),
});

export const createPostSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(5),
  postType: z.enum(['ANNOUNCEMENT', 'HIGHLIGHT', 'EVENT', 'POLL']).default('ANNOUNCEMENT'),
  isPinned: z.boolean().optional().default(false),
});

export const uploadPhotoSchema = z.object({
  matchId: z.string().min(1),
  teamId: z.string().min(1),
  sportId: z.string().min(1),
  photoUrl: z.string().url(),
  caption: z.string().optional(),
});

export const proposeMatchSchema = z.object({
  sportId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  groundId: z.string().optional(),
  scheduledAt: z.string(),
});

export const submitPaymentSchema = z.object({
  paymentId: z.string().min(1),
  paymentMethod: z.enum(['EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER', 'CASH']),
  transactionReference: z.string().min(2),
  proofImageUrl: z.string().url().optional(),
  remarks: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
});

export const scoreEventSchema = z.object({
  eventType: z.string().min(1),
  teamId: z.string().min(1),
  playerId: z.string().optional(),
  minuteOrBall: z.string().optional(),
  setOrInnings: z.number().int().optional(),
  detailsJson: z.string().optional(),
});

export const transferRequestSchema = z.object({
  sportId: z.string().min(1),
  newTeamId: z.string().min(1),
  notes: z.string().optional(),
});

export const createTransferSchema = transferRequestSchema;
""")
