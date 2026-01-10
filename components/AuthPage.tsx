
import React, { useState, useEffect, useRef } from 'react';
import { AuthCredentials, LoginResult } from '../hooks/useAuth';
import { sendOtpViaGateway } from '../services/otpService';

interface AuthPageProps {
  onLogin: (credentials: AuthCredentials) => Promise<LoginResult>;
  onFinalizeLogin: (userData: any) => void;
  onSignup: (credentials: AuthCredentials) => Promise<any>;
  commitSignup: (credentials: AuthCredentials) => Promise<boolean>;
  error: string | null;
  isLoading: boolean;
}

type AuthViewMode = 'login' | 'signup' | 'otp';

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onFinalizeLogin, onSignup, commitSignup, error: authError, isLoading }) => {
  const [viewMode, setViewMode] = useState<AuthViewMode>('login');
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'login'>('signup');
  const [pendingUser, setPendingUser] = useState<AuthCredentials | null>(null);
  
  const [generatedEmailOtp, setGeneratedEmailOtp] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [revealedCode, setRevealedCode] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
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
    if (authError) setFormError(authError);
  }, [authError]);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resendTimer]);

  const initiateOtpDelivery = async (targetEmail: string, targetMobile: string, targetName: string) => {
    setIsDelivering(true);
    setFormError('');
    setRevealedCode(false);

    const eOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedEmailOtp(eOtp);

    try {
        const result = await sendOtpViaGateway({
          email: targetEmail,
          mobile: targetMobile,
          emailCode: eOtp,
          userName: targetName || 'OSM Intern'
        });

        if (result.success) {
          setViewMode('otp');
          setResendTimer(30);
        } else {
          setFormError(result.error || "Delivery trigger failed.");
        }
    } catch (e) {
        setFormError("Connection error while triggering OTP.");
    } finally {
        setIsDelivering(false);
    }
  };

  const clearForm = () => {
    setName(''); setEmail(''); setMobile(''); setPassword('');
    setFormError(''); setEmailOtp(''); setPendingUser(null);
    setGeneratedEmailOtp(''); setRevealedCode(false);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!name || !email || !mobile || !password) {
        setFormError("All fields are mandatory.");
        return;
    }
    if (!email.toLowerCase().endsWith('@omegaseikimobility.com')) {
        setFormError("Restricted: Use @omegaseikimobility.com only.");
        return;
    }
    
    const isValid = await onSignup({ name, email, mobile, password });
    if (isValid) {
        setOtpPurpose('signup');
        setPendingUser({ name, email, mobile, password });
        initiateOtpDelivery(email, mobile, name);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!email || !password) {
        setFormError("ID and password required.");
        return;
    }

    const result = await onLogin({ email, password });
    if (result.success && result.tempUser) {
        onFinalizeLogin(result.tempUser);
    } else if (result.error) {
        setFormError(result.error);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setFormError('');

    if (emailOtp === generatedEmailOtp) {
        if (otpPurpose === 'signup' && pendingUser) {
            const saved = await commitSignup(pendingUser);
            if (saved) {
                alert("Account Verified! Please login now.");
                setViewMode('login'); 
                clearForm();
            } else {
                setFormError("Error saving profile.");
            }
        } else {
            onFinalizeLogin(pendingUser);
        }
    } else {
        setFormError("Incorrect 4-digit code.");
        setEmailOtp('');
    }
    setIsVerifying(false);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
        {viewMode === 'signup' && (
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl slide-in">
                <div className="mb-6">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Register Intern</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Omega Seiki Mobility Hub</p>
                </div>
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600 outline-none font-bold text-slate-900" placeholder="Required" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Official Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600 outline-none font-bold text-slate-900" placeholder="@omegaseikimobility.com" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Mobile</label>
                        <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600 outline-none font-bold text-slate-900" placeholder="+91" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600 outline-none font-bold text-slate-900" placeholder="••••••••" required />
                    </div>
                    {formError && <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100">{formError}</div>}
                    <button type="submit" disabled={isLoading || isDelivering} className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-green-700 shadow-lg transition-all">
                        {isDelivering ? 'Connecting Gateway...' : 'Verify Email'}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <button onClick={() => { setViewMode('login'); clearForm(); }} className="text-[10px] font-black text-slate-400 hover:text-green-600 uppercase tracking-widest">Already registered? <span className="underline font-black text-slate-600">Login</span></button>
                </div>
            </div>
        )}

        {viewMode === 'otp' && (
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl slide-in">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Check Email</h2>
                    <p className="text-slate-500 text-[10px] font-bold mt-1 uppercase tracking-widest leading-relaxed">Identity Check for: {pendingUser?.email}</p>
                </div>

                <form onSubmit={handleOtpVerify} className="space-y-6">
                    <div className="relative">
                        <input type="text" maxLength={4} value={emailOtp} onChange={e => setEmailOtp(e.target.value)} className="w-full text-center py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-100 outline-none font-black text-4xl text-slate-900 tracking-[0.5em]" placeholder="----" required />
                        {revealedCode && (
                          <div className="absolute -top-10 left-0 right-0 text-center text-[10px] font-black text-white bg-slate-900 py-1 rounded-full animate-pulse shadow-xl">
                            BYPASS CODE: {generatedEmailOtp}
                          </div>
                        )}
                    </div>
                    
                    {formError && <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 text-center">{formError}</div>}
                    
                    <button type="submit" disabled={isVerifying || isDelivering} className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-green-700 shadow-lg transition-all">
                        {isVerifying ? 'Verifying...' : 'Activate Account'}
                    </button>

                    <div className="flex flex-col gap-3 text-center">
                        <button type="button" disabled={resendTimer > 0} onClick={() => initiateOtpDelivery(pendingUser?.email!, pendingUser?.mobile!, pendingUser?.name!)} className={`text-[10px] font-black uppercase tracking-[0.1em] ${resendTimer > 0 ? 'text-slate-300' : 'text-slate-500 hover:text-green-600'}`}>
                            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Email'}
                        </button>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left">
                            <button type="button" onClick={() => setShowGuide(!showGuide)} className="flex items-center justify-between w-full text-[10px] font-black text-slate-600 uppercase">
                                <span className="flex items-center gap-2">✅ GATEWAY CONNECTED</span>
                                <span>{showGuide ? '−' : '+'}</span>
                            </button>
                            
                            {showGuide && (
                                <div className="mt-3 space-y-4">
                                    <p className="text-[10px] text-slate-500 font-black leading-tight bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                        Your specific Google Apps Script URL is now successfully linked to this application.
                                    </p>
                                    <div className="text-[10px] font-bold text-slate-700 space-y-2 pl-2 border-l-2 border-green-500">
                                        <div>• Emails are sent via your verified script.</div>
                                        <div>• If no email appears, check your Spam folder.</div>
                                    </div>
                                    <button type="button" onClick={() => setRevealedCode(true)} className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all">Reveal Code (Dev Mode)</button>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        )}

        {viewMode === 'login' && (
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl slide-in">
                <div className="text-center mb-8">
                    <div className="inline-block bg-green-600 p-3 rounded-2xl mb-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">OSM Hub Login</h2>
                    <p className="text-slate-400 text-[9px] mt-1 font-black uppercase tracking-[0.2em] opacity-60">Field Intelligence Portal</p>
                </div>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Official ID</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-green-50 outline-none font-bold text-slate-900" placeholder="id@omegaseikimobility.com" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-green-50 outline-none font-bold text-slate-900" placeholder="••••••••" required />
                    </div>
                    {formError && <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 text-center">{formError}</div>}
                    <button type="submit" disabled={isLoading} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 shadow-lg transition-all">
                        {isLoading ? 'Verifying...' : 'Login to System'}
                    </button>
                </form>
                <div className="mt-8 text-center border-t pt-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        New? <button onClick={() => { setViewMode('signup'); clearForm(); }} className="ml-1 text-green-600 hover:underline font-black">Register Now</button>
                    </p>
                </div>
            </div>
        )}
    </div>
  );
};

export default AuthPage;
