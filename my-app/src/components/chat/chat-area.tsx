'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore, useChatStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Smile,
  Loader2,
  Download,
  Trash2,
  Edit2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ChatArea() {
  const { user } = useAuthStore();
  const { selectedChat, messages, setMessages, addMessage, updateMessage, deleteMessage } = useChatStore();
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
      fetchChatInfo();
      subscribeToMessages();
    }
  }, [selectedChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChatInfo = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        chat_members (
          user_id,
          profiles:user_id (id, username, full_name, avatar_url)
        )
      `)
      .eq('id', selectedChat)
      .single();

    if (error) {
      console.error('Error fetching chat info:', error);
      return;
    }

    const otherMembers = data.chat_members?.filter(
      (m: any) => m.user_id !== user?.id
    );

    setChatInfo({
      ...data,
      displayName: data.is_group
        ? data.name
        : otherMembers?.[0]?.profiles?.full_name ||
          otherMembers?.[0]?.profiles?.username ||
          'Неизвестный',
      displayAvatar: data.is_group
        ? null
        : otherMembers?.[0]?.profiles?.avatar_url,
      isOnline: false, // TODO: Implement online status
    });
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (id, username, full_name, avatar_url)
      `)
      .eq('chat_id', selectedChat)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`chat-${selectedChat}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${selectedChat}`,
        },
        (payload) => {
          addMessage(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${selectedChat}`,
        },
        (payload) => {
          updateMessage(payload.new.id, payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          deleteMessage(payload.old.id);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);

    const { error } = await supabase.from('messages').insert({
      chat_id: selectedChat,
      sender_id: user.id,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
    });

    if (error) {
      toast.error('Ошибка отправки сообщения');
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }

    setIsLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsLoading(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      // Send message with file
      const { error: messageError } = await supabase.from('messages').insert({
        chat_id: selectedChat,
        sender_id: user.id,
        content: `Файл: ${file.name}`,
        file_url: publicUrl,
        file_type: file.type,
        created_at: new Date().toISOString(),
      });

      if (messageError) throw messageError;

      toast.success('Файл отправлен');
    } catch (error: any) {
      toast.error('Ошибка загрузки файла');
      console.error('Error uploading file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId);

    if (error) {
      toast.error('Ошибка удаления сообщения');
    } else {
      toast.success('Сообщение удалено');
    }
  };

  const groupMessagesByDate = (messages: any[]) => {
    const groups: { [key: string]: any[] } = {};
    messages.forEach((message) => {
      const date = format(new Date(message.created_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/50">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-muted-foreground mb-2">
            Выберите чат
          </h2>
          <p className="text-muted-foreground">
            Выберите чат слева или создайте новый
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={chatInfo?.displayAvatar} />
            <AvatarFallback>
              {chatInfo?.displayName?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{chatInfo?.displayName}</h2>
            <p className="text-sm text-muted-foreground">
              {chatInfo?.isOnline ? 'В сети' : 'Не в сети'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Информация о чате</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Покинуть чат
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-6">
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              <div className="flex justify-center mb-4">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {format(new Date(date), 'd MMMM yyyy', { locale: ru })}
                </span>
              </div>
              <div className="space-y-4">
                {dateMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_id === user?.id
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] group ${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      } rounded-lg px-4 py-2`}
                    >
                      {message.sender_id !== user?.id && (
                        <p className="text-xs font-medium mb-1">
                          {message.sender?.full_name ||
                            message.sender?.username}
                        </p>
                      )}
                      {message.is_deleted ? (
                        <p className="italic text-muted-foreground">
                          Сообщение удалено
                        </p>
                      ) : (
                        <>
                          {message.file_url && (
                            <div className="mb-2">
                              {message.file_type?.startsWith('image/') ? (
                                <img
                                  src={message.file_url}
                                  alt="Изображение"
                                  className="max-w-full rounded-lg cursor-pointer"
                                  onClick={() =>
                                    window.open(message.file_url, '_blank')
                                  }
                                />
                              ) : (
                                <a
                                  href={message.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-background/20 rounded"
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="text-sm underline">
                                    Скачать файл
                                  </span>
                                </a>
                              )}
                            </div>
                          )}
                          <p>{message.content}</p>
                        </>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span
                          className={`text-xs ${
                            message.sender_id === user?.id
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {format(new Date(message.created_at), 'HH:mm', {
                            locale: ru,
                          })}
                        </span>
                        {message.is_edited && (
                          <span className="text-xs opacity-70">изм.</span>
                        )}
                      </div>

                      {/* Message Actions */}
                      {!message.is_deleted && message.sender_id === user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 absolute -right-8 top-0"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteMessage(message.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            placeholder="Введите сообщение..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
          >
            <Smile className="h-5 w-5" />
          </Button>
          <Button type="submit" disabled={!newMessage.trim() || isLoading}>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
