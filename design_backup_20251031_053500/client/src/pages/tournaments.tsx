import { Button } from "@/components/ui/button";
import { Plus, Trophy, ChevronRight, ChevronDown, MoreHorizontal, Calendar, Users, Target } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Tournament, TournamentRound, Match } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";
import { TournamentDialog } from "@/components/tournament-dialog";
import { RoundDialog } from "@/components/round-dialog";
import { formatDateSafe } from "@/lib/date";

const formatStatusBadge = (status: string) => {
  const statusColors = {
    upcoming: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    ongoing: "bg-green-500/10 text-green-500 border-green-500/20",
    completed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  };
  return statusColors[status as keyof typeof statusColors] || statusColors.upcoming;
};

const formatFormatBadge = (formatType: string) => {
  const formatColors = {
    "single-elimination": "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "double-elimination": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    "round-robin": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    league: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    swiss: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    custom: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  };
  return formatColors[formatType as keyof typeof formatColors] || formatColors.custom;
};

function TournamentCard({ tournament, onEdit, onAddRound, onEditRound }: { 
  tournament: Tournament; 
  onEdit: (tournament: Tournament) => void;
  onAddRound: (tournamentId: string) => void;
  onEditRound: (round: TournamentRound) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rounds = [], isLoading: loadingRounds } = useQuery<TournamentRound[]>({
    queryKey: ["/api/tournaments", tournament.id, "rounds"],
    enabled: isExpanded,
  });

  const deleteTournamentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/tournaments/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Success",
        description: "Tournament deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete tournament",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure? This will delete the tournament and all its rounds and matches.")) {
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
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg truncate" data-testid={`text-tournament-name-${tournament.id}`}>
              {tournament.name}
            </CardTitle>
          </div>
          {tournament.description && (
            <p className="text-sm text-muted-foreground truncate ml-14">{tournament.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-tournament-menu-${tournament.id}`}>
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
          <Badge variant="outline" className={cn("border", formatStatusBadge(tournament.status))}>
            {tournament.status}
          </Badge>
          <Badge variant="outline" className={cn("border", formatFormatBadge(tournament.format))}>
            {tournament.format.replace("-", " ")}
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
            <span>{formatDateSafe(tournament.startDate, "MMM d, yyyy")}</span>
          </div>
          {tournament.endDate && (
            <div className="flex items-center gap-1">
              <span>-</span>
              <span>{formatDateSafe(tournament.endDate, "MMM d, yyyy")}</span>
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
              rounds.map((round) => (
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

function RoundItem({ round, tournamentId, onEdit }: { 
  round: TournamentRound; 
  tournamentId: string;
  onEdit: (round: TournamentRound) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: matches = [], isLoading: loadingMatches } = useQuery<Match[]>({
    queryKey: ["/api/rounds", round.id, "matches"],
    enabled: isExpanded,
  });

  const deleteRoundMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/rounds/${id}?tournamentId=${tournamentId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "rounds"] });
      toast({
        title: "Success",
        description: "Round deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete round",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure? This will delete the round and all its matches.")) {
      await deleteRoundMutation.mutateAsync(id);
    }
  };

  return (
    <div className="border rounded-md p-3 bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid={`button-toggle-round-${round.id}`}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid={`text-round-name-${round.id}`}>
              Round {round.roundNumber}: {round.name}
            </p>
            {round.format && (
              <p className="text-xs text-muted-foreground truncate">Format: {round.format}</p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-round-menu-${round.id}`}>
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => onEdit(round)}
              data-testid={`button-edit-round-${round.id}`}
            >
              Edit Round
            </DropdownMenuItem>
            <DropdownMenuItem data-testid={`button-add-match-${round.id}`}>Add Match</DropdownMenuItem>
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
        <div className="mt-2 space-y-1 ml-8">
          {loadingMatches ? (
            <Skeleton className="h-10" />
          ) : matches.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-2">No matches scheduled</div>
          ) : (
            matches.map((match) => (
              <div key={match.id} className="flex items-center gap-2 p-2 bg-background rounded text-xs">
                <span className="text-muted-foreground">Match {match.matchNumber}:</span>
                <span className="font-medium">{match.teamA}</span>
                {match.scoreA !== null && match.scoreB !== null ? (
                  <>
                    <span className="text-muted-foreground">
                      {match.scoreA} - {match.scoreB}
                    </span>
                    <span className="font-medium">{match.teamB}</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">vs</span>
                    <span className="font-medium">{match.teamB}</span>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Tournaments() {
  const { toast } = useToast();
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | undefined>();
  const [roundDialogOpen, setRoundDialogOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<TournamentRound | undefined>();
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");

  const { data: tournaments = [], isLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
  });

  const handleAdd = () => {
    setSelectedTournament(undefined);
    setTournamentDialogOpen(true);
  };

  const handleEditTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setTournamentDialogOpen(true);
  };

  const handleAddRound = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    setSelectedRound(undefined);
    setRoundDialogOpen(true);
  };

  const handleEditRound = (round: TournamentRound) => {
    setSelectedTournamentId(round.tournamentId);
    setSelectedRound(round);
    setRoundDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-tournaments-title">
            Tournaments
          </h1>
          <p className="text-muted-foreground">Manage tournament structure with rounds and matches</p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-tournament">
          <Plus className="w-4 h-4 mr-2" />
          Add Tournament
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground mb-4">
              No tournaments yet. Create your first tournament to get started.
            </p>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Create Tournament
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {tournaments.map((tournament) => (
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

      <TournamentDialog
        open={tournamentDialogOpen}
        onOpenChange={setTournamentDialogOpen}
        tournament={selectedTournament}
      />

      <RoundDialog
        open={roundDialogOpen}
        onOpenChange={setRoundDialogOpen}
        tournamentId={selectedTournamentId}
        round={selectedRound}
      />
    </div>
  );
}
