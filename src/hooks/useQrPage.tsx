import { useNavigate, useParams } from "react-router-dom";
import { createLogger } from "../utils/logger";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { connectSocket } from "../lib/socket";
import { CHAT_EVENTS } from "../lib/chatContract";

const log = createLogger('qr-page');

type HostInfo = {
  id: string;
  name: string;
  email?: string | null;
  qrCode?: string | null;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export const useQrPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [host, setHost] = useState<HostInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestFullName, setGuestFullName] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const qrCode = useMemo(() => code || '', [code]);

  useEffect(() => {
    let active = true;

    async function loadHost() {
      if (!qrCode) {
        setLoading(false);
        setHost(null);
        return;
      }

      setLoading(true);

      try {
        log.info('host:lookup:start', { qrCode });
        const { data } = await api.get(`/auth/host-by-qr/${encodeURIComponent(qrCode)}`);
        if (!active) {
          return;
        }

        setHost(data?.host || null);
        log.info('host:lookup:ok', {
          qrCode,
          hostId: data?.host?.id || null,
          hostName: data?.host?.name || null,
        });
      } catch {
        if (!active) {
          return;
        }

        setHost(null);
        log.warn('host:lookup:failed', { qrCode });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadHost();

    return () => {
      active = false;
    };
  }, [qrCode]);

  async function startFlow() {
    const fullName = normalizeText(guestFullName);
    const initialMessage = normalizeText(firstMessage);

    if (!fullName) {
      setError('Escribi tu nombre completo');
      return;
    }

    if (!initialMessage) {
      setError('Escribi tu primer mensaje');
      return;
    }

    if (!host?.qrCode) {
      setError('No pudimos leer ese QR');
      return;
    }

    if (starting) {
      return;
    }

    const socket = connectSocket();
    setError(null);
    setStarting(true);
    log.info('flow:start', {
      qrCode,
      guestFullName: fullName,
      hostId: host?.id || null,
      hostName: host?.name || null,
      hasMessage: Boolean(initialMessage),
    });

    socket.timeout(15000).emit(
      CHAT_EVENTS.SESSION_START,
      {
        qrCode,
        guestName: fullName,
        initialMessage,
      },
      (err: unknown, response: any) => {
        setStarting(false);

        if (err) {
          setError('No pudimos iniciar la conversacion');
          log.warn('flow:start:timeout', { qrCode });
          return;
        }

        if (!response?.ok) {
          setError(response?.error || 'No pudimos iniciar la conversacion');
          log.warn('flow:start:failed', {
            qrCode,
            error: response?.error || null,
          });
          return;
        }

        const conversationId = response?.conversationId || '';

        if (!conversationId) {
          setError('No pudimos iniciar la conversacion');
          log.warn('flow:start:missing-conversation-id', { qrCode });
          return;
        }

        navigate(`/chat/${encodeURIComponent(conversationId)}`, {
          replace: true,
        });
      },
    );
  }

  return {
    props: {
      loading,
      host,
      guestFullName,
      firstMessage,
      startFlow,
      error,
      starting,
    },
    methods: {
      setGuestFullName,
      setFirstMessage,
    }
  }
}
