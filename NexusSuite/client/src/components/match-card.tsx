import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin } from 'lucide-react';
import { formatDateSafe } from '@/lib/date';

interface MatchCardProps {
  id: string;
  teamA: string;
  teamB: string;
  scoreA?: number;
  scoreB?: number;
  date: unknown;
  tournament: string | null;
  game: string;
  venue?: string | null;
  status: 'upcoming' | 'live' | 'completed';
}

export function MatchCard({
  id,
  teamA,
  teamB,
  scoreA,
  scoreB,
  date,
  tournament,
  game,
  venue,
  status,
}: MatchCardProps) {
  const statusColors = {
    upcoming: 'bg-chart-4 text-primary-foreground',
    live: 'bg-chart-5 text-primary-foreground',
    completed: 'bg-secondary text-secondary-foreground',
  };

  const winner =
    scoreA !== undefined && scoreB !== undefined
      ? scoreA > scoreB
        ? 'A'
        : scoreA < scoreB
          ? 'B'
          : 'draw'
      : null;
  const dateFormatted = formatDateSafe(date, 'MMM dd, HH:mm');
  const rawDateText = typeof date === 'string' ? date : '';

  const dateText = dateFormatted || rawDateText;

  return (
    <Card
      className="hover-elevate active-elevate-2 cursor-pointer"
      data-testid={`card-match-${id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-sm">{tournament || 'Standalone Match'}</h3>

            <p className="text-xs text-muted-foreground">{game}</p>
          </div>
          <Badge className={`${statusColors[status]} text-xs`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>

        <div className="flex items-center justify-between py-3">
          <div className="flex-1 text-center">
            <p className={`font-semibold ${winner === 'A' ? 'text-chart-2' : ''}`}>{teamA}</p>
          </div>
          <div className="px-4">
            {status === 'completed' && scoreA !== undefined && scoreB !== undefined ? (
              <div className="font-mono font-bold text-lg">
                <span className={winner === 'A' ? 'text-chart-2' : ''}>{scoreA}</span>
                {' : '}
                <span className={winner === 'B' ? 'text-chart-2' : ''}>{scoreB}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">vs</span>
            )}
          </div>
          <div className="flex-1 text-center">
            <p className={`font-semibold ${winner === 'B' ? 'text-chart-2' : ''}`}>{teamB}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            {dateText && <Calendar className="w-3 h-3" />}
            {dateText && <span>{dateText}</span>}
          </div>
          {venue && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{venue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
