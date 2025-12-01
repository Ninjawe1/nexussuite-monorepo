import { Button } from '@/components/ui/button';

import {
  Plus,
  Trophy,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Calendar,
  Users,
  Target,
} from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { Tournament, TournamentRound, Match } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { tweakcn } from '@/lib/tweakcn';
import { formatDateSafe } from '@/lib/date';
import { TournamentDialog } from '@/components/tournament-dialog';
import { RoundDialog } from '@/components/round-dialog';
import { useOrganization } from '@/contexts/OrganizationContext';

const formatStatusBadge = (status: string) => {
  const statusColors = {
    upcoming: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    ongoing: 'bg-green-500/10 text-green-500 border-green-500/20',
    completed: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  return statusColors[status as keyof typeof statusColors] || statusColors.upcoming;
};

const formatFormatBadge = (formatType: string) => {
  const formatColors = {
    'single-elimination': 'bg-primary/10 text-primary border-primary/20',
    'double-elimination': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'round-robin': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    league: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    swiss: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    custom: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  };
  return formatColors[formatType as keyof typeof formatColors] || formatColors.custom;
};

function TournamentCard({
  tournament,
  onEdit,
  onAddRound,
  onEditRound,
}: {
  tournament: Tournament;
  onEdit: (tournament: Tournament) => void;
  onAddRound: (tournamentId: string) => void;
  onEditRound: (round: TournamentRound) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  const { data: rounds = [], isLoading: loadingRounds } = useQuery<TournamentRound[]>({
    queryKey: ['/api/tournaments', tournament.id, 'rounds', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(
        `/api/tournaments/${tournament.id}/rounds?organizationId=${currentOrganization.id}`,
        'GET'
      );
      return await res.json();
    },
    enabled: isExpanded && !!currentOrganization?.id,
  });

  const deleteTournamentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/tournaments/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      toast({
        title: 'Success',
        description: 'Tournament deleted successfully',
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: 'Unauthorized',
          description: 'You are logged out. Logging in again...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete tournament',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will delete the tournament and all its rounds and matches.')) {
      await deleteTournamentMutation.mutateAsync(id);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`button-toggle-tournament-${tournament.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle
              className="text-lg truncate"
              data-testid={`text-tournament-name-${tournament.id}`}
            >
              {tournament.name}
            </CardTitle>
          </div>
          {tournament.description && (
            <p className="text-sm text-muted-foreground truncate ml-14">{tournament.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              data-testid={`button-tournament-menu-${tournament.id}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onEdit(tournament)}
              data-testid={`button-edit-tournament-${tournament.id}`}
            >
              Edit Tournament
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAddRound(tournament.id)}
              data-testid={`button-add-round-${tournament.id}`}
            >
              Add Round
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(tournament.id)}
              data-testid={`button-delete-tournament-${tournament.id}`}
            >
              Delete Tournament
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge
            variant="outline"
            className={tweakcn('border', formatStatusBadge(tournament.status))}
          >
            {tournament.status}
          </Badge>
          <Badge
            variant="outline"
            className={tweakcn('border', formatFormatBadge(tournament.format))}
          >
            {tournament.format.replace('-', ' ')}
          </Badge>
          {tournament.game && (
            <Badge variant="outline">
              <Target className="h-3 w-3 mr-1" />
              {tournament.game}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDateSafe(tournament.startDate, 'MMM d, yyyy')}</span>
          </div>
          {tournament.endDate && (
            <div className="flex items-center gap-1">
              <span>-</span>
              <span>{formatDateSafe(tournament.endDate, 'MMM d, yyyy')}</span>
            </div>
          )}
          {tournament.maxTeams && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>Max {tournament.maxTeams} teams</span>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-2 border-t pt-4">
            {loadingRounds ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : rounds.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No rounds added yet
              </div>
            ) : (
              rounds.map(round => (
                <RoundItem
                  key={round.id}
                  round={round}
                  tournamentId={tournament.id}
                  onEdit={onEditRound}
                />
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoundItem({
  round,
  tournamentId,
  onEdit,
}: {
  round: TournamentRound;
  tournamentId: string;
  onEdit: (round: TournamentRound) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  const { data: matches = [], isLoading: loadingMatches } = useQuery<Match[]>({
    queryKey: ['/api/rounds', round.id, 'matches', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(
        `/api/rounds/${round.id}/matches?organizationId=${currentOrganization.id}`,
        'GET'
      );
      return await res.json();
    },
    enabled: isExpanded && !!currentOrganization?.id,
  });

  const deleteRoundMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/rounds/${id}?tournamentId=${tournamentId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/tournaments', tournamentId, 'rounds'],
      });
      toast({
        title: 'Success',
        description: 'Round deleted successfully',
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: 'Unauthorized',
          description: 'You are logged out. Logging in again...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete round',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will delete all matches in this round.')) {
      await deleteRoundMutation.mutateAsync(id);
    }
  };

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`button-toggle-round-${round.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <CardTitle className="text-base truncate" data-testid={`text-round-name-${round.id}`}>
              {round.name}
            </CardTitle>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              data-testid={`button-round-menu-${round.id}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onEdit(round)}
              data-testid={`button-edit-round-${round.id}`}
            >
              Edit Round
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(round.id)}
              data-testid={`button-delete-round-${round.id}`}
            >
              Delete Round
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {loadingMatches ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-3 text-sm text-muted-foreground">
              No matches added yet
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map(match => (
                <div key={match.id} className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{match.teamA}</Badge>
                      <span className="text-muted-foreground">vs</span>
                      <Badge variant="outline">{match.teamB}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {match.date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDateSafe(match.date, 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    )}
                    {match.scoreA !== null && match.scoreB !== null && (
                      <Badge
                        variant="outline"
                        className={tweakcn(
                          'border',
                          match.scoreA! > match.scoreB!
                            ? 'text-green-500 border-green-500/20'
                            : match.scoreB! > match.scoreA!
                              ? 'text-blue-500 border-blue-500/20'
                              : 'text-gray-500 border-gray-500/20'
                        )}
                      >
                        {match.scoreA! > match.scoreB!
                          ? match.teamA
                          : match.scoreB! > match.scoreA!
                            ? match.teamB
                            : 'draw'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TournamentsPage() {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isRoundDialogOpen, setRoundDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const { data: tournaments = [], isLoading } = useQuery<Tournament[]>({
    queryKey: ['/api/tournaments', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(
        `/api/tournaments?organizationId=${currentOrganization.id}`,
        'GET'
      );
      return await res.json();
    },
    enabled: !!currentOrganization?.id,
  });

  const handleAddRound = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    setRoundDialogOpen(true);
  };

  const handleEditRound = (round: TournamentRound) => {
    setRoundDialogOpen(true);
  };

  const handleEditTournament = (tournament: Tournament) => {
    setDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Tournament
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">No tournaments found</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map(tournament => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              onEdit={handleEditTournament}
              onAddRound={handleAddRound}
              onEditRound={handleEditRound}
            />
          ))}
        </div>
      )}

      <TournamentDialog open={isDialogOpen} onOpenChange={setDialogOpen} />
      <RoundDialog
        open={isRoundDialogOpen}
        onOpenChange={setRoundDialogOpen}
        tournamentId={selectedTournamentId || ''}
      />
    </div>
  );
}
