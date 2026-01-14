
import React, { useState, useEffect, useRef } from 'react';
import { AuthCredentials, LoginResult } from '../hooks/useAuth';
import { sendOtpViaGateway } from '../services/otpService';

interface AuthPageProps {
  onLogin: (credentials: AuthCredentials) => Promise<LoginResult>;
  onFinalizeLogin: (userData: any) => void;
  onSignup: (credentials: AuthCredentials) => Promise<any>;
  commitSignup: (credentials: AuthCredentials) => Promise<boolean>;
  checkEmailExists: (email: string) => any | null;
  resetPassword: (email: string, newPass: string) => Promise<boolean>;
  error: string | null;
  isLoading: boolean;
  logoUrl: string;
}

type AuthViewMode = 'login' | 'signup' | 'otp' | 'forgot-password' | 'reset-password';

const AuthPage: React.FC<AuthPageProps> = ({ 
    onLogin, onFinalizeLogin, onSignup, commitSignup, 
    checkEmailExists, resetPassword, error: authError, isLoading,
    logoUrl
}) => {
  const [viewMode, setViewMode] = useState<AuthViewMode>('login');
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'reset'>('signup');
  const [pendingUser, setPendingUser] = useState<AuthCredentials | null>(null);
  
  const [generatedEmailOtp, setGeneratedEmailOtp] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(0);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    const eOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedEmailOtp(eOtp);

    try {
        const result = await sendOtpViaGateway({
          email: targetEmail.toLowerCase().trim(),
          mobile: targetMobile,
          emailCode: eOtp,
          userName: targetName || 'OSM Intern'
        });

        if (result.success) {
          setViewMode('otp');
          setResendTimer(30);
        } else {
          setFormError(result.error || "Network delay. Please check your connection.");
        }
    } catch (e: any) {
        console.warn("Gateway communication error, moving to OTP screen using console fallback.", e);
        // If we have an OTP generated, don't block the user.
        setViewMode('otp');
        setResendTimer(30);
    } finally {
        setIsDelivering(false);
    }
  };

  const clearForm = () => {
    setName(''); setEmail(''); setMobile(''); setPassword(''); setConfirmPassword('');
    setFormError(''); setEmailOtp(''); setPendingUser(null);
    setGeneratedEmailOtp('');
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDelivering || isLoading) return;
    setFormError('');
    
    if (!name || !email || !mobile || !password) {
        setFormError("All fields are mandatory.");
        return;
    }
    
    if (!email.toLowerCase().trim().endsWith('@omegaseikimobility.com')) {
        setFormError("Restricted: Use @omegaseikimobility.com only.");
        return;
    }
    
    // Check if onSignup actually finished correctly
    try {
        const isValid = await onSignup({ name, email, mobile, password });
        if (isValid === true) {
            setOtpPurpose('signup');
            setPendingUser({ name, email, mobile, password });
            await initiateOtpDelivery(email, mobile, name);
        }
    } catch (err) {
        setFormError("Validation failed. Please try again.");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!email || !password) {
        setFormError("Mail id and password required.");
        return;
    }

    const result = await onLogin({ email: email.toLowerCase().trim(), password });
    if (result.success && result.tempUser) {
        onFinalizeLogin(result.tempUser);
    } else if (result.error) {
        setFormError(result.error);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!email) {
        setFormError("Mail id is required.");
        return;
    }

    const existingUser = checkEmailExists(email);
    if (existingUser) {
        setOtpPurpose('reset');
        setPendingUser({ email: existingUser.email, name: existingUser.name, mobile: existingUser.mobile });
        await initiateOtpDelivery(existingUser.email, existingUser.mobile, existingUser.name);
    } else {
        setFormError("This Mail id is not registered.");
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!password || !confirmPassword) {
        setFormError("Both password fields are required.");
        return;
    }
    if (password !== confirmPassword) {
        setFormError("Passwords do not match.");
    } else if (password.length < 6) {
        setFormError("Password must be at least 6 characters.");
    } else {
        const success = await resetPassword(pendingUser?.email || '', password);
        if (success) {
            alert("Password updated successfully! You can now login.");
            setViewMode('login');
            clearForm();
        } else {
            setFormError("Failed to update password.");
        }
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
                setFormError("Registry synchronization failed.");
            }
        } else if (otpPurpose === 'reset') {
            setViewMode('reset-password');
            setEmailOtp('');
        }
    } else {
        setFormError("Incorrect 4-digit code.");
        setEmailOtp('');
    }
    setIsVerifying(false);
  };

  return (
    <div className="min-h-screen w-full bg-sky-50 flex items-center justify-center p-4 font-sans text-slate-900">
        {viewMode === 'signup' && (
            <div className="max-w-[420px] w-full bg-white border border-sky-100/50 rounded-[3rem] p-10 shadow-2xl slide-in">
                <div className="mb-10 text-center">
                    <img src={logoUrl} alt="OSM Logo" className="h-16 w-auto object-contain mx-auto mb-4 select-none pointer-events-none" style={{ mixBlendMode: 'multiply' }} />
                    <h2 className="text-[#00aeef] text-[11px] font-black uppercase tracking-[0.2em]">Register Intern</h2>
                </div>
                <form onSubmit={handleSignupSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[#00aeef] uppercase tracking-widest block px-1">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-4 bg-[#f0f9ff] border border-sky-100 rounded-2xl focus:ring-2 focus:ring-[#00aeef] focus:bg-white outline-none font-bold text-slate-800 transition-all" placeholder="Enter full name" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[#00aeef] uppercase tracking-widest block px-1">Mail id</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 bg-[#f0f9ff] border border-sky-100 rounded-2xl focus:ring-2 focus:ring-[#00aeef] focus:bg-white outline-none font-bold text-slate-800 transition-all" placeholder="id@omegaseikimobility.com" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[#00aeef] uppercase tracking-widest block px-1">Mobile</label>
                        <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full px-5 py-4 bg-[#f0f9ff] border border-sky-100 rounded-2xl focus:ring-2 focus:ring-[#00aeef] focus:bg-white outline-none font-bold text-slate-800 transition-all" placeholder="91XXXXXXXX" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[#00aeef] uppercase tracking-widest block px-1">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-5 py-4 bg-[#f0f9ff] border border-sky-100 rounded-2xl focus:ring-2 focus:ring-[#00aeef] focus:bg-white outline-none font-bold text-slate-800 transition-all" placeholder="••••••••" required />
                    </div>
                    {formError && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-2xl border border-red-100 text-center uppercase tracking-widest">{formError}</div>}
                    <button type="submit" disabled={isLoading || isDelivering} className="w-full py-5 bg-[#0088cc] text-white rounded-2xl font-black text-[13px] uppercase tracking-[0.2em] hover:bg-[#0077b3] shadow-lg transition-all active:scale-[0.98] disabled:opacity-50">
                        {isDelivering ? 'CONNECTING GATEWAY...' : 'VERIFY EMAIL'}
                    </button>
                </form>
                <div className="mt-8 text-center">
                    <button onClick={() => { setViewMode('login'); clearForm(); }} className="text-[11px] font-bold text-[#00aeef] hover:text-[#0088cc] uppercase tracking-widest transition-all">
                        ALREADY REGISTERED? <span className="underline font-black text-slate-700">LOGIN</span>
                    </button>
                </div>
            </div>
        )}

        {viewMode === 'login' && (
            <div className="max-w-[420px] w-full bg-white border border-sky-100/50 rounded-[3rem] p-10 shadow-2xl slide-in">
                <div className="text-center mb-10">
                    <img src={logoUrl} alt="OSM Logo" className="h-20 mx-auto mb-4 object-contain select-none pointer-events-none" style={{ mixBlendMode: 'multiply' }} />
                    <h2 className="text-[#00aeef] text-[11px] font-black uppercase tracking-[0.3em]">Field Intelligence Portal</h2>
                </div>
                <form onSubmit={handleLoginSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[#00aeef] uppercase tracking-widest block px-1">Mail id</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 bg-[#f0f9ff] border border-sky-100 rounded-2xl focus:ring-2 focus:ring-[#00aeef] focus:bg-white outline-none font-bold text-slate-800 transition-all" placeholder="id@omegaseikimobility.com" required />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[11px] font-black text-[#00aeef] uppercase tracking-widest block">Password</label>
                            <button type="button" onClick={() => { setViewMode('forgot-password'); clearForm(); }} className="text-[10px] font-black text-[#00aeef] hover:underline uppercase">Forgot?</button>
                        </div>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-5 py-4 bg-[#f0f9ff] border border-sky-100 rounded-2xl focus:ring-2 focus:ring-[#00aeef] focus:bg-white outline-none font-bold text-slate-800 transition-all" placeholder="••••••••" required />
                    </div>
                    {formError && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-2xl border border-red-100 text-center uppercase tracking-widest">{formError}</div>}
                    <button type="submit" disabled={isLoading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[13px] uppercase tracking-[0.2em] hover:bg-black shadow-xl transition-all active:scale-[0.98]">
                        {isLoading ? 'VERIFYING...' : 'LOGIN'}
                    </button>
                </form>
                <div className="mt-10 text-center border-t border-slate-50 pt-8">
                    <p className="text-[11px] font-bold text-[#00aeef] uppercase tracking-widest">
                        NEW USER? <button onClick={() => { setViewMode('signup'); clearForm(); }} className="ml-1 text-slate-800 underline font-black hover:text-black">REGISTER NOW</button>
                    </p>
                </div>
            </div>
        )}

        {viewMode === 'forgot-password' && (
            <div className="max-w-md w-full bg-white border border-sky-100 rounded-[3rem] p-10 shadow-2xl slide-in">
                <div className="mb-8 text-center">
                    <img src={logoUrl} alt="OSM Logo" className="h-16 w-auto object-contain mx-auto mb-4 select-none pointer-events-none" style={{ mixBlendMode: 'multiply' }} />
                    <h2 className="text-[#00aeef] text-[11px] font-black uppercase tracking-widest">Reset Password</h2>
                </div>
                <p className="text-slate-500 text-[11px] font-bold text-center mb-8 leading-relaxed uppercase tracking-wide">Enter your registered Mail id to receive a verification OTP.</p>
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[#00aeef] uppercase tracking-widest block px-1">Mail id</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-5 py-4 bg-[#f0f9ff] border border-sky-100 rounded-2xl focus:ring-2 focus:ring-[#00aeef] outline-none font-bold text-slate-800" placeholder="id@omegaseikimobility.com" required />
                    </div>
                    {formError && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-2xl border border-red-100 text-center uppercase tracking-widest">{formError}</div>}
                    <button type="submit" disabled={isDelivering} className="w-full py-5 bg-[#0088cc] text-white rounded-2xl font-black text-[13px] uppercase tracking-[0.2em] hover:bg-[#0077b3] shadow-lg transition-all">
                        {isDelivering ? 'SENDING OTP...' : 'SEND OTP'}
                    </button>
                    <button type="button" onClick={() => { setViewMode('login'); clearForm(); }} className="w-full text-[11px] font-black text-[#00aeef] hover:underline uppercase tracking-widest text-center mt-4">Back to login</button>
                </form>
            </div>
        )}

        {viewMode === 'otp' && (
            <div className="max-w-md w-full bg-white border border-sky-100 rounded-[3rem] p-10 shadow-2xl slide-in">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-sky-50 text-[#00aeef] rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Check Email</h2>
                    <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-widest leading-relaxed">Identity Check: {pendingUser?.email}</p>
                </div>

                <form onSubmit={handleOtpVerify} className="space-y-8">
                    <div className="relative">
                        <input type="text" maxLength={4} value={emailOtp} onChange={e => setEmailOtp(e.target.value)} className="w-full text-center py-6 bg-[#f0f9ff] border border-sky-100 rounded-[2rem] focus:ring-4 focus:ring-sky-100 outline-none font-black text-5xl text-slate-900 tracking-[0.5em]" placeholder="----" required />
                    </div>
                    
                    {formError && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-2xl border border-red-100 text-center uppercase tracking-widest">{formError}</div>}
                    
                    <button type="submit" disabled={isVerifying || isDelivering} className="w-full py-5 bg-[#0088cc] text-white rounded-2xl font-black text-[13px] uppercase tracking-[0.2em] hover:bg-[#0077b3] shadow-lg transition-all">
                        {isVerifying ? 'VERIFYING...' : 'ACTIVATE ACCOUNT'}
                    </button>

                    <div className="flex flex-col gap-4 text-center">
                        <button type="button" disabled={resendTimer > 0} onClick={() => initiateOtpDelivery(pendingUser?.email!, pendingUser?.mobile!, pendingUser?.name!)} className={`text-[11px] font-black uppercase tracking-[0.1em] transition-all ${resendTimer > 0 ? 'text-sky-200' : 'text-[#00aeef] hover:underline'}`}>
                            {resendTimer > 0 ? `RESEND IN ${resendTimer}S` : 'RESEND OTP EMAIL'}
                        </button>
                    </div>
                </form>
            </div>
        )}

        {viewMode === 'reset-password' && (
            <div className="max-w-md w-full bg-white border border-sky-100 rounded-[3rem] p-10 shadow-2xl slide-in">
                <div className="mb-10 text-center">
                    <img src={logoUrl} alt="OSM Logo" className="h-16 w-auto object-contain mx-auto mb-4 select-none pointer-events-none" style={{ mixBlendMode: 'multiply' }} />
                    <h2 className="text-[#00aeef] text-[11px] font-black uppercase tracking-widest">Set New Password</h2>
                </div>
                <form onSubmit={handleResetPasswordSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[#00aeef] uppercase tracking-widest block px-1">New Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-5 py-4 bg-[#f0f9ff] border border-sky-100 rounded-2xl focus:ring-2 focus:ring-[#00aeef] outline-none font-bold text-slate-800" placeholder="••••••••" required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-[#00aeef] uppercase tracking-widest block px-1">Confirm Password</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-5 py-4 bg-[#f0f9ff] border border-sky-100 rounded-2xl focus:ring-2 focus:ring-[#00aeef] outline-none font-bold text-slate-800" placeholder="••••••••" required />
                    </div>
                    {formError && <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black rounded-2xl border border-red-100 text-center uppercase tracking-widest">{formError}</div>}
                    <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[13px] uppercase tracking-[0.2em] hover:bg-black shadow-lg transition-all">
                        SAVE NEW PASSWORD
                    </button>
                </form>
            </div>
        )}
    </div>
  );
};

export default AuthPage;
