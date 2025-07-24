
'use server';

import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CaseComment } from '@/types';

interface AddCommentData extends Omit<CaseComment, 'id' | 'createdAt'> {}

interface ActionResult {
  success: boolean;
  message: string;
  commentId?: string;
}

export async function addCommentAction(caseId: string, commentData: AddCommentData): Promise<ActionResult> {
  if (!caseId || !commentData.authorUid || !commentData.text.trim()) {
    return { success: false, message: 'Missing required comment data.' };
  }

  try {
    const commentsColRef = collection(db, 'cases', caseId, 'comments');
    
    const newComment = {
      ...commentData,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(commentsColRef, newComment);

    return { success: true, message: 'Comment added successfully.', commentId: docRef.id };

  } catch (error: any) {
    console.error('Error adding comment:', error);
    return { success: false, message: error.message || 'Failed to add comment.' };
  }
}
