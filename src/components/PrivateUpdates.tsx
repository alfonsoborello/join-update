import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PrivateUpdate, User } from '../types';
import { Send, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import CryptoJS from 'crypto-js';

export const PrivateUpdates: React.FC<{ user: User }> = ({ user }) => {
  const [messages, setMessages] = useState<PrivateUpdate[]>([]);
  const [recipientKey, setRecipientKey] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(true);

  // Use a simple encryption key derived from both UIDs for basic P2P encryption
  // In a real app, this would be more robust (e.g. Signal protocol)
  const getEncryptionKey = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('-');
  };

  useEffect(() => {
    // Listen for messages where user is sender OR recipient
    const q1 = query(
      collection(db, 'privateUpdates'),
      where('senderUid', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const q2 = query(
      collection(db, 'privateUpdates'),
      where('recipientUid', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsub1 = onSnapshot(q1, (snapshot) => {
      updateMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PrivateUpdate)));
    });
    const unsub2 = onSnapshot(q2, (snapshot) => {
      updateMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PrivateUpdate)));
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user.uid]);

  const updateMessages = (newDocs: PrivateUpdate[]) => {
    setMessages(prev => {
      const combined = [...prev, ...newDocs];
      const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
      return unique.sort((a, b) => {
        const t1 = a.timestamp?.toMillis() || Date.now();
        const t2 = b.timestamp?.toMillis() || Date.now();
        return t2 - t1;
      });
    });
    setLoading(false);
  };

  const handleSendPrivateUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !recipientKey.trim()) return;

    try {
      // Find recipient by poeticKey
      const userQuery = query(collection(db, 'users'), where('poeticKey', '==', recipientKey.trim()));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        alert('Poetic Key not found.');
        return;
      }

      const recipient = userSnapshot.docs[0].data() as User;
      const encryptionKey = getEncryptionKey(user.uid, recipient.uid);
      const encryptedContent = CryptoJS.AES.encrypt(messageContent, encryptionKey).toString();

      await addDoc(collection(db, 'privateUpdates'), {
        content: encryptedContent,
        timestamp: serverTimestamp(),
        senderUid: user.uid,
        recipientUid: recipient.uid,
        senderKey: user.poeticKey,
        recipientKey: recipient.poeticKey
      });

      // Log activity (no content)
      await addDoc(collection(db, 'activityLogs'), {
        timestamp: serverTimestamp(),
        senderKey: user.poeticKey,
        recipientKey: recipient.poeticKey,
        type: 'private'
      });

      setMessageContent('');
      setRecipientKey('');
    } catch (error) {
      console.error('Error sending private update:', error);
    }
  };

  const decryptMessage = (msg: PrivateUpdate) => {
    try {
      const encryptionKey = getEncryptionKey(msg.senderUid, msg.recipientUid);
      const bytes = CryptoJS.AES.decrypt(msg.content, encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      return '[Encrypted Message]';
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-12">
      <div className="mb-12">
        <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-[#CCCCCC]/40 mb-6 flex items-center gap-2">
          <Lock size={12} />
          Ghost P2P Network
        </h2>
        
        <form onSubmit={handleSendPrivateUpdate} className="space-y-4">
          <input
            type="text"
            value={recipientKey}
            onChange={(e) => setRecipientKey(e.target.value)}
            placeholder="Recipient Poetic Key (e.g. Silver-Echo-24)"
            className="w-full p-4 border border-[#CCCCCC] bg-black text-[#CCCCCC] focus:outline-none focus:ring-1 focus:ring-[#CCCCCC] font-mono text-sm"
          />
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Enter private update..."
            className="w-full p-4 border border-[#CCCCCC] bg-black text-[#CCCCCC] focus:outline-none focus:ring-1 focus:ring-[#CCCCCC] resize-none h-24 font-sans"
          />
          <button
            type="submit"
            className="w-full bg-[#CCCCCC] text-black py-3 font-bold uppercase tracking-widest hover:bg-[#CCCCCC]/90 transition-colors flex items-center justify-center gap-2"
          >
            <Send size={16} />
            Send Private Update
          </button>
        </form>
      </div>

      <div className="space-y-8">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => {
            const isSender = msg.senderUid === user.uid;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: isSender ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 border ${isSender ? 'border-[#CCCCCC] bg-[#CCCCCC] text-black' : 'border-[#CCCCCC]/10 bg-black text-[#CCCCCC]'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">
                    {isSender ? `To: ${msg.recipientKey}` : `From: ${msg.senderKey}`}
                  </span>
                  <span className="text-[10px] font-mono opacity-40">
                    {msg.timestamp ? format(msg.timestamp.toDate(), 'HH:mm') : '...'}
                  </span>
                </div>
                <div className="font-sans text-sm whitespace-pre-wrap">
                  {decryptMessage(msg)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {loading && (
          <div className="text-center text-[#CCCCCC]/20 font-mono text-xs animate-pulse">
            SYNCING ENCRYPTED FEED...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center text-[#CCCCCC]/40 font-sans italic text-sm">
            Your private feed is empty.
          </div>
        )}
      </div>
    </div>
  );
};
