import { supabase } from "./db.ts";
import { AppError } from "./errors.ts";

export const ADMIN_EMAIL = "basmetten@gmail.com";

export async function requireAdminUser(authHeader: string | null): Promise<{ id: string; email: string }> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const email = data.user.email || "";
  if (email !== ADMIN_EMAIL) {
    throw new AppError("Forbidden", "FORBIDDEN", 403);
  }

  return { id: data.user.id, email };
}
