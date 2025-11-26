import { FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { differenceInDays } from "date-fns";
import { formatDateSafe, toDateSafe } from "@/lib/date";


interface ContractRowProps {
  id: string;
  fileName: string;
  type: "Player" | "Staff" | "Sponsor";
  linkedPerson: string;
  expirationDate: unknown;
  status: "active" | "expiring" | "expired";

}

export function ContractRow({
  id,
  fileName,
  type,
  linkedPerson,
  expirationDate,
  status,
}: ContractRowProps) {
  const exp = toDateSafe(expirationDate);
  const daysUntilExpiration = exp ? differenceInDays(exp, new Date()) : null;

  // Auto-derive status based on expiration date if needed
  let derivedStatus = status;
  if (exp) {
    const days = differenceInDays(exp, new Date());
    if (days <= 0) {
      derivedStatus = "expired";
    } else if (days <= 30) {
      derivedStatus = "expiring";
    } else {
      derivedStatus = "active";

    }
  }

  const statusColors = {
    active: "bg-chart-2 text-primary-foreground",
    expiring: "bg-chart-4 text-primary-foreground",
    expired: "bg-chart-5 text-primary-foreground",
  };

  const typeColors: Record<string, string> = {
    Player: "bg-primary text-primary-foreground",
    Staff: "bg-chart-3 text-primary-foreground",
    Sponsor: "bg-accent text-accent-foreground",

  };

  // Row highlight classes based on derived status
  const getRowHighlightClass = () => {
    if (derivedStatus === "expired") {
      return "bg-red-50 border-red-200 hover:bg-red-100";
    } else if (derivedStatus === "expiring") {
      return "bg-yellow-50 border-yellow-200 hover:bg-yellow-100";
    }
    return "hover-elevate active-elevate-2";

  };

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border border-border ${getRowHighlightClass()}`}
      data-testid={`row-contract-${id}`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className="font-semibold text-sm truncate"
              data-testid={`text-filename-${id}`}
            >
              {fileName}
            </h4>
            <Badge className={`${typeColors[type]} text-xs shrink-0`}>
              {type}
            </Badge>

          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="truncate">{linkedPerson}</span>
            <span>•</span>
            <span className="shrink-0">
              Expires: {formatDateSafe(expirationDate, "MMM dd, yyyy")}

            </span>
            {daysUntilExpiration !== null &&
              daysUntilExpiration > 0 &&
              daysUntilExpiration <= 30 && (
                <>
                  <span>•</span>
                  <span className="text-chart-4 shrink-0">
                    {daysUntilExpiration} days left
                  </span>

                </>
              )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={`${statusColors[derivedStatus]} text-xs`}>
          {derivedStatus.charAt(0).toUpperCase() + derivedStatus.slice(1)}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          data-testid={`button-preview-${id}`}
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          data-testid={`button-download-${id}`}
        >

          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
