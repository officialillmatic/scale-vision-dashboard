
import React from "react";
import { WhiteLabelCallsTable } from "./WhiteLabelCallsTable";

interface CallTableProps {
  onSelectCall?: (call: any) => void;
}

export function CallTable({ onSelectCall }: CallTableProps) {
  return <WhiteLabelCallsTable onSelectCall={onSelectCall} />;
}
