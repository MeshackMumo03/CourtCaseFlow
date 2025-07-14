// src/ai/flows/tag-legal-documents.ts
'use server';
/**
 * @fileOverview A legal document tagging AI agent.
 *
 * - tagLegalDocument - A function that handles the legal document tagging process.
 * - TagLegalDocumentInput - The input type for the tagLegalDocument function.
 * - TagLegalDocumentOutput - The return type for the tagLegalDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TagLegalDocumentInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "A legal document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  documentDescription: z.string().describe('The description of the legal document.'),
});
export type TagLegalDocumentInput = z.infer<typeof TagLegalDocumentInputSchema>;

const TagLegalDocumentOutputSchema = z.object({
  tags: z.array(z.string()).describe('An array of suggested tags for the legal document.'),
});
export type TagLegalDocumentOutput = z.infer<typeof TagLegalDocumentOutputSchema>;

export async function tagLegalDocument(input: TagLegalDocumentInput): Promise<TagLegalDocumentOutput> {
  return tagLegalDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'tagLegalDocumentPrompt',
  input: {schema: TagLegalDocumentInputSchema},
  output: {schema: TagLegalDocumentOutputSchema},
  prompt: `You are an expert legal assistant specializing in tagging legal documents.

You will use this information to suggest relevant tags for the document.

Description: {{{documentDescription}}}
Document: {{media url=documentDataUri}}

Please provide an array of suggested tags that can be used to categorize this document.
`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const tagLegalDocumentFlow = ai.defineFlow(
  {
    name: 'tagLegalDocumentFlow',
    inputSchema: TagLegalDocumentInputSchema,
    outputSchema: TagLegalDocumentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
