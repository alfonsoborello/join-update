import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, signIn, logout } from './firebase';
import { User } from './types';
import { generatePoeticKey } from './lib/poeticKeys';
import { Logo } from './components/Logo';
import { UpdateFeed } from './components/UpdateFeed';
import { PrivateUpdates } from './components/PrivateUpdates';
import { AdminMatrix } from './components/AdminMatrix';
import { LogIn, LogOut, Shield, MessageSquare, Rss, User as UserIcon, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Layout: React.FC<{ 
  children: React.ReactNode; 
  user: User | null; 
  onLogin: () => void; 
  onLogout: () => void;
  onUpdateLanguage: (lang: string) => void;
}> = ({ children, user, onLogin, onLogout, onUpdateLanguage }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname === '/the-matrix';
  const [isIdle, setIsIdle] = useState(false);
  const [isEditingLang, setIsEditingLang] = useState(false);
  const [tempLang, setTempLang] = useState(user?.preferredLanguage || 'English');

  useEffect(() => {
    if (user?.preferredLanguage) {
      setTempLang(user.preferredLanguage);
    }
  }, [user?.preferredLanguage]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      setIsIdle(false);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsIdle(true), 10000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('scroll', resetTimer);

    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      clearTimeout(timeoutId);
    };
  }, []);

  if (isAdminRoute) return <>{children}</>;

  return (
    <motion.div 
      animate={{ opacity: isIdle ? 0.4 : 1 }}
      transition={{ duration: isIdle ? 5 : 2, ease: "easeInOut" }}
      className="min-h-screen flex flex-col bg-black text-[#CCCCCC]"
    >
      <header className="py-12 border-b border-[#CCCCCC]/5">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center gap-8">
          <Link to="/">
            <Logo />
          </Link>
          
          <nav className="flex items-center gap-8 text-[10px] uppercase tracking-[0.3em] font-mono">
            <Link to="/" className={`hover:text-[#CCCCCC] transition-colors ${location.pathname === '/' ? 'text-[#CCCCCC] font-bold' : 'text-[#CCCCCC]/40'}`}>
              Broadcast
            </Link>
            {user && (
              <Link to="/private" className={`hover:text-[#CCCCCC] transition-colors ${location.pathname === '/private' ? 'text-[#CCCCCC] font-bold' : 'text-[#CCCCCC]/40'}`}>
                Private
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/the-matrix" className="text-red-600/40 hover:text-red-600 transition-colors">
                Matrix
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="py-12 border-t border-[#CCCCCC]/5">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center gap-6">
          {user ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-6">
                <div className="text-[10px] font-mono text-[#CCCCCC]/40 uppercase tracking-widest">
                  Key: <span className="text-[#CCCCCC] font-bold">{user.poeticKey}</span>
                </div>
                
                <div className="flex items-center gap-2 text-[10px] font-mono text-[#CCCCCC]/40 uppercase tracking-widest">
                  <Globe size={10} />
                  {isEditingLang ? (
                    <input
                      autoFocus
                      type="text"
                      value={tempLang}
                      onChange={(e) => setTempLang(e.target.value)}
                      onBlur={() => {
                        setIsEditingLang(false);
                        onUpdateLanguage(tempLang);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsEditingLang(false);
                          onUpdateLanguage(tempLang);
                        }
                      }}
                      className="bg-transparent border-b border-[#CCCCCC]/20 focus:outline-none text-[#CCCCCC] w-24 lowercase"
                    />
                  ) : (
                    <span 
                      onClick={() => setIsEditingLang(true)}
                      className="text-[#CCCCCC] cursor-pointer hover:text-white transition-colors lowercase"
                    >
                      {user.preferredLanguage || 'English'}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={onLogout}
                className="text-[10px] font-mono text-[#CCCCCC]/20 hover:text-[#CCCCCC] transition-colors uppercase tracking-widest flex items-center gap-1"
              >
                <LogOut size={10} />
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="px-8 py-3 bg-[#CCCCCC] text-black text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-[#CCCCCC]/90 transition-all flex items-center gap-2"
            >
              <LogIn size={12} />
              Join Update
            </button>
          )}
        </div>
      </footer>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
          // Create new user with poetic key
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            poeticKey: generatePoeticKey(),
            role: firebaseUser.email === 'alfonsoborello@gmail.com' ? 'admin' : 'user'
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleUpdateLanguage = async (lang: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        preferredLanguage: lang
      });
      setUser({ ...user, preferredLanguage: lang });
    } catch (error) {
      console.error('Error updating language:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-[10px] font-mono tracking-[0.5em] text-[#CCCCCC]/20 animate-pulse">
          INITIALIZING_UPDATE...
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout}
        onUpdateLanguage={handleUpdateLanguage}
      >
        <Routes>
          <Route path="/" element={<UpdateFeed user={user} />} />
          <Route path="/private" element={user ? <PrivateUpdates user={user} /> : <UpdateFeed user={null} />} />
          <Route path="/the-matrix" element={user ? <AdminMatrix user={user} /> : <div className="h-screen bg-black" />} />
        </Routes>
      </Layout>
    </Router>
  );
}
