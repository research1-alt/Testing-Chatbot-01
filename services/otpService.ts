
/**
 * OTP Service Gateway
 * Handles communication with Google Apps Script for email delivery.
 */

export interface OtpDeliveryPayload {
  email: string;
  mobile: string;
  emailCode: string;
  userName: string;
}

const USE_FREE_GOOGLE_SCRIPT = true; 

/** 
 * LIVE GOOGLE WEB APP URL
 * This URL connects the app to your Google account for sending emails.
 */
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzXbhNym4nzvxKa_vp6sVQdmVKgvlyuYi1DG-EeIeRWqxk_vCTRdHExVIj4qNHbRKloTA/exec';

export const sendOtpViaGateway = async (payload: OtpDeliveryPayload): Promise<{ success: boolean; error?: string }> => {
  try {
    if (USE_FREE_GOOGLE_SCRIPT) {
        const formData = new URLSearchParams();
        formData.append('email', payload.email);
        formData.append('mobile', payload.mobile);
        formData.append('emailCode', payload.emailCode);
        formData.append('userName', payload.userName);

        console.log("--- OTP DISPATCH INITIATED ---");
        console.log("Targeting Live Gateway:", GOOGLE_SCRIPT_URL);
        
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
    }

    return { success: false, error: "Gateway not configured." };
  } catch (error: any) {
    console.error('OTP Dispatch Critical Error:', error);
    return { 
      success: false, 
      error: 'Network failure. Ensure your Google Script is deployed to "Anyone".' 
    };
  }
};
