import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Building2, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Invite, Tenant } from "@shared/schema";

export default function InviteAccept() {
  const { token } = useParams();
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Verify invite (no auth required)
    fetch(`/api/invites/verify/${token}`)
      .then(res => res.json())
      .then(async data => {
        if (data.message) {
          setError(data.message);
        } else {
          setInvite(data);
          // Fetch tenant info
          const tenantRes = await fetch(`/api/admin/clubs`);
          if (tenantRes.ok) {
            const clubs = await tenantRes.json();
            const club = clubs.find((c: Tenant) => c.id === data.tenantId);
            if (club) setTenant(club);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load invite");
        setLoading(false);
      });
  }, [token]);

  // Auto-accept if user is logged in and email matches
  useEffect(() => {
    if (isAuthenticated && user && invite && !error && !accepting) {
      if (user.email?.toLowerCase() === invite.email.toLowerCase()) {
        handleAccept();
      } else if (user.email) {
        setError(`This invite was sent to ${invite.email}, but you're logged in as ${user.email}`);
      }
    }
  }, [isAuthenticated, user, invite, error]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const result = await apiRequest(`/api/invites/accept/${token}`, "POST", {});
      // Clear pending token from sessionStorage
      sessionStorage.removeItem("pendingInviteToken");
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Failed to accept invite");
      setAccepting(false);
    }
  };

  const handleLogin = () => {
    // Store token in sessionStorage so we can auto-accept after login
    sessionStorage.setItem("pendingInviteToken", token || "");
    window.location.href = "/api/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <CardTitle>Invalid Invite</CardTitle>
                <CardDescription>{error}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full" data-testid="button-go-home">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  if (accepting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Accepting invite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>You're Invited!</CardTitle>
              <CardDescription>Join {tenant?.name || "a club"} on Nexus Suite</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="font-medium">{invite.email}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge>{invite.role}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">Invited by</span>
              <span className="font-medium">{invite.inviterName}</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Expires: {new Date(invite.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Login with the email address {invite.email} to accept this invitation
              </p>
              <Button onClick={handleLogin} className="w-full" data-testid="button-login-to-accept">
                Login to Accept Invite
              </Button>
            </div>
          ) : user?.email?.toLowerCase() === invite.email.toLowerCase() ? (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>Accepting invite...</span>
            </div>
          ) : (
            <p className="text-sm text-destructive text-center">
              Please login with {invite.email} to accept this invite
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
