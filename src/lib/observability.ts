import * as Sentry from '@sentry/nextjs'

export function initSentry() {
  if (!process.env.NEXT_PUBLIC_ENABLE_SENTRY) return
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return
  Sentry.init({ dsn })
}
