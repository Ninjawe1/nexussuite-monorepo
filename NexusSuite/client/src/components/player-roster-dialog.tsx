import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Staff, Roster, InsertRoster } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

interface PlayerRosterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: Staff;
  existingRosters: Roster[];
}

export function PlayerRosterDialog({
  open,
  onOpenChange,
  player,
  existingRosters,
}: PlayerRosterDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<Pick<InsertRoster, 'playerId' | 'game' | 'role'>>({
    playerId: player.id,
    game: 'valorant',
    role: 'Player',
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertRoster) => {
      return await apiRequest('/api/rosters', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rosters'] });
      toast({ title: 'Success', description: 'Roster assigned' });

      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign roster',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/rosters/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rosters'] });
      toast({ title: 'Success', description: 'Roster removed' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove roster',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form as InsertRoster);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Roster • {player.name}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Game</label>
              <Select value={form.game} onValueChange={v => setForm({ ...form, game: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valorant">Valorant</SelectItem>
                  <SelectItem value="cs2">CS2</SelectItem>
                  <SelectItem value="lol">League of Legends</SelectItem>
                  <SelectItem value="dota2">Dota 2</SelectItem>
                  <SelectItem value="apex">Apex Legends</SelectItem>
                  <SelectItem value="fortnite">Fortnite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Role</label>
              <Input
                placeholder="e.g., IGL, Entry, Support"
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              Assign
            </Button>
          </div>
        </form>

        {existingRosters.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">Existing assignments</p>
            <div className="space-y-2">
              {existingRosters.map(r => (
                <div key={r.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <span className="text-sm">
                    {r.game} • {r.role}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(r.id)}
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
