import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, Users, Trophy, Clock } from 'lucide-react';
import { Roster } from '@/types/roster';
import { useRosterContext } from '@/contexts/RosterContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RosterDetailsDialogProps {
  roster: Roster | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RosterDetailsDialog({ roster, open, onOpenChange }: RosterDetailsDialogProps) {
  const { rosterPlayers, isLoadingPlayers, removePlayerFromRoster } = useRosterContext();
  const [removingId, setRemovingId] = useState<string | null>(null);
  if (!roster) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'competitive':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'casual':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'practice':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'competitive':
        return <Trophy className="h-4 w-4" />;
      case 'casual':
        return <Users className="h-4 w-4" />;
      case 'practice':
        return <Clock className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {roster.name}
            <Badge className={`${getTypeColor(roster.type)} flex items-center gap-1`}>
              {getTypeIcon(roster.type)}
              {roster.type.charAt(0).toUpperCase() + roster.type.slice(1)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Roster details and member information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Roster Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Roster Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {roster.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm">{roster.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {rosterPlayers.length || 0} / {roster.maxPlayers} players
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Created {formatDate(roster.createdAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Players Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Team Members
                <Badge variant="secondary">
                  {rosterPlayers.length || 0} / {roster.maxPlayers}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPlayers ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : rosterPlayers && rosterPlayers.length > 0 ? (
                <div className="space-y-3">
                  {rosterPlayers.map((player) => (
                    <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {player.playerId.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{player.playerId}</h4>
                          {player.role && (
                            <Badge variant="outline" className="text-xs">
                              {player.role}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Joined: {player.joinedAt?.toLocaleDateString?.() || '-'}</p>
                      </div>
                      {/* Remove player action */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900"
                            disabled={removingId === player.playerId}
                          >
                            {removingId === player.playerId ? (
                              <span className="text-xs">Removing...</span>
                            ) : (
                              // Using an X icon via unicode to avoid new imports; lucide Trash present but not imported to keep file tidy
                              <span aria-hidden>🗑️</span>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove player from roster?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove <strong>{player.playerId}</strong> from <strong>{roster.name}</strong>.
                              You can re-assign this player at any time.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  setRemovingId(player.playerId);
                                  await removePlayerFromRoster(roster.id, player.playerId);
                                } finally {
                                  setRemovingId(null);
                                }
                              }}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No players assigned</h3>
                  <p className="text-sm text-muted-foreground">
                    This roster doesn't have any players assigned yet. 
                    Use the assign players option to add team members.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

