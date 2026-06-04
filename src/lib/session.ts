export type AnonymousMode = 'chat';

export type AnonymousChatSession = {
  conversationId: string;
  guestToken: string;
  guestFullName: string;
  initialMessage?: string;
  qrCode: string;
  hostName: string;
  hostId: string;
  mode: AnonymousMode;
  expiresAt?: string | null;
};

const STORAGE_KEY = 'anon-flow-session';
const GUEST_TOKEN_KEY = 'anon-flow-guest-token';
const GUEST_NAME_KEY = 'anon-flow-guest-name';

export function saveChatSession(session: AnonymousChatSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  localStorage.setItem(GUEST_TOKEN_KEY, session.guestToken);
  localStorage.setItem(GUEST_NAME_KEY, session.guestFullName);
}

export function loadChatSession(): AnonymousChatSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AnonymousChatSession;
  } catch {
    return null;
  }
}

export function clearChatSession() {
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
