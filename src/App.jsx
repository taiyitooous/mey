import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/layout/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import Atividades from './pages/Atividades'
import Vendas from './pages/Vendas'
import Logistica from './pages/Logistica'
import Cobranca from './pages/Cobranca'
import Hoje from './pages/Hoje'
import Integracoes from './pages/Integracoes'
import Skale from './pages/Skale'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchInterval: false,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="/atividades" element={<ErrorBoundary><Atividades /></ErrorBoundary>} />
            <Route path="/vendas" element={<ErrorBoundary><Vendas /></ErrorBoundary>} />
            <Route path="/logistica" element={<ErrorBoundary><Logistica /></ErrorBoundary>} />
            <Route path="/cobranca" element={<ErrorBoundary><Cobranca /></ErrorBoundary>} />
            <Route path="/hoje" element={<ErrorBoundary><Hoje /></ErrorBoundary>} />
            <Route path="/integracoes" element={<ErrorBoundary><Integracoes /></ErrorBoundary>} />
            <Route path="/skale" element={<ErrorBoundary><Skale /></ErrorBoundary>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
