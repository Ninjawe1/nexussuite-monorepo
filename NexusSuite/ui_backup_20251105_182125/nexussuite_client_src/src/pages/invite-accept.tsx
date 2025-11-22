import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function InviteAccept() {
  const [, params] = useRoute("/invite/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });

  const token = params?.token;

  // Fetch invite details
  const { data: invite, isLoading, error } = useQuery({
    queryKey: ["/api/invites", token],
    queryFn: async () => {
      const res = await fetch(`/api/invites/${token}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch invite");
      }
      return res.json();
    },
    enabled: !!token,
  });

  // Accept invite mutation
  const acceptMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; password: string }) => {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create account");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created successfully!",
        description: "You can now log in with your credentials.",
      });
      // Redirect to login after 2 seconds
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create account",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 8 characters",
      });
      return;
    }

    acceptMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      password: formData.password,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-6 h-6 text-destructive" />
              <CardTitle>Invalid Invite</CardTitle>
            </div>
            <CardDescription>
              {error?.message || "This invite link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/login")}
              className="w-full"
              data-testid="button-goto-login"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-6 h-6 text-primary" />
            <CardTitle>Join {invite.tenantName}</CardTitle>
          </div>
          <CardDescription>
            {invite.inviterName} has invited you to join as a {invite.role}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invite.email}
                disabled
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                data-testid="input-firstname"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                data-testid="input-lastname"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                data-testid="input-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={8}
                data-testid="input-confirm-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={acceptMutation.isPending}
              data-testid="button-accept-invite"
            >
              {acceptMutation.isPending ? "Creating Account..." : "Accept Invite & Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

