import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTournamentSchema, type InsertTournament, type Tournament } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateSafe, toDateSafe } from "@/lib/date";

interface TournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament?: Tournament;
}

const tournamentSchema = insertTournamentSchema.omit({ tenantId: true }).extend({
  startDate: z.string(),
  endDate: z.string().optional(),
});

type TournamentFormData = z.infer<typeof tournamentSchema>;

export function TournamentDialog({ open, onOpenChange, tournament }: TournamentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!tournament;

  const form = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: tournament
      ? {
          name: tournament.name,
          description: tournament.description || "",
          format: tournament.format,
          game: tournament.game || "",
          startDate: tournament.startDate ? formatDateSafe(tournament.startDate, "yyyy-MM-dd") : "",
          endDate: tournament.endDate ? formatDateSafe(tournament.endDate, "yyyy-MM-dd") : "",
          maxTeams: tournament.maxTeams || undefined,
          status: tournament.status,
        }
      : {
          name: "",
          description: "",
          format: "single-elimination",
          game: "",
          startDate: "",
          endDate: "",
          maxTeams: undefined,
          status: "upcoming",
        },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertTournament) => {
      if (isEdit) {
        return await apiRequest(`/api/tournaments/${tournament.id}`, "PATCH", data);
      }
      return await apiRequest("/api/tournaments", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({
        title: "Success",
        description: `Tournament ${isEdit ? "updated" : "created"} successfully`,
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
        description: error.message || `Failed to ${isEdit ? "update" : "create"} tournament`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TournamentFormData) => {
    const start = toDateSafe(data.startDate);
    if (!start) {
      toast({
        title: "Invalid date",
        description: "Please enter a valid start date (YYYY-MM-DD).",
        variant: "destructive",
      });
      return;
    }
    const end = data.endDate ? toDateSafe(data.endDate) : undefined;
    if (data.endDate && !end) {
      toast({
        title: "Invalid date",
        description: "Please enter a valid end date (YYYY-MM-DD).",
        variant: "destructive",
      });
      return;
    }
    const tournamentData: any = {
      ...data,
      startDate: start,
      endDate: end,
    };
    mutation.mutate(tournamentData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Tournament" : "Create Tournament"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update tournament details" : "Add a new tournament to your organization"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tournament Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Spring Championship 2025" {...field} data-testid="input-tournament-name" />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tournament details..."
                      {...field}
                      value={field.value || ""}
                      data-testid="input-tournament-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tournament-format">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single-elimination">Single Elimination</SelectItem>
                        <SelectItem value="double-elimination">Double Elimination</SelectItem>
                        <SelectItem value="round-robin">Round Robin</SelectItem>
                        <SelectItem value="league">League</SelectItem>
                        <SelectItem value="swiss">Swiss</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="game"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="League of Legends" {...field} data-testid="input-tournament-game" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-tournament-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-tournament-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxTeams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Teams (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="16"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value || ""}
                        data-testid="input-tournament-max-teams"
                      />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tournament-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-tournament"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-tournament">
                {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
