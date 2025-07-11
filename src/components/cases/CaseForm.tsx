
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createCaseAction, updateCaseAction } from '@/actions/cases'; 
import type { CaseFile, UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Timestamp } from 'firebase/firestore';
import { Combobox } from '@/components/ui/combobox';


const caseFormSchema = z.object({
  caseNumber: z.string().min(1, 'Case number is required'),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Invalid client email address'),
  court: z.string().min(1, 'Court name is required'),
  status: z.enum(['active', 'pending', 'archived', 'closed']),
  description: z.string().optional(),
  hearingDate: z.date().optional().nullable(),
});

type CaseFormValues = z.infer<typeof caseFormSchema>;

interface CaseFormProps {
  initialData?: CaseFile; // For editing
  caseId?: string;
  clients?: Pick<UserProfile, 'uid' | 'displayName' | 'email'>[];
}

export function CaseForm({ initialData, caseId, clients = [] }: CaseFormProps) {
  const { userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const isEditMode = !!initialData;

  const clientOptions = clients.map(client => ({
    value: client.email!,
    label: `${client.displayName} (${client.email})`
  }));

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          hearingDate: initialData.hearingDate instanceof Timestamp ? initialData.hearingDate.toDate() : initialData.hearingDate ? new Date(initialData.hearingDate as any) : null,
        }
      : {
          caseNumber: '',
          clientName: '',
          clientEmail: '',
          court: '',
          status: 'pending',
          description: '',
          hearingDate: null,
        },
  });

  const handleClientSelect = (email: string) => {
    const selectedClient = clients.find(c => c.email === email);
    if (selectedClient) {
        form.setValue('clientEmail', selectedClient.email || '', { shouldValidate: true });
        form.setValue('clientName', selectedClient.displayName || '', { shouldValidate: true });
    }
  }

  const onSubmit = async (values: CaseFormValues) => {
    if (!userProfile || userProfile.role !== 'lawyer') {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'Only lawyers can create or update cases.' });
      return;
    }
    setIsLoading(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'hearingDate' && value instanceof Date) {
            formData.append(key, value.toISOString());
          } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'){
            formData.append(key, String(value));
          }
        }
      });
      formData.append('lawyerUid', userProfile.uid);
      
      let result;
      if (caseId) {
        formData.append('caseId', caseId);
        result = await updateCaseAction(formData);
        if (result.success) {
          toast({ title: 'Case Updated', description: 'Case details have been successfully updated.' });
          router.push(result.caseId ? `/cases/${result.caseId}` : '/dashboard');
        } else {
          throw new Error(result.message || 'Failed to update case.');
        }
      } else {
        result = await createCaseAction(formData);
        if (result.success) {
          toast({ title: 'Case Created', description: 'New case has been successfully created.' });
          router.push(result.caseId ? `/cases/${result.caseId}` : '/dashboard');
        } else {
          throw new Error(result.message || 'Failed to create case.');
        }
      }
      router.refresh(); // Refresh server components
    } catch (error: any) {
      console.error('Failed to save case:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save case. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{caseId ? 'Edit Case' : 'Create New Case'}</CardTitle>
        <CardDescription>
          {caseId ? 'Update the details for this case.' : 'Fill in the details for the new case.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="caseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CV-2023-12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="court"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Court</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., High Court of Justice" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {isEditMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
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
                        <Input type="email" placeholder="client@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
                <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Select a Client</FormLabel>
                            <Combobox
                                options={clientOptions}
                                value={field.value}
                                onChange={handleClientSelect}
                                placeholder="Select a registered client..."
                                searchPlaceholder="Search by name or email..."
                                emptyPlaceholder="No clients found."
                            />
                             <FormMessage />
                             {/* Hidden inputs to hold the values for the form */}
                             <FormField
                                control={form.control}
                                name="clientName"
                                render={({ field: nameField }) => (
                                    <FormControl>
                                        <Input type="hidden" {...nameField} />
                                    </FormControl>
                                )}
                            />
                        </FormItem>
                    )}
                />
            )}


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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief summary of the case, key facts, objectives..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="hearingDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Hearing Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={(date) => field.onChange(date || null)}
                        disabled={(date) => date < new Date(new Date().setDate(new Date().getDate()-1)) } // Disable past dates
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {caseId ? 'Save Changes' : 'Create Case'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
