
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
// UPDATED: Using the new URL provided by the user
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxw5f15p8wF7annhM7414owKJkjWZljslS9bS2xWCSbwBvMQwkB2Fnc9A_JnomTVAKi/exec';

export const sendOtpViaGateway = async (payload: OtpDeliveryPayload): Promise<{ success: boolean; error?: string }> => {
  try {
    if (USE_FREE_GOOGLE_SCRIPT) {
        // We use URLSearchParams which sends data as 'application/x-www-form-urlencoded'
        // This is the most robust way to trigger Google Apps Script doPost(e)
        const formData = new URLSearchParams();
        formData.append('email', payload.email);
        formData.append('mobile', payload.mobile);
        formData.append('emailCode', payload.emailCode);
        formData.append('userName', payload.userName);

        console.log("Dispatching OTP to:", GOOGLE_SCRIPT_URL);

        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Crucial for cross-domain Google Script triggers
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded', 
            },
            body: formData.toString(),
        });

        // With no-cors, we assume the hit was successful.
        return { success: true };
    }

    return { success: false, error: "Gateway not configured." };
  } catch (error: any) {
    console.error('OTP Dispatch Error:', error);
    return { 
      success: false, 
      error: 'Network error. Please check your internet or Google Script access.' 
    };
  }
};
