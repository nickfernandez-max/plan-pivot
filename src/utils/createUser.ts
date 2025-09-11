import { supabase } from "@/integrations/supabase/client";

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name?: string;
  role?: 'editor' | 'admin';
}

export async function createUser({ email, password, full_name, role = 'editor' }: CreateUserRequest) {
  try {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email,
        password,
        full_name,
        role
      }
    });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error creating user:', error);
    return { data: null, error };
  }
}