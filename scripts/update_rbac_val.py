import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Updated:', path)

write_file('src/lib/rbac.ts', """import { TokenPayload } from './auth';
import { prisma } from './prisma';

export enum RoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  REGIONAL_ADMIN = 'REGIONAL_ADMIN',
  CITY_ADMIN = 'CITY_ADMIN',
  SPORTS_ADMIN = 'SPORTS_ADMIN',
  OFFICIAL = 'OFFICIAL',
  CAPTAIN = 'CAPTAIN',
  PLAYER = 'PLAYER',
  FAN = 'FAN',
}

export function hasRole(user: TokenPayload, role: RoleCode | string): boolean {
  return user.roles.some((r) => r.roleCode === role);
}

export function hasAnyRole(user: TokenPayload, roles: (RoleCode | string)[]): boolean {
  return user.roles.some((r) => roles.includes(r.roleCode));
}

export function isSuperAdmin(user: TokenPayload): boolean {
  return hasRole(user, RoleCode.SUPER_ADMIN);
}

export function isRegionalAdmin(user: TokenPayload, regionId?: string): boolean {
  if (isSuperAdmin(user)) return true;
  if (regionId) {
    return user.roles.some((r) => r.roleCode === RoleCode.REGIONAL_ADMIN && (!r.regionId || r.regionId === regionId));
  }
  return hasRole(user, RoleCode.REGIONAL_ADMIN);
}

export function isCityAdmin(user: TokenPayload, cityId?: string): boolean {
  if (isSuperAdmin(user)) return true;
  if (cityId) {
    return user.roles.some((r) => r.roleCode === RoleCode.CITY_ADMIN && r.cityId === cityId);
  }
  return hasRole(user, RoleCode.CITY_ADMIN);
}

export function isSportsAdmin(user: TokenPayload, sportId?: string): boolean {
  if (isSuperAdmin(user)) return true;
  if (sportId) {
    return user.roles.some((r) => r.roleCode === RoleCode.SPORTS_ADMIN && r.sportId === sportId);
  }
  return hasRole(user, RoleCode.SPORTS_ADMIN);
}

export function isOfficial(user: TokenPayload): boolean {
  return hasRole(user, RoleCode.OFFICIAL);
}

export function isCaptain(user: TokenPayload): boolean {
  return hasRole(user, RoleCode.CAPTAIN);
}

export function isPlayer(user: TokenPayload): boolean {
  return hasRole(user, RoleCode.PLAYER);
}

export async function canManageCity(user: TokenPayload, targetCityId: string): Promise<boolean> {
  if (isSuperAdmin(user)) return true;

  const cityAdminRole = user.roles.find((r) => r.roleCode === RoleCode.CITY_ADMIN);
  if (cityAdminRole && cityAdminRole.cityId === targetCityId) {
    return true;
  }

  const regionalAdminRole = user.roles.find((r) => r.roleCode === RoleCode.REGIONAL_ADMIN);
  if (regionalAdminRole && regionalAdminRole.regionId) {
    const city = await prisma.city.findUnique({
      where: { id: targetCityId },
      select: { regionId: true },
    });
    if (city && city.regionId === regionalAdminRole.regionId) {
      return true;
    }
  }

  return false;
}

export async function canManageSport(user: TokenPayload, targetSportId: string, targetCityId?: string): Promise<boolean> {
  if (isSuperAdmin(user)) return true;

  const sportsAdminRole = user.roles.find((r) => r.roleCode === RoleCode.SPORTS_ADMIN);
  if (sportsAdminRole && sportsAdminRole.sportId === targetSportId) {
    return true;
  }

  if (targetCityId) {
    return canManageCity(user, targetCityId);
  }

  return false;
}

export function canManageTeams(user: TokenPayload, cityId: string): boolean {
  return isSuperAdmin(user) || isCityAdmin(user, cityId);
}

export function canApproveTransfers(user: TokenPayload, cityId: string): boolean {
  return isSuperAdmin(user) || isCityAdmin(user, cityId);
}

export function isCaptainOfTeam(user: TokenPayload, captainId: string): boolean {
  return user.userId === captainId;
}

export function canEditUser(requestingUser: TokenPayload, targetUserId: string): boolean {
  if (requestingUser.userId === targetUserId) return true;
  if (isSuperAdmin(requestingUser)) return true;
  return false;
}

export function canScoreMatch(user: TokenPayload, matchCityId: string, matchOfficialId?: string): boolean {
  if (isSuperAdmin(user)) return true;
  if (user.roles.some((r) => r.roleCode === RoleCode.CITY_ADMIN && r.cityId === matchCityId)) return true;
  if (hasRole(user, RoleCode.OFFICIAL)) {
    if (!matchOfficialId || matchOfficialId === user.userId) return true;
  }
  return false;
}
""")

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

export const transferRequestSchema = z.object({
  sportId: z.string().min(1),
  newTeamId: z.string().min(1),
  notes: z.string().optional(),
});

export const createTransferSchema = transferRequestSchema;
""")
