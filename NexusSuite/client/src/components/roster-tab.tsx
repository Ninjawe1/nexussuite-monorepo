import React, { useState } from "react";
import { RosterList } from "@/components/roster-list";
import { RosterCreationDialog } from "@/components/roster-creation-dialog";
import { RosterDetailsDialog } from "@/components/roster-details-dialog";
import { RosterEditDialog } from "@/components/roster-edit-dialog";
import { PlayerAssignmentDialog } from "@/components/player-assignment-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";
import { useRosterContext } from "@/contexts/RosterContext";
import { CreateRosterData, PlayerAssignment } from "@/services/rosterService";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Mock player data - replace with actual player data from your context
interface Player {
  id: string;
  name: string;
  email: string;
  role: string;
  game: string;
  avatar?: string;
  status: "active" | "inactive";
}

interface RosterTabProps {
  organizationId: string;
  currentUserId: string;
  allPlayers: Player[];
}

export function RosterTab({
  organizationId,
  currentUserId,
  allPlayers,
}: RosterTabProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // Use the RosterContext's selectedRoster so that rosterPlayers queries and
  // cache invalidations are correctly keyed and reflected across the app
  const {
    rosters,
    isLoadingRosters,
    createRoster,
    assignPlayersToRoster,
    removePlayerFromRoster,
    updateRoster,
    deleteRoster,
    selectedRoster,
    setSelectedRoster,
    rosterPlayers,
  } = useRosterContext();

  const { toast } = useToast();

  const handleCreateRoster = async (data: CreateRosterData) => {
    try {
      await createRoster(data);
      toast({
        title: "Success",
        description: "Roster created successfully",
      });
    } catch (error) {
      console.error("Error creating roster:", error);
      toast({
        title: "Error",
        description: "Failed to create roster. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleAssignPlayers = async (payload: {
    rosterId: string;
    playerIds: string[];
    role: string;
    game: string;
  }) => {
    try {
      // Ensure the roster has a 'game' set before assigning players
      const needsGame =
        !selectedRoster?.game ||
        selectedRoster?.game === "" ||
        selectedRoster?.game === "Unknown Game";
      if (needsGame) {
        const gameToSet = payload.game?.trim();
        if (!gameToSet) {
          throw new Error(
            "Roster is missing required 'game'. Please set the roster's game before assigning players.",
          );
        }
        await updateRoster(payload.rosterId, { game: gameToSet } as any);
        // Update local selectedRoster snapshot to reflect the change immediately
        setSelectedRoster((prev: any) =>
          prev ? { ...prev, game: gameToSet } : prev,
        );
      }
      const players: PlayerAssignment[] = payload.playerIds.map((id) => ({
        playerId: id,
        role: payload.role,
        game: needsGame ? payload.game : (selectedRoster?.game ?? payload.game),
      }));
      await assignPlayersToRoster(payload.rosterId, players);
      toast({
        title: "Success",
        description: "Players assigned to roster successfully",
      });
    } catch (error) {
      console.error("Error assigning players:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to assign players. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleRemovePlayer = async (rosterId: string, playerId: string) => {
    try {
      await removePlayerFromRoster(rosterId, playerId);
      toast({
        title: "Success",
        description: "Player removed from roster successfully",
      });
    } catch (error) {
      console.error("Error removing player:", error);
      toast({
        title: "Error",
        description: "Failed to remove player. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRoster = async (roster: any) => {
    // Delegate to context mutation which handles toasts and cache invalidation
    await deleteRoster(roster.id);
  };

  const handleAssignPlayersClick = (roster: any) => {
    // Sync selection into context so rosterPlayers query activates
    setSelectedRoster(roster);
    setIsAssignDialogOpen(true);
  };

  const handleRosterSelect = (roster: any) => {
    // Sync selection into context so details dialog can load rosterPlayers
    setSelectedRoster(roster);
    setIsDetailsDialogOpen(true);
  };

  if (isLoadingRosters) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading rosters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Rosters</h2>
          <p className="text-muted-foreground">
            Manage your team rosters, assign players, and track team composition
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Roster
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Rosters</p>
              <p className="text-2xl font-bold">{rosters.length}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Players</p>
              <p className="text-2xl font-bold">
                {rosters.reduce(
                  (total, roster) => total + (roster.playerCount || 0),
                  0,
                )}
              </p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Rosters</p>
              <p className="text-2xl font-bold">
                {rosters.filter((r) => r.isActive).length}
              </p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Rosters List */}
      {rosters.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No rosters found. Create your first roster to get started with team
            management.
          </AlertDescription>
        </Alert>
      ) : (
        <RosterList
          rosters={rosters}
          onRosterSelect={handleRosterSelect}
          onRosterEdit={(roster) => {
            setSelectedRoster(roster);
            setIsEditDialogOpen(true);
          }}
          onRosterDelete={handleDeleteRoster}
          onAssignPlayers={handleAssignPlayersClick}
          onRemovePlayer={handleRemovePlayer}
          isLoading={isLoadingRosters}
        />
      )}

      {/* Create Roster Dialog */}
      <RosterCreationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateRoster}
        organizationId={organizationId}
        createdBy={currentUserId}
        isLoading={isLoadingRosters}
      />

      {/* Roster Details Dialog */}
      <RosterDetailsDialog
        roster={selectedRoster}
        open={isDetailsDialogOpen}
        onOpenChange={(open) => {
          // Clear selection on close to avoid stale queries
          if (!open) setSelectedRoster(null);
          setIsDetailsDialogOpen(open);
        }}
      />

      {/* Roster Edit Dialog */}
      {selectedRoster && (
        <RosterEditDialog
          roster={selectedRoster}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSubmit={async (data) => {
            try {
              await updateRoster(selectedRoster.id, data);
              toast({
                title: "Roster updated",
                description: "Your changes have been saved.",
              });
            } catch (e) {
              toast({
                title: "Failed to update roster",
                description: "Please try again later.",
                variant: "destructive",
              });
            }
          }}
          isLoading={isLoadingRosters}
        />
      )}

      {/* Player Assignment Dialog */}
      {selectedRoster && (
        <PlayerAssignmentDialog
          open={isAssignDialogOpen}
          onOpenChange={(open) => {
            if (!open) setSelectedRoster(null);
            setIsAssignDialogOpen(open);
          }}
          onSubmit={handleAssignPlayers}
          rosterId={selectedRoster.id}
          rosterName={selectedRoster.name}
          maxPlayers={selectedRoster.maxPlayers}
          // Use context.rosterPlayers so current count/slots reflect latest server state
          currentPlayers={rosterPlayers.map((p) => ({
            playerId: p.playerId,
            role: p.role,
          }))}
          allPlayers={allPlayers}
          isLoading={isLoadingRosters}
          game={selectedRoster.game}
        />
      )}
    </div>
  );
}
