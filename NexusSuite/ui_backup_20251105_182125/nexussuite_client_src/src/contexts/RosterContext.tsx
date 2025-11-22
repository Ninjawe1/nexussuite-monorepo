import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rosterService, Roster, RosterPlayer, CreateRosterData, PlayerAssignment } from '@/services/rosterService';
import { useToast } from '@/hooks/use-toast';

interface RosterContextType {
  // State
  selectedRoster: Roster | null;
  isCreatingRoster: boolean;
  isAssigningPlayers: boolean;
  
  // Actions
  setSelectedRoster: (roster: Roster | null) => void;
  createRoster: (data: CreateRosterData) => Promise<void>;
  updateRoster: (rosterId: string, data: Partial<Roster>) => Promise<void>;
  deleteRoster: (rosterId: string) => Promise<void>;
  assignPlayersToRoster: (rosterId: string, players: PlayerAssignment[]) => Promise<void>;
  removePlayerFromRoster: (rosterId: string, playerId: string) => Promise<void>;
  
  // Queries
  rosters: Roster[];
  rosterPlayers: RosterPlayer[];
  isLoadingRosters: boolean;
  isLoadingPlayers: boolean;
  refetchRosters: () => void;
  refetchRosterPlayers: () => void;
}

const RosterContext = createContext<RosterContextType | undefined>(undefined);

interface RosterProviderProps {
  children: React.ReactNode;
  organizationId: string;
}

