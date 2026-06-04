import { useNavigate, useParams } from "react-router-dom";
import { createLogger } from "../utils/logger";
import { connectSocket, getSocket } from "../lib/socket";
import { useEffect, useMemo, useRef, useState } from "react";
import { CHAT_EVENTS } from "../lib/chatContract";

const log = createLogger('chat-page');

type ChatMessage = {
  id: string;
  sender: 'guest' | 'host';
  message: string;
  timestamp: string;
  deliveryStatus?: 'sent' | 'delivered' | 'read';
  deliveredAt?: string | null;
  readAt?: string | null;
};

function keyForMessage(item: ChatMessage) {
  return item.id || `${item.sender}:${item.message}:${item.timestamp}`;
}

function formatTimeLeft(ms: number) {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getExpireAtFromPayload(payload: any) {
  return (
    payload?.conversation?.expireAt ||
    payload?.conversation?.timeoutAt ||
    payload?.conversationTimeoutAt ||
    payload?.expireAt ||
    payload?.timeoutAt ||
    null
  );
}

function normalizeMessage(message: any): ChatMessage | null {
  if (!message) {
    return null;
  }

  return {
    id: message.id || `${message.sender}:${message.createdAt || Date.now()}`,
    sender: message.sender === 'host' ? 'host' : 'guest',
    message: message.text || message.message || '',
    timestamp: message.createdAt || new Date().toISOString(),
    deliveryStatus: message.deliveryStatus || 'sent',
    deliveredAt: message.deliveredAt || null,
    readAt: message.readAt || null,
  };
}

export const useChatPage = () => {
  const { conversationId: routeConversationId = '' } = useParams();
  const navigate = useNavigate();
  const conversationId = routeConversationId;
  const socket = getSocket();

  const [guestName, setGuestName] = useState('Visitante');
  const [hostId, setHostId] = useState('');
  const [hostName, setHostName] = useState('Conversación');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composer, setComposer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [conversationTimeoutAt, setConversationTimeoutAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const title = hostName;
  const pageVisibleRef = useRef<boolean>(document.visibilityState === 'visible');
  const deliveredMessageIdsRef = useRef(new Set<string>());
  const readMessageIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const timeLeftMs = useMemo(() => {
    if (!conversationTimeoutAt) {
      return 0;
    }

    const timeoutAtMs = new Date(conversationTimeoutAt).getTime();
    if (Number.isNaN(timeoutAtMs)) {
      return 0;
    }

    return Math.max(0, timeoutAtMs - now);
  }, [conversationTimeoutAt, now]);

  const expired = Boolean(conversationTimeoutAt) && timeLeftMs <= 0;
  const myRole = 'guest';

  const isMessageAcked = (message: ChatMessage, status: 'delivered' | 'read') => {
    if (status === 'read') {
      return message.deliveryStatus === 'read' || Boolean(message.readAt);
    }

    return message.deliveryStatus === 'delivered' || message.deliveryStatus === 'read' || Boolean(message.deliveredAt);
  };

  const emitMessageStatus = (messageId: string, status: 'delivered' | 'read') => {
    const currentSocket = connectSocket();
    currentSocket.emit(status === 'read' ? CHAT_EVENTS.MESSAGE_READ : CHAT_EVENTS.MESSAGE_DELIVERED, {
      conversationId,
      messageId,
      role: myRole,
      sender: myRole,
      targetRole: myRole === 'guest' ? 'host' : 'guest',
    });
  };

  const acknowledgeMessages = (items: ChatMessage[]) => {
    items.forEach((item) => {
      if (item.sender === myRole) {
        return;
      }

      if (!deliveredMessageIdsRef.current.has(item.id) && !isMessageAcked(item, 'delivered')) {
        deliveredMessageIdsRef.current.add(item.id);
        emitMessageStatus(item.id, 'delivered');
      }

      if (pageVisibleRef.current && !readMessageIdsRef.current.has(item.id) && !isMessageAcked(item, 'read')) {
        readMessageIdsRef.current.add(item.id);
        emitMessageStatus(item.id, 'read');
      }
    });
  };

  useEffect(() => {
    if (messages.length > 0 && pageVisibleRef.current) {
      acknowledgeMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    const handleVisibility = () => {
      pageVisibleRef.current = document.visibilityState === 'visible';
      if (pageVisibleRef.current) {
        acknowledgeMessages(messages);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [messages]);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      setError('conversationId requerido');
      return;
    }

    const currentSocket = connectSocket();
    log.info('chat:join', {
      conversationId,
    });

    const handleConversationState = (payload: any) => {
      const incomingConversationId = payload?.conversationId || payload?.conversation?.conversationId;
      if (incomingConversationId !== conversationId) {
        return;
      }

      const hydratedConversation = payload?.conversation || {};
      const hydratedHost = payload?.host || {};
      const nextGuestName = hydratedConversation.guestName || payload?.guestName;
      const nextHostId = hydratedConversation.hostId || hydratedHost.id || payload?.hostId;
      const nextHostName = hydratedHost.name || payload?.host?.name || payload?.hostName;
      const expireAt = getExpireAtFromPayload(payload);

      if (nextGuestName) {
        setGuestName(nextGuestName);
      }

      if (nextHostId) {
        setHostId(nextHostId);
      }

      if (nextHostName) {
        setHostName(nextHostName);
      }

      if (expireAt) {
        setConversationTimeoutAt(expireAt);
      }

      log.info('chat:state', {
        conversationId,
        messageCount: Array.isArray(payload?.messages) ? payload.messages.length : null,
      });

      if (Array.isArray(payload?.messages) && payload.messages.length > 0) {
        const nextMessages = payload.messages.map(normalizeMessage).filter(Boolean) as ChatMessage[];
        if (nextMessages.length > 0) {
          setMessages(nextMessages);
          acknowledgeMessages(nextMessages);
        }
      }

      setLoading(false);
    };

    const handleMessageNew = (payload: any) => {
      const incomingConversationId =
        payload?.conversation?.conversationId ||
        payload?.conversationId ||
        payload?.message?.conversationId;

      if (incomingConversationId !== conversationId) {
        return;
      }

      const nextMessage = normalizeMessage(payload?.message);
      if (!nextMessage) {
        return;
      }

      const expireAt = getExpireAtFromPayload(payload);
      if (expireAt) {
        setConversationTimeoutAt(expireAt);
      }

      const hydratedConversation = payload?.conversation || {};
      const hydratedHost = payload?.host || {};
      const nextGuestName = hydratedConversation.guestName || payload?.guestName;
      const nextHostId = hydratedConversation.hostId || hydratedHost.id || payload?.hostId;
      const nextHostName = hydratedHost.name || payload?.host?.name || payload?.hostName;

      if (nextGuestName) {
        setGuestName(nextGuestName);
      }

      if (nextHostId) {
        setHostId(nextHostId);
      }

      if (nextHostName) {
        setHostName(nextHostName);
      }

      log.info('chat:message:new', {
        conversationId,
        messageId: nextMessage.id,
        sender: nextMessage.sender,
      });

      setMessages((current) => {
        if (current.some((item) => item.id === nextMessage.id)) {
          const merged = current.map((item) =>
            item.id === nextMessage.id
              ? {
                  ...item,
                  ...nextMessage,
                  deliveryStatus: nextMessage.deliveryStatus || item.deliveryStatus,
                  deliveredAt: nextMessage.deliveredAt || item.deliveredAt,
                  readAt: nextMessage.readAt || item.readAt,
                }
              : item,
          );
          acknowledgeMessages(merged);
          return merged;
        }

        const nextMessages = [...current, nextMessage];
        acknowledgeMessages(nextMessages);
        return nextMessages;
      });
    };

    const handleMessageStatus = (payload: any) => {
      const incomingConversationId =
        payload?.conversationId ||
        payload?.conversation?.conversationId ||
        payload?.message?.conversationId;

      if (incomingConversationId !== conversationId) {
        return;
      }

      const updatedMessage = normalizeMessage(payload?.message);
      if (!updatedMessage) {
        return;
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === updatedMessage.id
            ? {
                ...item,
                ...updatedMessage,
                deliveryStatus: updatedMessage.deliveryStatus || item.deliveryStatus,
                deliveredAt: updatedMessage.deliveredAt || item.deliveredAt,
                readAt: updatedMessage.readAt || item.readAt,
              }
            : item,
        ),
      );
    };

    currentSocket.on(CHAT_EVENTS.CONVERSATION_STATE, handleConversationState);
    currentSocket.on(CHAT_EVENTS.MESSAGE_NEW, handleMessageNew);
    currentSocket.on(CHAT_EVENTS.MESSAGE_STATUS, handleMessageStatus);

    currentSocket.emit(
      CHAT_EVENTS.JOIN,
      {
        conversationId,
        role: 'guest',
      },
      (response: any) => {
        if (!response?.ok) {
          setLoading(false);
          setError(response?.error || 'No pudimos abrir la conversación');
          return;
        }

        const hydratedConversation = response?.conversation || {};
        const hydratedHost = response?.host || {};
        const nextGuestName = hydratedConversation.guestName || response?.guestName;
        const nextHostId = hydratedConversation.hostId || hydratedHost.id || response?.hostId;
        const nextHostName = hydratedHost.name || response?.host?.name || response?.hostName;
        const expireAt = getExpireAtFromPayload(response);

        if (nextGuestName) {
          setGuestName(nextGuestName);
        }

        if (nextHostId) {
          setHostId(nextHostId);
        }

        if (nextHostName) {
          setHostName(nextHostName);
        }

        if (expireAt) {
          setConversationTimeoutAt(expireAt);
        }

        if (Array.isArray(response.messages) && response.messages.length > 0) {
          const nextMessages = response.messages.map(normalizeMessage).filter(Boolean) as ChatMessage[];
          if (nextMessages.length > 0) {
            setMessages(nextMessages);
            acknowledgeMessages(nextMessages);
          }
        }

        setLoading(false);
      },
    );

    return () => {
      currentSocket.off(CHAT_EVENTS.CONVERSATION_STATE, handleConversationState);
      currentSocket.off(CHAT_EVENTS.MESSAGE_NEW, handleMessageNew);
      currentSocket.off(CHAT_EVENTS.MESSAGE_STATUS, handleMessageStatus);
    };
  }, [conversationId, navigate, socket]);

  async function sendMessage() {
    const text = composer.trim();
    if (!text || expired) return;

    const currentSocket = connectSocket();
    setSending(true);
    setComposer('');
    setError(null);
    log.info('message:send', { conversationId, textLength: text.length, hostId: hostId || null });

    currentSocket.emit(
      CHAT_EVENTS.MESSAGE_SEND,
      {
        conversationId,
        hostId,
        guestName,
        sender: 'guest',
        senderName: guestName,
        text,
      },
      (response: any) => {
        setSending(false);

        if (!response?.ok) {
          setError(response?.error || 'No pudimos enviar el mensaje');
          log.warn('message:failed', {
            conversationId,
            error: response?.error || null,
          });
          return;
        }

        const nextMessage = normalizeMessage(response.message);
        if (nextMessage) {
          setMessages((current) => {
            if (current.some((item) => item.id === nextMessage.id)) {
              return current;
            }

            return [...current, nextMessage];
          });
        }

        const expireAt = getExpireAtFromPayload(response);
        if (expireAt) {
          setConversationTimeoutAt(expireAt);
        }
      },
    );
  }

  const filteredMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((item) => {
      const signature = keyForMessage(item);
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
  }, [messages]);

  return {
    props: {
      composer,
      conversationTimeoutAt,
      error,
      expired,
      filteredMessages,
      loading,
      sending,
      timeLeftMs,
      title,
    },
    methods: {
      formatTimeLeft,
      keyForMessage,
      navigate,
      sendMessage,
      setComposer,
    },
  }
}
