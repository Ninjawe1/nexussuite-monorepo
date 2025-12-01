import { StaffCard } from '@/components/staff-card';
import { StaffDialog } from '@/components/staff-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { Staff as StaffType, Tenant } from '@shared/schema';
import { Badge } from '@/components/ui/badge';

import { useOrganization } from '@/contexts/OrganizationContext';

export default function Staff() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const { currentOrganization } = useOrganization();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffType | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: staffMembers = [], isLoading } = useQuery<StaffType[]>({
    queryKey: ['/api/staff', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(`/api/staff?organizationId=${currentOrganization.id}`, 'GET');
      return await res.json();
    },
    enabled: !!currentOrganization?.id,
  });

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ['/api/tenant'],
  });

  // Calculate staff limit based on subscription plan
  const planLimits: Record<string, number> = {
    starter: 10,
    growth: 50,
    enterprise: Infinity,
  };
  const currentPlan = tenant?.subscriptionPlan || 'starter';

  const staffLimit = planLimits[currentPlan] ?? 10;
  const staffCount = staffMembers.length;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/staff/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({
        title: 'Success',
        description: 'Staff member deleted successfully',
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: 'Unauthorized',
          description: 'You are logged out. Logging in again...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete staff member',
        variant: 'destructive',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/api/staff/${id}`, 'PATCH', {
        status: status === 'active' ? 'suspended' : 'active',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({
        title: 'Success',
        description: 'Staff status updated successfully',
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: 'Unauthorized',
          description: 'You are logged out. Logging in again...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update staff status',
        variant: 'destructive',
      });
    },
  });

  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch =
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      roleFilter === 'all' || staff.role.toLowerCase() === roleFilter.toLowerCase();

    return matchesSearch && matchesRole;
  });

  const handleEdit = (staff: StaffType) => {
    setSelectedStaff(staff);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedStaff(undefined);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedStaff(undefined);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-heading font-bold" data-testid="text-staff-title">
              Staff Management
            </h1>
            <Badge variant="outline" data-testid="badge-staff-limit">
              {staffCount} / {staffLimit === Infinity ? '∞' : staffLimit} staff
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Manage your club's staff members and their permissions
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-staff">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            data-testid="input-search-staff"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-role-filter">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="player">Player</SelectItem>
            <SelectItem value="marcom">Marketing</SelectItem>
            <SelectItem value="analyst">Analyst</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading staff...</p>
        </div>
      ) : filteredStaff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map(staff => (
            <StaffCard
              key={staff.id}
              {...staff}
              status={staff.status as 'active' | 'suspended'}
              avatar={staff.avatar || undefined}
              phone={staff.phone || undefined}
              onEdit={() => handleEdit(staff)}
              onDelete={() => deleteMutation.mutate(staff.id)}
              onToggleStatus={() =>
                toggleStatusMutation.mutate({
                  id: staff.id,
                  status: staff.status,
                })
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery || roleFilter !== 'all'
              ? 'No staff members found matching your filters'
              : 'No staff members yet'}
          </p>
          {!searchQuery && roleFilter === 'all' && (
            <Button onClick={handleAdd} className="mt-4" data-testid="button-add-first-staff">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Staff Member
            </Button>
          )}
        </div>
      )}

      <StaffDialog open={dialogOpen} onOpenChange={handleDialogClose} staff={selectedStaff} />
    </div>
  );
}
