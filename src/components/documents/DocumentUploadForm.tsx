'use client';

import { Loader2, UploadCloud } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { uploadDocumentAction } from '@/actions/documents';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

interface Props {
  caseId: string;
  onClose: () => void;
  onUploaded: (doc: { id: string; name: string }) => void;
}

export function DocumentUploadForm({ caseId, onClose, onUploaded }: Props) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function pick(f: File | null) {
    setFile(f);
    setError(f && f.size > MAX_BYTES ? 'Files must be 4 MB or smaller.' : null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || error) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('description', description);
    // The server re-checks size and file type; these browser checks are only for quick feedback.
    const result = await uploadDocumentAction(caseId, formData);
    setLoading(false);

    if (!result.success) {
      toast({ variant: 'destructive', title: 'Upload failed', description: result.message });
      return;
    }
    toast({ title: 'Document uploaded', description: `${result.data.name} is stored securely.` });
    onUploaded(result.data);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>PDF, Word, JPEG or PNG. Max 4 MB.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="document">Document File</Label>
            <Input
              id="document"
              type="file"
              accept={ACCEPT}
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
              className="pt-2 file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input id="description" maxLength={500} placeholder="e.g., Signed affidavit" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !file || !!error}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
