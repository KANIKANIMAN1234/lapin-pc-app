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

export async function exchangeCodeForToken(code: string): Promise<{ token: string | null; error?: string }> {
  const gasUrl = process.env.NEXT_PUBLIC_GAS_WEB_APP_URL;
  if (!gasUrl) return { token: null, error: 'GAS_URL未設定' };
  if (!LINE_LOGIN_CALLBACK_URL) return { token: null, error: 'CALLBACK_URL未設定' };

  const url = `${gasUrl}?action=lineTokenExchange&code=${code}&redirect_uri=${encodeURIComponent(LINE_LOGIN_CALLBACK_URL)}`;
  try {
    const response = await fetch(url);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { token: null, error: `GASレスポンスがJSONでない (status=${response.status}): ${text.substring(0, 200)}` };
    }
    if (data.success && data.data?.id_token) {
      return { token: data.data.id_token };
    }
    const errMsg = data.error?.message || data.error || JSON.stringify(data);
    return { token: null, error: `GAS応答: ${errMsg}` };
  } catch (err) {
    return { token: null, error: `ネットワークエラー: ${String(err)}` };
  }
}

export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('line_login_state');
  }
}
