const LINE_LOGIN_CHANNEL_ID =
  process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID || '';
const LINE_LOGIN_CALLBACK_URL =
  process.env.NEXT_PUBLIC_LINE_LOGIN_CALLBACK_URL || '';

export function getLineLoginUrl(): string {
  const state = generateRandomState();
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('line_login_state', state);
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_LOGIN_CHANNEL_ID,
    redirect_uri: LINE_LOGIN_CALLBACK_URL,
    state,
    scope: 'profile openid',
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

function generateRandomState(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function exchangeCodeForToken(code: string): Promise<string | null> {
  // In production, this should be done server-side
  // For now, call the GAS endpoint that handles token exchange
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_GAS_WEB_APP_URL}?action=lineTokenExchange&code=${code}&redirect_uri=${encodeURIComponent(LINE_LOGIN_CALLBACK_URL)}`
    );
    const data = await response.json();
    if (data.success && data.data?.id_token) {
      return data.data.id_token;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('line_login_state');
  }
}
