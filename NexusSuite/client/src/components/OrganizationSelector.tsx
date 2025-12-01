/**
 * Organization Selector Component
 * Allows users to switch between multiple organizations
 */

import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Building2, Plus, Settings, Users, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface OrganizationSelectorProps {
  className?: string;
  showCreateButton?: boolean;
  showSettings?: boolean;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  className = '',

  showCreateButton = true,
  showSettings = true,
}) => {
  const {
    organizations,
    currentOrganization,
    currentMembership,
    isLoading,
    isSwitching,
    selectOrganization,
    createOrganization,
  } = useOrganization();

  const { isSystemAdmin } = useAuth();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');

  const [isCreating, setIsCreating] = useState(false);

  /**
   * Handle organization selection
   */
  const handleSelectOrganization = async (organizationId: string) => {
    if (organizationId === currentOrganization?.id || isSwitching) return;

    try {
      await selectOrganization(organizationId);
    } catch (error) {
      // Error handling is done in the context
    }
  };

  /**
   * Handle new organization creation
   */
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newOrgName.trim()) {
      toast({
        title: 'Organization name required',
        description: 'Please enter a name for your organization',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      await createOrganization(newOrgName.trim(), newOrgSlug.trim() || undefined);

      setNewOrgName('');
      setNewOrgSlug('');
      setIsCreateDialogOpen(false);

      toast({
        title: 'Organization created',
        description: 'Your new organization has been created successfully',
      });
    } catch (error) {
      // Error handling is done in the context
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Generate slug from name
   */
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

      .substring(0, 50);
  };

  /**
   * Handle name change with auto-slug generation
   */
  const handleNameChange = (value: string) => {
    setNewOrgName(value);
    if (!newOrgSlug || newOrgSlug === generateSlug(newOrgName)) {
      setNewOrgSlug(generateSlug(value));
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-muted ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading organizations...</span>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 ${className}`}
      >
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">No organization selected</span>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`flex items-center gap-2 px-3 py-2 hover:bg-accent ${className}`}
            disabled={isSwitching}
          >
            <Building2 className="h-4 w-4" />
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium truncate">{currentOrganization.name}</span>

              {currentMembership && (
                <Badge variant="outline" className="text-xs">
                  {currentMembership.role}
                </Badge>
              )}
            </div>
            {isSwitching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4 opacity-50" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-80">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {organizations.map(org => {
            const isCurrent = org.id === currentOrganization.id;
            return (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSelectOrganization(org.id)}
                className="flex items-center gap-3 py-3"
                disabled={isSwitching}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {org.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{org.name}</div>
                  {org.slug && <div className="text-sm text-muted-foreground">{org.slug}</div>}
                </div>

                {isCurrent && <div className="w-2 h-2 rounded-full bg-primary" />}
              </DropdownMenuItem>
            );
          })}

          {organizations.length === 0 && (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
              No organizations found
            </div>
          )}

          <DropdownMenuSeparator />

          {showCreateButton && (
            <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </DropdownMenuItem>
          )}

          {showSettings && currentOrganization && (
            <DropdownMenuItem
              onClick={() => {
                /* Navigate to org settings */
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Organization Settings
            </DropdownMenuItem>
          )}

          {isSystemAdmin() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  /* Navigate to admin dashboard */
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Admin Dashboard
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Organization Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreateOrganization}>
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
              <DialogDescription>
                Create a new organization to collaborate with your team. You'll be the owner of this
                organization.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="org-name">Organization Name *</Label>
                <Input
                  id="org-name"
                  value={newOrgName}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Acme Corporation"
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="org-slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">app.nexussuite.com/</span>
                  <Input
                    id="org-slug"
                    value={newOrgSlug}
                    onChange={e => setNewOrgSlug(e.target.value)}
                    placeholder="acme-corp"
                    pattern="[a-z0-9-]+"
                    disabled={isCreating}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used in URLs and must be unique. Leave blank to auto-generate from name.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrganizationSelector;
