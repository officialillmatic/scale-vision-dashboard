import dynamic from 'next/dynamic'

const BillingSettings = dynamic(() => import('../src/components/settings/BillingSettings').catch(() => ({ default: () => null })), { ssr: false })
const AppearanceSettings = dynamic(() => import('../src/components/settings/AppearanceSettings').catch(() => ({ default: () => null })), { ssr: false })

export default function Settings(){
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="opacity-70">Configure billing, appearance, and platform options.</p>
      </header>
      <section>
        <h2 className="text-xl font-semibold">Billing</h2>
        <BillingSettings />
      </section>
      <section>
        <h2 className="text-xl font-semibold">Appearance</h2>
        <AppearanceSettings />
      </section>
    </main>
  )
}
