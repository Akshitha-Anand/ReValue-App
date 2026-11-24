import React, { Component } from 'react';
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

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#f1f5f9',
          background: 'rgba(7, 21, 16, 0.95)',
          borderRadius: '16px',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          margin: '3rem auto',
          maxWidth: '560px'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '0.75rem' }}>Unable to load page</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering this section.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '8px',
              background: '#10b981',
              color: '#042f1a',
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

  // If not logged in, render in full-width public layout (no sidebar, no margin restrictions)
  if (!user) {
    return (
      <div className="public-app-container">
        <main className="public-main">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    );
  }

  // When logged in, render in authenticated dashboard layout with sidebar and top navbar
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <main className="dashboard-content">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
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