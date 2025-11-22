import { CampaignCard } from "../campaign-card";

export default function CampaignCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-background">
      <CampaignCard
        id="1"
        title="VCT Championship Hype"
        description="Building excitement for our team's championship run with daily highlights and player interviews"
        startDate={new Date("2024-10-01")}
        endDate={new Date("2024-10-15")}
        platforms={["twitter", "instagram", "youtube"]}
        reach={125000}
        engagement={8.5}
        status="active"
      />
      <CampaignCard
        id="2"
        title="New Roster Announcement"
        description="Introducing our new League of Legends roster with teaser content and reveal event"
        startDate={new Date("2024-10-20")}
        endDate={new Date("2024-10-22")}
        platforms={["twitter", "twitch"]}
        status="scheduled"
      />
      <CampaignCard
        id="3"
        title="Bootcamp Documentary"
        description="Behind-the-scenes content from our PUBG team's training bootcamp in Seoul"
        startDate={new Date("2024-09-15")}
        endDate={new Date("2024-09-30")}
        platforms={["youtube", "tiktok", "instagram"]}
        reach={89000}
        engagement={12.3}
        status="completed"
      />
    </div>
  );
}
