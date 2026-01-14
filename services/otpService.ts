
/**
 * OTP Service & Registration Gateway
 * Handles communication with Google Apps Script for email delivery and spreadsheet logging.
 * 
 * Target Spreadsheet Name: "Active Session Infromation"
 */

export interface OtpDeliveryPayload {
  email: string;
  mobile: string;
  emailCode: string;
  userName: string;
  status?: string;
  timestamp?: string;
  sessionId?: string;
  query?: string;
}

/** 
 * GOOGLE WEB APP URL
 */
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkWa887L_vd0xDlJZtjsKfNEuVHwzT-uAV2RZkwtaVsC-TG9SZtdRG_O7n6GK9aqJRPg/exec';

/**
 * Standardized logging function.
 * Uses a POST request with parameters. If the sheet is still blank,
 * ensure the GAS code uses e.parameter.email, e.parameter.userName, etc.
 */
export const sendOtpViaGateway = async (payload: OtpDeliveryPayload): Promise<{ success: boolean; error?: string }> => {
  try {
    const sheetName = "Active Session Infromation";
    const timestamp = payload.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    
    // Constructing query string for maximum compatibility
    const queryParams = new URLSearchParams();
    queryParams.append('sheetName', sheetName);
    queryParams.append('timestamp', timestamp);
    queryParams.append('email', payload.email.toLowerCase().trim());
    queryParams.append('userName', payload.userName || 'N/A');
    queryParams.append('mobile', payload.mobile || 'N/A');
    queryParams.append('emailCode', payload.emailCode || 'N/A');
    queryParams.append('status', payload.status || 'LOG');
    queryParams.append('sessionId', payload.sessionId || 'N/A');
    queryParams.append('query', payload.query || 'N/A');

    // We send via POST but include params in URL as well for redundancy
    // mode: 'no-cors' is required because GAS redirects to a different domain for the result
    await fetch(`${GOOGLE_SCRIPT_URL}?${queryParams.toString()}`, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Spreadsheet Sync Error:', error);
    return { 
      success: false, 
      error: 'Connection to spreadsheet failed.' 
    };
  }
};

/**
 * Registers the current session ID in the cloud.
 */
export const syncSessionToCloud = async (email: string, sessionId: string) => {
    return sendOtpViaGateway({
        email,
        mobile: 'N/A',
        userName: 'User Login',
        emailCode: 'N/A',
        status: 'SESSION_SYNC',
        sessionId: sessionId
    });
};

/**
 * Logs a user technical query to the spreadsheet.
 */
export const logUserQuery = async (email: string, userName: string, query: string) => {
    return sendOtpViaGateway({
        email,
        userName,
        mobile: 'N/A',
        emailCode: 'N/A',
        status: 'USER_QUERY',
        query: query
    });
};

/**
 * Checks if the user's session is still the active one.
 */
export const fetchRemoteSessionId = async (email: string): Promise<string | null> => {
    try {
        const url = `${GOOGLE_SCRIPT_URL}?email=${encodeURIComponent(email)}&action=check_session&sheetName=${encodeURIComponent('Active Session Infromation')}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.text();
        return (data.includes("NOT_FOUND") || data.includes("ERROR")) ? null : data.trim();
    } catch (e) {
        return null;
    }
};

/**
 * Logs a verified intern signup.
 */
export const logInternRegistration = async (payload: OtpDeliveryPayload) => {
    return sendOtpViaGateway({
        ...payload,
        status: 'VERIFIED_SIGNUP',
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
};
