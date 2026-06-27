import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MessageSquare, Phone, Video, Clock, MoreVertical, Users, ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";

interface Conversation {
  id: string;
  updated_at: string;
  participant: { user_id: string; full_name: string; avatar_url: string | null; college?: string | null };
  lastMessage?: string;
  unread?: boolean;
  unreadCount?: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  read_at?: string | null;
}

type FilterTab = "all" | "unread" | "groups";

const MessagesPage = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchParams] = useSearchParams();
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingResetRef = useRef<number | null>(null);
  const chatChannelRef = useRef<any>(null);

  const fetchUnreadCounts = useCallback(async (convoList: Conversation[]) => {
    if (!user || convoList.length === 0) return convoList;

    const convoIds = convoList.map((c) => c.id);
    const { data: unreadData } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convoIds)
      .neq("sender_id", user.id)
      .is("read_at", null);

    const countMap: Record<string, number> = {};
    unreadData?.forEach((m) => {
      countMap[m.conversation_id] = (countMap[m.conversation_id] || 0) + 1;
    });

    return convoList.map((c) => ({
      ...c,
      unreadCount: countMap[c.id] || 0,
      unread: (countMap[c.id] || 0) > 0,
    }));
  }, [user]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    setLoadingConvos(true);
    const { data, error } = await supabase.rpc("get_user_conversations", { p_user_id: user.id });
    if (error || !data) {
      setLoadingConvos(false);
      return;
    }

    const convoList: Conversation[] = (data as any[]).map((row) => ({
      id: row.conversation_id,
      updated_at: row.conversation_updated_at,
      participant: {
        user_id: row.other_user_id,
        full_name: row.other_full_name || "Unknown",
        avatar_url: row.other_avatar_url,
        college: row.other_college,
      },
      lastMessage: row.last_message_content,
    }));

    const withUnread = await fetchUnreadCounts(convoList);
    setConversations(withUnread);
    setLoadingConvos(false);
  }, [fetchUnreadCounts, user]);

  const touchMyLastSeen = useCallback(async () => {
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ last_seen: new Date().toISOString() } as any)
      .eq("user_id", user.id);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user, fetchConversations]);

  useEffect(() => {
    const convoId = searchParams.get("convo");
    if (convoId) setSelectedConvo(convoId);
  }, [searchParams]);

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return;

    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);

    setConversations((prev) =>
      prev.map((c) => c.id === conversationId ? { ...c, unreadCount: 0, unread: false } : c)
    );
  };

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: user.id } },
    });

    const updatePresenceState = () => {
      const state = channel.presenceState();
      setOnlineUsers(new Set(Object.keys(state)));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        touchMyLastSeen();
        channel.track({ online_at: new Date().toISOString() });
      } else {
        touchMyLastSeen();
      }
    };

    channel
      .on("presence", { event: "sync" }, updatePresenceState)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
          await touchMyLastSeen();
        }
      });

    const interval = window.setInterval(() => {
      touchMyLastSeen();
    }, 60000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", touchMyLastSeen);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", touchMyLastSeen);
      supabase.removeChannel(channel);
    };
  }, [touchMyLastSeen, user]);

  useEffect(() => {
    if (!user) return;

    const listChannel = supabase
      .channel(`conversation-list:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(listChannel);
    };
  }, [fetchConversations, user]);

  const selectedParticipant = conversations.find((c) => c.id === selectedConvo)?.participant;
  const isParticipantOnline = selectedParticipant ? onlineUsers.has(selectedParticipant.user_id) : false;

  useEffect(() => {
    if (!selectedParticipant) {
      setOtherUserLastSeen(null);
      return;
    }

    const fetchLastSeen = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("last_seen")
        .eq("user_id", selectedParticipant.user_id)
        .maybeSingle();

      setOtherUserLastSeen((data as { last_seen?: string | null } | null)?.last_seen ?? null);
    };

    fetchLastSeen();

    const profileChannel = supabase
      .channel(`profile-last-seen:${selectedParticipant.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${selectedParticipant.user_id}`,
        },
        (payload) => {
          const next = payload.new as { last_seen?: string | null };
          setOtherUserLastSeen(next.last_seen ?? null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [selectedParticipant]);

  useEffect(() => {
    if (!selectedConvo || !user) return;

    setIsOtherTyping(false);

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConvo)
        .order("created_at", { ascending: true });

      setMessages(data || []);
      markMessagesAsRead(selectedConvo);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat:${selectedConvo}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConvo}` },
        (payload) => {
          const newMsg = payload.new as Message;

          setMessages((prev) => {
            if (newMsg.sender_id === user.id) {
              const tempIndex = prev.findIndex(
                (m) => m.id.startsWith("temp-") && m.sender_id === user.id && m.content === newMsg.content
              );

              if (tempIndex !== -1) {
                const tempId = prev[tempIndex].id;
                const next = [...prev];
                next[tempIndex] = newMsg;
                setPendingIds((current) => {
                  const updated = new Set(current);
                  updated.delete(tempId);
                  return updated;
                });
                return next;
              }
            }

            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          setConversations((prev) =>
            prev.map((convo) =>
              convo.id === selectedConvo
                ? {
                    ...convo,
                    lastMessage: newMsg.content,
                    updated_at: newMsg.created_at,
                    unreadCount:
                      newMsg.sender_id !== user.id && selectedConvo !== convo.id
                        ? (convo.unreadCount || 0) + 1
                        : convo.unreadCount,
                  }
                : convo
            )
          );

          if (newMsg.sender_id !== user.id) {
            markMessagesAsRead(selectedConvo);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConvo}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.senderId !== user.id) {
          setIsOtherTyping(true);
          if (typingResetRef.current) window.clearTimeout(typingResetRef.current);
          typingResetRef.current = window.setTimeout(() => setIsOtherTyping(false), 1800);
        }
      })
      .on("broadcast", { event: "stopped_typing" }, (payload) => {
        if (payload.payload?.senderId !== user.id) {
          setIsOtherTyping(false);
        }
      })
      .subscribe();

    chatChannelRef.current = channel;

    return () => {
      if (typingResetRef.current) window.clearTimeout(typingResetRef.current);
      setIsOtherTyping(false);
      chatChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [selectedConvo, user]);

  useEffect(() => {
    const viewport = messagesScrollRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
    if (!viewport) return;

    requestAnimationFrame(() => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    });
  }, [messages]);

  const sendTypingEvent = useCallback((typing: boolean) => {
    if (!chatChannelRef.current || !user || !selectedConvo) return;

    chatChannelRef.current.send({
      type: "broadcast",
      event: typing ? "typing" : "stopped_typing",
      payload: { senderId: user.id, conversationId: selectedConvo },
    });
  }, [selectedConvo, user]);

  const handleSend = async (content: string, file?: File): Promise<boolean> => {
    if (!selectedConvo || !user) return false;
    if (!content && !file) return false;

    let attachmentUrl: string | null = null;
    let attachmentType: string | null = null;
    let attachmentName: string | null = null;

    if (file) {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${selectedConvo}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(filePath, file);

      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        return false;
      }

      const { data: urlData } = supabase.storage.from("message-attachments").getPublicUrl(filePath);
      attachmentUrl = urlData.publicUrl;
      attachmentType = file.type;
      attachmentName = file.name;
    }

    const finalContent = content || (attachmentName ? `Sent ${attachmentType?.startsWith("image/") ? "an image" : attachmentType?.startsWith("video/") ? "a video" : "a file"}` : "");
    const tempId = `temp-${crypto.randomUUID()}`;

    const optimisticMsg: Message = {
      id: tempId,
      content: finalContent,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      attachment_name: attachmentName,
      read_at: null,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setPendingIds((current) => new Set(current).add(tempId));
    setConversations((prev) =>
      prev.map((convo) =>
        convo.id === selectedConvo
          ? { ...convo, lastMessage: finalContent, updated_at: optimisticMsg.created_at }
          : convo
      )
    );

    sendTypingEvent(false);

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConvo,
      sender_id: user.id,
      content: finalContent,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      attachment_name: attachmentName,
    });

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setPendingIds((current) => {
        const updated = new Set(current);
        updated.delete(tempId);
        return updated;
      });
      toast({ title: "Message failed", description: error.message, variant: "destructive" });
      return false;
    }

    return true;
  };

  const filteredConvos = conversations.filter((c) =>
    c.participant.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const formatConvoTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const getDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  const groupedMessages = messages.reduce<{ date: string; messages: Message[] }[]>((groups, msg) => {
    const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
    const existing = groups.find((g) => g.date === dateKey);
    if (existing) existing.messages.push(msg);
    else groups.push({ date: dateKey, messages: [msg] });
    return groups;
  }, []);

  const participantStatusText = isParticipantOnline
    ? (isOtherTyping ? "typing..." : "Online")
    : otherUserLastSeen
      ? `Last seen ${formatDistanceToNow(new Date(otherUserLastSeen), { addSuffix: true })}`
      : "Offline";

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Please sign in to view messages.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "groups", label: "Groups" },
  ];

  const showSidebar = !isMobile || !selectedConvo;
  const showChat = !isMobile || !!selectedConvo;

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 min-h-0 pb-16 md:pb-0">
        <div className={`${!isMobile ? "container py-4" : ""} h-full`}>
          <div className={`${!isMobile ? "bg-card rounded-xl border" : "bg-card"} overflow-hidden h-full`}>
            <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] h-full">
              {showSidebar && (
                <div className="border-r flex flex-col h-full min-h-0">
                  <div className="p-5 border-b shrink-0">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-foreground">Messages</h2>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Users className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search messages..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-secondary/50 border-0"
                      />
                    </div>
                    <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
                      {tabs.map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
                            activeTab === tab.key
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    {loadingConvos ? (
                      <div className="p-4 text-center text-muted-foreground">Loading...</div>
                    ) : filteredConvos.length === 0 ? (
                      <div className="p-8 text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">No conversations yet</p>
                        <p className="text-muted-foreground/60 text-xs mt-1">Start a conversation from Connections</p>
                      </div>
                    ) : (
                      filteredConvos.map((convo) => (
                        <button
                          key={convo.id}
                          onClick={() => setSelectedConvo(convo.id)}
                          className={`w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/50 transition-colors border-b border-border/30 ${
                            selectedConvo === convo.id ? "bg-secondary/70" : ""
                          }`}
                        >
                          <div className="relative">
                            <Avatar className="h-11 w-11">
                              {convo.participant.avatar_url && <AvatarImage src={convo.participant.avatar_url} alt={convo.participant.full_name} />}
                              <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                                {convo.participant.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            {onlineUsers.has(convo.participant.user_id) && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-card" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-foreground text-sm truncate cursor-pointer hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); navigate(`/user/${convo.participant.user_id}`); }}>{convo.participant.full_name}</p>
                              <span className="text-muted-foreground/60 text-xs whitespace-nowrap ml-2">
                                {formatConvoTime(convo.updated_at)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className="text-muted-foreground text-xs truncate">{convo.lastMessage || "No messages yet"}</p>
                              {(convo.unreadCount ?? 0) > 0 && (
                                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 ml-2">
                                  {convo.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </ScrollArea>
                </div>
              )}

              {showChat && (
                <div className="flex flex-col h-full min-h-0">
                  {selectedConvo && selectedParticipant ? (
                    <>
                      <div className="p-4 border-b flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          {isMobile && (
                            <button onClick={() => setSelectedConvo(null)} className="p-1.5 -ml-1 mr-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/50 transition-colors">
                              <ArrowLeft className="h-5 w-5" />
                            </button>
                          )}
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              {selectedParticipant.avatar_url && <AvatarImage src={selectedParticipant.avatar_url} alt={selectedParticipant.full_name} />}
                              <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                                {selectedParticipant.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            {isParticipantOnline && (
                              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-card" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/user/${selectedParticipant.user_id}`)}>{selectedParticipant.full_name}</p>
                              {selectedParticipant.college && (
                                <span className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full border">
                                  {selectedParticipant.college}
                                </span>
                              )}
                            </div>
                            <p className={`text-xs font-medium ${isParticipantOnline || isOtherTyping ? "text-emerald-500" : "text-muted-foreground"}`}>
                              {participantStatusText}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {[Phone, Video].map((Icon, i) => (
                            <button key={i} onClick={() => toast({ title: "Coming Soon", description: "Audio/Video calling will be available soon!" })} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                              <Icon className="h-5 w-5" />
                            </button>
                          ))}
                          {[Clock, MoreVertical].map((Icon, i) => (
                            <button key={i + 2} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors">
                              <Icon className="h-5 w-5" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <ScrollArea ref={messagesScrollRef} className="flex-1 min-h-0 p-4">
                        <div className="space-y-4">
                          {groupedMessages.map((group) => (
                            <div key={group.date}>
                              <div className="flex items-center justify-center my-4">
                                <span className="text-xs text-muted-foreground bg-secondary/70 px-3 py-1 rounded-full">
                                  {getDateSeparator(group.messages[0].created_at)}
                                </span>
                              </div>
                              <div className="space-y-3">
                                {group.messages.map((msg) => (
                                  <MessageBubble
                                    key={msg.id}
                                    content={msg.content}
                                    senderId={msg.sender_id}
                                    createdAt={msg.created_at}
                                    attachmentUrl={msg.attachment_url}
                                    attachmentType={msg.attachment_type}
                                    attachmentName={msg.attachment_name}
                                    isMine={msg.sender_id === user.id}
                                    participantName={selectedParticipant.full_name}
                                    participantAvatar={selectedParticipant.avatar_url}
                                    readAt={msg.read_at}
                                    recipientOnline={isParticipantOnline}
                                    isPending={pendingIds.has(msg.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="shrink-0">
                        <ChatInput onSend={handleSend} onTypingChange={sendTypingEvent} />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">Select a conversation</p>
                        <p className="text-muted-foreground/60 text-sm mt-1">Choose from your existing conversations</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default MessagesPage;
