import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function WaitlistForm({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest('POST', '/api/waitlist', { email });
    },
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'You have been added to the waitlist.',
      });
      setEmail('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    mutation.mutate(email);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm items-center space-x-2">
      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={mutation.isPending}
        className={
          variant === 'minimal'
            ? 'border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground'
            : ''
        }
        required
      />
      <Button
        type="submit"
        disabled={mutation.isPending}
        className={variant === 'minimal' ? 'rounded-full px-6' : ''}
      >
        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Join Waitlist
      </Button>
    </form>
  );
}
