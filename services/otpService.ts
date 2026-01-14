
/**
 * OTP & Activity Service Gateways
 * Direct routing to your provided Google Apps Script endpoints.
 */

export interface OtpDeliveryPayload {
  email: string;
  mobile: string;
  emailCode: string;
  userName: string;
  status?: string;
  sessionId?: string;
  query?: string;
}

/** 
 * GATEWAY ENDPOINTS
 */
const SIGNUP_GATEWAY_URL = 'https://script.google.com/macros/s/AKfycbwZw-FNIPMTekXN1VNx6w6Obgrf0gpe_WFmyRaPxyY5Q0uUfVtkhmBbnhfyzKcCRocd/exec';
const ACTIVITY_GATEWAY_URL = 'https://script.google.com/macros/s/AKfycbzw1BcA67Bh9ITVMEcJGnUm2c2PNV-ELX4-_DvvqrtsYtSWKTptrrkf-GvIfvgq3u6W0g/exec';

/**
 * Universal dispatcher for Google Apps Script.
 * Uses URLSearchParams to ensure data lands correctly in GAS e.parameter.
 */
const postToGoogle = async (url: string, payload: any) => {
  const formBody = new URLSearchParams();
  Object.keys(payload).forEach(key => {
    const val = payload[key];
    formBody.append(key, val !== undefined && val !== null ? String(val).trim() : "N/A");
  });

  try {
    // 'no-cors' is required for browser-to-GAS communication
    return await fetch(url.trim(), {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString()
    });
  } catch (err) {
    console.error("Gateway Sync Error:", err);
    return null;
  }
};

/**
 * CONDITION: When "Verify Email" is clicked.
 * Logs to Registrations Sheet & triggers Email via Script 1.
 */
export const sendOtpViaGateway = async (payload: OtpDeliveryPayload): Promise<{ success: boolean; error?: string }> => {
  try {
    await postToGoogle(SIGNUP_GATEWAY_URL, {
        ...payload,
        status: 'OTP_DISPATCHED'
    });
    return { success: true };
  } catch (error: any) {
    return { success: true }; 
  }
};

/**
 * CONDITION: When 4-digit code is verified.
 * Logs to Registrations Sheet via Script 1.
 */
export const logInternRegistration = async (payload: OtpDeliveryPayload) => {
    return postToGoogle(SIGNUP_GATEWAY_URL, {
        ...payload,
        status: 'VERIFIED_SIGNUP'
    });
};

/**
 * CONDITION: Upon successful Login.
 * Logs to Activity Sheet via Script 2.
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
 * CONDITION: Every time a Chat message is sent.
 * Logs to Activity Sheet via Script 2.
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
 * Background Check: Used for Multi-device logout detection.
 */
export const fetchRemoteSessionId = async (email: string): Promise<string | null> => {
    try {
        const url = `${ACTIVITY_GATEWAY_URL.trim()}?email=${encodeURIComponent(email)}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.text();
        return (data === 'NOT_FOUND' || data === '' || data.includes('<!DOCTYPE')) ? null : data.trim();
    } catch (e) {
        return null;
    }
};
