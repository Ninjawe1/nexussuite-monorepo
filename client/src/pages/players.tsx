import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Staff, Payroll, Contract, Roster } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileText } from "lucide-react";
import { StaffCard } from "@/components/staff-card";
import { PlayerRosterDialog } from "@/components/player-roster-dialog";
import { PlayerAddDialog } from "@/components/player-add-dialog";
import { formatDateSafe } from "@/lib/date";

export default function Players() {
  const [searchQuery, setSearchQuery] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [dialogOpenFor, setDialogOpenFor] = useState<string | null>(null);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);

  const { data: staffMembers = [], isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: rosters = [] } = useQuery<Roster[]>({
    queryKey: ["/api/rosters"],
  });

  const { data: payroll = [] } = useQuery<Payroll[]>({
    queryKey: ["/api/payroll"],
  });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const players = staffMembers
    .filter(s => s.role.toLowerCase() === "player")
    .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredPlayers = players.filter(p => {
    if (gameFilter === "all") return true;
    return rosters.some(r => r.playerId === p.id && r.game.toLowerCase() === gameFilter.toLowerCase());
  });

  const getSalaryText = (playerId: string) => {
    const entries = payroll.filter(p => p.staffId === playerId);
    if (!entries.length) return "No payroll set";
    const latest = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).at(-1)!;
    return `${latest.amount} (${latest.type})`;
  };

  const getContractFor = (name: string) => {
    return contracts.find(c => c.type.toLowerCase() === "player" && c.linkedPerson === name);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-players">Players</h1>
          <p className="text-muted-foreground">Assign rosters per game, track roles, salary, and contracts</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddPlayerOpen(true)} data-testid="button-add-player">
            + Add Player
          </Button>
          <Button onClick={() => window.location.href = "/contracts"}>
            <FileText className="w-4 h-4 mr-2" />
            Manage Contracts
          </Button>
        </div>
      </div>

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
            const playerRosters = rosters.filter(r => r.playerId === player.id);
            const contract = getContractFor(player.name);

            return (
              <Card key={player.id} className="hover-elevate">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{player.name}</CardTitle>
                    <Badge>Player</Badge>
                  </div>
                  <CardDescription>{player.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Salary</span>
                      <Badge variant="outline" className="text-xs">{getSalaryText(player.id)}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Rosters</span>
                      <Button size="sm" variant="outline" onClick={() => setDialogOpenFor(player.id)}>
                        <Plus className="w-4 h-4 mr-1" /> Assign
                      </Button>
                    </div>
                    {playerRosters.length ? (
                      <div className="flex flex-wrap gap-2">
                        {playerRosters.map(r => (
                          <Badge key={r.id} variant="secondary" className="text-xs">{r.game} • {r.role}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No rosters assigned</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Contract</span>
                      {contract ? (
                        <Badge variant="outline" className="text-xs">
                          Expires {formatDateSafe(contract.expirationDate, "MMM dd, yyyy")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">No contract</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>

                {dialogOpenFor === player.id && (
                  <PlayerRosterDialog
                    open={true}
                    onOpenChange={(o) => setDialogOpenFor(o ? player.id : null)}
                    player={player}
                    existingRosters={playerRosters}
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

      {/* Mount the Add Player dialog inside the returned JSX */}
      <PlayerAddDialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen} />
    </div>
  );
}