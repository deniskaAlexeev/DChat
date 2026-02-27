export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
  friend?: Profile;
  user?: Profile;
}

export interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  displayName?: string;
  displayAvatar?: string | null;
  lastMessage?: Message | null;
  otherMembers?: ChatMember[];
  chat_members?: ChatMember[];
  messages?: Message[];
}

export interface ChatMember {
  id: string;
  chat_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
  profiles?: Profile;
  user?: Profile;
}

export interface Message {
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
  sender?: Profile;
}

export interface UserSearchResult extends Profile {
  friendshipStatus: string | null;
  friendshipId: string | null;
}
