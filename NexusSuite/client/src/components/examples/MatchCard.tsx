import { MatchCard } from "../match-card";


export default function MatchCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-background">
      <MatchCard
        id="1"
        teamA="Nexus Valorant"
        teamB="Team Phoenix"
        scoreA={2}
        scoreB={1}
        date={new Date("2024-10-08T18:00:00")}

        tournament="VCT Champions"
        game="Valorant"
        venue="Online"
        status="completed"
      />
      <MatchCard
        id="2"
        teamA="Nexus League"
        teamB="Storm Esports"
        date={new Date("2024-10-12T20:00:00")}

        tournament="LCS Summer Split"
        game="League of Legends"
        venue="LA Studio"
        status="upcoming"
      />
      <MatchCard
        id="3"
        teamA="Nexus PUBG"
        teamB="Elite Squad"
        scoreA={3}
        scoreB={3}
        date={new Date("2024-10-11T16:00:00")}

        tournament="PGC Qualifiers"
        game="PUBG"
        status="live"
      />
    </div>
  );
}
