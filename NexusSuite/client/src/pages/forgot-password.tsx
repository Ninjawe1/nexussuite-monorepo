import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    const t = setTimeout(() => form.setFocus("email"), 50);
    return () => clearTimeout(t);
  }, [form]);

  async function onSubmit(data: ForgotForm) {
    try {
      setIsLoading(true);
      const res = await apiRequest("/api/auth/forgot-password", "POST", {
        email: data.email,
      });
      // If no throw, treat as success
      if (res.ok) {
        toast({
          title: "Password reset link sent",
          description: "Password reset link sent to your email",
        });
      } else {
        const json = await res.json().catch(() => null);
        const message = json?.message || `Request failed (${res.status})`;
        toast({
          title: "Reset request failed",
          description: message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const message =
        error?.data?.message || error?.message || "Request failed";
      toast({
        title: "Reset request failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function onInvalid(errors: FieldErrors<ForgotForm>) {
    if (errors.email) form.setFocus("email");
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-12 bg-background text-foreground">
      <div className="w-full max-w-sm">
        <Card className="bg-card text-card-foreground border border-border rounded-lg shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Forgot your password?
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Enter your email and we’ll send you reset instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                className="grid gap-6"
                onSubmit={form.handleSubmit(onSubmit, onInvalid)}
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid gap-2">
                        <FormLabel htmlFor="email">Email</FormLabel>
                        <FormControl>
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            data-testid="input-email"
                            disabled={isLoading}
                            className="transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="sr-only">
                          Enter a valid email address
                        </FormDescription>
                        <FormMessage className="motion-safe:transition-opacity motion-safe:duration-200" />
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  data-testid="button-send-reset"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    Remembered your password?{" "}
                  </span>
                  <Link href="/login">
                    <span className="underline underline-offset-4 cursor-pointer text-primary">
                      Back to login
                    </span>
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
