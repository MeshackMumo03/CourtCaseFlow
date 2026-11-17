'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { createCaseAction, updateCaseAction } from '@/actions/cases';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { courtList } from '@/lib/courts';
import { CASE_STATUSES, type CaseFile } from '@/types';

const formSchema = z.object({
  caseNumber: z.string().trim().min(1, 'Case number is required.').max(100),
  clientName: z.string().trim().min(1, 'Client name is required.').max(200),
  clientEmail: z.email('Invalid client email address.'),
  court: z.string().min(1, 'Court is required.'),
  status: z.enum(CASE_STATUSES),
  description: z.string().max(5000).optional(),
  /** Value of a datetime-local input (local time, no zone), or empty. */
  hearingLocal: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

/** Date -> "YYYY-MM-DDTHH:mm" in the browser's local time, for datetime-local inputs. */
function toLocalInput(date: Date | null) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface CaseFormProps {
  initialData?: CaseFile;
  /** The lawyer's existing clients, offered as shortcuts when creating a case. */
  knownClients?: { name: string; email: string }[];
}

export function CaseForm({ initialData, knownClients = [] }: CaseFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(initialData);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      caseNumber: initialData?.caseNumber ?? '',
      clientName: initialData?.clientName ?? '',
      clientEmail: initialData?.clientEmail ?? '',
      court: initialData?.court ?? '',
      status: initialData?.status ?? 'pending',
      description: initialData?.description ?? '',
      hearingLocal: toLocalInput(initialData?.hearingDate ?? null),
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const input = {
      caseNumber: values.caseNumber,
      clientName: values.clientName,
      clientEmail: values.clientEmail,
      court: values.court,
      status: values.status,
      description: values.description ?? '',
      hearingDate: values.hearingLocal ? new Date(values.hearingLocal).toISOString() : '',
    };
    const result = initialData ? await updateCaseAction(initialData.id, input) : await createCaseAction(input);
    setLoading(false);

    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not save case', description: result.message });
      return;
    }
    toast({ title: isEdit ? 'Case updated' : 'Case created' });
    router.push(`/cases/${result.data.caseId}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Case' : 'Create New Case'}</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the details for this case.'
            : 'The client will see this case once they sign up and verify this email address.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="caseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CV-2026-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="court"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Court</FormLabel>
                    <Combobox
                      options={courtList.map((c) => ({ value: c, label: c }))}
                      value={field.value}
                      onChange={(v) => form.setValue('court', v, { shouldValidate: true })}
                      placeholder="Select a court..."
                      searchPlaceholder="Search for a court..."
                      emptyPlaceholder="No court found."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEdit && knownClients.length > 0 && (
              <FormItem>
                <FormLabel>Existing client (optional)</FormLabel>
                <Select
                  onValueChange={(email) => {
                    const c = knownClients.find((k) => k.email === email);
                    if (!c) return;
                    form.setValue('clientEmail', c.email, { shouldValidate: true });
                    form.setValue('clientName', c.name, { shouldValidate: true });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick one of your clients..." />
                  </SelectTrigger>
                  <SelectContent>
                    {knownClients.map((c) => (
                      <SelectItem key={c.email} value={c.email}>
                        {c.name} ({c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Wanjiku" {...field} disabled={isEdit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="client@example.com" {...field} disabled={isEdit} />
                    </FormControl>
                    {isEdit && <FormDescription>The client on a case can&apos;t be changed.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select case status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CASE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hearingLocal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hearing Date &amp; Time (Optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief summary of the case, key facts, objectives..." className="resize-none" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full md:w-auto" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Case'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
