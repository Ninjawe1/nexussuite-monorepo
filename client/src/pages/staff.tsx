import { StaffCard } from "@/components/staff-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function Staff() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const staffMembers = [
    {
      id: "1",
      name: "Sarah Johnson",
      role: "Manager",
      email: "sarah.j@nexus.gg",
      phone: "+1 555-0123",
      permissions: ['Staff', 'Payroll', 'Matches', 'Analytics'],
      status: "active" as const,
    },
    {
      id: "2",
      name: "Mike Chen",
      role: "Analyst",
      email: "mike.c@nexus.gg",
      phone: "+1 555-0234",
      permissions: ['Analytics', 'Matches'],
      status: "active" as const,
    },
    {
      id: "3",
      name: "Alex Rivera",
      role: "Player",
      email: "alex.r@nexus.gg",
      phone: "+1 555-0456",
      permissions: ['Matches'],
      status: "active" as const,
    },
    {
      id: "4",
      name: "Emma Wilson",
      role: "Staff",
      email: "emma.w@nexus.gg",
      permissions: ['Marcom', 'Contracts'],
      status: "active" as const,
    },
    {
      id: "5",
      name: "James Park",
      role: "Player",
      email: "james.p@nexus.gg",
      phone: "+1 555-0789",
      permissions: ['Matches'],
      status: "suspended" as const,
    },
    {
      id: "6",
      name: "Lisa Martinez",
      role: "Admin",
      email: "lisa.m@nexus.gg",
      phone: "+1 555-0321",
      permissions: ['Staff', 'Payroll', 'Matches', 'Analytics', 'Marcom', 'Contracts', 'Settings'],
      status: "active" as const,
    },
  ];

  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         staff.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || staff.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold mb-1" data-testid="text-staff-title">
            Staff Management
          </h1>
          <p className="text-muted-foreground">Manage your club's staff members and their permissions</p>
        </div>
        <Button data-testid="button-add-staff">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-staff"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-role-filter">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Owner">Owner</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Manager">Manager</SelectItem>
            <SelectItem value="Staff">Staff</SelectItem>
            <SelectItem value="Player">Player</SelectItem>
            <SelectItem value="Analyst">Analyst</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((staff) => (
          <StaffCard key={staff.id} {...staff} />
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No staff members found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
