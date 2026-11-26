import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { Providers } from '@/components/providers'
import { Sidebar } from '@/components/sidebar'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }
  return (
    <Providers>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="md:ml-[260px] min-h-screen">
          {children}
        </main>
      </div>
    </Providers>
  )
}
