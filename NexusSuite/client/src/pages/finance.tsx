// Top-level imports (showing only the lines to adjust)
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Transaction } from "@shared/schema";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletDialog } from "@/components/wallet-dialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertTransactionSchema,
  type InsertTransaction,
  type Wallet,
} from "@shared/schema";

import { useToast } from "@/hooks/use-toast";
// removed direct date-fns format import; using formatDateSafe instead
import { formatDateSafe, toDateSafe } from "@/lib/date";

import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Edit,
  Trash2,
  Calendar,
  Filter,
  Download,
} from "lucide-react";
import { DashboardLineChart } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const incomeCategories = [
  { value: "sponsorship", label: "Sponsorship" },
  { value: "merchandise", label: "Merchandise" },
  { value: "tournament_prize", label: "Tournament Prize" },
  { value: "streaming_revenue", label: "Streaming Revenue" },
  { value: "ticket_sales", label: "Ticket Sales" },
  { value: "other_income", label: "Other Income" },
];

const expenseCategories = [
  { value: "salaries", label: "Salaries" },
  { value: "equipment", label: "Equipment" },
  { value: "facility", label: "Facility Rent" },
  { value: "travel", label: "Travel" },
  { value: "marketing", label: "Marketing" },
  { value: "tournament_fees", label: "Tournament Fees" },
  { value: "utilities", label: "Utilities" },
  { value: "other_expense", label: "Other Expense" },
];

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "paypal", label: "PayPal" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "other", label: "Other" },

];

