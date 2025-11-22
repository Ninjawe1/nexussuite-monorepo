import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Staff } from "@shared/schema";
import { TEAM_ROLES } from "@/constants/teamRoles";

interface PlayerRoleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Staff | null;
  rosterName?: string;
  currentRole?: string; // Existing roster role for this player within the target roster
  onSubmit: (nextRole: string) => Promise<void> | void;
}

const roleEnumValues = TEAM_ROLES.map((r) => r.value) as [
  (typeof TEAM_ROLES)[number]["value"],
  ...(typeof TEAM_ROLES)[number]["value"][],
];

const schema = z.object({
  role: z.enum(roleEnumValues).default("Player"),
});

export function PlayerRoleEditDialog({
  open,
  onOpenChange,
  player,
  rosterName,
  currentRole = "Player",
  onSubmit,
}: PlayerRoleEditDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { role: (currentRole as any) || "Player" },
    values: { role: (currentRole as any) || "Player" },
  });

  const handleSubmit = async (values: z.infer<typeof schema>) => {
    setIsSaving(true);
    await onSubmit(values.role);
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Player Role</DialogTitle>
          <DialogDescription>
            {player
              ? `Update ${player.name}'s role${rosterName ? ` for ${rosterName}` : ""}`
              : "Update player role"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TEAM_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Preview:</span>
              <span className="px-2 py-0.5 rounded border border-orange-500 bg-orange-500/10 text-orange-400 transition-colors">
                {form.getValues("role")}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
