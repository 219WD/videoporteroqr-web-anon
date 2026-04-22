import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import { saveFlowSession } from '../lib/session';
import { Loader2, ScanSearch } from 'lucide-react';

type HostInfo = {
  id: string;
  name: string;
  email?: string | null;
  qrCode?: string | null;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function QrPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [host, setHost] = useState<HostInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestFullName, setGuestFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const qrCode = useMemo(() => code || '', [code]);

  useEffect(() => {
    let active = true;

    async function loadHost() {
      if (!qrCode) {
        setError('Falta el código QR');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/auth/host-by-qr/${encodeURIComponent(qrCode)}`);
        if (!active) return;
        setHost(response.data?.host || null);
      } catch (err: any) {
        if (!active) return;
        setError(err.response?.data?.error || 'No pudimos encontrar al anfitrión');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHost();

    return () => {
      active = false;
    };
  }, [qrCode]);

  async function startFlow() {
    const fullName = normalizeText(guestFullName);

    if (!fullName) {
      setError('Escribí tu nombre completo');
      return;
    }

    if (!host?.qrCode) {
      setError('No pudimos leer ese código');
      return;
    }

    try {
      setError(null);
      const response = await api.post('/flows/start', {
        qrCode,
        actionType: 'message',
        guestName: fullName,
        guestFullName: fullName,
        isAnonymous: true,
      });

      saveFlowSession({
        callId: response.data.callId as string,
        guestToken: response.data.guestToken as string,
        guestFullName: fullName,
        qrCode,
        hostName: response.data.hostName || host?.name || 'Anfitrión',
        hostId: String(response.data.hostId || host?.id || ''),
        mode: 'chat',
        expiresAt: null,
      });

      navigate(`/chat/${response.data.callId}`, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'No pudimos iniciar la conversación');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col gap-4 px-4 py-4 sm:px-5">
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-b from-[#7d1522] to-[#6b101d] text-white">
          <Badge className="bg-white/10 text-white">Acceso anónimo</Badge>
          <CardTitle className="text-[28px] text-white">
            {loading ? 'Buscando anfitrión...' : host?.name || 'Anfitrión no encontrado'}
          </CardTitle>
          <CardDescription className="text-white/80">
            {loading
              ? 'Estamos preparando tu acceso.'
              : 'Escribí tu nombre completo para continuar.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-5">
          <label className="flex flex-col gap-2 text-sm font-bold text-zinc-800">
            <span>Nombre completo</span>
            <Input
              value={guestFullName}
              onChange={(event) => setGuestFullName(event.target.value)}
              placeholder="Nombre y apellido"
              autoComplete="name"
            />
          </label>

          <Button type="button" onClick={startFlow} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            Entrar al chat
          </Button>

          {error ? <div className="rounded-2xl border border-[#f4c4c4] bg-[#fdecec] px-4 py-3 text-sm text-[#b3261e]">{error}</div> : null}
          {host ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Vas a contactar a {host.name}. Desde el chat podés iniciar una videollamada.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
