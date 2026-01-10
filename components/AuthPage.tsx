
import React, { useState, useEffect, useRef } from 'react';
import { AuthCredentials, LoginResult } from '../hooks/useAuth';
import { sendOtpViaGateway } from '../services/otpService';

interface AuthPageProps {
  onLogin: (credentials: AuthCredentials) => Promise<LoginResult>;
  onFinalizeLogin: (userData: any) => void;
  onSignup: (credentials: AuthCredentials) => Promise<any>;
  error: string | null;
  isLoading: boolean;
}

type AuthViewMode = 'login' | 'signup' | 'otp' | 'success';

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onFinalizeLogin, onSignup, error: authError, isLoading }) => {
  const [viewMode, setViewMode] = useState<AuthViewMode>('login');
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'login'>('signup');
  const [pendingUser, setPendingUser] = useState<any>(null);
  
  const [generatedEmailOtp, setGeneratedEmailOtp] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [revealedCode, setRevealedCode] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  
  const [emailOtp, setEmailOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (authError) {
        setFormError(authError);
    }
  }, [authError]);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (viewMode === 'otp' && resendTimer === 0) setShowTroubleshoot(true);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resendTimer, viewMode]);

  const initiateRealDelivery = async (targetEmail: string, targetMobile: string, targetName: string) => {
    setIsDelivering(true);
    setFormError('');
    setShowTroubleshoot(false);
    setRevealedCode(false);

    const eOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedEmailOtp(eOtp);

    try {
        const result = await sendOtpViaGateway({
          email: targetEmail,
          mobile: targetMobile,
          emailCode: eOtp,
          userName: targetName || 'OSM User'
        });

        if (result.success) {
          setViewMode('otp');
          setResendTimer(15); // Faster resend for testing
        } else {
          setFormError(result.error || "Delivery failed.");
        }
    } catch (e) {
        setFormError("Check your internet connection or script settings.");
    } finally {
        setIsDelivering(false);
    }
  };

  const clearForm = () => {
    setName('');
    setEmail('');
    setMobile('');
    setPassword('');
    setFormError('');
    setEmailOtp('');
    setPendingUser(null);
    setGeneratedEmailOtp('');
    setShowTroubleshoot(false);
    setRevealedCode(false);
  };

  const validateEmail = (e: string) => e.toLowerCase().endsWith('@omegaseikimobility.com');

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!name || !email || !mobile || !password) {
        setFormError("All information is required.");
        return;
    }
    if (!validateEmail(email)) {
        setFormError("Error: Only @omegaseikimobility.com emails allowed.");
        return;
    }
    
    const success = await onSignup({ name, email, mobile, password });
    if (success) {
        setOtpPurpose('signup');
        setPendingUser({ name, email, mobile });
        initiateRealDelivery(email, mobile, name);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const result = await onLogin({ email, password });
    if (result.success && result.mfaRequired) {
        setPendingUser(result.tempUser);
        setOtpPurpose('login');
        initiateRealDelivery(result.tempUser.email, result.tempUser.mobile, result.tempUser.name);
    }
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setFormError('');

    setTimeout(() => {
        if (emailOtp === generatedEmailOtp) {
            if (otpPurpose === 'signup') {
                setViewMode('success'); 
            } else {
                onFinalizeLogin(pendingUser);
            }
        } else {
            setFormError("Invalid code. Please try again.");
            setEmailOtp('');
        }
        setIsVerifying(false);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4">
        {viewMode === 'signup' && (
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-2xl slide-in">
                <div className="mb-8 border-b pb-4">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Registration</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Service Intern Onboarding</p>
                </div>
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-600 outline-none font-bold text-slate-900" placeholder="John Doe" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Official Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-600 outline-none font-bold text-slate-900" placeholder="id@omegaseikimobility.com" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Mobile</label>
                        <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-600 outline-none font-bold text-slate-900" placeholder="+91 XXXX XXXX" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-600 outline-none font-bold text-slate-900" placeholder="••••••••" required />
                    </div>
                    {formError && <div className="p-4 bg-red-50 text-red-600 text-[11px] font-bold rounded-2xl border border-red-100">{formError}</div>}
                    <button type="submit" disabled={isLoading || isDelivering} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-green-700 transition-all shadow-xl disabled:bg-slate-300">
                        {isDelivering ? 'Delivering OTP...' : (isLoading ? 'Processing...' : 'Register Now')}
                    </button>
                </form>
                <div className="mt-8 text-center">
                    <button onClick={() => { setViewMode('login'); clearForm(); }} className="text-xs font-bold text-slate-400 hover:text-green-600 uppercase tracking-widest">Already have an account? <span className="underline font-black text-slate-600 ml-1">Login</span></button>
                </div>
            </div>
        )}

        {viewMode === 'otp' && (
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-2xl slide-in">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900">OTP Sent</h2>
                    <p className="text-slate-500 text-[11px] font-bold mt-2 uppercase tracking-widest">Verify identity to continue</p>
                </div>

                <form onSubmit={handleOtpVerify} className="space-y-8">
                    <div className="relative group">
                        <input type="text" maxLength={4} value={emailOtp} onChange={e => setEmailOtp(e.target.value)} className="w-full text-center py-6 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-green-100 outline-none font-black text-5xl text-slate-900 tracking-[0.6em] transition-all" placeholder="----" required />
                        {revealedCode && (
                          <div className="absolute -top-10 left-0 right-0 text-center text-xs font-black text-green-600 bg-green-50 py-1 rounded-full animate-bounce">
                            CODE: {generatedEmailOtp}
                          </div>
                        )}
                    </div>
                    
                    {formError && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 text-center">{formError}</div>}
                    
                    <button type="submit" disabled={isVerifying || isDelivering} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-green-700 shadow-xl">
                        {isVerifying ? 'Verifying...' : 'Validate & Open Portal'}
                    </button>

                    <div className="flex flex-col gap-4 text-center">
                        <button type="button" disabled={resendTimer > 0} onClick={() => initiateRealDelivery(pendingUser?.email, pendingUser?.mobile, pendingUser?.name)} className={`text-[11px] font-black uppercase tracking-[0.1em] ${resendTimer > 0 ? 'text-slate-300' : 'text-slate-500 hover:text-green-600'}`}>
                            {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Request New OTP'}
                        </button>

                        <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Didn't get the email?</p>
                            <ul className="text-[11px] text-slate-500 space-y-2 font-bold leading-tight">
                                <li className="flex gap-2"><span>1.</span> Check **Spam** folder.</li>
                                <li className="flex gap-2"><span>2.</span> Ensure Script Access is **"Anyone"**.</li>
                                <li className="flex gap-2 text-green-700">
                                   <button type="button" onClick={() => setRevealedCode(true)} className="underline hover:text-green-900">3. Click here to reveal code for testing.</button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </form>
            </div>
        )}

        {viewMode === 'success' && (
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2.5rem] p-12 shadow-2xl text-center slide-in">
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Success!</h2>
                <p className="text-slate-500 text-sm mb-10 font-bold uppercase tracking-widest">Identity Verified</p>
                <button onClick={() => { setViewMode('login'); clearForm(); }} className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-green-700 shadow-xl">
                    Back to Login
                </button>
            </div>
        )}

        {viewMode === 'login' && (
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-2xl slide-in">
                <div className="text-center mb-10">
                    <div className="inline-block bg-green-600 p-3 rounded-2xl mb-4 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">OSM Hub</h2>
                    <p className="text-slate-500 text-[10px] mt-1 font-black uppercase tracking-[0.3em] opacity-60">Service Intelligence Portal</p>
                </div>
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Email ID</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-50 outline-none font-bold text-slate-900 transition-all" placeholder="id@omegaseikimobility.com" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-50 outline-none font-bold text-slate-900 transition-all" placeholder="••••••••" required />
                    </div>
                    {formError && <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 text-center">{formError}</div>}
                    <button type="submit" disabled={isLoading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 shadow-xl transition-all">
                        {isLoading ? 'Authenticating...' : 'Enter Hub'}
                    </button>
                </form>
                <div className="mt-10 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        New Intern? <button onClick={() => { setViewMode('signup'); clearForm(); }} className="ml-2 text-green-600 hover:underline font-black">Register Account</button>
                    </p>
                </div>
            </div>
        )}
    </div>
  );
};

export default AuthPage;
