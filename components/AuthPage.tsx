
import React, { useState, useEffect, useRef } from 'react';
import { AuthCredentials, LoginResult } from '../hooks/useAuth';
import { sendOtpViaGateway } from '../services/otpService';

// Added logoUrl to AuthPageProps to fix type error in App.tsx
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
    logoUrl // Destructured logoUrl
}) => {
  const [viewMode, setViewMode] = useState<AuthViewMode>('login');
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'reset'>('signup');
  const [pendingUser, setPendingUser] = useState<AuthCredentials | null>(null);
  
  const [generatedEmailOtp, setGeneratedEmailOtp] = useState<string>('');
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [revealedCode, setRevealedCode] = useState(false);
  
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
    setName(''); setEmail(''); setMobile(''); setPassword(''); setConfirmPassword('');
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
        setFormError("Mail id and password required.");
        return;
    }

    const result = await onLogin({ email, password });
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
        initiateOtpDelivery(existingUser.email, existingUser.mobile, existingUser.name);
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
        return;
    }
    if (password.length < 6) {
        setFormError("Password must be at least 6 characters.");
        return;
    }

    const success = await resetPassword(pendingUser?.email || '', password);
    if (success) {
        alert("Password updated successfully! You can now login.");
        setViewMode('login');
        clearForm();
    } else {
        setFormError("Failed to update password. Try again.");
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
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
        {viewMode === 'signup' && (
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl slide-in">
                <div className="mb-6 text-center">
                    {/* Replaced text with logoUrl image */}
                    <img src={logoUrl} alt="OSM Logo" className="h-10 w-auto object-contain mx-auto mb-2" />
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Register Intern</p>
                </div>
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600 outline-none font-bold text-slate-900" placeholder="Required" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Mail id</label>
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
                    <button onClick={() => { setViewMode('login'); clearForm(); }} className="text-[10px] font-black text-slate-400 hover:text-green-600 uppercase tracking-widest">Already registered? <span className="underline font-black text-slate-600">login</span></button>
                </div>
            </div>
        )}

        {viewMode === 'forgot-password' && (
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl slide-in">
                <div className="mb-6 text-center">
                    {/* Replaced text with logoUrl image */}
                    <img src={logoUrl} alt="OSM Logo" className="h-10 w-auto object-contain mx-auto mb-2" />
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Reset Password</p>
                </div>
                <p className="text-slate-500 text-[11px] font-bold text-center mb-6 leading-relaxed uppercase tracking-wide">Enter your registered Mail id to receive a verification OTP.</p>
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Mail id</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-green-50 outline-none font-bold text-slate-900" placeholder="id@omegaseikimobility.com" required />
                    </div>
                    {formError && <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 text-center">{formError}</div>}
                    <button type="submit" disabled={isDelivering} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 shadow-lg transition-all">
                        {isDelivering ? 'Processing...' : 'Send OTP'}
                    </button>
                    <button type="button" onClick={() => { setViewMode('login'); clearForm(); }} className="w-full text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest text-center mt-2">Back to login</button>
                </form>
            </div>
        )}

        {viewMode === 'reset-password' && (
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl slide-in">
                <div className="mb-6 text-center">
                    {/* Replaced text with logoUrl image */}
                    <img src={logoUrl} alt="OSM Logo" className="h-10 w-auto object-contain mx-auto mb-2" />
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Set New Password</p>
                </div>
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">New Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-green-50 outline-none font-bold text-slate-900" placeholder="••••••••" required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-green-50 outline-none font-bold text-slate-900" placeholder="••••••••" required />
                    </div>
                    {formError && <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 text-center">{formError}</div>}
                    <button type="submit" className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-green-700 shadow-lg transition-all">
                        Save New Password
                    </button>
                </form>
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
                    </div>
                    
                    {formError && <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 text-center">{formError}</div>}
                    
                    <button type="submit" disabled={isVerifying || isDelivering} className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-green-700 shadow-lg transition-all">
                        {isVerifying ? 'Verifying...' : 'Activate Account'}
                    </button>

                    <div className="flex flex-col gap-3 text-center">
                        <button type="button" disabled={resendTimer > 0} onClick={() => initiateOtpDelivery(pendingUser?.email!, pendingUser?.mobile!, pendingUser?.name!)} className={`text-[10px] font-black uppercase tracking-[0.1em] ${resendTimer > 0 ? 'text-slate-300' : 'text-slate-500 hover:text-green-600'}`}>
                            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Email'}
                        </button>
                    </div>
                </form>
            </div>
        )}

        {viewMode === 'login' && (
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl slide-in">
                <div className="text-center mb-8">
                    {/* Replaced text with logoUrl image */}
                    <img src={logoUrl} alt="OSM Logo" className="h-10 w-auto object-contain mx-auto mb-2" />
                    <p className="text-slate-400 text-[9px] mt-1 font-black uppercase tracking-[0.2em] opacity-60">Field Intelligence Portal</p>
                </div>
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Mail id</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-green-50 outline-none font-bold text-slate-900" placeholder="id@omegaseikimobility.com" required />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Password</label>
                            <button type="button" onClick={() => { setViewMode('forgot-password'); clearForm(); }} className="text-[9px] font-black text-green-600 hover:text-green-700 uppercase tracking-tighter">Forgot Password?</button>
                        </div>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-green-50 outline-none font-bold text-slate-900" placeholder="••••••••" required />
                    </div>
                    {formError && <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 text-center">{formError}</div>}
                    <button type="submit" disabled={isLoading} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 shadow-lg transition-all">
                        {isLoading ? 'Verifying...' : 'login'}
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
