'use client';

import { Download, FilePlus, FileText, Loader2, Tags, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deleteDocumentAction } from '@/actions/documents';
import { LocalTime } from '@/components/common/LocalTime';
import { AiTaggingTool } from '@/components/documents/AiTaggingTool';
import { DocumentUploadForm } from '@/components/documents/DocumentUploadForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/utils';
import type { CaseDocument } from '@/types';

export function DocumentsPanel({ caseId, documents, canEdit }: { caseId: string; documents: CaseDocument[]; canEdit: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [tagging, setTagging] = useState<{ id: string; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<CaseDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete() {
    if (!toDelete) return;
    setDeletingId(toDelete.id);
    const result = await deleteDocumentAction(caseId, toDelete.id);
    setDeletingId(null);
    setToDelete(null);
    toast(result.success ? { title: result.message } : { variant: 'destructive', title: 'Error', description: result.message });
    if (result.success) router.refresh();
  }

  return (
    <Card className="shadow-lg print:hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Case Documents</CardTitle>
        {canEdit && (
          <Button onClick={() => setShowUpload(true)}>
            <FilePlus className="mr-2 h-4 w-4" /> Upload Document
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="rounded-md border border-dashed py-10 text-center">
            <FileText className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <p className="text-lg font-semibold text-muted-foreground">No documents uploaded yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="max-w-xs break-all font-medium">
                    {doc.name}
                    <div className="text-xs text-muted-foreground">{formatFileSize(doc.sizeBytes)}</div>
                  </TableCell>
                  <TableCell className="max-w-xs break-all text-sm text-muted-foreground">{doc.description || 'N/A'}</TableCell>
                  <TableCell className="text-sm">
                    <LocalTime value={doc.uploadedAt} />
                  </TableCell>
                  <TableCell>
                    {doc.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No tags</span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap text-right">
                    <Button variant="outline" size="sm" asChild>
                      {/* Goes through an access check, then to a 5-minute signed link. */}
                      <a href={`/api/documents/${doc.id}/download`} rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" /> Download
                      </a>
                    </Button>
                    {canEdit && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setTagging({ id: doc.id, name: doc.name })} aria-label={`Suggest tags for ${doc.name}`}>
                          <Tags className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setToDelete(doc)}
                          disabled={deletingId === doc.id}
                          aria-label={`Delete ${doc.name}`}
                        >
                          {deletingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {canEdit && tagging && (
          <AiTaggingTool
            caseId={caseId}
            documentId={tagging.id}
            documentName={tagging.name}
            onDone={() => {
              setTagging(null);
              router.refresh();
            }}
          />
        )}
      </CardContent>

      {canEdit && showUpload && (
        <DocumentUploadForm
          caseId={caseId}
          onClose={() => setShowUpload(false)}
          onUploaded={(doc) => {
            setTagging(doc);
            router.refresh();
          }}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <span className="font-bold">&quot;{toDelete?.name}&quot;</span> from the case. It can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Yes, delete document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
