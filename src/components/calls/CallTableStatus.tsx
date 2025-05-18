
import { Badge } from "@/components/ui/badge";

interface CallTableStatusProps {
  status: string;
}

export function CallTableStatus({ status }: CallTableStatusProps) {
  switch(status) {
    case "completed":
      return <Badge className="bg-green-500">Completed</Badge>;
    case "user_hangup":
      return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Hangup</Badge>;
    case "dial_no_answer":
      return <Badge variant="outline" className="border-red-500 text-red-500">No Answer</Badge>;
    case "voicemail":
      return <Badge variant="outline" className="border-blue-500 text-blue-500">Voicemail</Badge>;
    default:
      return <Badge variant="outline" className="border-gray-500">Unknown</Badge>;
  }
}
