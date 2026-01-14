
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

const SIGNUP_GATEWAY_URL = 'https://script.google.com/macros/s/AKfycbwLvpxNKGiLPLzp2aMyZ6jQvgvx5NCwSQDijsvAaboQOYuwbzeZKw1KyrP8Ws8MtjCZ/exec';
const ACTIVITY_GATEWAY_URL = 'https://script.google.com/macros/s/AKfycbwz0D4ik3RlrVmrRUdGMR8vNDfB-j7bPEecUDBZLfX4ShsQqptuiBQ6DwtfbznRowXUiw/exec';

/**
 * Dispatches data to Google Apps Script via POST.
 * Uses 'no-cors' to bypass CORS restrictions on redirects.
 */
const postToGoogle = async (url: string, payload: any): Promise<boolean> => {
  try {
    const cleanUrl = url.trim();
    const formData = new URLSearchParams();
    
    Object.keys(payload).forEach(key => {
      const value = payload[key];
      formData.append(key, value !== undefined && value !== null ? String(value).trim() : "N/A");
    });

    // We use fetch with no-cors. The response will be "opaque", 
    // but the data will reach the Apps Script doPost function.
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    console.log(`[Gateway] Payload dispatched to ${cleanUrl.slice(-15)}`);
    return true;
  } catch (err) {
    console.error("[Gateway] Transmission Error:", err);
    return false;
  }
};

/**
 * Retrieves user data from the cloud spreadsheet.
 */
export const fetchUserFromCloud = async (email: string): Promise<any | null> => {
    try {
        const url = `${SIGNUP_GATEWAY_URL.trim()}?action=get_user&email=${encodeURIComponent(email.toLowerCase().trim())}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        return data.success ? data.user : null;
    } catch (e) {
        console.warn("[Gateway] Cloud fetch failed, using local fallback.");
        return null;
    }
};

/**
 * Triggers the OTP delivery sequence.
 */
export const sendOtpViaGateway = async (payload: OtpDeliveryPayload): Promise<{ success: boolean; error?: string }> => {
  const success = await postToGoogle(SIGNUP_GATEWAY_URL, {
      ...payload,
      status: 'OTP_DISPATCHED'
  });
  
  if (!success) return { success: false, error: "Cloud connection failed." };
  return { success: true };
};

/**
 * Records final intern registration in the cloud.
 */
export const logInternRegistration = async (payload: OtpDeliveryPayload) => {
    return postToGoogle(SIGNUP_GATEWAY_URL, {
        ...payload,
        status: 'VERIFIED_SIGNUP'
    });
};

/**
 * Syncs the session ID to prevent multiple browser logins.
 */
export const syncSessionToCloud = async (email: string, sessionId: string, userName: string, mobile?: string) => {
    return postToGoogle(ACTIVITY_GATEWAY_URL, {
        email: email.toLowerCase().trim(),
        userName: userName,
        mobile: mobile || 'N/A',
        status: 'SESSION_SYNC',
        sessionId: sessionId
    });
};

/**
 * Logs user queries to the spreadsheet for monitoring.
 */
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
 */
export const fetchRemoteSessionId = async (email: string): Promise<string | null> => {
    try {
        const url = `${ACTIVITY_GATEWAY_URL.trim()}?email=${encodeURIComponent(email.toLowerCase().trim())}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.text();
        if (data === 'NOT_FOUND' || data.includes('<!DOCTYPE') || data.length < 5) return null;
        return data.trim();
    } catch (e) {
        return null;
    }
};
