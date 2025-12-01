import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreateRosterData } from '@/services/rosterService';
import { GAME_OPTIONS } from '@/constants/games';

const rosterFormSchema = z.object({
  name: z
    .string()
    .min(3, 'Roster name must be at least 3 characters')
    .max(50, 'Roster name must not exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9\s-_]+$/,
      'Roster name can only contain letters, numbers, spaces, hyphens, and underscores'
    ),
  description: z.string().max(200, 'Description must not exceed 200 characters').optional(),
  game: z.enum(GAME_OPTIONS, {
    errorMap: () => ({ message: 'Please select a game' }),
  }),
  type: z.enum(['International competitive', 'Local Competitive', 'Academy'], {
    errorMap: () => ({ message: 'Please select a valid roster type' }),
  }),
  maxPlayers: z
    .number()
    .min(1, 'Maximum players must be at least 1')
    .max(12, 'Maximum players must not exceed 12'),
});

type RosterFormValues = z.infer<typeof rosterFormSchema>;

interface RosterCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateRosterData) => Promise<void>;
  organizationId: string;
  createdBy: string;
  isLoading?: boolean;
}

const rosterTypes = [
  {
    value: 'International competitive',
    label: 'International competitive',
    description: 'Teams for international tournaments',
  },
  {
    value: 'Local Competitive',
    label: 'Local Competitive',
    description: 'Teams for local/regional competitions',
  },
  {
    value: 'Academy',
    label: 'Academy',
    description: 'Development/feeder teams',
  },
];

export function RosterCreationDialog({
  open,
  onOpenChange,
  onSubmit,
  organizationId,
  createdBy,
  isLoading = false,
}: RosterCreationDialogProps) {
  const form = useForm<RosterFormValues>({
    resolver: zodResolver(rosterFormSchema),
    defaultValues: {
      name: '',
      description: '',
      game: 'Valorant',
      type: 'International competitive',

      maxPlayers: 5,
    },
  });

  const handleSubmit = async (values: RosterFormValues) => {
    try {
      const { ...rosterData } = values;
      await onSubmit({
        ...rosterData,
        organizationId,
        createdBy,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Error creating roster:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Roster</DialogTitle>
          <DialogDescription>
            Set up a new roster for your team. Fill in the details below to get started.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roster Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Team Alpha, Main Squad, etc."
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Choose a unique name for your roster (3-50 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the purpose of this roster..."
                      className="resize-none"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide additional context about this roster (max 200 characters)
                  </FormDescription>
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a game" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GAME_OPTIONS.map(g => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Select the game this roster is for.</FormDescription>

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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {rosterTypes.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        className={`rounded-md border p-3 text-left transition ${field.value === type.value ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`}
                        onClick={() => field.onChange(type.value)}
                        disabled={isLoading}
                      >
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </button>
                    ))}
                  </div>
                  <FormDescription>
                    Choose between International competitive, Local Competitive, or Academy
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxPlayers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roster Capacity</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={12} {...field} />
                  </FormControl>
                  <FormDescription>
                    Default is 5. Adjust to limit how many players can be assigned.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Roster'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
