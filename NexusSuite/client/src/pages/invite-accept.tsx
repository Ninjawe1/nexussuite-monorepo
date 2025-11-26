import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function InviteAccept() {
  const [, params] = useRoute("/invite/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const token = params?.token;

  const { data: invite, isLoading, error } = useQuery({
    queryKey: ["/api/organizations/invite", token],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/invite/${token}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to fetch invitation");

      return json?.data;
    },
    enabled: !!token,
  });

  const signup = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/organizations/invite/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to complete signup");
      return json;
    },
    onSuccess: () => {
      toast({ title: "Joined organization", description: "Welcome aboard" });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Signup failed", description: error.message || "Error" });

    },
  });

  const handleResend = () => requestOtp.mutate();

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
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription>
              {error?.message || "This invitation link is invalid or has expired."}

            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/dashboard")}

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
            <CardTitle className="flex items-center gap-2">
              {invite.organizationLogo && (
                <img src={invite.organizationLogo} alt="Org Logo" className="w-8 h-8 rounded" />
              )}
              <span>Join {invite.organizationName || "Organization"}</span>

            </CardTitle>
          </div>
          <CardDescription>
            You’re invited as a {invite.role}. Email and name are fixed to the invitation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={(invite.email || "").split("@")[0]} disabled />

              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={invite.email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Create password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => signup.mutate()} disabled={signup.isPending || !password || password !== confirmPassword}>
                {signup.isPending ? "Creating..." : "Create account & join"}

              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