export default function Finance() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/finance"],

  });

  const {
    data: wallets = [],
    isLoading: walletsLoading,
    isError: walletsError,
  } = useQuery<Wallet[]>({
    queryKey: ["/api/wallets"],
  });
  const walletMap = useMemo(
    () => Object.fromEntries(wallets.map((w) => [w.id, w])),
    [wallets],
  );

  // Add default wallet resolution (if one default or only one wallet)
  const defaultWallet = useMemo(
    () =>
      wallets.find((w) => w.isDefault) ??
      (wallets.length === 1 ? wallets[0] : undefined),
    [wallets],

  );
  const { data: monthlyData = [] } = useQuery<
    Array<{
      month: string;
      income: number;
      expenses: number;
      profit: number;
    }>
  >({
    queryKey: ["/api/finance/monthly"],

  });

  const handleExport = async () => {
    try {
      const response = await fetch("/api/finance/export", {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${formatDateSafe(new Date(), "yyyy-MM-dd")}.csv`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Transactions exported successfully" });
    } catch (error) {
      toast({
        title: "Failed to export transactions",
        variant: "destructive",

      });
    }
  };

  const form = useForm<any>({
    resolver: zodResolver(
      insertTransactionSchema.omit({ tenantId: true, createdBy: true }),
    ),
    defaultValues: {
      type: "income",
      category: "",
      amount: undefined,
      description: "",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "",
      reference: "",
      walletId: "",

    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTransaction) => {
      return apiRequest("/api/finance", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Transaction created successfully" });

      setIsOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Failed to create transaction",
        variant: "destructive",

      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<InsertTransaction>;
    }) => {
      return apiRequest(`/api/finance/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Transaction updated successfully" });

      setIsOpen(false);
      setEditingTransaction(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Failed to update transaction",
        variant: "destructive",

      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/finance/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({ title: "Transaction deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to delete transaction",
        variant: "destructive",

      });
    },
  });

  // NEW: Wallet deletion mutation
  const deleteWalletMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/wallets/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance"] });
      toast({ title: "Wallet deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to delete wallet",
        variant: "destructive",

      });
    },
  });

  const onSubmit = (data: any) => {
    const parsedDate = toDateSafe(data.date);
    if (!parsedDate) {
      toast({
        title: "Invalid date",
        description: "Please provide a valid date for the transaction.",
        variant: "destructive",

      });
      return;
    }
    const submitData: any = {
      ...data,
      amount: data.amount.toString(),
      date: parsedDate,
    };
    // If no wallet selected, fallback to default wallet if available
    if (!submitData.walletId || submitData.walletId === "") {

      if (defaultWallet?.id) {
        submitData.walletId = defaultWallet.id;
      } else {
        delete submitData.walletId;
      }
    }
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    form.reset({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      description: transaction.description || "",
      date: formatDateSafe(transaction.date, "yyyy-MM-dd"),
      paymentMethod: transaction.paymentMethod || "",
      reference: transaction.reference || "",
      walletId: transaction.walletId || "",

    });
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setEditingTransaction(null);
    form.reset();
  };

  // Calculate financial summary
  const summary = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expenses = transactions
      .filter((t) => t.type === "expense")

      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const profit = income - expenses;
    return { income, expenses, profit };
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterCategory !== "all" && t.category !== filterCategory)
        return false;

      return true;
    });
  }, [transactions, filterType, filterCategory]);

  const selectedType = form.watch("type");
  const categories =
    selectedType === "income" ? incomeCategories : expenseCategories;


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground mt-1">
            Track income, expenses, and financial health
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export-transactions"
          >

            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          {/* Wallet creation dialog component */}
          <WalletDialog />

          {/* Single, valid transaction dialog */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setIsOpen(true)}
                data-testid="button-add-transaction"
              >

                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>

            <DialogContent
              className="max-w-2xl"
              data-testid="dialog-transaction"
            >
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? "Edit Transaction" : "Add Transaction"}

                </DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue("category", "");

                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >

                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (

                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
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
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              data-testid="input-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="date"
                              data-testid="input-date"
                            />

                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Transaction details..."
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method (Optional)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >

                            <FormControl>
                              <SelectTrigger data-testid="select-payment-method">
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {paymentMethods.map((method) => (
                                <SelectItem
                                  key={method.value}
                                  value={method.value}
                                >

                                  {method.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Invoice #, Receipt #, etc."
                              data-testid="input-reference"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="walletId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wallet (Optional)</FormLabel>
                        <Select
                          onValueChange={(v) =>
                            field.onChange(v === "none" ? "" : v)
                          }
                          value={field.value === "" ? "none" : field.value}

                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-wallet">
                              <SelectValue placeholder="Select wallet" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem key="none" value="none">
                              No wallet
                            </SelectItem>
                            {wallets.map((w) => (

                              <SelectItem key={w.id} value={w.id}>
                                {w.name} ({w.currency.toUpperCase()})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDialog}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createMutation.isPending || updateMutation.isPending
                      }
                      data-testid="button-submit"
                    >
                      {editingTransaction ? "Update" : "Create"} Transaction

                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="card-income">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold font-mono"
              data-testid="text-total-income"
            >
              ${summary.income.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter((t) => t.type === "income").length}{" "}
              transactions

            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-expenses">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold font-mono"
              data-testid="text-total-expenses"
            >
              ${summary.expenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter((t) => t.type === "expense").length}{" "}
              transactions

            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-profit">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Profit/Loss
            </CardTitle>

            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold font-mono ${
                summary.profit >= 0 ? "text-success" : "text-destructive"

              }`}
              data-testid="text-profit"
            >
              ${summary.profit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.profit >= 0 ? "Profitable" : "Loss"}

            </p>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Wallets</h2>

        {walletsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="hover-elevate">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16 mt-2" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-md" />
                  </div>
                  <Skeleton className="h-8 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : walletsError ? (
          <div className="text-sm text-destructive">
            Failed to load wallets.
          </div>

        ) : wallets.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">No wallets yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a wallet to track balances and link transactions.
                  </p>
                </div>
                <WalletDialog />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wallets.map((w) => {
              const typeLabel = w.type
                .replace(/_/g, " ")
                .replace(/^\w/, (c) => c.toUpperCase());

              return (
                <Card
                  key={w.id}
                  className="hover-elevate active-elevate-2 cursor-pointer"
                  data-testid={`card-wallet-${w.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base leading-tight">
                          {w.name}
                        </CardTitle>

                        <div className="text-xs text-muted-foreground mt-1">
                          {typeLabel} • {w.currency.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {w.isDefault && (
                          <Badge
                            className="bg-chart-2 text-primary-foreground text-xs"
                            data-testid={`badge-default-${w.id}`}
                          >
                            Default
                          </Badge>
                        )}
                        {/* Wallet delete action */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label="Delete wallet"
                              data-testid={`button-delete-wallet-${w.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete wallet?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the wallet "
                                {w.name}". Transactions linked to this wallet
                                will remain, but may show with an unknown wallet
                                label. This action cannot be undone.

                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  deleteWalletMutation.mutate(w.id)
                                }

                                data-testid={`confirm-delete-wallet-${w.id}`}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold font-mono">
                      {formatCurrency(w.balance, w.currency)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Monthly Trend Chart */}
        {monthlyData.length > 0 && (
          <Card data-testid="card-monthly-trend">
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardLineChart
                data={monthlyData}
                xKey="month"
                series={[
                  { key: "income", label: "Income" },
                  { key: "expenses", label: "Expenses" },
                  { key: "profit", label: "Net Profit" },
                ]}
                height={300}
                xTickFormatter={(value: any) => {
                  const v = String(value ?? "");

                  const m = v.match(/^(\d{4})-(\d{2})$/);
                  if (m) {
                    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
                    return isNaN(d.getTime())
                      ? v
                      : d.toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        });
                  }
                  return v || "Unknown";

                }}
                yTickFormatter={(value: number) => `$${value.toLocaleString()}`}
              />
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger
                className="w-[180px]"
                data-testid="select-filter-type"
              >

                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger
                className="w-[180px]"
                data-testid="select-filter-category"
              >

                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {[...incomeCategories, ...expenseCategories].map((cat) => (

                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading transactions...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (

                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate active-elevate-2"
                  data-testid={`transaction-${transaction.id}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`p-2 rounded-lg ${
                        transaction.type === "income"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {transaction.type === "income" ? (

                        <TrendingUp className="h-5 w-5" />
                      ) : (
                        <TrendingDown className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className="font-semibold"
                          data-testid={`text-description-${transaction.id}`}
                        >
                          {transaction.description || transaction.category}
                        </h4>
                        <Badge
                          variant={
                            transaction.type === "income"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {transaction.category.replace(/_/g, " ")}

                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateSafe(transaction.date, "MMM dd, yyyy")}
                        </span>
                        {transaction.paymentMethod && (
                          <span>
                            {transaction.paymentMethod.replace(/_/g, " ")}
                          </span>
                        )}
                        {transaction.reference && (
                          <span>Ref: {transaction.reference}</span>
                        )}
                        {/* Wallet label */}
                        {transaction.walletId && (
                          <span>
                            Wallet:{" "}
                            {walletMap[transaction.walletId]?.name ?? "Unknown"}{" "}
                            {walletMap[transaction.walletId]?.currency
                              ? `(${walletMap[transaction.walletId]?.currency.toUpperCase()})`
                              : ""}

                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`text-lg font-mono font-semibold ${
                        transaction.type === "income"
                          ? "text-success"
                          : "text-destructive"
                      }`}
                      data-testid={`text-amount-${transaction.id}`}
                    >
                      {transaction.type === "income" ? "+" : "-"}$

                      {parseFloat(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(transaction)}
                      data-testid={`button-edit-${transaction.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-delete-${transaction.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete Transaction
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this transaction?
                            This action cannot be undone.

                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              deleteMutation.mutate(transaction.id)
                            }

                            data-testid="button-confirm-delete"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  function formatCurrency(amount: string | number, currency?: string) {
    const currencyMap: Record<string, string> = {
      usd: "USD",
      eur: "EUR",
      gbp: "GBP",
      inr: "INR",
      sgd: "SGD",
      aed: "AED",
      ngn: "NGN",
      cny: "CNY",
      jpy: "JPY",
      cad: "CAD",
      aud: "AUD",
      zar: "ZAR",
    };
    const code =
      currencyMap[currency?.toLowerCase?.() || ""] ||
      currency?.toUpperCase?.() ||
      "USD";
    const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
    const safe = Number.isFinite(numeric) ? numeric : 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",

      currency: code,
      maximumFractionDigits: 2,
    }).format(safe);
  }
}
