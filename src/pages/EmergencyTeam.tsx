import React from 'react'
import { EmergencyTeamMembers } from '@/components/EmergencyTeamMembers'

export default function EmergencyTeam() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              🚨 Emergency Team Management
            </h1>
            <p className="mt-2 text-gray-600">
              Página de prueba para validar el sistema super admin
            </p>
          </div>
          
          <EmergencyTeamMembers />
        </div>
      </div>
    </div>
  )
}
