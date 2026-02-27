-- Fix all RLS Policies
-- Execute this in Supabase SQL Editor to ensure all policies are created

-- ============================================
-- PROFILES TABLE
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Everyone can view profiles
CREATE POLICY "profiles_select_all" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated, anon
  USING (true);

-- Users can only insert their own profile
CREATE POLICY "profiles_insert_own" 
  ON public.profiles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id);

-- ============================================
-- FRIENDSHIPS TABLE
-- ============================================
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select" ON public.friendships;
DROP POLICY IF EXISTS "friendships_insert" ON public.friendships;
DROP POLICY IF EXISTS "friendships_update" ON public.friendships;
DROP POLICY IF EXISTS "friendships_delete" ON public.friendships;

-- Users can view their own friendships
CREATE POLICY "friendships_select" 
  ON public.friendships 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friendships (as sender)
CREATE POLICY "friendships_insert" 
  ON public.friendships 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update friendships (both sender and receiver)
CREATE POLICY "friendships_update" 
  ON public.friendships 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete their friendships
CREATE POLICY "friendships_delete" 
  ON public.friendships 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================
-- CHATS TABLE
-- ============================================
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chats_select_members" ON public.chats;
DROP POLICY IF EXISTS "chats_insert_creator" ON public.chats;
DROP POLICY IF EXISTS "chats_update_creator" ON public.chats;

-- Users can view chats they are members of
CREATE POLICY "chats_select_members" 
  ON public.chats 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_id = id AND user_id = auth.uid()
    )
  );

-- Users can create chats
CREATE POLICY "chats_insert_creator" 
  ON public.chats 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Chat creators can update chats
CREATE POLICY "chats_update_creator" 
  ON public.chats 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = created_by);

-- ============================================
-- CHAT_MEMBERS TABLE
-- ============================================
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_members_select" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_insert" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete" ON public.chat_members;

-- Users can view members of their chats
CREATE POLICY "chat_members_select" 
  ON public.chat_members 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members AS cm
      WHERE cm.chat_id = chat_id AND cm.user_id = auth.uid()
    )
  );

-- Chat creators can add members
CREATE POLICY "chat_members_insert" 
  ON public.chat_members 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = chat_id AND created_by = auth.uid()
    )
  );

-- Users can leave chats (delete themselves)
CREATE POLICY "chat_members_delete" 
  ON public.chat_members 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
DROP POLICY IF EXISTS "messages_delete" ON public.messages;

-- Users can view messages in their chats
CREATE POLICY "messages_select" 
  ON public.messages 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );

-- Users can send messages to their chats
CREATE POLICY "messages_insert" 
  ON public.messages 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_members
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );

-- Users can update their own messages
CREATE POLICY "messages_update" 
  ON public.messages 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = sender_id);

-- Users can delete their own messages
CREATE POLICY "messages_delete" 
  ON public.messages 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = sender_id);

-- ============================================
-- VERIFY ALL POLICIES
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd,
  qual::text,
  with_check::text
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
