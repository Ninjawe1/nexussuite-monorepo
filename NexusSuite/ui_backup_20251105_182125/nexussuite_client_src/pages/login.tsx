import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LogIn, Trophy } from "lucide-react";
import { Link, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [forceReset, setForceReset] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginForm) {
    try {
      setIsLoading(true);
      const res = await apiRequest("/api/auth/login", "POST", data);
      const { user } = await res.json();
      queryClient.setQueryData(["/api/auth/user"], user);

      toast({
        title: "Welcome back!",
        description: "Login successful",
      });

      // If the user logged in with a temporary password, prompt to change it immediately
      if (user?.isTemporaryPassword) {
        setForceReset(true);
        setCurrentPassword(data.password);
        return; // Do not redirect yet
      }

      // Redirect to dashboard (router picks Admin or Dashboard based on role)
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 8) {
      toast({
        title: "New password too short",
        description: "Please enter at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please confirm your new password.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsChanging(true);
      await apiRequest("/api/auth/change-password", "POST", {
        currentPassword,
        newPassword,
      });
      toast({
        title: "Password updated",
        description: "Your temporary password has been changed.",
      });
      // Make sure the cached user reflects the change
      const cached = queryClient.getQueryData(["/api/auth/user"]);
      queryClient.setQueryData(["/api/auth/user"], {
        ...(cached || {}),
        isTemporaryPassword: false,
        lastPasswordChange: new Date().toISOString(),
      });
      setForceReset(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setCurrentPassword("");
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Failed to change password",
        description: err?.message || "Please check your current password and try again.",
        variant: "destructive",
      });
    } finally {
      setIsChanging(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4 text-neutral-100">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-heading font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Nexus Esports Suite
            </h1>
          </div>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <Card className="bg-neutral-900 text-neutral-200 border-neutral-800">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="your@email.com" 
                          data-testid="input-email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          data-testid="input-password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>

                {/* Google login (disabled/coming soon) */}
                <Button 
                  type="button" 
                  className="w-full" 
                  variant="outline" 
                  disabled
                  title="Google login coming soon"
                >
                  Continue with Google (coming soon)
                </Button>
              </form>
            </Form>

            {/* Force change password flow */}
            {forceReset && (
              <div className="mt-6 border-t border-neutral-800 pt-4">
                <p className="text-sm mb-2">You signed in using a temporary password. Please set a new password now.</p>
                <div className="space-y-3">
                  <Input 
                    type="password" 
                    placeholder="New password (min 8 chars)" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input 
                    type="password" 
                    placeholder="Confirm new password" 
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                  <Button 
                    type="button" 
                    className="w-full" 
                    onClick={handleChangePassword} 
                    disabled={isChanging}
                    data-testid="button-change-password"
                  >
                    {isChanging ? "Updating password..." : "Change Password"}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/register">
                <span className="text-primary hover:underline cursor-pointer" data-testid="link-register">
                  Sign up
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

