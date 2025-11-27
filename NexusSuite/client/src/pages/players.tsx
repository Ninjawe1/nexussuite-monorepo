import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Staff, Payroll, Contract } from "@shared/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, FileText, Users, Edit2, Trash } from "lucide-react";
import { AssignToRosterDialog } from "@/components/assign-to-roster-dialog";
import { PlayerAddDialog } from "@/components/player-add-dialog";
import { RosterTab } from "@/components/roster-tab";
import { RosterProvider, useRosterContext } from "@/contexts/RosterContext";
import { formatDateSafe, toDateSafe } from "@/lib/date";
import { PlayerRoleEditDialog } from "@/components/player-role-edit-dialog";
import { StaffDialog } from "@/components/staff-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { useAuth } from "@/hooks/useAuth"; // Correct hook path? I saw useAuth.ts in hooks/
import { useOrganization } from "@/contexts/OrganizationContext";

export default function Players() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || "";

  // Wait for organization to be loaded
  if (!organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    );
  }

  return (
    <RosterProvider organizationId={organizationId}>
      <PlayersContent organizationId={organizationId} />
    </RosterProvider>
  );
}

function PlayersContent({
  organizationId,
}: {
  organizationId: string;
}) {
  const { user } = useAuth();
  const currentUserId = user?.id || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [dialogOpenFor, setDialogOpenFor] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Staff | null>(null);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("players");

  const [roleEditOpen, setRoleEditOpen] = useState(false);
  const [roleEditState, setRoleEditState] = useState<{
    rosterId: string;
    rosterName: string;
    playerId: string;
    role: string;
  } | null>(null);
  const [editOpenFor, setEditOpenFor] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: staffMembers = [], isLoading: staffLoading } = useQuery<
    Staff[]
  >({
    queryKey: ["/api/staff", organizationId],
    queryFn: async () => {
      const res = await apiRequest(
        `/api/staff?organizationId=${organizationId}`,
        "GET",
      );
      return await res.json();
    },
    enabled: !!organizationId,
  });

  const { data: payroll = [] } = useQuery<Payroll[]>({
    queryKey: ["/api/payroll", organizationId],
    queryFn: async () => {
      const res = await apiRequest(
        `/api/payroll?organizationId=${organizationId}`,
        "GET",
      );
      return await res.json();
    },
    enabled: !!organizationId,
  });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts", organizationId],
    queryFn: async () => {
      const res = await apiRequest(
        `/api/contracts?organizationId=${organizationId}`,
        "GET",
      );
      return await res.json();
    },
    enabled: !!organizationId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/staff/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/staff", organizationId],
      });
      toast({
        title: "Player deleted",
        description: "The player has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete player.",
        variant: "destructive",

      });
    },
  });

  const players = staffMembers
    .filter((s) => s.role.toLowerCase() === "player")
    .filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()),

    );

  const filteredPlayers = players; // Game filtering removed due to roster.game deprecation

  // Roster context for assignment and relation data (now safely within Provider)
  const {
    rosters: contextRosters,
    rosterPlayers,
    assignPlayersToRoster,
    isLoadingRosters,
    setSelectedRoster,
  } = useRosterContext();

  const getSalaryText = (playerId: string) => {
    const entries = payroll.filter((p) => p.staffId === playerId);
    if (!entries.length) return "No payroll set";
    const latest = entries
      .sort(
        (a, b) =>
          (toDateSafe(a.date)?.getTime() ?? 0) -
          (toDateSafe(b.date)?.getTime() ?? 0),
      )

      .at(-1)!;
    return `${latest.amount} (${latest.type})`;
  };

  const getContractFor = (name: string) => {
    return contracts.find(
      (c) => c.type.toLowerCase() === "player" && c.linkedPerson === name,
    );
  };

  const mockPlayers = players.map((player) => ({
    id: player.id,
    name: player.name,
    email: player.email,
    role: "starter",
    game: "valorant",
    status: "active" as const,

  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-players">
            Players
          </h1>
          <p className="text-muted-foreground">
            Manage players, rosters, contracts, and team composition
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setAddPlayerOpen(true)}
            data-testid="button-add-player"
          >
            + Add Player
          </Button>
          <Button onClick={() => (window.location.href = "/contracts")}>

            <FileText className="w-4 h-4 mr-2" />
            Manage Contracts
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="players">
            <Users className="w-4 h-4 mr-2" />
            Players
          </TabsTrigger>
          <TabsTrigger value="rosters">
            <Users className="w-4 h-4 mr-2" />
            Rosters
          </TabsTrigger>
        </TabsList>

        {/* Players Tab Content */}
        <TabsContent value="players" className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search players by name or email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}

              />
            </div>
            <Select value={gameFilter} onValueChange={setGameFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by game" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Games</SelectItem>
                <SelectItem value="valorant">Valorant</SelectItem>
                <SelectItem value="cs2">CS2</SelectItem>
                <SelectItem value="lol">League of Legends</SelectItem>
                <SelectItem value="dota2">Dota 2</SelectItem>
                <SelectItem value="apex">Apex Legends</SelectItem>
                <SelectItem value="fortnite">Fortnite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {staffLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground">Loading players...</p>
            </div>
          ) : filteredPlayers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlayers.map((player) => {
                const playerAssignments = rosterPlayers.filter(
                  (rp) => rp.playerId === player.id,
                );

                const contract = getContractFor(player.name);

                return (
                  <Card key={player.id} className="hover-elevate">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {player.name}
                        </CardTitle>

                        <div className="flex items-center gap-2">
                          <Badge>Player</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit player"
                            onClick={() => setEditOpenFor(player.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            title="Delete player"
                            onClick={() => deleteMutation.mutate(player.id)}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>{player.email}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Salary
                          </span>

                          <Badge variant="outline" className="text-xs">
                            {getSalaryText(player.id)}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Rosters
                          </span>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPlayer(player);
                              setDialogOpenFor(player.id);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Assign
                          </Button>
                        </div>
                        {playerAssignments.length ? (
                          <div className="flex flex-wrap gap-2">
                            {playerAssignments.map((ap) => {
                              const rosterName =
                                contextRosters.find((r) => r.id === ap.rosterId)
                                  ?.name || "Roster";
                              return (
                                <div
                                  key={ap.id}
                                  className="flex items-center gap-1"
                                >
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >

                                    {rosterName} · {ap.role}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      setSelectedPlayer(player);
                                      setRoleEditState({
                                        rosterId: ap.rosterId,
                                        rosterName,
                                        playerId: player.id,
                                        role: ap.role,
                                      });
                                      setRoleEditOpen(true);
                                    }}
                                    title="Edit role"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No rosters assigned
                          </p>

                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Contract
                          </span>
                          {contract ? (
                            <Badge variant="outline" className="text-xs">
                              Expires{" "}
                              {formatDateSafe(
                                contract.expirationDate,
                                "MMM dd, yyyy",
                              )}

                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              No contract
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    {dialogOpenFor === player.id && (
                      <AssignToRosterDialog
                        open={true}
                        onOpenChange={(o) => {

                          if (!o) {
                            setDialogOpenFor(null);
                            setSelectedPlayer(null);
                          }
                        }}
                        player={selectedPlayer}
                        availableRosters={contextRosters}
                        onSubmit={async (rosterId, role) => {
                          const chosen =
                            contextRosters.find((r) => r.id === rosterId) ||
                            null;
                          setSelectedRoster(chosen);
                          await assignPlayersToRoster(rosterId, [
                            { playerId: player.id, role },
                          ]);

                        }}
                        isLoading={isLoadingRosters}
                      />
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No players found.</p>
            </div>
          )}
        </TabsContent>

        {/* Rosters Tab Content */}
        <TabsContent value="rosters" className="mt-6">
          <RosterTab
            organizationId={organizationId}
            currentUserId={currentUserId}
            allPlayers={mockPlayers}
          />
        </TabsContent>
      </Tabs>

      {/* Mount the Add Player dialog outside of tabs */}
      <PlayerAddDialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen} />

      {/* Edit Player Role dialog */}
      {roleEditState && (
        <PlayerRoleEditDialog
          open={roleEditOpen}
          onOpenChange={(o) => {

            setRoleEditOpen(o);
            if (!o) setRoleEditState(null);
          }}
          player={selectedPlayer}
          rosterName={roleEditState.rosterName}
          currentRole={roleEditState.role}
          onSubmit={async (nextRole) => {

            await assignPlayersToRoster(roleEditState.rosterId, [
              { playerId: roleEditState.playerId, role: nextRole },
            ]);
          }}
        />
      )}

      {/* Edit Player Info dialog */}
      <StaffDialog
        open={!!editOpenFor}
        onOpenChange={(o) => {
          if (!o) setEditOpenFor(null);
        }}
        staff={
          editOpenFor
            ? staffMembers.find((s) => s.id === editOpenFor)
            : undefined
        }

      />
    </div>
  );
}
