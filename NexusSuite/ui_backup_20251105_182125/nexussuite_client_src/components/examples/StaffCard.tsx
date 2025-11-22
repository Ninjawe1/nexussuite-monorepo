import { StaffCard } from "../staff-card";

export default function StaffCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-background">
      <StaffCard
        id="1"
        name="Sarah Johnson"
        role="Manager"
        email="sarah.j@nexus.gg"
        phone="+1 555-0123"
        permissions={['Staff', 'Payroll', 'Matches']}
        status="active"
      />
      <StaffCard
        id="2"
        name="Mike Chen"
        role="Analyst"
        email="mike.c@nexus.gg"
        permissions={['Analytics', 'Matches']}
        status="active"
      />
      <StaffCard
        id="3"
        name="Alex Rivera"
        role="Player"
        email="alex.r@nexus.gg"
        phone="+1 555-0456"
        permissions={['Matches']}
        status="suspended"
      />
    </div>
  );
}

