-- Enable Realtime for friendships table
-- This allows real-time updates for friend requests

-- Enable replication for the friendships table
ALTER TABLE public.friendships REPLICA IDENTITY FULL;

-- Check if the table is already in the publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'friendships'
  ) THEN
    -- Add table to realtime publication
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships';
  END IF;
END
$$;

-- Verify the table is in realtime
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
