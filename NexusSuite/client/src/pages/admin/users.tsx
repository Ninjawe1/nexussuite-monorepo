import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { User, Tenant } from '@shared/schema';
import { formatDateSafe, toDateSafe } from '@/lib/date';
import { Calendar, Search, LogOut, KeyRound } from 'lucide-react';

const demoUsers: User[] = [
  {
    id: 'u1',
    email: 'alice@example.com',
    password: '',
    firstName: 'Alice',
    lastName: 'Ng',
    profileImageUrl: '',
    tenantId: 't1',
    role: 'owner',
    isSuperAdmin: false,
    isTemporaryPassword: false,
    lastPasswordChange: new Date(),
    createdAt: new Date('2024-07-02'),
    updatedAt: new Date('2024-10-01'),
  },
  {
    id: 'u2',
    email: 'bob@example.com',
    password: '',
    firstName: 'Bob',
    lastName: 'Lee',
    profileImageUrl: '',
    tenantId: 't1',
    role: 'manager',
    isSuperAdmin: false,
    isTemporaryPassword: false,
    lastPasswordChange: new Date(),
    createdAt: new Date('2024-08-15'),
    updatedAt: new Date('2024-10-18'),
  },
  {
    id: 'u3',
    email: 'carlo@example.com',
    password: '',
    firstName: 'Carlo',
    lastName: 'M',
    profileImageUrl: '',
    tenantId: 't2',
    role: 'analyst',
    isSuperAdmin: false,
    isTemporaryPassword: false,
    lastPasswordChange: new Date(),
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-10-20'),
  },
];

const demoTenants: Tenant[] = [
  {
    id: 't1',
    name: 'Phoenix Esports',
    clubTag: 'PHX',
    logoUrl: '',
    primaryColor: '#f97316',
    website: '',
    region: 'NA',
    subscriptionPlan: 'growth',
    subscriptionStatus: 'active',
    stripeCustomerId: '',
    stripeSubscriptionId: '',

    trialEndsAt: null as any,
    subscriptionEndsAt: null as any,
    suspendedAt: null as any,
    suspensionReason: null as any,
    suspendedBy: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 't2',
    name: 'Nebula Gaming',
    clubTag: 'NBL',
    logoUrl: '',
    primaryColor: '#6366f1',
    website: '',
    region: 'EU',
    subscriptionPlan: 'starter',
    subscriptionStatus: 'trial',
    stripeCustomerId: '',
    stripeSubscriptionId: '',

    trialEndsAt: null as any,
    subscriptionEndsAt: null as any,
    suspendedAt: null as any,
    suspensionReason: null as any,
    suspendedBy: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function AdminUsersPage() {
  const { toast } = useToast();
  const {
    data: users = [],
    isLoading: loadingUsers,
    error: usersError,
  } = useQuery<User[]>({ queryKey: ['/api/admin/users'] });
  const { data: tenants = [], isLoading: loadingTenants } = useQuery<Tenant[]>({
    queryKey: ['/api/admin/clubs'],
  });

  const [searchText, setSearchText] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [dateJoined, setDateJoined] = useState<string>('');

  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<Record<string, string[]>>({});

  const usersData = usersError ? demoUsers : users;
  const tenantsData = loadingTenants ? demoTenants : tenants.length ? tenants : demoTenants;

  const updateUserMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<User> & { password?: string };
    }) => {
      return await apiRequest(`/api/admin/users/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: 'Success', description: 'User updated' });
    },
    onError: () => {
      toast({
        title: 'Demo',
        description: 'In demo mode this action is simulated',
        variant: 'default',
      });
    },
  });

  const filtered = useMemo(() => {
    return usersData.filter(u => {
      const tenant = tenantsData.find(t => t.id === u.tenantId);
      const matchesSearch = [u.email, u.firstName, u.lastName]
        .join(' ')
        .toLowerCase()
        .includes(searchText.toLowerCase());
      const matchesPlan =
        planFilter === 'all' || (tenant?.subscriptionPlan || 'starter') === planFilter;
      const lastActive = toDateSafe(u.updatedAt);
      const activeDays = lastActive
        ? Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;
      const matchesActivity =
        activityFilter === 'all' ||
        (activityFilter === 'active' ? activeDays <= 7 : activeDays > 7);
      const joined = toDateSafe(u.createdAt);
      const matchesDate =
        !dateJoined || (joined && formatDateSafe(joined, 'yyyy-MM-dd') === dateJoined);
      return matchesSearch && matchesPlan && matchesActivity && matchesDate;
    });
  }, [usersData, tenantsData, searchText, planFilter, activityFilter, dateJoined]);

  const forceLogout = (userId: string) => {
    toast({
      title: 'Force logout',

      description: `User ${userId} will be logged out (demo)`,
    });
  };
  const resetPassword = (userId: string) => {
    updateUserMutation.mutate({
      id: userId,
      data: { isTemporaryPassword: true, password: 'Temp12345!' },
    });
  };
  const changeTier = (tenantId: string, plan: string) => {
    toast({
      title: 'Change subscription',

      description: `Set tenant ${tenantId} plan to ${plan} (demo)`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users Management</h1>
        <p className="text-muted-foreground">Search, filter, and manage all users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Find users by plan, activity, or date joined</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or email"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active (≤7d)</SelectItem>
                <SelectItem value="inactive">Inactive (&gt;7d)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={dateJoined} onChange={e => setDateJoined(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Perform actions on any account</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsers && !usersError ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">No users match the filters</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(u => {
                const tenant = tenantsData.find(t => t.id === u.tenantId);

                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {u.firstName} {u.lastName}
                        </h3>
                        {u.isSuperAdmin && <Badge>Super Admin</Badge>}
                        <Badge variant="outline">{u.role}</Badge>
                        {tenant && <Badge variant="secondary">{tenant.subscriptionPlan}</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Joined {formatDateSafe(u.createdAt, 'PPP')}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          placeholder="Add admin note"
                          value={notes[u.id] || ''}
                          onChange={e =>
                            setNotes(prev => ({
                              ...prev,
                              [u.id]: e.target.value,
                            }))
                          }
                        />
                        <Input
                          placeholder="Tags (comma)"
                          value={(tags[u.id] || []).join(', ')}
                          onChange={e =>
                            setTags(prev => ({
                              ...prev,
                              [u.id]: e.target.value
                                .split(',')
                                .map(s => s.trim())

                                .filter(Boolean),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => forceLogout(u.id)}>
                        <LogOut className="h-4 w-4 mr-1" /> Force Logout
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => resetPassword(u.id)}>
                        <KeyRound className="h-4 w-4 mr-1" /> Reset Password
                      </Button>
                      {tenant && (
                        <Select onValueChange={val => changeTier(tenant.id, val)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Tier" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="growth">Growth</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
