import { useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Roster } from '@/services/rosterService';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GAME_OPTIONS, normalizeGameTitle } from '@/constants/games';

export interface RosterEditDialogProps {
  roster: Roster;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (updates: Partial<Roster>) => Promise<void> | void;
  isLoading?: boolean;
}

const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().max(200, 'Description too long').optional().or(z.literal('')),
  game: z.enum(GAME_OPTIONS),
  type: z.enum(['International competitive', 'Local Competitive', 'Academy']),

  maxPlayers: z.coerce.number().min(1).max(12),
});

type FormValues = z.infer<typeof schema>;

export function RosterEditDialog({
  roster,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: RosterEditDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: roster?.name ?? '',
      description: roster?.description ?? '',
      game: (() => {
        const normalized = normalizeGameTitle(roster?.game ?? '');
        return normalized && (GAME_OPTIONS as readonly string[]).includes(normalized)
          ? (normalized as (typeof GAME_OPTIONS)[number])
          : 'Valorant';
      })(),
      type: (roster?.type as FormValues['type']) ?? 'International competitive',

      maxPlayers: roster?.maxPlayers ?? 5,
    },
  });

  useEffect(() => {
    if (open && roster) {
      form.reset({
        name: roster.name ?? '',
        description: roster.description ?? '',
        game: (() => {
          const normalized = normalizeGameTitle(roster?.game ?? '');
          return normalized && (GAME_OPTIONS as readonly string[]).includes(normalized)
            ? (normalized as (typeof GAME_OPTIONS)[number])
            : 'Valorant';
        })(),
        type: (roster.type as FormValues['type']) ?? 'International competitive',

        maxPlayers: roster.maxPlayers ?? 5,
      });
    }
  }, [open, roster]);

  const handleSubmit = async (values: FormValues) => {
    await onSubmit({
      name: values.name,
      description: values.description || '',

      game: normalizeGameTitle(values.game),
      type: values.type,
      maxPlayers: values.maxPlayers,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Roster</DialogTitle>
          <DialogDescription>Update roster details and constraints.</DialogDescription>
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
                    <Input placeholder="e.g. Team Alpha" {...field} />
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
                    <Textarea placeholder="Optional description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="game"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a game" />
                      </SelectTrigger>
                      <SelectContent>
                        {GAME_OPTIONS.map(g => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-2"
                    >
                      <ToggleGroupItem
                        value="International competitive"
                        aria-label="International competitive"
                        className="px-4 py-2"
                      >
                        International competitive
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="Local Competitive"
                        aria-label="Local Competitive"
                        className="px-4 py-2"
                      >
                        Local Competitive
                      </ToggleGroupItem>
                      <ToggleGroupItem value="Academy" aria-label="Academy" className="px-4 py-2">
                        Academy
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </FormControl>
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
                    <Input type="number" min={1} max={12} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default RosterEditDialog;
