import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sanitizeText } from '../lib/sanitize';

export const useMessaging = () => {
  const sendMessage = async (text, senderId, receiverId, type = 'chat') => {
    if (!db || !text?.trim()) return;
    try {
      await addDoc(collection(db, 'messages'), {
        text: sanitizeText(text),
        senderId,
        receiverId,
        type,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error('[useMessaging] send failed:', err);
    }
  };

  return { sendMessage };
};
