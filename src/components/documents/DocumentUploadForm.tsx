
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
import { uploadDocumentAction } from '@/actions/documents';
import { useAuth } from '@/hooks/use-auth';
import type { CaseDocument } from '@/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];

const uploadFormSchema = z.object({
  document: z
    .custom<FileList>((val) => val instanceof FileList && val.length > 0, 'File is required.')
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ALLOWED_FILE_TYPES.includes(files?.[0]?.type),
      "Only .pdf, .doc, .docx, .jpg, .png files are allowed."
    ),
  description: z.string().optional(),
});

// Define the type for form values
type UploadFormValues = z.infer<typeof uploadFormSchema>;

interface DocumentUploadFormProps {
  caseId: string;
  onClose: () => void;
  onDocumentUploaded: (document: CaseDocument, dataUri: string) => void;
}

export function DocumentUploadForm({ caseId, onClose, onDocumentUploaded }: DocumentUploadFormProps) {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      document: undefined,
      description: '', // Ensure description is initialized to an empty string
    },
  });
  
  const fileRef = form.register("document");

  const onSubmit = async (values: UploadFormValues) => {
    setIsLoading(true);
    if (!values.document || values.document.length === 0 || !userProfile) {
        toast({ variant: 'destructive', title: 'Error', description: 'File or user information is missing.' });
        setIsLoading(false);
        return;
    }
    const file = values.document[0];
    const formData = new FormData();
    formData.append('document', file);
    if (values.description) {
        formData.append('description', values.description);
    }

    try {
      const result = await uploadDocumentAction(caseId, userProfile.uid, formData);

      if (result.success && result.document) {
         toast({
          title: 'Document Uploaded',
          description: `${file.name} is now stored and ready for AI tag suggestions.`,
        });
        
        // Read file as data URI for AI tagging tool
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUri = reader.result as string;
          onDocumentUploaded(result.document!, dataUri);
          form.reset();
          onClose();
        };
        reader.readAsDataURL(file);

      } else {
         toast({ variant: 'destructive', title: 'Upload Failed', description: result.message });
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not upload the file.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => {
      if (!open) {
        form.reset(); 
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Select a document to upload to this case. Max 5MB.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="document"
              render={() => (
                <FormItem>
                  <FormLabel>Document File</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      {...fileRef}
                      className="pt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Description (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                        placeholder="e.g., 'Evidence photo from scene'" 
                        {...field}
                        value={field.value || ''} // Explicitly handle undefined
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { form.reset(); onClose();}} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !form.formState.isDirty || !form.formState.isValid}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                Upload & Process
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
