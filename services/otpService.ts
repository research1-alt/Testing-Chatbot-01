
/**
 * OTP Service & Registration Gateway
 * Handles communication with Google Apps Script for email delivery and spreadsheet logging.
 * 
 * Target Spreadsheet: https://docs.google.com/spreadsheets/d/1xItnaIxqCiXgP3IOuWxVZlVGRD543WV1IU2r67PEl3w/
 */

export interface OtpDeliveryPayload {
  email: string;
  mobile: string;
  emailCode: string;
  userName: string;
  status?: string;
  timestamp?: string;
}

/** 
 * GOOGLE WEB APP URL
 * This is the endpoint for your Google Apps Script deployment.
 */
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmwCesT3jwii8PONR_8X02WlzrxigdUDyacic9V2vqS1DafSnIpsx2rFlHxfvMyUC9Jw/exec';

export const sendOtpViaGateway = async (payload: OtpDeliveryPayload): Promise<{ success: boolean; error?: string }> => {
  try {
    const formData = new URLSearchParams();
    formData.append('email', payload.email);
    formData.append('mobile', payload.mobile);
    formData.append('emailCode', payload.emailCode || ''); 
    formData.append('userName', payload.userName);
    formData.append('status', payload.status || (payload.emailCode ? 'OTP_PENDING' : 'REGISTRATION_LOG'));
    formData.append('timestamp', payload.timestamp || new Date().toLocaleString());

    // Use 'no-cors' to allow cross-origin requests to Google Scripts.
    // Note: With no-cors, we won't be able to read the response body, 
    // but the request will still reach the script and execute successfully.
    await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded', 
        },
        body: formData.toString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Spreadsheet Gateway Error:', error);
    return { 
      success: false, 
      error: 'Connection to registration server failed. Please check your internet connection.' 
    };
  }
};

/**
 * Logs a verified intern signup to your Google Spreadsheet.
 */
export const logInternRegistration = async (payload: OtpDeliveryPayload) => {
    return sendOtpViaGateway({
        ...payload,
        status: 'VERIFIED_SIGNUP',
        timestamp: new Date().toLocaleString()
    });
};
