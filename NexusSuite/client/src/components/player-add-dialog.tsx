import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { toDateSafe } from "@/lib/date";


interface PlayerAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const schema = z.object({
  // Player
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),

  phone: z.string().optional(),
  avatar: z.string().optional(),
  // Contract toggle and fields
  includeContract: z.boolean().default(true),
  fileName: z.string().min(1, "Contract file name is required").optional(),
  fileUrl: z.string().min(1, "Contract URL is required").optional(),
  contractStatus: z.enum(["active", "expiring", "expired"]).default("active"),

  expirationDate: z.string().optional(), // yyyy-mm-dd
  // Payroll toggle and fields
  includePayroll: z.boolean().default(true),
  amount: z.string().optional(), // decimal string
  payrollType: z.enum(["monthly", "weekly", "one-time"]).default("monthly"),
  payrollStatus: z.enum(["paid", "pending"]).default("pending"),

  payrollDate: z.string().optional(), // yyyy-mm-dd
});

export function PlayerAddDialog({ open, onOpenChange }: PlayerAddDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      avatar: "",
      includeContract: true,
      fileName: "",
      fileUrl: "",
      contractStatus: "active",
      expirationDate: new Date().toISOString().split("T")[0],
      includePayroll: true,
      amount: "0",
      payrollType: "monthly",
      payrollStatus: "pending",
      payrollDate: new Date().toISOString().split("T")[0],

    },
  });

  const createFlow = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      // 1) Create staff with role 'player'
      const staffPayload = {
        name: values.name,
        email: values.email,
        phone: values.phone || "",
        role: "player",
        avatar: values.avatar || "",
        permissions: [] as string[],
        status: "active",
      };
      const staffRes = await apiRequest("/api/staff", "POST", staffPayload);
      const staff = await staffRes.json(); // parse Response into JSON

      // 2) Optionally create contract
      if (
        values.includeContract &&
        values.fileName &&
        values.fileUrl &&
        values.expirationDate
      ) {
        const exp = toDateSafe(values.expirationDate);
        if (!exp) {
          toast({
            title: "Invalid date",
            description:
              "Please enter a valid contract expiration date (YYYY-MM-DD).",
            variant: "destructive",
          });
          throw new Error("Invalid contract expiration date");

        }
        const contractPayload = {
          fileName: values.fileName,
          fileUrl: values.fileUrl,
          type: "Player",

          linkedPerson: staff.name, // now valid
          expirationDate: exp,
          status: values.contractStatus,
        };
        await apiRequest("/api/contracts", "POST", contractPayload);

      }

      // 3) Optionally create payroll
      if (values.includePayroll && values.amount && values.payrollDate) {
        const payDate = toDateSafe(values.payrollDate);
        if (!payDate) {
          toast({
            title: "Invalid date",
            description: "Please enter a valid payroll date (YYYY-MM-DD).",
            variant: "destructive",
          });
          throw new Error("Invalid payroll date");

        }
        const payrollPayload = {
          staffId: staff.id, // now valid
          name: staff.name,
          role: "player",

          amount: values.amount,
          type: values.payrollType,
          status: values.payrollStatus,
          date: payDate,
        };
        await apiRequest("/api/payroll", "POST", payrollPayload);

      }

      return staff;
    },
    onSuccess: () => {
      // Invalidate lists so new entries appear
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });

      toast({
        title: "Player added",
        description: "Player, contract, and payroll saved successfully",

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
          window.location.href = "/login";

        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to add player",
        variant: "destructive",

      });
    },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setIsSubmitting(true);
    try {
      await createFlow.mutateAsync(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="dialog-add-player"
      >
        <DialogHeader>
          <DialogTitle>Add Player</DialogTitle>
          <DialogDescription>
            Capture player info, contract, and payroll in one step.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Player info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Player Info
              </h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                      />

                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 555-0123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="avatar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avatar URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contract section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="includeContract"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />

                      </FormControl>
                      <FormLabel className="m-0">Add Contract Info</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("includeContract") && (

                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fileName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract File Name</FormLabel>
                          <FormControl>
                            <Input placeholder="contract.pdf" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fileUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://storage/contract.pdf"
                              {...field}
                            />

                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="expirationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiration Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contractStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >

                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="expiring">
                                Expiring Soon
                              </SelectItem>

                              <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Payroll section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="includePayroll"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />

                      </FormControl>
                      <FormLabel className="m-0">Add Payroll</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("includePayroll") && (

                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="5000.00"
                              {...field}
                            />

                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payrollType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >

                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="one-time">One-time</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="payrollStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >

                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payrollDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Add Player"}

              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
