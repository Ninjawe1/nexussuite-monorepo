import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const plans = [
  {
    id: 'starter',
    name: 'Free / Starter',
    price: 0,
    features: ['Basic analytics', 'Community support'],
    limits: { users: 3, projects: 2 },
  },
  {
    id: 'growth',
    name: 'Pro / Growth',
    price: 49,
    features: ['Full analytics', 'Priority support'],
    limits: { users: 25, projects: 25 },
  },
  {
    id: 'enterprise',
    name: 'Business / Enterprise',
    price: 199,
    features: ['SLA', 'Dedicated manager'],
    limits: { users: 200, projects: 100 },
  },
  {
    id: 'custom',
    name: 'Custom',
    price: 0,
    features: ['Negotiated'],

    limits: { users: 9999, projects: 9999 },
  },
];

const demoInvoices = [
  {
    id: 'inv_001',
    customer: 'Phoenix Esports',
    amount: 49.0,
    currency: 'USD',
    status: 'paid',
    date: '2024-10-01',
  },
  {
    id: 'inv_002',
    customer: 'Nebula Gaming',
    amount: 0.0,
    currency: 'USD',
    status: 'trial',
    date: '2024-10-08',
  },
  {
    id: 'inv_003',
    customer: 'Phoenix Esports',
    amount: 49.0,
    currency: 'USD',
    status: 'paid',
    date: '2024-11-01',
  },
];

const demoRevenue = {
  mrr: 98,
  arr: 98 * 12,
  totalIncome: 3299,
  churnRate: 1.8,
  trials: 12,
  trialConversion: 58,
};

export default function AdminBillingPage() {
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('growth');

  const applyCoupon = () => {
    toast({
      title: 'Coupon',

      description: `Applied code ${couponCode} (demo)`,
    });
  };

  const updatePlan = () => {
    toast({
      title: 'Plan updated',

      description: `Changed default plan to ${selectedPlan} (demo)`,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground">Manage plans, invoices, and revenue performance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
          <CardDescription>Set features, pricing and usage limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(p => (
              <div key={p.id} className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{p.name}</h3>
                  <span className="text-sm">${p.price}/mo</span>
                </div>
                <ul className="text-sm list-disc pl-5">
                  {p.features.map(f => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <div className="text-xs text-muted-foreground">
                  Limits: users {p.limits.users}, projects {p.limits.projects}
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex items-center gap-3">
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Default signup plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={updatePlan}>Set as default</Button>
            <div className="flex items-center gap-2 ml-auto">
              <Input
                placeholder="Discount code"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
              />
              <Button variant="outline" onClick={applyCoupon}>
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Recent payments and receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Invoice</th>
                  <th className="p-2">Customer</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {demoInvoices.map(inv => (
                  <tr key={inv.id} className="border-t border-border">
                    <td className="p-2">{inv.id}</td>
                    <td className="p-2">{inv.customer}</td>
                    <td className="p-2">
                      ${inv.amount.toFixed(2)} {inv.currency}
                    </td>
                    <td className="p-2 capitalize">{inv.status}</td>
                    <td className="p-2">{inv.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Key billing metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Metric label="MRR" value={`$${demoRevenue.mrr}`} />
            <Metric label="ARR" value={`$${demoRevenue.arr}`} />
            <Metric label="Total Income" value={`$${demoRevenue.totalIncome}`} />
            <Metric label="Churn" value={`${demoRevenue.churnRate}%`} />
            <Metric label="Active Trials" value={`${demoRevenue.trials}`} />
            <Metric label="Trial Conversion" value={`${demoRevenue.trialConversion}%`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
