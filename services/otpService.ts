
/**
 * OTP Service Gateway
 * Handles communication with Google Apps Script for email delivery and signup logging.
 */

export interface OtpDeliveryPayload {
  email: string;
  mobile: string;
  emailCode: string;
  userName: string;
}

/** 
 * LIVE GOOGLE WEB APP URL
 * This URL connects the app to your Google account for sending emails and logging signups.
 */
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxfXzbCQ_tgtxHqAazUVZwk6sZC3Wmsp6hq2wf9f8VeRGlmU2q87KH4ISx2OsY5CrrweQ/exec';

export const sendOtpViaGateway = async (payload: OtpDeliveryPayload): Promise<{ success: boolean; error?: string }> => {
  try {
    const formData = new URLSearchParams();
    formData.append('email', payload.email);
    formData.append('mobile', payload.mobile);
    formData.append('emailCode', payload.emailCode);
    formData.append('userName', payload.userName);

    // Use 'no-cors' to avoid browser pre-flight blocks for script.google.com
    await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded', 
        },
        body: formData.toString(),
    });

    // Since we use no-cors, we assume success if no network error occurs.
    return { success: true };
  } catch (error: any) {
    console.error('OTP Dispatch Critical Error:', error);
    return { 
      success: false, 
      error: 'Network failure. Ensure your Google Script is deployed correctly.' 
    };
  }
};

/**
 * Specifically used to log verified signups to your Google Sheet.
 */
export const logInternRegistration = async (payload: OtpDeliveryPayload) => {
    return sendOtpViaGateway(payload);
};
