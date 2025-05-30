
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getCurrentUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("ANON_KEY");
    
    if (!supabaseUrl || !anonKey) {
      console.error("Missing Supabase configuration for auth");
      return null;
    }

    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { authorization: authHeader }
      }
    });
    
    const { data: userData } = await userSupabase.auth.getUser();
    if (userData.user) {
      console.log("Current user ID:", userData.user.id);
      return userData.user.id;
    }
  } catch (error) {
    console.error("Error getting current user:", error);
  }

  return null;
}
