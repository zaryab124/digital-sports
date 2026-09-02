import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    print('[OK] Updated rbac canScoreMatch:', path)

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

export function isRegionalAdmin(user: TokenPayload, regionId?: string | null): boolean {
  if (isSuperAdmin(user)) return true;
  if (regionId) {
    return user.roles.some((r) => r.roleCode === RoleCode.REGIONAL_ADMIN && (!r.regionId || r.regionId === regionId));
  }
  return hasRole(user, RoleCode.REGIONAL_ADMIN);
}

export function isCityAdmin(user: TokenPayload, cityId?: string | null): boolean {
  if (isSuperAdmin(user)) return true;
  if (cityId) {
    return user.roles.some((r) => r.roleCode === RoleCode.CITY_ADMIN && r.cityId === cityId);
  }
  return hasRole(user, RoleCode.CITY_ADMIN);
}

export function isSportsAdmin(user: TokenPayload, sportId?: string | null): boolean {
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

export async function canManageSport(user: TokenPayload, targetSportId: string, targetCityId?: string | null): Promise<boolean> {
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

export function canManageTeams(user: TokenPayload, cityId: string | null): boolean {
  if (isSuperAdmin(user)) return true;
  if (cityId) return isCityAdmin(user, cityId);
  return false;
}

export function canApproveTransfers(user: TokenPayload, cityId: string | null): boolean {
  if (isSuperAdmin(user)) return true;
  if (cityId) return isCityAdmin(user, cityId);
  return false;
}

export function canVerifyPayments(user: TokenPayload, cityId?: string | null): boolean {
  if (isSuperAdmin(user) || isRegionalAdmin(user)) return true;
  if (cityId) return isCityAdmin(user, cityId);
  return hasAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.CITY_ADMIN]);
}

export function canModeratePhoto(user: TokenPayload, cityId?: string | null): boolean {
  if (isSuperAdmin(user) || isRegionalAdmin(user)) return true;
  if (cityId) return isCityAdmin(user, cityId);
  return hasAnyRole(user, [RoleCode.SUPER_ADMIN, RoleCode.CITY_ADMIN]);
}

export function canVerifyMatchResult(user: TokenPayload, cityId: string | null): boolean {
  if (isSuperAdmin(user)) return true;
  if (cityId) return isCityAdmin(user, cityId);
  return false;
}

export function isCaptainOfTeam(user: TokenPayload, captainId: string): boolean {
  return user.userId === captainId;
}

export function canEditUser(requestingUser: TokenPayload, targetUserId: string): boolean {
  if (requestingUser.userId === targetUserId) return true;
  if (isSuperAdmin(requestingUser)) return true;
  return false;
}

export function canScoreMatch(
  user: TokenPayload,
  matchCityOrIsOfficial: string | boolean,
  matchCityIdOrOfficialId?: string | null
): boolean {
  if (isSuperAdmin(user)) return true;

  if (typeof matchCityOrIsOfficial === 'boolean') {
    if (matchCityOrIsOfficial) return true;
    if (matchCityIdOrOfficialId && isCityAdmin(user, matchCityIdOrOfficialId)) return true;
    return false;
  }

  const matchCityId = matchCityOrIsOfficial;
  const matchOfficialId = matchCityIdOrOfficialId;
  if (isCityAdmin(user, matchCityId)) return true;
  if (hasRole(user, RoleCode.OFFICIAL)) {
    if (!matchOfficialId || matchOfficialId === user.userId) return true;
  }
  return false;
}
""")
