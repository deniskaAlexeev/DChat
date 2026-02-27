import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: any | null) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setProfile: (profile) => set({ profile }),
      
      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, isAuthenticated: false });
      },
      
      initialize: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          set({ user: session.user, isAuthenticated: true });
          
          // Fetch user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            set({ profile });
          }
        }
        
        set({ isLoading: false });
        
        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            set({ user: session.user, isAuthenticated: true });
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (profile) {
              set({ profile });
            }
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, profile: null, isAuthenticated: false });
          }
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

interface ChatState {
  selectedChat: string | null;
  chats: any[];
  messages: any[];
  setSelectedChat: (chatId: string | null) => void;
  setChats: (chats: any[]) => void;
  addChat: (chat: any) => void;
  setMessages: (messages: any[]) => void;
  addMessage: (message: any) => void;
  updateMessage: (messageId: string, updates: any) => void;
  deleteMessage: (messageId: string) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  selectedChat: null,
  chats: [],
  messages: [],
  
  setSelectedChat: (chatId) => set({ selectedChat: chatId, messages: [] }),
  setChats: (chats) => set({ chats }),
  addChat: (chat) => set((state) => ({ chats: [chat, ...state.chats] })),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  updateMessage: (messageId, updates) => set((state) => ({
    messages: state.messages.map((m) => 
      m.id === messageId ? { ...m, ...updates } : m
    ),
  })),
  deleteMessage: (messageId) => set((state) => ({
    messages: state.messages.filter((m) => m.id !== messageId),
  })),
}));

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  theme: 'system',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));
