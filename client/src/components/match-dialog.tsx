import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertMatchSchema, type InsertMatch, type Match, type Tournament, type TournamentRound } from "@shared/schema";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { toDateSafe } from "@/lib/date";

interface MatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match?: Match;
}

export function MatchDialog({ open, onOpenChange, match }: MatchDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | undefined>(match?.tournamentId || undefined);

  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
    enabled: open,
  });

  const { data: rounds = [] } = useQuery<TournamentRound[]>({
    queryKey: ["/api/tournaments", selectedTournamentId, "rounds"],
    enabled: open && !!selectedTournamentId,
  });

  const formSchema = insertMatchSchema.omit({ tenantId: true }).extend({
    date: insertMatchSchema.shape.date.or(z.string().transform(val => new Date(val))),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tournamentId: match?.tournamentId || undefined,
      roundId: match?.roundId || undefined,
      teamA: match?.teamA || "",
      teamB: match?.teamB || "",
      scoreA: match?.scoreA || undefined,
      scoreB: match?.scoreB || undefined,
      date: match?.date ? (toDateSafe(match.date)?.toISOString().slice(0, 16) ?? new Date().toISOString().slice(0, 16)) : new Date().toISOString().slice(0, 16),
      tournament: match?.tournament || "",
      game: match?.game || "",
      venue: match?.venue || "",
      status: match?.status || "upcoming",
      notes: match?.notes || "",
    },
  });

  useEffect(() => {
    if (open) {
      if (match) {
        setSelectedTournamentId(match.tournamentId || undefined);
        form.reset({
          tournamentId: match.tournamentId || undefined,
          roundId: match.roundId || undefined,
          teamA: match.teamA || "",
          teamB: match.teamB || "",
          scoreA: match.scoreA || undefined,
          scoreB: match.scoreB || undefined,
          date: match.date ? (toDateSafe(match.date)?.toISOString().slice(0, 16) ?? new Date().toISOString().slice(0, 16)) : new Date().toISOString().slice(0, 16),
          tournament: match.tournament || "",
          game: match.game || "",
          venue: match.venue || "",
          status: match.status || "upcoming",
          notes: match.notes || "",
        });
      } else {
        setSelectedTournamentId(undefined);
        form.reset({
          tournamentId: undefined,
          roundId: undefined,
          teamA: "",
          teamB: "",
          scoreA: undefined,
          scoreB: undefined,
          date: new Date().toISOString().slice(0, 16),
          tournament: "",
          game: "",
          venue: "",
          status: "upcoming",
          notes: "",
        });
      }
    }
  }, [match, open, form]);

  const createMutation = useMutation({
    mutationFn: async (data: Omit<InsertMatch, "tenantId">) => {
      return await apiRequest("/api/matches", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Success",
        description: "Match added successfully",
      });
      onOpenChange(false);
      form.reset();
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
        description: error.message || "Failed to add match",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Omit<InsertMatch, "tenantId">) => {
      return await apiRequest(`/api/matches/${match?.id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Success",
        description: "Match updated successfully",
      });
      onOpenChange(false);
      form.reset();
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
        description: error.message || "Failed to update match",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const submitData = {
        ...data,
        date: new Date(data.date),
      };
      if (match) {
        await updateMutation.mutateAsync(submitData);
      } else {
        await createMutation.mutateAsync(submitData);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-testid="dialog-match">
        <DialogHeader>
          <DialogTitle>{match ? "Edit Match" : "Add Match"}</DialogTitle>
          <DialogDescription>
            {match ? "Update the match details below" : "Schedule a new match or tournament"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tournamentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value === "none" ? undefined : value);
                        setSelectedTournamentId(value === "none" ? undefined : value);
                        form.setValue("roundId", undefined);
                      }} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-match-tournament">
                          <SelectValue placeholder="Select tournament" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (Standalone Match)</SelectItem>
                        {tournaments.map((tournament) => (
                          <SelectItem key={tournament.id} value={tournament.id}>
                            {tournament.name}
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
                name="roundId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Round (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                      value={field.value || "none"}
                      disabled={!selectedTournamentId}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-match-round">
                          <SelectValue placeholder={selectedTournamentId ? "Select round" : "Select tournament first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {rounds.map((round) => (
                          <SelectItem key={round.id} value={round.id}>
                            {round.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="teamA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team A</FormLabel>
                    <FormControl>
                      <Input placeholder="Nexus Valorant" {...field} data-testid="input-match-teamA" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teamB"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team B</FormLabel>
                    <FormControl>
                      <Input placeholder="Opponent Team" {...field} data-testid="input-match-teamB" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scoreA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score A (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-match-scoreA"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scoreB"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score B (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-match-scoreB"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tournament"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament</FormLabel>
                    <FormControl>
                      <Input placeholder="VCT Champions" {...field} data-testid="input-match-tournament" />
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
                      <Input placeholder="Valorant, League of Legends, etc." {...field} data-testid="input-match-game" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-match-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-match-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Online, LA Studio, etc." {...field} data-testid="input-match-venue" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional match details..." {...field} data-testid="input-match-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                data-testid="button-cancel-match"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-submit-match">
                {isSubmitting ? "Saving..." : match ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
