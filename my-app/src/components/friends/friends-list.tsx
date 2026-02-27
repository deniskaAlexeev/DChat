'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Search,
  UserPlus,
  Check,
  X,
  Clock,
  UserMinus,
  Users,
  RefreshCw,
} from 'lucide-react';

interface FriendsListProps {
  open: boolean;
  onClose: () => void;
}

export function FriendsList({ open, onClose }: FriendsListProps) {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('friends');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    console.log('FriendsList effect triggered - open:', open, 'user:', user?.id, 'activeTab:', activeTab);
    if (open && user) {
      console.log('Loading friends data...');
      fetchFriends();
      fetchPendingRequests();
      fetchSentRequests();
      
      // Subscribe to friendship changes
      const subscription = supabase
        .channel('friendships-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships',
          },
          (payload) => {
            console.log('Friendship change detected:', payload);
            // Refresh all data when any friendship changes
            fetchFriends();
            fetchPendingRequests();
            fetchSentRequests();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [open, user, activeTab]);

  const fetchFriends = async () => {
    console.log('Fetching friends for user:', user?.id);
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error fetching friends:', error);
      return;
    }

    // Fetch profiles separately
    const friendIds = friendships?.map(f => f.friend_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const friendsWithProfiles = friendships?.map(f => ({
      ...f,
      friend: profilesMap.get(f.friend_id)
    })) || [];

    console.log('Friends fetched:', friendsWithProfiles.length);
    setFriends(friendsWithProfiles);
  };

  const fetchPendingRequests = async () => {
    console.log('Fetching pending requests for user:', user?.id);
    const { data: requests, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('friend_id', user?.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching pending requests:', error);
      return;
    }

    // Fetch sender profiles separately
    const userIds = requests?.map(r => r.user_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const requestsWithProfiles = requests?.map(r => ({
      ...r,
      user: profilesMap.get(r.user_id)
    })) || [];

    console.log('Pending requests fetched:', requestsWithProfiles.length);
    setPendingRequests(requestsWithProfiles);
  };

  const fetchSentRequests = async () => {
    console.log('Fetching sent requests for user:', user?.id);
    const { data: requests, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching sent requests:', error);
      return;
    }

    // Fetch recipient profiles separately
    const friendIds = requests?.map(r => r.friend_id) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const requestsWithProfiles = requests?.map(r => ({
      ...r,
      friend: profilesMap.get(r.friend_id)
    })) || [];

    console.log('Sent requests fetched:', requestsWithProfiles.length);
    setSentRequests(requestsWithProfiles);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${searchQuery}%`)
      .neq('id', user?.id)
      .limit(10);

    if (error) {
      toast.error('Ошибка поиска');
    } else {
      // Check friendship status for each user
      const resultsWithStatus = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: friendship } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(user_id.eq.${user?.id},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${user?.id})`)
            .single();

          return {
            ...profile,
            friendshipStatus: friendship?.status || null,
            friendshipId: friendship?.id || null,
          };
        })
      );

      setSearchResults(resultsWithStatus);
    }

    setIsSearching(false);
  };

  const sendFriendRequest = async (friendId: string) => {
    console.log('Sending friend request:', { from: user?.id, to: friendId });
    
    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', user?.id)
      .eq('friend_id', friendId)
      .maybeSingle();
    
    if (existing) {
      toast.error('Заявка уже отправлена');
      return;
    }
    
    const { error } = await supabase.from('friendships').insert({
      user_id: user?.id,
      friend_id: friendId,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error sending friend request:', error);
      toast.error('Ошибка отправки запроса: ' + error.message);
    } else {
      toast.success('Запрос на дружбу отправлен');
      searchUsers();
      fetchSentRequests();
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    console.log('Accepting friend request:', requestId);
    
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      console.error('Error accepting request:', error);
      toast.error('Ошибка принятия запроса: ' + error.message);
    } else {
      // Create reciprocal friendship
      const request = pendingRequests.find((r) => r.id === requestId);
      if (request) {
        console.log('Creating reciprocal friendship for:', request.user_id);
        const { error: reciprocalError } = await supabase.from('friendships').insert({
          user_id: user?.id,
          friend_id: request.user_id,
          status: 'accepted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        
        if (reciprocalError) {
          console.error('Error creating reciprocal friendship:', reciprocalError);
        }
      }

      toast.success('Запрос на дружбу принят');
      fetchFriends();
      fetchPendingRequests();
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId);

    if (error) {
      toast.error('Ошибка отклонения запроса');
    } else {
      toast.success('Запрос на дружбу отклонен');
      fetchPendingRequests();
    }
  };

  const removeFriend = async (friendId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${user?.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user?.id})`);

    if (error) {
      toast.error('Ошибка удаления друга');
    } else {
      toast.success('Друг удален');
      fetchFriends();
    }
  };

  const cancelRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId);

    if (error) {
      toast.error('Ошибка отмены запроса');
    } else {
      toast.success('Запрос отменен');
      fetchSentRequests();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Друзья</DialogTitle>
          <DialogDescription>
            Управляйте своими друзьями и запросами
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              fetchFriends();
              fetchPendingRequests();
              fetchSentRequests();
              toast.success('Данные обновлены');
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Обновить
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="friends">
              <Users className="mr-2 h-4 w-4" />
              Друзья ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="mr-2 h-4 w-4" />
              Поиск
            </TabsTrigger>
            <TabsTrigger value="pending">
              <Clock className="mr-2 h-4 w-4" />
              Входящие ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              <UserPlus className="mr-2 h-4 w-4" />
              Исходящие ({sentRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="flex-1">
            <ScrollArea className="h-[400px]">
              {friends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>У вас пока нет друзей</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friendship) => (
                    <div
                      key={friendship.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={friendship.friend?.avatar_url} />
                          <AvatarFallback>
                            {friendship.friend?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {friendship.friend?.full_name ||
                              friendship.friend?.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{friendship.friend?.username}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFriend(friendship.friend_id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="flex-1">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Поиск по username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              />
              <Button onClick={searchUsers} disabled={isSearching}>
                {isSearching ? 'Поиск...' : 'Найти'}
              </Button>
            </div>
            <ScrollArea className="h-[350px]">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Введите username для поиска</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.full_name || user.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      {user.friendshipStatus === 'accepted' ? (
                        <Button variant="ghost" size="sm" disabled>
                          <Check className="mr-2 h-4 w-4" />
                          Друзья
                        </Button>
                      ) : user.friendshipStatus === 'pending' ? (
                        <Button variant="ghost" size="sm" disabled>
                          <Clock className="mr-2 h-4 w-4" />
                          Ожидание
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => sendFriendRequest(user.id)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Добавить
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pending" className="flex-1">
            <ScrollArea className="h-[400px]">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Нет входящих запросов</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={request.user?.avatar_url} />
                          <AvatarFallback>
                            {request.user?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {request.user?.full_name || request.user?.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{request.user?.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => acceptFriendRequest(request.id)}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Принять
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => rejectFriendRequest(request.id)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Отклонить
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sent" className="flex-1">
            <ScrollArea className="h-[400px]">
              {sentRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Нет исходящих запросов</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={request.friend?.avatar_url} />
                          <AvatarFallback>
                            {request.friend?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {request.friend?.full_name ||
                              request.friend?.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            @{request.friend?.username}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelRequest(request.id)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Отменить
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
