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
import TresC from './pages/TresC'
import DataCrazy from './pages/DataCrazy'
import Leaderboard from './pages/Leaderboard'
import Eventos from './pages/Eventos'
import LeadDetail from './pages/LeadDetail'
import ImportarCSV from './pages/ImportarCSV'
import Coordenadores from './pages/Coordenadores'

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
            <Route path="/tresc" element={<ErrorBoundary><TresC /></ErrorBoundary>} />
            <Route path="/datacrazy" element={<ErrorBoundary><DataCrazy /></ErrorBoundary>} />
            <Route path="/leaderboard" element={<ErrorBoundary><Leaderboard /></ErrorBoundary>} />
            <Route path="/eventos" element={<ErrorBoundary><Eventos /></ErrorBoundary>} />
            <Route path="/leads/:id" element={<ErrorBoundary><LeadDetail /></ErrorBoundary>} />
            <Route path="/importar" element={<ErrorBoundary><ImportarCSV /></ErrorBoundary>} />
            <Route path="/coordenadores" element={<ErrorBoundary><Coordenadores /></ErrorBoundary>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
