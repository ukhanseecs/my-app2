'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardContent } from './DashboardContent'

const queryClient = new QueryClient()

export function DashboardComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  )
}
