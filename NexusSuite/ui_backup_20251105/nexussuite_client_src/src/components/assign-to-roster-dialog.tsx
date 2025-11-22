import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Staff, Roster } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export interface AssignToRosterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Staff | null;
  availableRosters: Roster[];
  onSubmit: (rosterId: string, role: string) => Promise<void> | void;
  isLoading?: boolean;
}

const schema = z.object({
  rosterId: z.string().min(1, "Please select a roster"),
  role: z.string().min(2, "Role is required"),
});

type FormValues = z.infer<typeof schema>;

export function AssignToRosterDialog({
  open,
  onOpenChange,
  player,
  availableRosters,
  onSubmit,
  isLoading,
}: AssignToRosterDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rosterId: "", role: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ rosterId: "", role: "" });
    }
  }, [open]);

  const handleSubmit = async (values: FormValues) => {
    await onSubmit(values.rosterId, values.role);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to Roster</DialogTitle>
          <DialogDescription>
            {player ? `Assign ${player.name} to a roster` : "Select a player to assign to a roster"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rosterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roster</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a roster" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRosters && availableRosters.length > 0 ? (
                          availableRosters
                            .filter(r => r.isActive !== false)
                            .map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name} {typeof r.playerCount === "number" ? `(${r.playerCount}/${r.maxPlayers ?? "?"})` : ""}
                              </SelectItem>
                            ))
                        ) : (
                          <div className="px-2 py-1 text-sm text-muted-foreground">No active rosters</div>
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Entry Fragger, Support" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !player}>
                Assign
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AssignToRosterDialog;

