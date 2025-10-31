
import { useState } from "react";
import { CallData } from "@/services/callService";

export const useCallFilters = (calls: CallData[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);

  // Filter calls based on search term and date
  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      searchTerm === "" ||
      call.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.call_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (call.transcript && call.transcript.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDate =
      !date ||
      new Date(call.timestamp).toDateString() === date.toDateString();

    return matchesSearch && matchesDate;
  });

  // Sort calls by timestamp, most recent first
  const sortedCalls = [...filteredCalls].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return {
    searchTerm,
    setSearchTerm,
    date,
    setDate,
    filteredAndSortedCalls: sortedCalls
  };
};
