
interface CallTableDiagnosticsProps {
  visible: boolean;
  onClose: () => void;
}

export function CallTableDiagnostics({ visible, onClose }: CallTableDiagnosticsProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-yellow-800">Call Diagnostics</h3>
        <button
          onClick={onClose}
          className="text-yellow-600 hover:text-yellow-800"
        >
          ×
        </button>
      </div>
      <p className="text-sm text-yellow-700 mt-2">
        Diagnostic information for call sync operations.
      </p>
    </div>
  );
}
