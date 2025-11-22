import { ContractRow } from "../contract-row";

export default function ContractRowExample() {
  return (
    <div className="flex flex-col gap-3 p-6 bg-background">
      <ContractRow
        id="1"
        fileName="player_contract_alex_rivera.pdf"
        type="Player"
        linkedPerson="Alex Rivera"
        expirationDate={new Date("2025-12-31")}
        status="active"
      />
      <ContractRow
        id="2"
        fileName="staff_agreement_sarah_johnson.pdf"
        type="Staff"
        linkedPerson="Sarah Johnson"
        expirationDate={new Date("2024-11-15")}
        status="expiring"
      />
      <ContractRow
        id="3"
        fileName="sponsor_contract_techgear_inc.pdf"
        type="Sponsor"
        linkedPerson="TechGear Inc."
        expirationDate={new Date("2024-09-30")}
        status="expired"
      />
    </div>
  );
}
