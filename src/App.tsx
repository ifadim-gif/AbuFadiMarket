import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from 'react-router-dom'
import { queryClient, queryPersister } from './lib/queryClient'
import { AuthProvider } from './features/auth/AuthProvider'
import { router } from './lib/router'

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
    >
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </PersistQueryClientProvider>
  )
}

export default App
