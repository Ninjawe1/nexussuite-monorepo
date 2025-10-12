import { MatchCard } from "@/components/match-card";
import { MatchDialog } from "@/components/match-dialog";
import { Button } from "@/components/ui/button";
import { Plus, List, Calendar as CalendarIcon, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Match as MatchType } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Matches() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchType | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: matches = [], isLoading } = useQuery<MatchType[]>({
    queryKey: ["/api/matches"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/matches/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Success",
        description: "Match deleted successfully",
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
        description: error.message || "Failed to delete match",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (match: MatchType) => {
    setSelectedMatch(match);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedMatch(undefined);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this match?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-matches-title">
            Matches & Tournaments
          </h1>
          <p className="text-muted-foreground">Track your team's performance across all tournaments</p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-match">
          <Plus className="w-4 h-4 mr-2" />
          Add Match
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "list" | "calendar")}>
        <TabsList>
          <TabsTrigger value="list" data-testid="tab-list-view">
            <List className="w-4 h-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-calendar-view">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No matches scheduled yet. Add your first match to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.map((match) => (
                <div key={match.id} className="relative group">
                  <MatchCard
                    {...match}
                    date={new Date(match.date)}
                    scoreA={match.scoreA ?? undefined}
                    scoreB={match.scoreB ?? undefined}
                    status={match.status as "upcoming" | "live" | "completed"}
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" data-testid={`button-menu-match-${match.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(match)} data-testid={`button-edit-match-${match.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(match.id)}
                          className="text-destructive"
                          data-testid={`button-delete-match-${match.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <div className="bg-card border border-card-border rounded-lg p-6">
            <div className="text-center py-12">
              <CalendarIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Calendar View</h3>
              <p className="text-muted-foreground mb-4">
                Calendar view coming soon. Use list view to manage your matches.
              </p>
              <Button variant="outline" onClick={() => setView("list")} data-testid="button-switch-to-list">
                Switch to List View
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <MatchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        match={selectedMatch}
      />
    </div>
  );
}
