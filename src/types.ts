export interface User {
  uid: string;
  email: string;
  displayName?: string;
  preferredLanguage?: string;
  poeticKey: string;
  role: 'admin' | 'user';
}

export interface PublicUpdate {
  id: string;
  content: string;
  timestamp: any; // Firestore Timestamp
  authorUid: string;
}

export interface PrivateUpdate {
  id: string;
  content: string;
  timestamp: any;
  senderUid: string;
  recipientUid: string;
  senderKey: string;
  recipientKey: string;
}

export interface ActivityLog {
  id: string;
  timestamp: any;
  senderKey: string;
  recipientKey?: string;
  type: 'public' | 'private';
}
