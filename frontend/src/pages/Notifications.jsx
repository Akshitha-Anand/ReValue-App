import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import API_BASE_URL from '../api';
import {
    Bell, CheckCheck, MapPin, Package, Building, X,
    ChevronRight, RefreshCw, Truck, CheckCircle, Clock
} from 'lucide-react';
import './Notifications.css';

const TYPE_CONFIG = {
    NEW_NEARBY_LISTING: {
        icon: <MapPin size={20} />,
        color: '#10b981',
        bg: 'rgba(16,185,129,0.12)',
        label: 'Nearby Pickup',
        showActions: true,
    },
    COLLECTION_REQUEST: {
        icon: <Truck size={20} />,
        color: '#0ea5e9',
        bg: 'rgba(14,165,233,0.12)',
        label: 'Collection Request',
        showActions: true,
    },
    REQUEST_ACCEPTED: {
        icon: <CheckCircle size={20} />,
        color: '#10b981',
        bg: 'rgba(16,185,129,0.12)',
        label: 'Collection Accepted',
        showActions: false,
    },
    REQUEST_REJECTED: {
        icon: <X size={20} />,
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.12)',
        label: 'Request Rejected',
        showActions: false,
    },
    INDUSTRY_MATCH: {
        icon: <Building size={20} />,
        color: '#a855f7',
        bg: 'rgba(168,85,247,0.12)',
        label: 'Industry Match',
        showActions: false,
    },
    SYSTEM: {
        icon: <Bell size={20} />,
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.12)',
        label: 'System',
        showActions: false,
    },
};

const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const Notifications = () => {
    const { token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});
    const [filter, setFilter] = useState('all');

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    const markRead = async (id) => {
        try {
            await axios.put(`${API_BASE_URL}/api/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) { console.error(err); }
    };

    const markAllRead = async () => {
        try {
            await axios.put(`${API_BASE_URL}/api/notifications/read-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) { console.error(err); }
    };

    const handleAccept = async (notifId) => {
        setActionLoading(prev => ({ ...prev, [notifId]: 'accepting' }));
        try {
            await axios.post(`${API_BASE_URL}/api/notifications/${notifId}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n =>
                n._id === notifId ? { ...n, actionStatus: 'accepted', isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to accept — listing may already be taken.');
        } finally {
            setActionLoading(prev => ({ ...prev, [notifId]: null }));
        }
    };

    const handleReject = async (notifId) => {
        setActionLoading(prev => ({ ...prev, [notifId]: 'rejecting' }));
        try {
            await axios.post(`${API_BASE_URL}/api/notifications/${notifId}/reject`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n =>
                n._id === notifId ? { ...n, actionStatus: 'rejected', isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) { console.error(err); } finally {
            setActionLoading(prev => ({ ...prev, [notifId]: null }));
        }
    };

    const filtered = notifications.filter(n => {
        if (filter === 'unread') return !n.isRead;
        if (filter === 'pending') return n.actionStatus === 'pending';
        return true;
    });

    return (
        <div className="notif-page animate-fade-in">
            <div className="section-header">
                <div className="notif-header-left">
                    <h1><Bell size={26} className="inline-icon" /> Notifications</h1>
                    {unreadCount > 0 && <span className="unread-badge-big">{unreadCount} unread</span>}
                </div>
                <div className="notif-header-actions">
                    <button className="btn btn-ghost" onClick={fetchNotifications} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
                    </button>
                    {unreadCount > 0 && (
                        <button className="btn btn-outline" onClick={markAllRead}>
                            <CheckCheck size={16} /> Mark All Read
                        </button>
                    )}
                </div>
            </div>

            <div className="notif-filter-tabs">
                {['all', 'unread', 'pending'].map(f => (
                    <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        {f === 'unread' && unreadCount > 0 && <span className="tab-count">{unreadCount}</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="notif-loading">
                    {[1, 2, 3].map(i => <div key={i} className="notif-skeleton glass-pane" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="notif-empty glass-pane">
                    <Bell size={48} color="var(--text-muted)" />
                    <h3>No {filter !== 'all' ? filter : ''} notifications</h3>
                    <p>You're all caught up! New alerts will appear here.</p>
                </div>
            ) : (
                <div className="notif-list">
                    {filtered.map(notif => {
                        const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.SYSTEM;
                        const isActing = actionLoading[notif._id];
                        const canAct = cfg.showActions && notif.actionStatus === 'pending';
                        return (
                            <div
                                key={notif._id}
                                className={`notif-card glass-pane ${!notif.isRead ? 'unread' : ''} ${notif.actionStatus}`}
                                onClick={() => !notif.isRead && markRead(notif._id)}
                            >
                                {!notif.isRead && <div className="unread-dot" />}
                                <div className="notif-icon-wrap" style={{ background: cfg.bg, color: cfg.color }}>
                                    {cfg.icon}
                                </div>
                                <div className="notif-body">
                                    <div className="notif-top-row">
                                        <span className="notif-type-label" style={{ color: cfg.color }}>{cfg.label}</span>
                                        <span className="notif-time"><Clock size={12} /> {timeAgo(notif.createdAt)}</span>
                                    </div>
                                    <h3 className="notif-title">{notif.title}</h3>
                                    <p className="notif-msg">{notif.message}</p>

                                    <div className="notif-meta-chips">
                                        {notif.distanceKm && (
                                            <span className="meta-chip"><MapPin size={12} /> {notif.distanceKm} km away</span>
                                        )}
                                        {notif.metadata?.category && (
                                            <span className={`badge badge-${notif.metadata.category}`}>{notif.metadata.category}</span>
                                        )}
                                        {notif.metadata?.weight && (
                                            <span className="meta-chip"><Package size={12} /> {notif.metadata.weight} {notif.metadata.unit || 'kg'}</span>
                                        )}
                                        {notif.metadata?.collectorName && (
                                            <span className="meta-chip"><Truck size={12} /> {notif.metadata.collectorName}</span>
                                        )}
                                        {notif.metadata?.industryName && (
                                            <span className="meta-chip"><Building size={12} /> {notif.metadata.industryName}</span>
                                        )}
                                    </div>

                                    {notif.actionStatus === 'accepted' && (
                                        <span className="action-chip accepted"><CheckCircle size={13} /> Accepted</span>
                                    )}
                                    {notif.actionStatus === 'rejected' && (
                                        <span className="action-chip rejected"><X size={13} /> Declined</span>
                                    )}

                                    {canAct && (
                                        <div className="notif-action-btns" onClick={e => e.stopPropagation()}>
                                            <button className="btn btn-primary btn-sm" onClick={() => handleAccept(notif._id)} disabled={!!isActing}>
                                                {isActing === 'accepting' ? <RefreshCw size={14} className="spin" /> : <CheckCircle size={14} />}
                                                Accept Pickup
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleReject(notif._id)} disabled={!!isActing}>
                                                {isActing === 'rejecting' ? <RefreshCw size={14} className="spin" /> : <X size={14} />}
                                                Decline
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {notif.post && <ChevronRight size={18} className="notif-arrow" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Notifications;
