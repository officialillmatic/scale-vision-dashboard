import Link from 'next/link'
export default function Custom404(){
  return (
    <main className="min-h-screen grid place-items-center p-8 text-center">
      <div>
        <h1 className="text-4xl font-bold">404 — Page Not Found
        </h1>
        <p className="mt-2 opacity-80">The page you’re looking for doesn’t exist.</p>
        <Link href="/" className="mt-6 inline-block underline">Go Home</Link>
      </div>
    </main>
  )
}
