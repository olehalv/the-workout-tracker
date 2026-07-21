"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteUserById, type Plan, patchUser } from "@/lib/admin";
import {
  clearAdminCookie,
  isAdminAuthed,
  setAdminCookie,
  verifyAdminPassword,
} from "@/server/auth/adminAuth";

/** Guards the mutating actions below so they can't run without an admin session. */
async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthed())) {
    redirect("/admin/login");
  }
}

export async function adminLogin(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    redirect("/admin/login?error=1");
  }
  await setAdminCookie();
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await clearAdminCookie();
  redirect("/admin/login");
}

export async function setUserPlan(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const plan = String(formData.get("plan")) as Plan;
  await patchUser(id, { plan });
  revalidatePath("/admin");
}

export async function removeUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await deleteUserById(id);
  revalidatePath("/admin");
}
