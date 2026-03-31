import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { ActivityLog, User } from '../types';
import { format } from 'date-fns';
import { motion } from 'motion/react';

export const AdminMatrix: React.FC<{ user: User }> = ({ user }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({ users: 0, updates: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.email !== 'alfonsoborello@gmail.com') return;

    const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
      setLogs(docs);
      setLoading(false);
    });

    const fetchStats = async () => {
      const usersCount = await getCountFromServer(collection(db, 'users'));
      const updatesCount = await getCountFromServer(collection(db, 'activityLogs'));
      setStats({
        users: usersCount.data().count,
        updates: updatesCount.data().count
      });
    };

    fetchStats();
    return () => unsubscribe();
  }, [user.email]);

  if (user.email !== 'alfonsoborello@gmail.com') {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-red-600 font-mono text-xs tracking-[0.5em]">
        ACCESS DENIED // UNAUTHORIZED_UID
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#CCCCCC] font-mono p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 border-b border-[#CCCCCC]/10 pb-8">
          <h1 className="text-xl tracking-[0.5em] mb-4">ADMIN_MATRIX</h1>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-[10px] text-[#CCCCCC]/40 uppercase mb-1">Active Keys</div>
              <div className="text-3xl">{stats.users}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#CCCCCC]/40 uppercase mb-1">Total Updates</div>
              <div className="text-3xl">{stats.updates}</div>
            </div>
          </div>
        </header>

        <section>
          <h2 className="text-[10px] text-[#CCCCCC]/40 uppercase tracking-[0.3em] mb-6">Activity Feed</h2>
          <div className="space-y-2">
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[10px] flex gap-4 py-2 border-b border-[#CCCCCC]/5"
              >
                <span className="text-[#CCCCCC]/30">
                  [{log.timestamp ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'PENDING'}]
                </span>
                <span className={log.type === 'public' ? 'text-blue-400' : 'text-green-400'}>
                  {log.type.toUpperCase()}
                </span>
                <span>
                  {log.senderKey}
                  {log.recipientKey && ` -> ${log.recipientKey}`}
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {loading && (
          <div className="mt-12 text-center text-[#CCCCCC]/20 animate-pulse">
            STREAMING_LOGS...
          </div>
        )}
      </div>
    </div>
  );
};
