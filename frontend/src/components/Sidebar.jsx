import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Home, ShoppingBag, PlusCircle, MessageSquare, User, LogOut,
    Package, Building, Star, Warehouse, Bell, Zap
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
    const { logout, user } = useAuth();

    const commonLinks = [
        { to: '/dashboard', name: 'Dashboard', icon: <Home size={20} /> },
        { to: '/marketplace', name: 'Marketplace', icon: <ShoppingBag size={20} /> },
        { to: '/chat', name: 'Messages', icon: <MessageSquare size={20} /> },
        { to: '/notifications', name: 'Notifications', icon: <Bell size={20} /> },
        { to: '/feedback', name: 'Ratings', icon: <Star size={20} /> },
        { to: '/profile', name: 'Profile', icon: <User size={20} /> },
    ];

    const roleLinks = {
        individual: [
            { to: '/create-post', name: 'Post Waste', icon: <PlusCircle size={20} /> },
        ],
        collector: [
            { to: '/hub', name: 'My Hub', icon: <Warehouse size={20} /> },
            { to: '/organizations', name: 'Industries', icon: <Building size={20} /> },
        ],
        industry: [
            { to: '/matches', name: 'AI Matches', icon: <Zap size={20} /> },
            { to: '/collectors', name: 'Collectors', icon: <Package size={20} /> },
        ],
    };

    const links = [
        commonLinks[0],                                                // Dashboard
        ...(user?.role !== 'industry' ? [commonLinks[1]] : []),        // Marketplace
        ...(roleLinks[user?.role] || []),                              // Role-specific
        commonLinks[2],                                                // Messages
        commonLinks[3],                                                // Notifications
        commonLinks[4],                                                // Ratings
        commonLinks[5],                                                // Profile
    ];

    return (
        <aside className="sidebar glass-pane">
            <div className="sidebar-brand">
                <div className="brand-logo">
                    <span className="brand-icon">♻️</span>
                    <h2 className="text-gradient">ReValue</h2>
                </div>
                <p className="tagline">Circular Economy Platform</p>
            </div>

            <nav className="sidebar-nav">
                {links.map((link) => (
                    <NavLink
                        to={link.to}
                        key={link.to}
                        end={link.to === '/'}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{link.icon}</span>
                        <span className="nav-label">{link.name}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="user-pill">
                    <div className="user-avatar-sm">{user?.name?.charAt(0) || 'U'}</div>
                    <div className="user-text">
                        <p className="user-name">{user?.name || 'User'}</p>
                        <span className={`role-tag badge-${user?.role}`}>{user?.role}</span>
                    </div>
                </div>
                <button onClick={logout} className="logout-btn">
                    <LogOut size={18} /> Sign Out
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
