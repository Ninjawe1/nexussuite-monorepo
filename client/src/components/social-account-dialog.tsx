import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { SocialAccount } from "@shared/schema";

const socialAccountSchema = z.object({
  platform: z.string().min(1, "Platform is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountId: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
});

type SocialAccountFormData = z.infer<typeof socialAccountSchema>;

interface SocialAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: SocialAccount;
}

export function SocialAccountDialog({ open, onOpenChange, account }: SocialAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<SocialAccountFormData>({
    resolver: zodResolver(socialAccountSchema),
    defaultValues: {
      platform: account?.platform || "",
      accountName: account?.accountName || "",
      accountId: account?.accountId || "",
      apiKey: "",
      apiSecret: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: SocialAccountFormData) => {
      // Remove empty credential fields to preserve existing values when editing
      const payload = { ...data };
      if (!payload.apiKey || payload.apiKey.trim() === "") {
        delete payload.apiKey;
      }
      if (!payload.apiSecret || payload.apiSecret.trim() === "") {
        delete payload.apiSecret;
      }
      if (!payload.accountId || payload.accountId.trim() === "") {
        delete payload.accountId;
      }
      
      if (account) {
        return await apiRequest(`/api/social/accounts/${account.id}`, "PATCH", payload);
      } else {
        return await apiRequest("/api/social/accounts", "POST", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/analytics"] });
      toast({
        title: "Success",
        description: account ? "Social account updated" : "Social account connected",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to connect social account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SocialAccountFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-social-account">
        <DialogHeader>
          <DialogTitle>{account ? "Update Social Account" : "Connect Social Account"}</DialogTitle>
          <DialogDescription>
            {account ? "Update your social media account settings" : "Connect a social media account to track analytics"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-platform">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">Twitter / X</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="twitch">Twitch</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name / Handle</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="@yourhandle" data-testid="input-account-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account ID (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Platform-specific account ID" data-testid="input-account-id" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-2 flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                data-testid="button-save-account"
              >
                {mutation.isPending ? "Saving..." : account ? "Update" : "Connect"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
