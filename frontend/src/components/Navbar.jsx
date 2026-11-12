import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Search, CheckCheck, MapPin, Package, Building, Truck, X, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../api';
import './Navbar.css';

const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const TYPE_ICONS = {
    NEW_NEARBY_LISTING: <MapPin size={16} color="#10b981" />,
    COLLECTION_REQUEST: <Truck size={16} color="#0ea5e9" />,
    REQUEST_ACCEPTED: <Package size={16} color="#10b981" />,
    INDUSTRY_MATCH: <Building size={16} color="#a855f7" />,
};

const Navbar = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications((res.data.notifications || []).slice(0, 8));
            setUnreadCount(res.data.unreadCount || 0);
        } catch (err) {
            // silently fail - don't break navbar
        }
    }, [token]);

    // Poll for notifications every 30 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markAllRead = async (e) => {
        e.stopPropagation();
        try {
            await axios.put(`${API_BASE_URL}/api/notifications/read-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) { /* silent */ }
    };

    const handleBellClick = () => {
        setShowDropdown(prev => !prev);
        fetchNotifications();
    };

    return (
        <header className="navbar glass-pane">
            <div className="search-bar">
                <Search size={18} className="search-icon" />
                <input type="text" placeholder="Search for items, categories..." />
            </div>

            <div className="nav-actions">
                {/* Bell with live badge */}
                <div className="notif-bell-wrap" ref={dropdownRef}>
                    <button className="icon-btn" onClick={handleBellClick} aria-label="Notifications">
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                        )}
                    </button>

                    {showDropdown && (
                        <div className="notif-dropdown glass-pane">
                            <div className="nd-header">
                                <span className="nd-title">Notifications</span>
                                <div className="nd-header-actions">
                                    {unreadCount > 0 && (
                                        <button className="nd-mark-all" onClick={markAllRead}>
                                            <CheckCheck size={13} /> Mark all read
                                        </button>
                                    )}
                                    <button className="nd-view-all" onClick={() => { navigate('/notifications'); setShowDropdown(false); }}>
                                        View all
                                    </button>
                                </div>
                            </div>

                            <div className="nd-list">
                                {notifications.length === 0 ? (
                                    <div className="nd-empty">
                                        <Bell size={28} color="var(--text-muted)" />
                                        <p>No notifications yet</p>
                                    </div>
                                ) : notifications.map(n => (
                                    <div
                                        key={n._id}
                                        className={`nd-item ${!n.isRead ? 'unread' : ''}`}
                                        onClick={() => { navigate('/notifications'); setShowDropdown(false); }}
                                    >
                                        <div className="nd-icon">
                                            {TYPE_ICONS[n.type] || <Bell size={16} color="#f59e0b" />}
                                        </div>
                                        <div className="nd-content">
                                            <p className="nd-msg">{n.title}</p>
                                            <p className="nd-sub">{n.message?.substring(0, 60)}{n.message?.length > 60 ? '…' : ''}</p>
                                            <span className="nd-time">{timeAgo(n.createdAt)}</span>
                                        </div>
                                        {!n.isRead && <div className="nd-dot" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="user-greeting">
                    <p>Hello, <span className="highlight text-gradient">{user?.name?.split(' ')[0]}</span>!</p>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
