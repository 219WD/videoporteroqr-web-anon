import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, Loader2, MessageCircle, Send, Video } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { api } from '../lib/api';
import { createSocket } from '../lib/socket';
import { getGuestToken, loadFlowSession, saveFlowSession } from '../lib/session';

type FlowMessage = {
  sender: 'guest' | 'host';
  message: string;
  timestamp: string;
  guestName?: string;
};

type FlowStatus = {
  _id: string;
  guestName: string;
  status: string;
  actionType: string;
  response?: string | null;
  messages?: FlowMessage[];
};

function keyForMessage(item: FlowMessage) {
  return `${item.sender}:${item.message}:${item.timestamp}`;
}

function formatTimeLeft(ms: number) {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ChatPage() {
  const { callId = '' } = useParams();
  const navigate = useNavigate();
  const session = useMemo(() => loadFlowSession(), []);
  const [messages, setMessages] = useState<FlowMessage[]>([]);
  const [composer, setComposer] = useState('');
  const [status, setStatus] = useState<FlowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);
  const pendingGuestEchoRef = useRef<{ message: string; sentAt: number } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeftMs((current) => Math.max(0, current - 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadChat() {
      try {
        setLoading(true);

        const statusResponse = await api.get(`/flows/status/${encodeURIComponent(callId)}`);
        const nextStatus = statusResponse.data?.call || null;
        if (!active) return;

        setStatus(nextStatus);
        setTimeLeftMs(Number(statusResponse.data?.timeoutIn || 0));

        const messagesResponse = await api.get(`/flows/${encodeURIComponent(callId)}/messages`);
        if (!active) return;

        setMessages(messagesResponse.data?.messages || []);
      } catch (err: any) {
        if (!active) return;
        setError(err.response?.data?.error || 'No se pudo cargar el chat');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadChat();

    return () => {
      active = false;
    };
  }, [callId]);

  useEffect(() => {
    const token = getGuestToken();
    if (!callId || !token) return;

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-flow-room', { callId, token });
    });

    socket.on('new-flow-message', (payload: FlowMessage & { callId?: string }) => {
      if (payload?.callId && payload.callId !== callId) return;

      if (payload.sender === 'guest' && pendingGuestEchoRef.current) {
        const pending = pendingGuestEchoRef.current;
        const isSameMessage = pending.message === payload.message;
        const isRecentEnough = Date.now() - pending.sentAt < 8000;

        if (isSameMessage && isRecentEnough) {
          pendingGuestEchoRef.current = null;
          return;
        }
      }

      const nextMessage: FlowMessage = {
        sender: payload.sender,
        message: payload.message,
        timestamp: payload.timestamp,
        guestName: payload.guestName,
      };

      setMessages((current) => {
        const seen = new Set(current.map(keyForMessage));
        const signature = keyForMessage(nextMessage);
        if (seen.has(signature)) return current;
        return [...current, nextMessage];
      });
    });

    socket.on('flow-response', (payload: { callId?: string; response?: string; hostMessage?: string }) => {
      if (payload?.callId && payload.callId !== callId) return;

      if (payload.response === 'timeout' || payload.response === 'reject') {
        setError(payload.response === 'timeout' ? 'La conversación terminó' : 'La otra persona rechazó la conversación');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [callId]);

  const expired = timeLeftMs <= 0;
  const guestName = session?.guestFullName || status?.guestName || 'Visitante';

  async function sendMessage() {
    const text = composer.trim();
    if (!text || expired) return;

    try {
      setSending(true);
      pendingGuestEchoRef.current = { message: text, sentAt: Date.now() };
      const response = await api.post(`/flows/${encodeURIComponent(callId)}/send-message`, {
        message: text,
        sender: 'guest',
      });

      setMessages(
        response.data?.messages || [
          ...messages,
          {
            sender: 'guest',
            message: text,
            timestamp: new Date().toISOString(),
          },
        ],
      );
      setComposer('');
      setError(null);
    } catch (err: any) {
      pendingGuestEchoRef.current = null;
      setError(err.response?.data?.error || 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  }

  async function startCall() {
    if (!session?.callId || !session?.guestFullName) {
      setError('No se pudo preparar la videollamada');
      return;
    }

    try {
      setStartingCall(true);
      const response = await api.post(`/flows/${encodeURIComponent(session.callId)}/start-call`, {});

      saveFlowSession({
        callId: session.callId,
        guestToken: (response.data.guestToken as string) || session.guestToken,
        guestFullName: session.guestFullName,
        qrCode: session.qrCode,
        hostName: response.data.hostName || session.hostName,
        hostId: String(response.data.hostId || session.hostId || ''),
        mode: 'call',
        expiresAt: null,
      });

      navigate(`/call/${session.callId}`, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'No pudimos iniciar la videollamada');
    } finally {
      setStartingCall(false);
    }
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-[720px] flex-col px-4 py-4 sm:px-5">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-zinc-200 bg-[#fafcfc]">
          <div className="flex items-start gap-3">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => navigate(-1)}
              className="mt-0.5 shrink-0"
              aria-label="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="truncate text-[18px] leading-6">{status?.guestName || guestName}</CardTitle>
                <Badge className="bg-[#7d1522] text-white">Anónimo</Badge>
              </div>

              <CardDescription className="mt-1 flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0">
                  {expired ? 'La conversación terminó' : `Tiempo restante ${formatTimeLeft(timeLeftMs)}`}
                </span>
              </CardDescription>
            </div>
          </div>

          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={startCall}
              disabled={expired || startingCall}
              className="w-full"
            >
              {startingCall ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
              Iniciar videollamada
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-[62vh] flex-1 flex-col gap-3 p-4">
          {loading ? (
            <div className="grid min-h-[240px] place-items-center text-center text-zinc-500">
              <Loader2 className="h-10 w-10 animate-spin text-[#7d1522]" />
              <p className="mt-3">Cargando conversación...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="grid min-h-[240px] place-items-center text-center text-zinc-500">
              <div className="grid h-[62px] w-[62px] place-items-center rounded-full bg-[#f7f2f3] text-[#7d1522]">
                <MessageCircle className="h-7 w-7" />
              </div>
              <h2 className="mt-3 text-[18px] font-extrabold text-zinc-800">Todavía no hay mensajes</h2>
              <p className="mt-2 max-w-[320px] leading-6">Escribí un mensaje para empezar.</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {filteredMessages.map((item, index) => {
                const mine = item.sender === 'guest';
                return (
                  <div key={`${keyForMessage(item)}-${index}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={[
                        'max-w-[82%] rounded-[18px] px-4 py-3 shadow-sm',
                        mine
                          ? 'rounded-br-[4px] bg-[#7d1522] text-white'
                          : 'rounded-bl-[4px] bg-zinc-100 text-zinc-800',
                      ].join(' ')}
                    >
                      <p className="m-0 whitespace-pre-wrap break-words leading-6">{item.message}</p>
                      <span className="mt-1 block text-right text-[10px] opacity-75">
                        {new Date(item.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 mt-3">
        <div className="rounded-t-3xl border border-b-0 border-zinc-200 bg-gradient-to-t from-white via-white/95 to-white/0 pt-3">
          <div className="flex gap-2">
            <Textarea
              value={composer}
              onChange={(event) => setComposer(event.target.value)}
              placeholder={expired ? 'La conversación terminó' : 'Escribí un mensaje...'}
              disabled={expired || sending}
              rows={1}
              className="min-h-12 flex-1"
            />
            <Button
              type="button"
              onClick={sendMessage}
              disabled={expired || sending || !composer.trim()}
              className="min-w-[88px] shrink-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </div>
        </div>
      </div>

      {error ? <div className="toast">{error}</div> : null}
      <div className="mt-3 text-center text-xs text-zinc-500">
        La conversación se cierra automáticamente a los 15 minutos.
      </div>
    </main>
  );
}
