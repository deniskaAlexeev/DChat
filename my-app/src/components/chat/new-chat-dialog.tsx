'use client';

import { useState, useEffect } from 'react';
import { useAuthStore, useChatStore } from '@/store';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  UserPlus,
  Users,
  MessageCircle,
  Check,
} from 'lucide-react';

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewChatDialog({ open, onClose }: NewChatDialogProps) {
  const { user } = useAuthStore();
  const { setSelectedChat, addChat } = useChatStore();
  const [activeTab, setActiveTab] = useState('private');
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchFriends();
    }
  }, [open, user]);

  const fetchFriends = async () => {
    console.log('NewChatDialog - Fetching friends for user:', user?.id);
    
    // Fetch friendships where user is either sender or receiver
    const { data: friendshipsWhereUserIsSender, error: error1 } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'accepted');

    const { data: friendshipsWhereUserIsReceiver, error: error2 } = await supabase
      .from('friendships')
      .select('*')
      .eq('friend_id', user?.id)
      .eq('status', 'accepted');

    if (error1 || error2) {
      console.error('Error fetching friends:', error1 || error2);
      return;
    }

    const allFriendships = [
      ...(friendshipsWhereUserIsSender || []),
      ...(friendshipsWhereUserIsReceiver || [])
    ];

    // Get friend IDs
    const friendIds = allFriendships.map(f => 
      f.user_id === user?.id ? f.friend_id : f.user_id
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const friendsWithProfiles = allFriendships.map(f => {
      const friendId = f.user_id === user?.id ? f.friend_id : f.user_id;
      return {
        ...f,
        friend: profilesMap.get(friendId),
        friend_id: friendId
      };
    });

    console.log('NewChatDialog - Friends fetched:', friendsWithProfiles.length);
    setFriends(friendsWithProfiles);
  };

  const handleCreatePrivateChat = async (friendId: string) => {
    setIsCreating(true);

    try {
      // Check if chat already exists
      const { data: existingChats } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user?.id);

      const chatIds = existingChats?.map((c) => c.chat_id) || [];

      if (chatIds.length > 0) {
        const { data: privateChats } = await supabase
          .from('chats')
          .select(`
            id,
            chat_members (user_id)
          `)
          .eq('is_group', false)
          .in('id', chatIds);

        const existingChat = privateChats?.find((chat) =>
          chat.chat_members.some((m: any) => m.user_id === friendId)
        );

        if (existingChat) {
          setSelectedChat(existingChat.id);
          onClose();
          setIsCreating(false);
          return;
        }
      }

      // Create new private chat
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert({
          is_group: false,
          created_by: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add members
      const { error: membersError } = await supabase.from('chat_members').insert([
        {
          chat_id: chatData.id,
          user_id: user?.id,
          joined_at: new Date().toISOString(),
        },
        {
          chat_id: chatData.id,
          user_id: friendId,
          joined_at: new Date().toISOString(),
        },
      ]);

      if (membersError) throw membersError;

      addChat(chatData);
      setSelectedChat(chatData.id);
      toast.success('Чат создан');
      onClose();
    } catch (error: any) {
      toast.error('Ошибка создания чата');
      console.error('Error creating chat:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateGroupChat = async () => {
    if (selectedUsers.length < 2) {
      toast.error('Выберите минимум 2 участника');
      return;
    }

    if (!groupName.trim()) {
      toast.error('Введите название группы');
      return;
    }

    setIsCreating(true);

    try {
      // Create group chat
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: groupName.trim(),
          is_group: true,
          created_by: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add members
      const members = [
        {
          chat_id: chatData.id,
          user_id: user?.id,
          joined_at: new Date().toISOString(),
        },
        ...selectedUsers.map((userId) => ({
          chat_id: chatData.id,
          user_id: userId,
          joined_at: new Date().toISOString(),
        })),
      ];

      const { error: membersError } = await supabase
        .from('chat_members')
        .insert(members);

      if (membersError) throw membersError;

      addChat(chatData);
      setSelectedChat(chatData.id);
      toast.success('Групповой чат создан');
      onClose();
      setGroupName('');
      setSelectedUsers([]);
    } catch (error: any) {
      toast.error('Ошибка создания группы');
      console.error('Error creating group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredFriends = friends.filter((friendship) =>
    friendship.friend?.username
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
    friendship.friend?.full_name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Новый чат</DialogTitle>
          <DialogDescription>
            Создайте личный или групповой чат
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="private">
              <MessageCircle className="mr-2 h-4 w-4" />
              Личный
            </TabsTrigger>
            <TabsTrigger value="group">
              <Users className="mr-2 h-4 w-4" />
              Групповой
            </TabsTrigger>
          </TabsList>

          <TabsContent value="private" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск друзей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[300px]">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>У вас пока нет друзей</p>
                  <p className="text-sm">
                    Добавьте друзей, чтобы начать чат
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFriends.map((friendship) => (
                    <button
                      key={friendship.id}
                      onClick={() => handleCreatePrivateChat(friendship.friend_id)}
                      disabled={isCreating}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted text-left transition-colors"
                    >
                      <Avatar>
                        <AvatarImage src={friendship.friend?.avatar_url} />
                        <AvatarFallback>
                          {friendship.friend?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {friendship.friend?.full_name ||
                            friendship.friend?.username}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{friendship.friend?.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Название группы</Label>
              <Input
                id="group-name"
                placeholder="Введите название..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск друзей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              Выбрано: {selectedUsers.length} участников
            </div>

            <ScrollArea className="h-[200px]">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>У вас пока нет друзей</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFriends.map((friendship) => (
                    <div
                      key={friendship.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => toggleUserSelection(friendship.friend_id)}
                    >
                      <Checkbox
                        checked={selectedUsers.includes(friendship.friend_id)}
                        onCheckedChange={() =>
                          toggleUserSelection(friendship.friend_id)
                        }
                      />
                      <Avatar>
                        <AvatarImage src={friendship.friend?.avatar_url} />
                        <AvatarFallback>
                          {friendship.friend?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {friendship.friend?.full_name ||
                            friendship.friend?.username}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{friendship.friend?.username}
                        </p>
                      </div>
                      {selectedUsers.includes(friendship.friend_id) && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <DialogFooter>
              <Button
                onClick={handleCreateGroupChat}
                disabled={isCreating || selectedUsers.length < 2 || !groupName.trim()}
                className="w-full"
              >
                {isCreating ? 'Создание...' : 'Создать группу'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
