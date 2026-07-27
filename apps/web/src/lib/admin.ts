import {
  deleteUser as dbDeleteUser,
  getStats,
  listUsers,
  type UserStats,
  updateUser,
} from "@/server/db/users";
import { type AdminUser, toAdminUser } from "@/server/serialize";

export type Plan = "free" | "pro";
export type { AdminUser, UserStats };

export interface UsersPage {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchStats(): Promise<UserStats> {
  return getStats();
}

export interface FetchUsersParams {
  search?: string;
  plan?: Plan;
  limit?: number;
  offset?: number;
}

export async function fetchUsers(params: FetchUsersParams = {}): Promise<UsersPage> {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  const { users, total } = await listUsers({
    limit,
    offset,
    search: params.search,
    plan: params.plan,
  });
  return { users: users.map(toAdminUser), total, limit, offset };
}

export async function patchUser(
  id: string,
  body: { email?: string | null; plan?: Plan; paidUntil?: string | null },
): Promise<void> {
  await updateUser(id, {
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(body.plan !== undefined ? { plan: body.plan } : {}),
    ...(body.paidUntil !== undefined
      ? { paidUntil: body.paidUntil ? new Date(body.paidUntil) : null }
      : {}),
  });
}

export async function deleteUserById(id: string): Promise<void> {
  await dbDeleteUser(id);
}
