import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import HomeRedirect from './pages/HomeRedirect';
import ProductsPage from './pages/ProductsPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchasesPage from './pages/PurchasesPage';
import CustomersPage from './pages/CustomersPage';
import SalesPage from './pages/SalesPage';
import DispatchesPage from './pages/DispatchesPage';
import CalendarPage from './pages/CalendarPage';
import WorkGroupsPage from './pages/WorkGroupsPage';
import UsersPage from './pages/UsersPage';
import ChartsPage from './pages/ChartsPage';
import AccountsReceivablePage from './pages/AccountsReceivablePage';

const MANAGEMENT_ROLES = ['ADMIN', 'PARTNER'] as const;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/productos" element={<ProductsPage />} />
              <Route path="/despachos" element={<DispatchesPage />} />
              <Route path="/calendario" element={<CalendarPage />} />

              <Route element={<RoleRoute roles={[...MANAGEMENT_ROLES]} />}>
                <Route path="/proveedores" element={<SuppliersPage />} />
                <Route path="/compras" element={<PurchasesPage />} />
                <Route path="/clientes" element={<CustomersPage />} />
                <Route path="/ventas" element={<SalesPage />} />
                <Route path="/cuentas-por-cobrar" element={<AccountsReceivablePage />} />
                <Route path="/graficos" element={<ChartsPage />} />
                <Route path="/lugares-trabajo" element={<WorkGroupsPage />} />
                <Route path="/perfiles" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
