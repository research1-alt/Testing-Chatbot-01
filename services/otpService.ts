
/**
 * OTP & Activity Service Gateways - Production Endpoints
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

const SIGNUP_GATEWAY_URL = 'https://script.google.com/macros/s/AKfycbyT3cQwfMOXTWON81E9VRKd6kILFXaiBGbPM5kDwNOKZDUZ1BX-UXDGu3uieQriXScD/exec';
const ACTIVITY_GATEWAY_URL = 'https://script.google.com/macros/s/AKfycbzVcf_qnTyyQUER4IVFZlCvzVQpn2o33jiofQ078QPFJmAvpJvMOfn7FuIoP_9D3P6z/exec';

const postToGoogle = async (url: string, payload: any): Promise<boolean> => {
  try {
    const cleanUrl = url.trim();
    const formData = new URLSearchParams();
    Object.keys(payload).forEach(key => {
      const value = payload[key];
      formData.append(key, value !== undefined && value !== null ? String(value).trim() : "N/A");
    });
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    return true;
  } catch (err) {
    console.error("[Gateway] Transmission Error:", err);
    return false;
  }
};

export const fetchUserFromCloud = async (email: string): Promise<any | null> => {
    try {
        const url = `${SIGNUP_GATEWAY_URL.trim()}?action=get_user&email=${encodeURIComponent(email.toLowerCase().trim())}&t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.success ? data.user : null;
    } catch (e) {
        return null;
    }
};

export const sendOtpViaGateway = async (payload: OtpDeliveryPayload): Promise<{ success: boolean; error?: string }> => {
  await postToGoogle(SIGNUP_GATEWAY_URL, { ...payload, status: 'OTP_DISPATCHED' });
  return { success: true };
};

export const logInternRegistration = async (payload: OtpDeliveryPayload) => {
    return postToGoogle(SIGNUP_GATEWAY_URL, { ...payload, status: 'VERIFIED_SIGNUP' });
};

export const syncSessionToCloud = async (email: string, sessionId: string, userName: string, mobile?: string) => {
    return postToGoogle(ACTIVITY_GATEWAY_URL, {
        email: email.toLowerCase().trim(),
        userName: userName,
        mobile: mobile || 'N/A',
        status: 'SESSION_SYNC',
        sessionId: sessionId
    });
};

export const logUserQuery = async (email: string, userName: string, query: string, sessionId: string, mobile?: string) => {
    return postToGoogle(ACTIVITY_GATEWAY_URL, {
        email: email.toLowerCase().trim(),
        userName: userName,
        mobile: mobile || 'N/A',
        status: 'USER_QUERY',
        query: query,
        sessionId: sessionId
    });
};

/**
 * Checks for session conflicts across devices.
 * Cleans the output to ensure no hidden characters break the comparison.
 */
export const fetchRemoteSessionId = async (email: string): Promise<string | null> => {
    try {
        const url = `${ACTIVITY_GATEWAY_URL.trim()}?email=${encodeURIComponent(email.toLowerCase().trim())}&t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const rawText = await response.text();
        
        // Remove any HTML tags or weird quotes often returned by script redirects
        const cleanId = rawText.replace(/<[^>]*>/g, '').replace(/["']/g, '').trim();
        
        if (cleanId === 'NOT_FOUND' || cleanId.length < 5) return null;
        return cleanId;
    } catch (e) {
        return null;
    }
};
