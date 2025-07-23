// src/actions/notifications.ts
'use server';

import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface ActionResult {
  success: boolean;
  message: string;
  emailId?: string;
}

/**
 * Sends an email by adding a document to the 'mail' collection.
 * This action requires the "Trigger Email" Firebase Extension to be installed and configured.
 * @param params - The email parameters.
 * @returns An action result indicating success or failure.
 */
export async function sendEmailAction({ to, subject, html }: SendEmailParams): Promise<ActionResult> {
  if (!to || !subject || !html) {
    return { success: false, message: 'Missing required email parameters.' };
  }

  try {
    // The "Trigger Email" extension listens for new documents in this collection.
    const mailCollectionRef = collection(db, 'mail');
    
    const emailDoc = await addDoc(mailCollectionRef, {
      to: [to],
      message: {
        subject: subject,
        html: html,
      },
    });

    console.log(`Email document created with ID: ${emailDoc.id}. The Trigger Email extension will now process and send it.`);

    return {
      success: true,
      message: 'Email queued for sending successfully.',
      emailId: emailDoc.id,
    };
  } catch (error: any) {
    console.error('Error queuing email:', error);
    return {
      success: false,
      message: error.message || 'Failed to queue email. Ensure the Trigger Email extension is installed and Firestore permissions are correct.',
    };
  }
}

// Example usage of how you might trigger this action for a hearing reminder.
// This is a conceptual example and would need to be integrated into a larger workflow,
// perhaps triggered by a cron job or another server-side process.

async function sendHearingReminder(caseId: string, clientEmail: string, hearingDate: Date, caseNumber: string) {
    const subject = `Upcoming Hearing Reminder for Case: ${caseNumber}`;
    const htmlBody = `
        <h1>Court Hearing Reminder</h1>
        <p>This is a reminder for your upcoming court hearing for case <strong>${caseNumber}</strong>.</p>
        <p><strong>Date and Time:</strong> ${hearingDate.toLocaleString()}</p>
        <p>Please ensure you are prepared. If you have any questions, please contact your lawyer.</p>
        <br/>
        <p>Thank you,</p>
        <p>CourtCaseFlow</p>
    `;

    return await sendEmailAction({
        to: clientEmail,
        subject: subject,
        html: htmlBody,
    });
}
