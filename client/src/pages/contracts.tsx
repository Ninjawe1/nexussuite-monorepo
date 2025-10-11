import { ContractRow } from "@/components/contract-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, AlertTriangle, CheckCircle } from "lucide-react";

export default function Contracts() {
  const contracts = [
    {
      id: "1",
      fileName: "player_contract_alex_rivera.pdf",
      type: "Player" as const,
      linkedPerson: "Alex Rivera",
      expirationDate: new Date('2025-12-31'),
      status: "active" as const,
    },
    {
      id: "2",
      fileName: "staff_agreement_sarah_johnson.pdf",
      type: "Staff" as const,
      linkedPerson: "Sarah Johnson",
      expirationDate: new Date('2024-11-15'),
      status: "expiring" as const,
    },
    {
      id: "3",
      fileName: "sponsor_contract_techgear_inc.pdf",
      type: "Sponsor" as const,
      linkedPerson: "TechGear Inc.",
      expirationDate: new Date('2024-09-30'),
      status: "expired" as const,
    },
    {
      id: "4",
      fileName: "player_contract_james_park.pdf",
      type: "Player" as const,
      linkedPerson: "James Park",
      expirationDate: new Date('2026-06-30'),
      status: "active" as const,
    },
    {
      id: "5",
      fileName: "staff_agreement_mike_chen.pdf",
      type: "Staff" as const,
      linkedPerson: "Mike Chen",
      expirationDate: new Date('2025-03-20'),
      status: "active" as const,
    },
    {
      id: "6",
      fileName: "sponsor_contract_energydrink_co.pdf",
      type: "Sponsor" as const,
      linkedPerson: "EnergyDrink Co.",
      expirationDate: new Date('2025-12-31'),
      status: "active" as const,
    },
  ];

  const activeContracts = contracts.filter(c => c.status === 'active').length;
  const expiringContracts = contracts.filter(c => c.status === 'expiring').length;
  const expiredContracts = contracts.filter(c => c.status === 'expired').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-contracts-title">
            Contracts Management
          </h1>
          <p className="text-muted-foreground">Manage player, staff, and sponsor contracts</p>
        </div>
        <Button data-testid="button-upload-contract">
          <Upload className="w-4 h-4 mr-2" />
          Upload Contract
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Contracts</CardTitle>
            <CheckCircle className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-chart-2" data-testid="stat-active-contracts">
              {activeContracts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently valid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-chart-4">
              {expiringContracts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
            <FileText className="h-4 w-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-chart-5">
              {expiredContracts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Needs renewal</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">All Contracts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contracts.map((contract) => (
            <ContractRow key={contract.id} {...contract} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
