import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Atividades from './pages/Atividades'
import Vendas from './pages/Vendas'
import Logistica from './pages/Logistica'
import Cobranca from './pages/Cobranca'
import Hoje from './pages/Hoje'
import Integracoes from './pages/Integracoes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchInterval: 5000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/atividades" element={<Atividades />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/logistica" element={<Logistica />} />
            <Route path="/cobranca" element={<Cobranca />} />
            <Route path="/hoje" element={<Hoje />} />
            <Route path="/integracoes" element={<Integracoes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
