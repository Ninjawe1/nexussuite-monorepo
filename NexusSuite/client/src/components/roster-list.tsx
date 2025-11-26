import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  Users,
  Gamepad2,
  Trophy,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Roster } from "@/services/rosterService";
import { normalizeGameTitle } from "@/constants/games";
import { format } from "date-fns";


interface RosterListProps {
  rosters: Roster[];
  onRosterSelect: (roster: Roster) => void;
  onRosterEdit: (roster: Roster) => void;
  onRosterDelete: (roster: Roster) => void;
  onAssignPlayers: (roster: Roster) => void;
  // Passed by parent but not used here; kept to satisfy props consistency across tabs/components
  onRemovePlayer?: (rosterId: string, playerId: string) => void;
  isLoading?: boolean;
}

export function RosterList({
  rosters,
  onRosterSelect,
  onRosterEdit,
  onRosterDelete,
  onAssignPlayers,
  isLoading = false,
}: RosterListProps) {
  const getTypeColor = (type: string) => {
    // Align badge colors with product roster types while keeping existing dark-theme palette
    switch (type) {
      case "International competitive":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Local Competitive":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "Academy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";

    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";

    try {
      const date =
        timestamp instanceof Date
          ? timestamp
          : timestamp?.toDate
            ? timestamp.toDate()
            : new Date(timestamp);
      const time = date?.getTime?.();
      if (!time || Number.isNaN(time)) return "Unknown";
      return format(date, "MMM dd, yyyy");
    } catch {
      return "Unknown";

    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (rosters.length === 0) {
    return (
      <div className="text-center py-12">
        <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No rosters found</h3>
        <p className="text-muted-foreground mb-4">
          Create your first roster to start managing your teams
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rosters.map((roster) => (

        <Card
          key={roster.id}
          className="hover:shadow-lg transition-shadow cursor-pointer group"
          onClick={() => onRosterSelect(roster)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
                    {(roster.name || "").trim().charAt(0).toUpperCase() || "?"}

                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold truncate">
                    {roster.name?.trim() || "Untitled roster"}

                  </CardTitle>
                  <CardDescription className="text-sm">
                    {formatDate(roster.createdAt)}
                  </CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}

                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {

                      e.stopPropagation();
                      onAssignPlayers(roster);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Players
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {

                      e.stopPropagation();
                      onRosterEdit(roster);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Roster
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={(e) => {

                      e.stopPropagation();
                      onRosterDelete(roster);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Roster
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {roster.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {roster.description}
              </p>

            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs ${getTypeColor(roster.type)}`}>
                <Trophy className="h-3 w-3 mr-1" />
                {roster.type}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Gamepad2 className="h-3 w-3 mr-1" />
                {normalizeGameTitle(roster.game) || "Unknown Game"}

              </Badge>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {roster.playerCount ?? 0}/{roster.maxPlayers ?? 5} players
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {formatDate(roster.updatedAt)}
                </span>

              </div>
            </div>

            {(roster.playerCount ?? 0) > 0 && (
              <div className="pt-3 border-t">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(5, roster.playerCount ?? 0))].map(
                    (_, i) => (
                      <Avatar
                        key={i}
                        className="h-6 w-6 border-2 border-background"
                      >
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          P
                        </AvatarFallback>
                      </Avatar>
                    ),
                  )}

                  {(roster.playerCount ?? 0) > 5 && (
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="text-xs bg-gray-500 text-white">
                        +{(roster.playerCount ?? 0) - 5}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
