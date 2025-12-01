import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { insertCampaignSchema, type Campaign } from '@shared/schema';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { formatDateSafe, toDateSafe } from '@/lib/date';
import { useOrganization } from '@/contexts/OrganizationContext';

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: Campaign;
}

const platformOptions = [
  { id: 'twitter', label: 'Twitter' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'twitch', label: 'Twitch' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
];

export function CampaignDialog({ open, onOpenChange, campaign }: CampaignDialogProps) {
  const { currentOrganization: organization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formSchema = insertCampaignSchema.omit({ tenantId: true }).extend({
    startDate: insertCampaignSchema.shape.startDate.or(
      z
        .string()
        .refine(v => !!toDateSafe(v), { message: 'Invalid date' })
        .transform(v => toDateSafe(v)!)
    ),
    endDate: insertCampaignSchema.shape.endDate.or(
      z
        .string()
        .refine(v => !!toDateSafe(v), { message: 'Invalid date' })
        .transform(v => toDateSafe(v)!)
    ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: campaign?.title || '',
      description: campaign?.description || '',
      startDate: campaign?.startDate
        ? formatDateSafe(campaign.startDate, 'yyyy-MM-dd')
        : new Date().toISOString().split('T')[0],
      endDate: campaign?.endDate
        ? formatDateSafe(campaign.endDate, 'yyyy-MM-dd')
        : new Date().toISOString().split('T')[0],
      platforms: campaign?.platforms || [],
      reach: campaign?.reach || undefined,
      engagement: campaign?.engagement || undefined,
      status: campaign?.status || 'scheduled',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return await apiRequest(`/api/campaigns?organizationId=${organization?.id}`, 'POST', {
        ...data,
        organizationId: organization?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', organization?.id] });
      toast({
        title: 'Success',
        description: 'Campaign created successfully',
      });
      onOpenChange(false);
      form.reset();
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
        description: error.message || 'Failed to create campaign',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return await apiRequest(
        `/api/campaigns/${campaign?.id}?organizationId=${organization?.id}`,
        'PATCH',
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', organization?.id] });
      toast({
        title: 'Success',
        description: 'Campaign updated successfully',
      });
      onOpenChange(false);
      form.reset();
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
        description: error.message || 'Failed to update campaign',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      if (campaign) {
        await updateMutation.mutateAsync(data as any);
      } else {
        await createMutation.mutateAsync(data as any);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-testid="dialog-campaign">
        <DialogHeader>
          <DialogTitle>{campaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
          <DialogDescription>
            {campaign ? 'Update the campaign details below' : 'Create a new marketing campaign'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="VCT Championship Hype"
                      {...field}
                      data-testid="input-campaign-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Campaign details..."
                      {...field}
                      data-testid="input-campaign-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          typeof field.value === 'string'
                            ? field.value
                            : formatDateSafe(field.value, 'yyyy-MM-dd')
                        }
                        onChange={e => field.onChange(e.target.value)}
                        data-testid="input-campaign-startdate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          typeof field.value === 'string'
                            ? field.value
                            : formatDateSafe(field.value, 'yyyy-MM-dd')
                        }
                        onChange={e => field.onChange(e.target.value)}
                        data-testid="input-campaign-enddate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="platforms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platforms</FormLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {platformOptions.map(platform => (
                      <div key={platform.id} className="flex items-center gap-2">
                        <Checkbox
                          id={platform.id}
                          checked={field.value?.includes(platform.id)}
                          onCheckedChange={checked => {
                            if (checked) {
                              field.onChange([...(field.value || []), platform.id]);
                            } else {
                              field.onChange(
                                field.value?.filter((p: string) => p !== platform.id) || []
                              );
                            }
                          }}
                          data-testid={`checkbox-platform-${platform.id}`}
                        />
                        <label htmlFor={platform.id} className="text-sm cursor-pointer">
                          {platform.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reach"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reach (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="125000"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e =>
                          field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                        }
                        data-testid="input-campaign-reach"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="engagement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement % (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="8.5"
                        {...field}
                        value={field.value ?? ''}
                        data-testid="input-campaign-engagement"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-campaign-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                data-testid="button-cancel-campaign"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-submit-campaign">
                {isSubmitting ? 'Saving...' : campaign ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
