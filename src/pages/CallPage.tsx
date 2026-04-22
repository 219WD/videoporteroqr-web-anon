import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Mic, MicOff, PhoneOff, RefreshCw, Video } from 'lucide-react';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { createSocket } from '../lib/socket';
import { getGuestToken, loadFlowSession } from '../lib/session';

type PeerOptions = {
  onTrack?: (event: RTCTrackEvent) => void;
  onIceCandidate?: (event: RTCPeerConnectionIceEvent) => void;
  onConnectionStateChange?: () => void;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

function createPeerConnection(options: PeerOptions = {}) {
  const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  if (options.onTrack) peer.ontrack = options.onTrack;
  if (options.onIceCandidate) peer.onicecandidate = options.onIceCandidate;
  if (options.onConnectionStateChange) peer.onconnectionstatechange = options.onConnectionStateChange;

  return peer;
}

export function CallPage() {
  const { callId = '' } = useParams();
  const navigate = useNavigate();
  const session = loadFlowSession();

  const [status, setStatus] = useState('Preparando la videollamada...');
  const [loadingCamera, setLoadingCamera] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [callExpired, setCallExpired] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<any>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const hostReadyRef = useRef(false);
  const offerSentRef = useRef(false);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const endedRef = useRef(false);

  const token = useMemo(() => getGuestToken(), []);
  const hostId = session?.hostId || '';

  function cleanupPeer() {
    if (peerRef.current) {
      try {
        peerRef.current.close();
      } catch {
        // ignore
      }
      peerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  }

  function returnToChat() {
    if (endedRef.current) return;
    endedRef.current = true;
    cleanupPeer();
    socketRef.current?.disconnect?.();
    socketRef.current = null;
    navigate(`/chat/${callId}`, { replace: true });
  }

  function ensurePeer() {
    if (peerRef.current) {
      return peerRef.current;
    }

    const peer = createPeerConnection({
      onTrack(event) {
        const stream = event.streams?.[0];
        if (!stream) return;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        setRemoteReady(true);
        setStatus('En llamada');
      },
      onIceCandidate(event) {
        if (!event.candidate || !socketRef.current || !callId) {
          return;
        }

        socketRef.current.emit('call:ice-candidate', {
          callId,
          toUserId: hostId,
          candidate: event.candidate,
        });
      },
      onConnectionStateChange() {
        const state = peer.connectionState;
        if (state === 'connected') {
          setStatus('En llamada');
        } else if (state === 'failed' || state === 'disconnected') {
          setStatus('Conexión perdida');
        }
      },
    });

    peerRef.current = peer;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current as MediaStream);
      });
    }

    return peer;
  }

  async function createOffer() {
    if (!socketRef.current || !callId || !hostId || !localStreamRef.current || offerSentRef.current) {
      return;
    }

    const peer = ensurePeer();
    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await peer.setLocalDescription(offer);
    offerSentRef.current = true;
    setStatus('Conectando...');

    socketRef.current.emit('call:offer', {
      callId,
      toUserId: hostId,
      fromUserId: 'anon',
      offer: peer.localDescription || offer,
    });
  }

  useEffect(() => {
    let active = true;

    async function bootstrapCamera() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!active) return;

        localStreamRef.current = media;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = media;
        }

        const videoTrack = media.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          setVideoEnabled(false);
        }

        setLoadingCamera(false);

        if (hostReadyRef.current) {
          await createOffer();
        }
      } catch {
        if (active) {
          setLoadingCamera(false);
          setStatus('Necesitamos acceso a la cámara y al micrófono');
        }
      }
    }

    bootstrapCamera();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!callId) return;

      try {
        const response = await api.get(`/flows/status/${encodeURIComponent(callId)}`);
        if (!active) return;

        const flow = response.data?.call || null;
        setAccepted(flow?.response === 'accept' || flow?.status === 'answered');
        setCallExpired(flow?.status === 'timeout');
        if (flow?.status === 'timeout' || flow?.status === 'rejected' || flow?.status === 'ended') {
          navigate(`/chat/${callId}`, { replace: true });
          return;
        }
        setStatus('Esperando a que acepte la otra persona...');
      } catch {
        if (!active) return;
        setStatus('No se pudo consultar el estado');
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [callId, navigate]);

  useEffect(() => {
    if (!token || !callId) {
      return undefined;
    }

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-flow-room', { callId, token });
      socket.emit('join-call-room', {
        callId,
        userRole: 'guest',
        token,
      });

      if (localStreamRef.current && hostReadyRef.current) {
        createOffer().catch((error) => {
          console.error('[anon-call] error creando offer:', error);
        });
      }
    });

    socket.on('flow-response', (payload: { callId?: string; response?: string }) => {
      if (payload?.callId !== callId) return;

      if (payload.response === 'accept') {
        setAccepted(true);
        setStatus('Videollamada lista');
      } else if (payload.response === 'reject') {
        setStatus('La otra persona rechazó la videollamada');
        navigate(`/chat/${callId}`, { replace: true });
      } else if (payload.response === 'timeout') {
        setCallExpired(true);
        setStatus('La videollamada terminó');
        navigate(`/chat/${callId}`, { replace: true });
      }
    });

    socket.on('flow-host-accepted', (payload: { callId?: string }) => {
      if (payload?.callId !== callId) return;
      setAccepted(true);
      setStatus('Videollamada lista');
    });

    socket.on('host-ready', async (payload: { callId?: string }) => {
      if (payload?.callId !== callId) return;
      hostReadyRef.current = true;
      setStatus('Anfitrion conectado. Preparando video...');

      if (localStreamRef.current) {
        await createOffer();
      }
    });

    socket.on('call-connected', (payload: { callId?: string }) => {
      if (payload?.callId !== callId) return;
      setStatus('En llamada');
    });

    socket.on('call:answer', async (payload: { callId?: string; answer?: RTCSessionDescriptionInit }) => {
      if (!payload?.callId || payload.callId !== callId || !payload.answer) return;

      const peer = ensurePeer();
      await peer.setRemoteDescription(new RTCSessionDescription(payload.answer));
      setRemoteReady(true);
      setStatus('En llamada');
    });

    socket.on('answer', async (payload: { answer?: RTCSessionDescriptionInit }) => {
      if (!payload?.answer) return;

      const peer = ensurePeer();
      await peer.setRemoteDescription(new RTCSessionDescription(payload.answer));
      setRemoteReady(true);
      setStatus('En llamada');
    });

    socket.on('call:ice-candidate', async (payload: { callId?: string; candidate?: RTCIceCandidateInit }) => {
      if (!payload?.callId || payload.callId !== callId || !payload.candidate) return;

      const peer = ensurePeer();
      try {
        await peer.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (error) {
        console.warn('[anon-call] no se pudo agregar ICE candidate:', error);
      }
    });

    socket.on('ice-candidate', async (payload: { candidate?: RTCIceCandidateInit }) => {
      if (!payload?.candidate) return;

      const peer = ensurePeer();
      try {
        await peer.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (error) {
        console.warn('[anon-call] no se pudo agregar ICE candidate:', error);
      }
    });

    socket.on('call-ended', () => {
      setStatus('La llamada terminó');
      returnToChat();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [callId, navigate, token]);

  useEffect(() => {
    if (!accepted || !localStreamRef.current || !hostReadyRef.current || offerSentRef.current) {
      return;
    }

    createOffer().catch((error) => {
      console.error('[anon-call] error creando offer tras aceptar:', error);
    });
  }, [accepted]);

  async function refreshStatus() {
    try {
      const response = await api.get(`/flows/status/${encodeURIComponent(callId)}`);
      const flow = response.data?.call;

      if (flow?.response === 'accept' || flow?.status === 'answered') {
        setAccepted(true);
        setStatus('Videollamada lista');
      } else if (flow?.response === 'reject') {
        setStatus('La otra persona rechazó la videollamada');
        navigate(`/chat/${callId}`, { replace: true });
      } else if (flow?.status === 'timeout' || flow?.status === 'rejected' || flow?.status === 'ended') {
        setCallExpired(true);
        setStatus('La videollamada terminó');
        navigate(`/chat/${callId}`, { replace: true });
      } else {
        setStatus('Esperando a que acepte la otra persona...');
      }
    } catch {
      setStatus('No se pudo consultar el estado');
    }
  }

  function toggleAudio() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }

  function toggleVideo() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setVideoEnabled(track.enabled);
  }

  async function hangUp() {
    try {
      await api.post('/videocall/end-call', { callId });
    } catch {
      // ignore
    } finally {
      returnToChat();
    }
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      <div className="relative h-dvh w-full bg-black">
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />

        {!remoteReady ? (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-black/45 via-black/20 to-black/70 px-6 text-center">
            <div className="max-w-sm space-y-3 rounded-[28px] border border-white/10 bg-black/35 px-5 py-6 backdrop-blur-md">
              <h1 className="text-[28px] font-extrabold">{session?.hostName || 'Videollamada anónima'}</h1>
              <p className="text-sm leading-6 text-white/80">
                {callExpired ? 'La llamada terminó' : status}
              </p>
            </div>
          </div>
        ) : null}

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
          <div className="min-w-0 rounded-full border border-white/15 bg-black/45 px-4 py-2 backdrop-blur-md">
            <p className="truncate text-[13px] font-semibold">{session?.hostName || 'Videollamada anónima'}</p>
            <p className="text-[11px] text-white/70">{callExpired ? 'Terminada' : status}</p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={refreshStatus}
            className="shrink-0 bg-white/10 text-white hover:bg-white/15"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>

        <div className="absolute right-4 top-20 h-[140px] w-[104px] overflow-hidden rounded-[18px] border border-white/25 bg-black/50 shadow-2xl">
          <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        </div>

        <div className="absolute bottom-28 left-4 right-4 rounded-[28px] border border-white/10 bg-black/45 px-4 py-4 backdrop-blur-md">
          <p className="text-sm leading-6 text-white/85">
            {callExpired ? 'La llamada terminó y volverás al chat.' : 'Usá los controles para silenciar, activar video o colgar.'}
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/70 px-4 pb-6 pt-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-[720px] items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={toggleAudio}
              className="h-12 rounded-full bg-white/10 px-4 text-white hover:bg-white/15"
            >
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {muted ? 'Audio off' : 'Audio'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={toggleVideo}
              className={`h-12 rounded-full px-4 text-white hover:bg-white/15 ${!videoEnabled ? 'bg-[#7d1522]' : 'bg-white/10'}`}
            >
              <Video className="h-4 w-4" />
              {videoEnabled ? 'Video' : 'Video off'}
            </Button>

            <Button
              type="button"
              onClick={hangUp}
              className="h-12 rounded-full bg-[#7d1522] px-5 text-white hover:bg-[#65111d]"
            >
              <PhoneOff className="h-4 w-4" />
              Colgar
            </Button>
          </div>
        </div>

        {loadingCamera ? (
          <div className="absolute inset-0 grid place-items-center bg-black/30">
            <div className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-3 text-sm text-white backdrop-blur-md">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              Activando cámara...
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
