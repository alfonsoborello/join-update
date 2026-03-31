import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { PublicUpdate, User } from '../types';
import { Share2, Trash2, Send, Languages, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { YouTubeEmbed } from './YouTubeEmbed';
import { GooglePlayBookEmbed } from './GooglePlayBookEmbed';
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const UpdateFeed: React.FC<{ user: User | null }> = ({ user }) => {
  const [updates, setUpdates] = useState<PublicUpdate[]>([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [loading, setLoading] = useState(true);
  const [translations, setTranslations] = useState<Record<string, { text: string; loading: boolean }>>({});

  useEffect(() => {
    const q = query(collection(db, 'publicUpdates'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PublicUpdate));
      setUpdates(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdate.trim() || !user || user.role !== 'admin') return;

    try {
      await addDoc(collection(db, 'publicUpdates'), {
        content: newUpdate,
        timestamp: serverTimestamp(),
        authorUid: user.uid
      });
      
      // Also log to activityLogs
      await addDoc(collection(db, 'activityLogs'), {
        timestamp: serverTimestamp(),
        senderKey: user.poeticKey,
        type: 'public'
      });

      setNewUpdate('');
    } catch (error) {
      console.error('Error posting update:', error);
    }
  };

  const handleDeleteUpdate = async (id: string) => {
    if (!user || user.role !== 'admin') return;
    try {
      await deleteDoc(doc(db, 'publicUpdates', id));
    } catch (error) {
      console.error('Error deleting update:', error);
    }
  };

  const handleShare = async (update: PublicUpdate) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'UPDATE',
          text: update.content,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(update.content);
      alert('Copied to clipboard');
    }
  };

  const handleTranslate = async (updateId: string, content: string) => {
    if (translations[updateId]?.text) {
      // Toggle off if already translated
      setTranslations(prev => {
        const next = { ...prev };
        delete next[updateId];
        return next;
      });
      return;
    }

    setTranslations(prev => ({
      ...prev,
      [updateId]: { text: '', loading: true }
    }));

    try {
      const targetLang = user?.preferredLanguage || 'English';
      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `Translate the following text to ${targetLang}. Return ONLY the translated text, no extra commentary:\n\n${content}` }] }],
        config: {
          temperature: 0.1,
        }
      });
      
      const translatedText = result.text || '';
      setTranslations(prev => ({
        ...prev,
        [updateId]: { text: translatedText, loading: false }
      }));
    } catch (error) {
      console.error('Translation error:', error);
      setTranslations(prev => {
        const next = { ...prev };
        delete next[updateId];
        return next;
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-12">
      {user?.role === 'admin' && (
        <form onSubmit={handlePostUpdate} className="mb-12">
          <div className="text-[9px] font-mono text-[#CCCCCC]/30 uppercase tracking-widest mb-1 ml-1">
            Signature: {user.poeticKey}
          </div>
          <textarea
            value={newUpdate}
            onChange={(e) => setNewUpdate(e.target.value)}
            placeholder={`Write an update as ${user.displayName || user.poeticKey}...`}
            className="w-full p-4 border border-[#CCCCCC] bg-black text-[#CCCCCC] focus:outline-none focus:ring-1 focus:ring-[#CCCCCC] resize-none h-32 font-sans"
          />
          <div className="flex justify-between items-center mt-2">
            <div className={`text-[9px] font-mono uppercase tracking-widest transition-opacity duration-500 ${newUpdate.length > 200 ? 'opacity-40' : 'opacity-0'}`}>
              Signal Strength: {Math.max(0, 300 - newUpdate.length)}
            </div>
            <button
              type="submit"
              disabled={newUpdate.length > 300}
              style={{ 
                opacity: newUpdate.length <= 250 
                  ? 1 
                  : newUpdate.length > 300 
                    ? 0 
                    : 1 - ((newUpdate.length - 250) / 50) * 0.8,
                pointerEvents: newUpdate.length > 300 ? 'none' : 'auto'
              }}
              className="bg-[#CCCCCC] text-black px-8 py-3 font-bold uppercase tracking-widest hover:bg-[#CCCCCC]/90 transition-all flex items-center justify-center gap-2"
            >
              <Send size={16} />
              Post Update
            </button>
          </div>
        </form>
      )}

      <div className="space-y-16">
        <AnimatePresence mode="popLayout">
          {updates.map((update, index) => (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: Math.max(0.2, 1 - index * 0.05), 
                y: 0 
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group relative"
            >
              <div className="text-lg leading-relaxed text-[#CCCCCC] font-sans whitespace-pre-wrap">
                {update.content}
              </div>

              {/* Translation Display */}
              <AnimatePresence>
                {translations[update.id] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 bg-[#CCCCCC]/5 border-l-2 border-[#CCCCCC]/20 italic text-[#CCCCCC]/80 text-sm"
                  >
                    {translations[update.id].loading ? (
                      <div className="flex items-center gap-2 animate-pulse">
                        <Loader2 size={12} className="animate-spin" />
                        <span>Translating...</span>
                      </div>
                    ) : (
                      translations[update.id].text
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Media Detection */}
              {(() => {
                const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
                const googleBooksRegex = /https?:\/\/(?:play\.google\.com\/store\/books\/details\?id=|books\.google\.com\/books\?id=)([a-zA-Z0-9_-]+)/;
                
                const ytMatch = update.content.match(youtubeRegex);
                if (ytMatch) {
                  return <YouTubeEmbed url={ytMatch[0]} />;
                }

                const gbMatch = update.content.match(googleBooksRegex);
                if (gbMatch) {
                  return <GooglePlayBookEmbed url={gbMatch[0]} />;
                }

                return null;
              })()}
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#CCCCCC]/40 uppercase tracking-wider">
                    {update.timestamp ? format(update.timestamp.toDate(), 'MMM d, yyyy · HH:mm') : 'Just now'}
                  </span>
                  <span className="text-sm text-[#666666] italic mt-1">
                    unhappy? join UPDATE
                  </span>
                </div>

                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleTranslate(update.id, update.content)}
                    className={`transition-colors ${translations[update.id] ? 'text-[#CCCCCC]' : 'text-[#CCCCCC]/40 hover:text-[#CCCCCC]'}`}
                    title="Translate"
                  >
                    <Languages size={16} />
                  </button>
                  <button
                    onClick={() => handleShare(update)}
                    className="text-[#CCCCCC]/40 hover:text-[#CCCCCC] transition-colors"
                  >
                    <Share2 size={16} />
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteUpdate(update.id)}
                      className="text-[#CCCCCC]/40 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {loading && (
          <div className="text-center text-[#CCCCCC]/20 font-mono text-xs animate-pulse">
            LOADING UPDATES...
          </div>
        )}
        
        {!loading && updates.length === 0 && (
          <div className="text-center text-[#CCCCCC]/40 font-sans italic">
            No updates yet.
          </div>
        )}
      </div>
    </div>
  );
};
