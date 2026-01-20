
/**
 * OTP & Activity Service Gateway - Unified Production Endpoint
 */

export interface OtpDeliveryPayload {
  email: string;
  mobile: string;
  emailCode: string;
  userName: string;
  status?: string;
  sessionId?: string;
  query?: string;
  password?: string;
}

/**
 * Replace this URL with your actual "Web App URL" from Google Apps Script.
 */
const GATEWAY_URL = 'https://script.google.com/macros/s/AKfycbw4009PRaSxKF-Gokv3D7lXzummp214zjyszeswl4S6J9DI8PAO31_ejCcmaWvUavBLzw/exec'; 

const postToGoogle = async (payload: any): Promise<boolean> => {
  try {
    const formData = new URLSearchParams();
    Object.keys(payload).forEach(key => {
      const value = payload[key];
      formData.append(key, value !== undefined && value !== null ? String(value).trim() : "N/A");
    });

    // POST requests to Google Scripts require no-cors mode
    fetch(GATEWAY_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    return true;
  } catch (err) {
    console.error("[OSM Gateway] Dispatch error:", err);
    return false;
  }
};

export const fetchUserFromCloud = async (email: string): Promise<any | null> => {
    try {
        const url = `${GATEWAY_URL}?action=get_user&email=${encodeURIComponent(email.toLowerCase().trim())}&t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.success ? data.user : null;
    } catch (e) {
        console.error("[OSM Gateway] User fetch failed:", e);
        return null;
    }
};

// Added optional error property to the return type to fix the TypeScript error in AuthPage.tsx where result.error was accessed.
export const sendOtpViaGateway = async (payload: OtpDeliveryPayload): Promise<{ success: boolean; error?: string }> => {
  const success = await postToGoogle({ ...payload, status: 'OTP_DISPATCHED' });
  return { success: !!success, error: success ? undefined : "Gateway connection failed. Please try again." };
};

export const logInternRegistration = async (payload: OtpDeliveryPayload) => {
    return postToGoogle({ ...payload, status: 'VERIFIED_SIGNUP' });
};

export const syncSessionToCloud = async (email: string, sessionId: string, userName: string, mobile?: string) => {
    return postToGoogle({
        email: email.toLowerCase().trim(),
        userName: userName,
        mobile: mobile || 'N/A',
        status: 'SESSION_SYNC',
        sessionId: sessionId
    });
};

export const logUserQuery = async (email: string, userName: string, query: string, sessionId: string, mobile?: string) => {
    return postToGoogle({
        email: email.toLowerCase().trim(),
        userName: userName,
        mobile: mobile || 'N/A',
        status: 'USER_QUERY',
        query: query,
        sessionId: sessionId
    });
};

export const fetchRemoteSessionId = async (email: string): Promise<string | null> => {
    try {
        const url = `${GATEWAY_URL}?action=check_session&email=${encodeURIComponent(email.toLowerCase().trim())}&t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const rawText = await response.text();
        const cleanId = rawText.trim();
        if (cleanId === 'NOT_FOUND' || cleanId.includes('<!DOCTYPE')) return null;
        return cleanId;
    } catch (e) {
        return null;
    }
};
