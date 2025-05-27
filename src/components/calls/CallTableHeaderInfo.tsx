
interface CallTableHeaderInfoProps {
  company: any;
}

export function CallTableHeaderInfo({ company }: CallTableHeaderInfoProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Call Analytics</h2>
      <p className="text-gray-600 mt-1">
        {company?.name ? `${company.name} call data` : 'Your call analytics dashboard'}
      </p>
    </div>
  );
}
