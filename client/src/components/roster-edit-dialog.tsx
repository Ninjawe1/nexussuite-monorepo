import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import type { Roster } from '@/services/rosterService';

const EditRosterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['competitive', 'casual', 'practice']),
  maxPlayers: z.number().min(1, 'Must be at least 1').max(100, 'Too many players'),
});

export interface RosterEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roster: Roster | null;
  onSubmit: (data: Partial<Roster>) => Promise<void> | void;
  isLoading?: boolean;
}

const rosterTypes = [
  { value: 'competitive', label: 'Competitive' },
  { value: 'casual', label: 'Casual' },
  { value: 'practice', label: 'Practice' },
] as const;

export function RosterEditDialog({ open, onOpenChange, roster, onSubmit, isLoading }: RosterEditDialogProps) {
  const form = useForm<z.infer<typeof EditRosterSchema>>({
    resolver: zodResolver(EditRosterSchema),
    defaultValues: {
      name: roster?.name ?? '',
      description: roster?.description ?? '',
      type: (roster?.type as any) ?? 'competitive',
      maxPlayers: roster?.maxPlayers ?? 5,
    },
    values: roster ? {
      name: roster.name,
      description: roster.description ?? '',
      type: roster.type as any,
      maxPlayers: roster.maxPlayers,
    } : undefined,
  });

  const handleSubmit = async (values: z.infer<typeof EditRosterSchema>) => {
    await onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Roster</DialogTitle>
          <DialogDescription>Update the roster details below.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roster Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Alpha Squad" {...field} disabled={isLoading} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional description" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roster Type</FormLabel>
                  <div className="flex gap-2 flex-wrap">
                    {rosterTypes.map((t) => (
                      <Button
                        key={t.value}
                        type="button"
                        variant={field.value === t.value ? 'default' : 'outline'}
                        onClick={() => field.onChange(t.value)}
                        disabled={isLoading}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxPlayers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Players</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={100} {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>Save Changes</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}