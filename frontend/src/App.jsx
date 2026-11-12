import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import Marketplace from './pages/Marketplace';
import CreatePost from './pages/CreatePost';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import CollectorHub from './pages/CollectorHub';
import Organizations from './pages/Organizations';
import Feedback from './pages/Feedback';
import Notifications from './pages/Notifications';
import IndustryMatches from './pages/IndustryMatches';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppLayout = ({ children }) => {
  const { user } = useAuth();
  return (
    <div className="app-container">
      {user && <Sidebar />}
      <div className="main-content" style={!user ? { marginLeft: 0, padding: 0 } : {}}>
        {user && <Navbar />}
        <main>{children}</main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
          <Route path="/create-post" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/hub" element={<ProtectedRoute><CollectorHub /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/matches" element={<RoleProtectedRoute allowedRoles={['industry']}><IndustryMatches /></RoleProtectedRoute>} />
          <Route path="/organizations" element={<RoleProtectedRoute allowedRoles={['collector', 'industry']}><Organizations /></RoleProtectedRoute>} />
          <Route path="/collectors" element={<RoleProtectedRoute allowedRoles={['collector', 'industry']}><Organizations /></RoleProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
        </Routes>
      </AppLayout>
    </AuthProvider>
  );
}

export default App;
