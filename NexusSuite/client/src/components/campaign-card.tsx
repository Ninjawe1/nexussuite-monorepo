import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SiX,
  SiInstagram,
  SiYoutube,
  SiTiktok,
  SiTwitch,
} from "react-icons/si";
import { Eye, Heart } from "lucide-react";
import { formatDateSafe } from "@/lib/date";


interface CampaignCardProps {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  platforms: Array<"twitter" | "instagram" | "youtube" | "tiktok" | "twitch">;
  reach?: number;
  engagement?: number;
  status: "active" | "completed" | "scheduled";

}

export function CampaignCard({
  id,
  title,
  description,
  startDate,
  endDate,
  platforms,
  reach,
  engagement,
  status,
}: CampaignCardProps) {
  const platformIcons = {
    twitter: SiX,
    instagram: SiInstagram,
    youtube: SiYoutube,
    tiktok: SiTiktok,
    twitch: SiTwitch,
  };

  const statusColors = {
    active: "bg-chart-2 text-primary-foreground",
    completed: "bg-secondary text-secondary-foreground",
    scheduled: "bg-chart-4 text-primary-foreground",
  };

  const startText = formatDateSafe(startDate, "MMM dd");
  const endText = formatDateSafe(endDate, "MMM dd, yyyy");

  return (
    <Card
      className="hover-elevate active-elevate-2 cursor-pointer"
      data-testid={`card-campaign-${id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-semibold text-base line-clamp-1"
            data-testid={`text-title-${id}`}
          >

            {title}
          </h3>
          <Badge className={`${statusColors[status]} text-xs shrink-0`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {description}
        </p>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center gap-2 mb-3">
          {platforms.map((platform) => {
            const Icon = platformIcons[platform];
            return (
              <Icon key={platform} className="w-4 h-4 text-muted-foreground" />
            );

          })}
        </div>
        {(reach !== undefined || engagement !== undefined) && (
          <div className="grid grid-cols-2 gap-3">
            {reach !== undefined && (
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-chart-3" />
                <div>
                  <p className="text-sm font-mono font-semibold">
                    {reach.toLocaleString()}
                  </p>

                  <p className="text-xs text-muted-foreground">Reach</p>
                </div>
              </div>
            )}
            {engagement !== undefined && (
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-chart-5" />
                <div>
                  <p className="text-sm font-mono font-semibold">
                    {engagement}%
                  </p>

                  <p className="text-xs text-muted-foreground">Engagement</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 pb-4 text-xs text-muted-foreground">
        {startText && endText
          ? `${startText} - ${endText}`
          : startText || endText}

      </CardFooter>
    </Card>
  );
}