export function RosterProvider({ children, organizationId }: RosterProviderProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRoster, setSelectedRoster] = useState<Roster | null>(null);
  const [isCreatingRoster, setIsCreatingRoster] = useState(false);
  const [isAssigningPlayers, setIsAssigningPlayers] = useState(false);

  // Fetch rosters
  const { data: rosters = [], isLoading: isLoadingRosters, refetch: refetchRosters } = useQuery({
    queryKey: ['rosters', organizationId],
    queryFn: () => rosterService.getRosters(organizationId),
    enabled: !!organizationId,
  });

  // Fetch roster players for selected roster
  const { data: rosterPlayers = [], isLoading: isLoadingPlayers, refetch: refetchRosterPlayers } = useQuery({
    queryKey: ['rosterPlayers', selectedRoster?.id],
    queryFn: () => selectedRoster ? rosterService.getRosterPlayers(selectedRoster.id) : [],
    enabled: !!selectedRoster?.id,
  });

  // Create roster mutation
  const createRosterMutation = useMutation({
    mutationFn: (data: CreateRosterData) => rosterService.createRoster(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rosters', organizationId] });
      toast({
        title: 'Success',
        description: 'Roster created successfully',
      });
      setIsCreatingRoster(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create roster: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update roster mutation
  const updateRosterMutation = useMutation({
    mutationFn: ({ rosterId, data }: { rosterId: string; data: Partial<Roster> }) => 
      rosterService.updateRoster(rosterId, data),
    // Optimistically update rosters list so UI reflects changes immediately (e.g., name)
    onMutate: async ({ rosterId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['rosters', organizationId] });
      const previous = queryClient.getQueryData<Roster[]>(['rosters', organizationId]);
      queryClient.setQueriesData<Roster[] | undefined>({ queryKey: ['rosters', organizationId] }, (existing) => {
        if (!existing) return existing;
        return existing.map((r) => {
          if (r.id !== rosterId) return r;
          return {
            ...r,
            name: typeof data.name !== 'undefined' ? (data.name ?? r.name) : r.name,
            description: typeof data.description !== 'undefined' ? (data.description ?? r.description) : r.description,
            type: typeof data.type !== 'undefined' ? (data.type as Roster['type']) : r.type,
            maxPlayers: typeof data.maxPlayers !== 'undefined' ? (data.maxPlayers ?? r.maxPlayers) : r.maxPlayers,
            game: typeof data.game !== 'undefined' ? (data.game ?? r.game) : r.game,
            isActive: typeof data.isActive !== 'undefined' ? (data.isActive ?? r.isActive) : r.isActive,
            updatedAt: new Date(),
          } as Roster;
        });
      });
      return { previous };
    },
    onSuccess: () => {
      // Re-fetch to get canonical data from server/storage
      queryClient.invalidateQueries({ queryKey: ['rosters', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['rosterPlayers', selectedRoster?.id] });
      toast({
        title: 'Success',
        description: 'Roster updated successfully',
      });
    },
    onError: (error, _variables, context) => {
      // Roll back optimistic update if server rejects
      if (context?.previous) {
        queryClient.setQueryData(['rosters', organizationId], context.previous);
      }
      toast({
        title: 'Error',
        description: `Failed to update roster: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete roster mutation
  const deleteRosterMutation = useMutation({
    mutationFn: (rosterId: string) => rosterService.deleteRoster(rosterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rosters', organizationId] });
      if (selectedRoster?.id) {
        setSelectedRoster(null);
      }
      toast({
        title: 'Success',
        description: 'Roster deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete roster: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Assign players mutation
  const assignPlayersMutation = useMutation({
    mutationFn: ({ rosterId, players }: { rosterId: string; players: PlayerAssignment[] }) => 
      rosterService.assignPlayersToRoster(rosterId, players),
    onSuccess: (_data, variables) => {
      // Optimistically update playerCount for the affected roster so tiles reflect changes immediately
      try {
        const { rosterId, players } = (variables || {}) as { rosterId?: string; players?: PlayerAssignment[] };
        if (rosterId && Array.isArray(players)) {
          queryClient.setQueriesData<Roster[] | undefined>({ queryKey: ['rosters', organizationId] }, (existing) => {
            if (!existing) return existing;
            return existing.map((r) => {
              if (r.id !== rosterId) return r;
              const nextCount = Math.max(0, (r.playerCount ?? 0) + players.length);
              return { ...r, playerCount: nextCount } as Roster;
            });
          });
        }
      } catch {
        // no-op: optimistic update is best effort; canonical data comes from invalidation below
      }

      // Invalidate queries to fetch canonical data
      queryClient.invalidateQueries({ queryKey: ['rosterPlayers', selectedRoster?.id] });
      toast({
        title: 'Success',
        description: 'Players assigned successfully',
      });
      setIsAssigningPlayers(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to assign players: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Remove player mutation
  const removePlayerMutation = useMutation({
    mutationFn: ({ rosterId, playerId }: { rosterId: string; playerId: string }) => 
      rosterService.removePlayerFromRoster(rosterId, playerId),
    onSuccess: (_data, variables) => {
      // Optimistically decrement playerCount for the affected roster
      try {
        const { rosterId } = (variables || {}) as { rosterId?: string };
        if (rosterId) {
          queryClient.setQueriesData<Roster[] | undefined>({ queryKey: ['rosters', organizationId] }, (existing) => {
            if (!existing) return existing;
            return existing.map((r) => {
              if (r.id !== rosterId) return r;
              const nextCount = Math.max(0, (r.playerCount ?? 0) - 1);
              return { ...r, playerCount: nextCount } as Roster;
            });
          });
        }
      } catch {
        // best effort; canonical data will arrive after invalidation
      }

      queryClient.invalidateQueries({ queryKey: ['rosterPlayers', selectedRoster?.id] });
      toast({
        title: 'Success',
        description: 'Player removed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to remove player: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleCreateRoster = async (data: CreateRosterData) => {
    setIsCreatingRoster(true);
    try {
      await createRosterMutation.mutateAsync(data);
    } finally {
      setIsCreatingRoster(false);
    }
  };

  const handleUpdateRoster = async (rosterId: string, data: Partial<Roster>) => {
    await updateRosterMutation.mutateAsync({ rosterId, data });
  };

  const handleDeleteRoster = async (rosterId: string) => {
    await deleteRosterMutation.mutateAsync(rosterId);
  };

  const handleAssignPlayers = async (rosterId: string, players: PlayerAssignment[]) => {
    setIsAssigningPlayers(true);
    try {
      await assignPlayersMutation.mutateAsync({ rosterId, players });
    } finally {
      setIsAssigningPlayers(false);
    }
  };

  const handleRemovePlayer = async (rosterId: string, playerId: string) => {
    await removePlayerMutation.mutateAsync({ rosterId, playerId });
  };

  // Sync roster tile playerCount with rosterPlayers length for the selected roster.
  // This ensures the bottom-left players count updates immediately even if the backend
  // does not return playerCount in the /api/rosters response.
  useEffect(() => {
    if (!selectedRoster?.id) return;
    const count = rosterPlayers.length;
    queryClient.setQueriesData<Roster[] | undefined>({ queryKey: ['rosters', organizationId] }, (existing) => {
      if (!existing) return existing;
      return existing.map((r) => (r.id === selectedRoster.id ? { ...r, playerCount: count } : r));
    });
  }, [selectedRoster?.id, rosterPlayers.length]);

  const value: RosterContextType = {
    selectedRoster,
    isCreatingRoster,
    isAssigningPlayers,
    setSelectedRoster,
    createRoster: handleCreateRoster,
    updateRoster: handleUpdateRoster,
    deleteRoster: handleDeleteRoster,
    assignPlayersToRoster: handleAssignPlayers,
    removePlayerFromRoster: handleRemovePlayer,
    rosters,
    rosterPlayers,
    isLoadingRosters,
    isLoadingPlayers,
    refetchRosters,
    refetchRosterPlayers,
  };

  return (
    <RosterContext.Provider value={value}>
      {children}
    </RosterContext.Provider>
  );
}

export const useRosterContext = useRoster;
export function useRoster() {
  const context = useContext(RosterContext);
  if (context === undefined) {
    throw new Error('useRoster must be used within a RosterProvider');
  }
  return context;
}

