import React from 'react'
import { EmergencyCreditPanel } from '@/components/EmergencyCreditPanel'

export default function EmergencyCredits() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              🚨 Emergency Credits Panel
            </h1>
            <p className="mt-2 text-gray-600">
              Página de prueba para validar estadísticas de créditos
            </p>
          </div>
          
          <EmergencyCreditPanel />
        </div>
      </div>
    </div>
  )
}
