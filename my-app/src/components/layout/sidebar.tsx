'use client';

import { useState, useEffect } from 'react';
import { useAuthStore, useChatStore, useUIStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from 'sonner';
import {
  Search,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Plus,
  Menu,
  MoreVertical,
  Check,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FriendsList } from '@/components/friends/friends-list';
import { NewChatDialog } from '@/components/chat/new-chat-dialog';

export function Sidebar() {
  const { user, profile, signOut } = useAuthStore();
  const { chats, setChats, selectedChat, setSelectedChat } = useChatStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'friends'>('chats');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChats();
      subscribeToChats();
    }
  }, [user]);

  const fetchChats = async () => {
    const { data, error } = await supabase
      .from('chat_members')
      .select(`
        chat_id,
        chats:chat_id (
          id,
          name,
          is_group,
          created_at,
          updated_at,
          chat_members (
            user_id,
            profiles:user_id (id, username, full_name, avatar_url)
          ),
          messages (
            id,
            content,
            created_at,
            sender_id
          )
        )
      `)
      .eq('user_id', user?.id)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching chats:', error);
      return;
    }

    const formattedChats = data.map((item: any) => {
      const chat = item.chats;
      const lastMessage = chat.messages?.[0];
      const otherMembers = chat.chat_members?.filter(
        (m: any) => m.user_id !== user?.id
      );

      return {
        ...chat,
        lastMessage,
        otherMembers,
        displayName: chat.is_group
          ? chat.name
          : otherMembers?.[0]?.profiles?.full_name ||
            otherMembers?.[0]?.profiles?.username ||
            'Неизвестный',
        displayAvatar: chat.is_group
          ? null
          : otherMembers?.[0]?.profiles?.avatar_url,
      };
    });

    setChats(formattedChats);
  };

  const subscribeToChats = () => {
    const subscription = supabase
      .channel('chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const filteredChats = chats.filter((chat) =>
    chat.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    await signOut();
    toast.success('Вы вышли из системы');
  };

  return (
    <>
      <div
        className={`flex flex-col border-r bg-card transition-all duration-300 ${
          sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>
                {profile?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold truncate">{profile?.username}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowFriends(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  Друзья
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Настройки
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск чатов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-2">
          <Button
            variant={activeTab === 'chats' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setActiveTab('chats')}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Чаты
          </Button>
          <Button
            variant={activeTab === 'friends' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setShowFriends(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Друзья
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="px-4 py-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowNewChat(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Новый чат
          </Button>
        </div>

        <Separator />

        {/* Chat List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredChats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Нет чатов</p>
                <p className="text-sm">Начните новый разговор</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                    selectedChat === chat.id
                      ? 'bg-primary/10'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={chat.displayAvatar} />
                    <AvatarFallback>
                      {chat.displayName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">{chat.displayName}</h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(chat.lastMessage.created_at),
                            { addSuffix: false, locale: ru }
                          )}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage
                        ? chat.lastMessage.content
                        : 'Нет сообщений'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 z-50 h-9 w-9"
        onClick={toggleSidebar}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Dialogs */}
      <FriendsList open={showFriends} onClose={() => setShowFriends(false)} />
      <NewChatDialog open={showNewChat} onClose={() => setShowNewChat(false)} />
    </>
  );
}
