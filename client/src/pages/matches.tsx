import { MatchCard } from "@/components/match-card";
import { Button } from "@/components/ui/button";
import { Plus, List, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Matches() {
  const [view, setView] = useState<"list" | "calendar">("list");

  const matches = [
    {
      id: "1",
      teamA: "Nexus Valorant",
      teamB: "Team Phoenix",
      scoreA: 2,
      scoreB: 1,
      date: new Date('2024-10-08T18:00:00'),
      tournament: "VCT Champions",
      game: "Valorant",
      venue: "Online",
      status: "completed" as const,
    },
    {
      id: "2",
      teamA: "Nexus League",
      teamB: "Storm Esports",
      date: new Date('2024-10-12T20:00:00'),
      tournament: "LCS Summer Split",
      game: "League of Legends",
      venue: "LA Studio",
      status: "upcoming" as const,
    },
    {
      id: "3",
      teamA: "Nexus PUBG",
      teamB: "Elite Squad",
      scoreA: 3,
      scoreB: 3,
      date: new Date('2024-10-11T16:00:00'),
      tournament: "PGC Qualifiers",
      game: "PUBG",
      status: "live" as const,
    },
    {
      id: "4",
      teamA: "Nexus Valorant",
      teamB: "Apex Gaming",
      date: new Date('2024-10-15T19:00:00'),
      tournament: "VCT Champions",
      game: "Valorant",
      venue: "Online",
      status: "upcoming" as const,
    },
    {
      id: "5",
      teamA: "Nexus League",
      teamB: "Dragon Force",
      scoreA: 1,
      scoreB: 2,
      date: new Date('2024-10-05T18:00:00'),
      tournament: "LCS Summer Split",
      game: "League of Legends",
      venue: "Online",
      status: "completed" as const,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-matches-title">
            Matches & Tournaments
          </h1>
          <p className="text-muted-foreground">Track your team's performance across all tournaments</p>
        </div>
        <Button data-testid="button-add-match">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
              <MatchCard key={match.id} {...match} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <div className="bg-card border border-card-border rounded-lg p-6">
            <div className="text-center py-12">
              <CalendarIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Calendar View</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Full calendar integration with match scheduling will be available in the complete version.
                Click on any date to add or view matches.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
