import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import type { Staff } from '@shared/schema';
import type { Roster } from '@/services/rosterService';

const AssignSchema = z.object({
  rosterId: z.string().min(1, 'Please select a roster'),
  role: z.string().min(1, 'Please enter a role'),
});

export interface AssignToRosterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Staff | null;
  availableRosters: Roster[];
  onSubmit: (rosterId: string, role: string) => Promise<void> | void;
  isLoading?: boolean;
}

export function AssignToRosterDialog({
  open,
  onOpenChange,
  player,
  availableRosters,
  onSubmit,
  isLoading,
}: AssignToRosterDialogProps) {
  const form = useForm<z.infer<typeof AssignSchema>>({
    resolver: zodResolver(AssignSchema),
    defaultValues: {
      rosterId: '',
      role: '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof AssignSchema>) => {
    await onSubmit(values.rosterId, values.role);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) form.reset();
      onOpenChange(o);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Player to Roster</DialogTitle>
          <DialogDescription>
            {player ? `Assign ${player.name} to one of your active rosters.` : 'Select a player to assign.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rosterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roster</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an active roster" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRosters.filter(r => r.isActive).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} {r.type ? `• ${r.type}` : ''}
                        </SelectItem>
                      ))}
                      {availableRosters.filter(r => r.isActive).length === 0 && (
                        <div className="px-2 py-2 text-sm text-muted-foreground">No active rosters found</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>Select one of your currently active rosters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Support, Entry, Flex" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormDescription>Specify the role this player will have in the roster.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>Assign</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

