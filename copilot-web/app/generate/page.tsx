import GenerateClient from './GenerateClient'
import Sidebar from '@/components/Sidebar'

export default function GeneratePage() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#080b11' }}>
      <Sidebar />
      <main className="flex-1 ml-60 p-8">
        <GenerateClient />
      </main>
    </div>
  )
}
