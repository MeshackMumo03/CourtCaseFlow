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
import { useState }
from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
// import { uploadDocumentAction } from '@/actions/documents'; // Placeholder for actual upload server action

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
  description: z.string().optional(), // Optional description for the AI
});

interface DocumentUploadFormProps {
  caseId: string;
  onClose: () => void;
  onDocumentUploaded: (dataUri: string, fileName: string) => void; // Callback with data URI
}

export function DocumentUploadForm({ caseId, onClose, onDocumentUploaded }: DocumentUploadFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof uploadFormSchema>>({
    resolver: zodResolver(uploadFormSchema),
  });

  const onSubmit = async (values: z.infer<typeof uploadFormSchema>) => {
    setIsLoading(true);
    const file = values.document[0];

    try {
      // Convert file to Data URI for AI processing
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        
        // Here, you would normally call a server action to upload the file to Firebase Storage
        // and save metadata to Firestore. For this demo, we'll just pass the data URI.
        // Example: const result = await uploadDocumentAction(caseId, file.name, dataUri, values.description);
        // if (result.success) { ... }

        toast({
          title: 'File Processed for Tagging',
          description: `${file.name} is ready for AI tag suggestions.`,
        });
        onDocumentUploaded(dataUri, file.name); // Pass data URI and name to parent
        form.reset();
        // onClose(); // Parent will close or show AI tagging tool
      };
      reader.onerror = () => {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to read file.' });
        setIsLoading(false);
      };
      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Upload error:', error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not process the file.' });
      setIsLoading(false);
    }
    // setLoading(false) is handled within reader.onloadend or reader.onerror
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Select a document to upload to case {caseId}. Max 5MB.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="document"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>Document File</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      onChange={(e) => onChange(e.target.files)}
                      {...rest} 
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
                    <Input placeholder="e.g., 'Evidence photo from scene'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
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
