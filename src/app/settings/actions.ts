'use server'

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getActiveSessions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const adminAuth = createAdminClient().auth;
  
  // List sessions via RPC
  const { data, error } = await supabase.rpc('get_user_sessions', { p_user_id: user.id });

  if (error) {
    throw new Error(error.message);
  }

  // Get current session ID to identify "Current Device"
  const { data: { session } } = await supabase.auth.getSession();

  // Sort by created_at desc (newest first)
  const sortedSessions = (data || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    sessions: sortedSessions,
    currentSessionId: (session as any)?.id // Cast to any to bypass type error for now
  };
}

export async function revokeSession(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Use RPC to delete session
  const { error } = await supabase.rpc('delete_session', { p_session_id: sessionId });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function revokeAllSessions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Use RPC to delete all sessions
  const { error } = await supabase.rpc('delete_all_user_sessions', { p_user_id: user.id });
  
  if (error) {
      console.error("RPC Error in revokeAllSessions:", error);
      throw new Error(error.message);
  }

  revalidatePath('/settings');
  return { success: true };
}
