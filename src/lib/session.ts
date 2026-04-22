export type AnonymousMode = 'chat' | 'call';

export type AnonymousFlowSession = {
  callId: string;
  guestToken: string;
  guestFullName: string;
  qrCode: string;
  hostName: string;
  hostId: string;
  mode: AnonymousMode;
  expiresAt?: string | null;
};

const STORAGE_KEY = 'anon-flow-session';
const GUEST_TOKEN_KEY = 'anon-flow-guest-token';
const GUEST_NAME_KEY = 'anon-flow-guest-name';

export function saveFlowSession(session: AnonymousFlowSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  localStorage.setItem(GUEST_TOKEN_KEY, session.guestToken);
  localStorage.setItem(GUEST_NAME_KEY, session.guestFullName);
}

export function loadFlowSession(): AnonymousFlowSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AnonymousFlowSession;
  } catch {
    return null;
  }
}

export function clearFlowSession() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(GUEST_TOKEN_KEY);
  localStorage.removeItem(GUEST_NAME_KEY);
}

export function getGuestToken() {
  return localStorage.getItem(GUEST_TOKEN_KEY);
}

export function getGuestName() {
  return localStorage.getItem(GUEST_NAME_KEY) || '';
}
