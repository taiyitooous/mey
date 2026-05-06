import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Logistica from '@/pages/Logistica';
import Eventos from '@/pages/Eventos';
import LeadDetail from '@/pages/LeadDetail';
import Atividades from '@/pages/Atividades';
import Integracoes from '@/pages/Integracoes';
import Coordenadores from '@/pages/Coordenadores';
import ImportarCSV from '@/pages/ImportarCSV';
import DataCrazy from '@/pages/DataCrazy';
import Leaderboard from '@/pages/Leaderboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <img
            src="https://media.base44.com/images/public/user_68fbb6f1a06149abf6635095/ff0e387d5_image.png"
            alt="MEY"
            className="w-14 h-14 rounded-xl"
          />
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lead/:id" element={<LeadDetail />} />
        <Route path="/logistica" element={<Logistica />} />
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/atividades" element={<Atividades />} />
        <Route path="/datacrazy" element={<DataCrazy />} />
        <Route path="/coordenadores" element={<Coordenadores />} />
        <Route path="/integracoes" element={<Integracoes />} />
        <Route path="/importar-csv" element={<ImportarCSV />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App