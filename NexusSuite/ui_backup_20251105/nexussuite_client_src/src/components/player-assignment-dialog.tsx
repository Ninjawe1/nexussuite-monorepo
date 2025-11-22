import React, { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Users, Gamepad2, Filter, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
// onSubmit will receive a payload { rosterId, playerIds: string[], role: string }

// Mock player data - replace with actual player data from your context
interface Player {
  id: string;
  name: string;
  email: string;
  role: string;
  game: string;
  avatar?: string;
  status: 'active' | 'inactive';
}

const assignmentFormSchema = z.object({
  playerIds: z.array(z.string()).min(1, 'Please select at least one player'),
  // Free-text role per product spec, defaults to "player"
  role: z.string().min(1, 'Please provide a role').default('player'),
  // Only required when the roster has no game set yet; optional here and validated in handleSubmit
  game: z.string().optional().default(''),
});

type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

interface PlayerAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { rosterId: string; playerIds: string[]; role: string; game: string }) => Promise<void>;
  rosterId: string;
  rosterName: string;
  maxPlayers: number;
  currentPlayers: Array<{
    playerId: string;
    role: string;
  }>;
  allPlayers: Player[];
  isLoading?: boolean;
  game?: string;
}

export function PlayerAssignmentDialog({
  open,
  onOpenChange,
  onSubmit,
  rosterId,
  rosterName,
  maxPlayers,
  currentPlayers,
  allPlayers,
  isLoading = false,
  game = 'Unknown Game',
}: PlayerAssignmentDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      playerIds: [],
      role: 'player',
      game: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        playerIds: [],
        role: 'player',
        game: '',
      });
      setSelectedPlayers([]);
      setSearchTerm('');
      setRoleFilter('all');
      setStatusFilter('all');
    }
  }, [open, form]);

  const filteredPlayers = allPlayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || player.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || player.status === statusFilter;
    // Removed game filtering to allow cross-game assignments from the Players tab
    return matchesSearch && matchesRole && matchesStatus;
  });

  const currentPlayerIds = currentPlayers.map(p => p.playerId);
  const availablePlayers = filteredPlayers.filter(player => 
    !currentPlayerIds.includes(player.id)
  );

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(prev => {
      const newSelection = prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId];
      
      form.setValue('playerIds', newSelection, { shouldValidate: true });
      return newSelection;
    });
  };

  const handleSubmit = async (values: AssignmentFormValues) => {
    try {
      // Determine which game to send: use the roster's game if known, otherwise require user-provided value
      const gameToUse = game && game !== 'Unknown Game' ? game : (values.game || '').trim();
      if (!gameToUse) {
        // Surface a form error so users know they must set the roster's game first
        form.setError('game' as any, { type: 'manual', message: 'Please select or enter a game for this roster before assigning players.' });
        return;
      }
      await onSubmit({
        rosterId,
        playerIds: values.playerIds,
        role: values.role,
        game: gameToUse,
      });
      
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning players:', error);
    }
  };

  const currentPlayerCount = currentPlayers.length;
  const availableSlots = maxPlayers - currentPlayerCount;
  const canAddMorePlayers = selectedPlayers.length <= availableSlots;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Assign Players to {rosterName}</DialogTitle>
          <DialogDescription>
            Select players to add to this roster. You can add up to {availableSlots} more players.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Current: {currentPlayerCount} / {maxPlayers}
                  </span>
                </div>
                <Badge variant={availableSlots > 0 ? 'default' : 'destructive'}>
                  {availableSlots} slots available
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter} disabled={isLoading}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="jungle">Jungle</SelectItem>
                <SelectItem value="mid">Mid</SelectItem>
                <SelectItem value="adc">ADC</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isLoading}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Warning for too many selections */}
          {!canAddMorePlayers && selectedPlayers.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You've selected {selectedPlayers.length} players but only {availableSlots} slots are available.
              </AlertDescription>
            </Alert>
          )}

          {/* Player List */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* If roster has no game, ask for it here so we can set it before assignment */}
              {(!game || game === 'Unknown Game') && (
                <FormField
                  control={form.control}
                  name="game"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roster Game</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter game (e.g., league-of-legends, valorant)"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This roster doesn't have a game yet. Set it once and we'll remember it for future assignments.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Role</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Role (e.g., player, starter, coach)"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This free-text role will be assigned to all selected players. Defaults to "player".
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ScrollArea className="h-[300px] rounded-md border">
                <div className="p-4 space-y-2">
                  {availablePlayers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No available players found</p>
                      <p className="text-sm">Try adjusting your filters or search terms</p>
                    </div>
                  ) : (
                    availablePlayers.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                          selectedPlayers.includes(player.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-accent/50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedPlayers.includes(player.id)}
                          onCheckedChange={() => handlePlayerToggle(player.id)}
                          disabled={isLoading || (!selectedPlayers.includes(player.id) && !canAddMorePlayers)}
                        />
                        
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={player.avatar} alt={player.name} />
                          <AvatarFallback>
                            {player.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{player.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{player.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {player.role}
                            </Badge>
                            <Badge 
                              variant={player.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {player.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <FormField
                control={form.control}
                name="playerIds"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || selectedPlayers.length === 0 || !canAddMorePlayers}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    `Assign ${selectedPlayers.length} Players`
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

