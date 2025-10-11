import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Mail, Phone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StaffCardProps {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  avatar?: string;
  permissions: string[];
  status: "active" | "suspended";
}

export function StaffCard({ id, name, role, email, phone, avatar, permissions, status }: StaffCardProps) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  const roleColors: Record<string, string> = {
    'Owner': 'bg-primary text-primary-foreground',
    'Admin': 'bg-chart-3 text-primary-foreground',
    'Manager': 'bg-chart-2 text-primary-foreground',
    'Staff': 'bg-secondary text-secondary-foreground',
    'Player': 'bg-accent text-accent-foreground',
  };

  return (
    <Card className="hover-elevate" data-testid={`card-staff-${id}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="w-12 h-12">
              {avatar && <AvatarImage src={avatar} alt={name} />}
              <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate" data-testid={`text-name-${id}`}>{name}</h3>
              <Badge className={`${roleColors[role] || roleColors['Staff']} text-xs mt-1`}>
                {role}
              </Badge>
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{email}</span>
                </div>
                {phone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span>{phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-menu-${id}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid={`button-edit-${id}`}>Edit Details</DropdownMenuItem>
              <DropdownMenuItem>Edit Permissions</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                {status === 'active' ? 'Suspend Account' : 'Activate Account'}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4 px-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{permissions.length} modules</span>
          <span>•</span>
          <span className={status === 'active' ? 'text-chart-2' : 'text-chart-5'}>
            {status === 'active' ? 'Active' : 'Suspended'}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
