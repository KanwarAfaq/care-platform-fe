import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { usePageMeta } from '../lib/usePageMeta';

const ALLOWED = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);

/** Requires a Supabase sign-in (and, if VITE_ADMIN_EMAILS is set, an allow-listed email) before showing the admin UI.
 *  Note: this only hides the UI. Row Level Security on `care_centers` must also restrict writes to admins. */
export default function AdminGate({ children }: { children: ReactNode }) {
  usePageMeta({ title: '管理後台｜桃園長照導航站', description: '機構資料管理後台', path: '/admin', noindex: true });
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError('登入失敗，請確認帳號密碼。');
  };

  if (!ready) return <div className="p-10 text-center text-gray-500">載入中...</div>;

  const allowed = session && (ALLOWED.length === 0 || ALLOWED.includes((session.user.email || '').toLowerCase()));
  if (session && !allowed) {
    return (
      <div className="p-10 text-center space-y-3">
        <p className="text-red-600 font-semibold">此帳號沒有管理權限。</p>
        <button className="text-blue-600 underline" onClick={() => supabase.auth.signOut()}>登出</button>
      </div>
    );
  }
  if (!session) {
    return (
      <form onSubmit={signIn} className="max-w-sm mx-auto mt-24 bg-white p-6 rounded-xl shadow border space-y-4">
        <h1 className="text-xl font-bold">管理員登入</h1>
        <label className="block text-sm">電子郵件<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full p-2 border rounded-lg" /></label>
        <label className="block text-sm">密碼<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full p-2 border rounded-lg" /></label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">登入</button>
      </form>
    );
  }
  return (
    <>
      <div className="flex justify-end px-6 pt-4 text-sm text-gray-500 gap-3">
        <span>{session.user.email}</span>
        <button className="text-blue-600 underline" onClick={() => supabase.auth.signOut()}>登出</button>
      </div>
      {children}
    </>
  );
}
