type UserStatus = "ACTIVE" | "SUSPENDED";
type UserRole = "USER" | "ADMIN";

export function canUseApp(user: { status: UserStatus }): boolean {
  return user.status === "ACTIVE";
}

export function canManageUser(user: { role: UserRole; status: UserStatus }): boolean {
  return user.role === "ADMIN" && user.status === "ACTIVE";
}