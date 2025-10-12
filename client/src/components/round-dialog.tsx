import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertTournamentRoundSchema, type InsertTournamentRound, type TournamentRound } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface RoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  round?: TournamentRound;
}

const roundSchema = insertTournamentRoundSchema.omit({ tournamentId: true }).extend({
  startDate: z.string().optional(),
});

type RoundFormData = z.infer<typeof roundSchema>;

export function RoundDialog({ open, onOpenChange, tournamentId, round }: RoundDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!round;

  const form = useForm<RoundFormData>({
    resolver: zodResolver(roundSchema),
    defaultValues: round
      ? {
          name: round.name,
          roundNumber: round.roundNumber,
          format: round.format || "",
          startDate: round.startDate ? format(new Date(round.startDate), "yyyy-MM-dd") : "",
          status: round.status,
        }
      : {
          name: "",
          roundNumber: 1,
          format: "",
          startDate: "",
          status: "upcoming",
        },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertTournamentRound) => {
      if (isEdit) {
        return await apiRequest(`/api/rounds/${round.id}`, "PATCH", { ...data, tournamentId });
      }
      return await apiRequest(`/api/tournaments/${tournamentId}/rounds`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "rounds"] });
      toast({
        title: "Success",
        description: `Round ${isEdit ? "updated" : "created"} successfully`,
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
        description: error.message || `Failed to ${isEdit ? "update" : "create"} round`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoundFormData) => {
    const roundData: any = {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
    };
    mutation.mutate(roundData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Round" : "Create Round"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update round details" : "Add a new round or stage to this tournament"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Round Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Quarterfinals" {...field} data-testid="input-round-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="roundNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Round Number</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-round-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Format (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Best of 3" {...field} value={field.value || ""} data-testid="input-round-format" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-round-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-round-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-round"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-round">
                {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
