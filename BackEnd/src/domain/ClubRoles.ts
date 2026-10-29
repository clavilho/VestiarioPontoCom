export const ClubRoles = {
  all: ["owner", "admin", "coach", "finance", "viewer"],
  administrators: ["owner", "admin"],
  finance: ["owner", "admin", "finance"],
  sports: ["owner", "admin", "coach"],
} as const;

export function includesRole(role: string | undefined, accepted: readonly string[]) {
  return role !== undefined && accepted.includes(role);
}
