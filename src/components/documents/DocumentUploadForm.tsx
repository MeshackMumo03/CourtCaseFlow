
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
  description: z.string().optional(),
});

// Define the type for form values
type UploadFormValues = z.infer<typeof uploadFormSchema>;

interface DocumentUploadFormProps {
  caseId: string;
  onClose: () => void;
  onDocumentUploaded: (dataUri: string, fileName: string) => void; // Callback with data URI
}

export function DocumentUploadForm({ caseId, onClose, onDocumentUploaded }: DocumentUploadFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UploadFormValues>({ // Use the defined type here
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      document: undefined,
      description: '',
    },
  });

  // Corrected onSubmit function signature using the UploadFormValues type
  const onSubmit = async (values: UploadFormValues) => {
    setIsLoading(true);
    // Ensure values.document is not null and has at least one file
    if (!values.document || values.document.length === 0) {
        toast({ variant: 'destructive', title: 'File Error', description: 'No file selected.' });
        setIsLoading(false);
        return;
    }
    const file = values.document[0];

    try {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const dataUri = reader.result as string;
          
          toast({
            title: 'File Processed for Tagging',
            description: `${file.name} is ready for AI tag suggestions.`,
          });
          onDocumentUploaded(dataUri, file.name); 
          form.reset(); 
        } catch (innerError) {
          console.error('Error in reader.onloadend:', innerError);
          toast({ variant: 'destructive', title: 'Processing Error', description: 'Failed to process file data.' });
        } finally {
          setIsLoading(false); // Ensure loading is stopped after onloadend processing
        }
      };

      reader.onerror = () => {
        toast({ variant: 'destructive', title: 'File Read Error', description: 'Failed to read file.' });
        setIsLoading(false); 
      };

      reader.readAsDataURL(file);

    } catch (error) {
      console.error('Upload error:', error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not process the file.' });
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
            Select a document to upload to case {caseId}. Max 5MB.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="document"
              render={({ field: { onChange, ...rest } }) => (
                <FormItem>
                  <FormLabel>Document File</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      onChange={(e) => {
                        onChange(e.target.files);
                      }}
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
