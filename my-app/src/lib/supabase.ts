import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      friendships: {
        Row: {
          id: string;
          user_id: string;
          friend_id: string;
          status: 'pending' | 'accepted' | 'blocked';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          friend_id: string;
          status?: 'pending' | 'accepted' | 'blocked';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          friend_id?: string;
          status?: 'pending' | 'accepted' | 'blocked';
          created_at?: string;
          updated_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          name: string | null;
          is_group: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          is_group?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          is_group?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_members: {
        Row: {
          id: string;
          chat_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string | null;
        };
        Insert: {
          id?: string;
          chat_id: string;
          user_id: string;
          joined_at?: string;
          last_read_at?: string | null;
        };
        Update: {
          id?: string;
          chat_id?: string;
          user_id?: string;
          joined_at?: string;
          last_read_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          content: string;
          file_url: string | null;
          file_type: string | null;
          created_at: string;
          updated_at: string;
          is_edited: boolean;
          is_deleted: boolean;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          content: string;
          file_url?: string | null;
          file_type?: string | null;
          created_at?: string;
          updated_at?: string;
          is_edited?: boolean;
          is_deleted?: boolean;
        };
        Update: {
          id?: string;
          chat_id?: string;
          sender_id?: string;
          content?: string;
          file_url?: string | null;
          file_type?: string | null;
          created_at?: string;
          updated_at?: string;
          is_edited?: boolean;
          is_deleted?: boolean;
        };
      };
    };
  };
};
