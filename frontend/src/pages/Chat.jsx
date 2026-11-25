import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Send, CheckCircle, Clock, MapPin, Search, Bell,
    MessageSquare, UserPlus, X, RefreshCw, Sparkles,
    Building, Truck, User as UserIcon, ShieldCheck
} from 'lucide-react';
import { io } from 'socket.io-client';
import axios from 'axios';
import API_BASE_URL from '../api';
import './Chat.css';

let socketInstance = null;
const getSocket = () => {
    if (!socketInstance) {
        socketInstance = io(API_BASE_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
    }
    return socketInstance;
};

const Chat = () => {
    const { user, token } = useAuth();
    const location = useLocation();

    const [contacts, setContacts] = useState([]);
    const [messages, setMessages] = useState([]);
    const [activeContactId, setActiveContactId] = useState(location.state?.contactId || null);
    const [inputText, setInputText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [notification, setNotification] = useState(null);
    const [sending, setSending] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Directory modal state
    const [showDirectory, setShowDirectory] = useState(false);
    const [directoryContacts, setDirectoryContacts] = useState([]);
    const [directoryRoleFilter, setDirectoryRoleFilter] = useState('all');
    const [directorySearch, setDirectorySearch] = useState('');
    const [directoryLoading, setDirectoryLoading] = useState(false);

    const messagesEndRef = useRef(null);
    const activeContactIdRef = useRef(activeContactId);

    useEffect(() => {
        activeContactIdRef.current = activeContactId;
    }, [activeContactId]);

    // Fetch conversation list
    const fetchConversations = useCallback(async () => {
        if (!user?._id) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/chat/conversations/${user._id}`);
            const data = Array.isArray(res.data) ? res.data : [];
            setContacts(data);

            // If we navigated here with a contact, ensure they are selected
            if (location.state?.contactId) {
                const targetId = location.state.contactId;
                const existing = data.find(c => String(c.id) === String(targetId));
                if (!existing) {
                    const newContact = {
                        id: targetId,
                        name: location.state.contactName || 'New Contact',
                        role: 'collector',
                        lastMsg: 'Start negotiating...',
                        time: new Date().toISOString(),
                        avatar: (location.state.contactName || 'N').charAt(0).toUpperCase()
                    };
                    setContacts(prev => [newContact, ...prev]);
                }
                setActiveContactId(targetId);
            } else if (data.length > 0 && !activeContactIdRef.current) {
                setActiveContactId(data[0].id);
            }
        } catch (err) {
            console.error("Error fetching conversations:", err);
        }
    }, [user?._id, location.state]);

    // Socket setup & registration
    useEffect(() => {
        if (!user?._id) return;

        const socket = getSocket();

        const register = () => {
            socket.emit('registerUser', user._id);
        };

        if (socket.connected) {
            register();
        }
        socket.on('connect', register);

        fetchConversations();

        // Listen for incoming messages
        const handleReceiveMessage = (msg) => {
            const senderId = typeof msg.sender === 'object' && msg.sender !== null ? String(msg.sender._id) : String(msg.sender);
            const receiverId = typeof msg.receiver === 'object' && msg.receiver !== null ? String(msg.receiver._id) : String(msg.receiver);
            const currentActive = String(activeContactIdRef.current || '');

            if (senderId === currentActive || receiverId === currentActive) {
                setMessages(prev => {
                    const alreadyExists = prev.some(m => String(m._id) === String(msg._id));
                    if (alreadyExists) return prev;
                    return [...prev, msg];
                });
            } else {
                setNotification({
                    text: `New message from ${msg.senderName || 'user'}!`,
                    contactId: senderId
                });
                setTimeout(() => setNotification(null), 5000);
            }
            fetchConversations();
        };

        socket.on('receiveMessage', handleReceiveMessage);

        return () => {
            socket.off('connect', register);
            socket.off('receiveMessage', handleReceiveMessage);
        };
    }, [user?._id, fetchConversations]);

    // Fetch messages for active contact
    useEffect(() => {
        if (!user?._id || !activeContactId) return;

        let isMounted = true;
        const fetchMessages = async () => {
            setLoadingMessages(true);
            try {
                const res = await axios.get(`${API_BASE_URL}/api/chat/messages/${user._id}/${activeContactId}`);
                if (isMounted) {
                    setMessages(Array.isArray(res.data) ? res.data : []);
                }
            } catch (err) {
                console.error("Error fetching messages:", err);
            } finally {
                if (isMounted) setLoadingMessages(false);
            }
        };

        fetchMessages();
        return () => { isMounted = false; };
    }, [user?._id, activeContactId]);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch directory contacts for modal
    const openDirectory = async (role = 'all') => {
        setShowDirectory(true);
        setDirectoryRoleFilter(role);
        setDirectoryLoading(true);
        try {
            const url = role === 'all'
                ? `${API_BASE_URL}/api/chat/contacts/available`
                : `${API_BASE_URL}/api/chat/contacts/available?role=${role}`;
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDirectoryContacts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error fetching directory contacts:", err);
        } finally {
            setDirectoryLoading(false);
        }
    };

    const handleSelectDirectoryContact = (contact) => {
        const contactId = contact._id;
        const existing = contacts.find(c => String(c.id) === String(contactId));
        if (!existing) {
            const newContact = {
                id: contactId,
                name: contact.name,
                role: contact.role,
                lastMsg: 'Start negotiating...',
                time: new Date().toISOString(),
                avatar: (contact.name || 'U').charAt(0).toUpperCase()
            };
            setContacts(prev => [newContact, ...prev]);
        }
        setActiveContactId(contactId);
        setShowDirectory(false);
    };

    // Send Message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        const text = inputText.trim();
        if (!text || !activeContactId || !user?._id || sending) return;

        setInputText('');
        setSending(true);

        const tempId = `temp-${Date.now()}`;
        const tempMsg = {
            _id: tempId,
            sender: user._id,
            receiver: activeContactId,
            message: text,
            createdAt: new Date().toISOString()
        };

        // Optimistically add to messages
        setMessages(prev => [...prev, tempMsg]);

        try {
            // 1. Send via REST endpoint for guaranteed DB persistence
            const res = await axios.post(`${API_BASE_URL}/api/chat/send`, {
                receiverId: activeContactId,
                message: text
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.data?.chat) {
                setMessages(prev => prev.map(m => m._id === tempId ? res.data.chat : m));
            }
        } catch (err) {
            console.warn("REST chat failed, falling back to socket:", err);
            // 2. Socket fallback
            const socket = getSocket();
            socket.emit('sendMessage', {
                senderId: user._id,
                receiverId: activeContactId,
                message: text
            });
        } finally {
            setSending(false);
            fetchConversations();
        }
    };

    const activeContact = contacts.find(c => String(c.id) === String(activeContactId));

    const filteredContacts = contacts.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredDirectory = directoryContacts.filter(c => {
        const matchRole = directoryRoleFilter === 'all' || c.role === directoryRoleFilter;
        const matchSearch = !directorySearch ||
            c.name?.toLowerCase().includes(directorySearch.toLowerCase()) ||
            c.hubLocation?.toLowerCase().includes(directorySearch.toLowerCase()) ||
            c.industryType?.toLowerCase().includes(directorySearch.toLowerCase());
        return matchRole && matchSearch;
    });

    const getRoleIcon = (role) => {
        switch (role) {
            case 'collector': return <Truck size={14} />;
            case 'industry': return <Building size={14} />;
            default: return <UserIcon size={14} />;
        }
    };

    return (
        <div className="chat-page animate-fade-in">
            {notification && (
                <div className="chat-notification glass-pane animate-slide-in">
                    <Bell size={18} color="var(--accent-mint)" />
                    <div className="notif-content">
                        <p>{notification.text}</p>
                    </div>
                    {notification.contactId && (
                        <button
                            className="btn btn-outline notif-view-btn"
                            onClick={() => {
                                setActiveContactId(notification.contactId);
                                setNotification(null);
                            }}
                        >
                            Open
                        </button>
                    )}
                    <button className="notif-close" onClick={() => setNotification(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="section-header chat-header-title">
                <div className="chat-header-actions-row">
                    <div>
                        <h1>Messages & Negotiations</h1>
                        <p className="subtitle">
                            Connect and trade recyclable materials securely across households, collectors, and recycling industries.
                        </p>
                    </div>
                    <button className="btn btn-primary new-chat-btn" onClick={() => openDirectory('all')}>
                        <UserPlus size={18} /> New Conversation
                    </button>
                </div>
            </div>

            <div className="chat-container glass-pane">
                {/* --- CHAT SIDEBAR --- */}
                <div className="chat-sidebar">
                    <div className="chat-sidebar-top">
                        <div className="chat-search">
                            <Search size={16} />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search conversations..."
                            />
                        </div>
                        <button
                            className="btn-icon-subtle"
                            title="Refresh conversations"
                            onClick={fetchConversations}
                        >
                            <RefreshCw size={15} />
                        </button>
                    </div>

                    <div className="chat-contact-list">
                        {filteredContacts.map(c => (
                            <div
                                key={c.id}
                                className={`chat-contact-item ${String(activeContactId) === String(c.id) ? 'active' : ''}`}
                                onClick={() => setActiveContactId(c.id)}
                            >
                                <div className="chat-avatar">
                                    {c.avatar || c.name?.charAt(0) || 'U'}
                                </div>
                                <div className="chat-contact-info">
                                    <div className="chat-contact-top">
                                        <h4 className="chat-contact-name">{c.name}</h4>
                                        <span className="chat-contact-time">
                                            {c.time ? new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <div className="chat-contact-sub">
                                        <span className={`badge badge-sm badge-${c.role || 'individual'}`}>
                                            {getRoleIcon(c.role)} {c.role || 'user'}
                                        </span>
                                        <p className="chat-contact-preview">{c.lastMsg || 'No messages yet'}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredContacts.length === 0 && (
                            <div className="chat-empty-sidebar">
                                <MessageSquare size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                                <p>No conversations found.</p>
                                <button className="btn btn-outline btn-sm" onClick={() => openDirectory('all')} style={{ marginTop: '10px' }}>
                                    <UserPlus size={14} /> Find Partners
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- MAIN CHAT WINDOW --- */}
                <div className="chat-main">
                    {!activeContactId ? (
                        <div className="chat-empty-state">
                            <div className="empty-state-icon">
                                <MessageSquare size={52} color="var(--accent-mint)" />
                            </div>
                            <h3>Select a conversation or start a new one</h3>
                            <p>Pick a partner from your active threads on the left, or browse the directory to connect.</p>
                            <button className="btn btn-primary" onClick={() => openDirectory('all')} style={{ marginTop: '12px' }}>
                                <UserPlus size={18} /> Start New Conversation
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="chat-main-header">
                                <div className="chat-header-user">
                                    <div className="chat-avatar">
                                        {activeContact?.avatar || activeContact?.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <div className="chat-role-pill-row">
                                            <span className={`role-pill-badge role-badge-${activeContact?.role || 'individual'}`}>
                                                {activeContact?.role === 'collector' && <><Truck size={13} /> VERIFIED SCRAP COLLECTOR</>}
                                                {activeContact?.role === 'industry' && <><Building size={13} /> RECYCLING INDUSTRY OFFTAKER</>}
                                                {(!activeContact?.role || activeContact?.role === 'individual') && <><UserIcon size={13} /> INDIVIDUAL / HOUSEHOLD SELLER</>}
                                            </span>
                                        </div>
                                        <h2 className="chat-active-name">{activeContact?.name || 'Partner'}</h2>
                                        <div className="cw-status-row">
                                            <span className="dot-online-text">● Active Node in Circular Economy</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="chat-header-actions">
                                    <button className="btn btn-outline btn-sm" onClick={() => openDirectory('all')}>
                                        <UserPlus size={14} /> Directory
                                    </button>
                                </div>
                            </div>

                            <div className="chat-role-indicator-banner">
                                {activeContact?.role === 'collector' ? (
                                    <div className="role-tag-highlight role-collector">
                                        <Truck size={16} />
                                        <span>ROLE: <strong>VERIFIED SCRAP COLLECTOR</strong> — Quotes scrap rates, aggregates materials & conducts home/hub pickups.</span>
                                    </div>
                                ) : activeContact?.role === 'industry' ? (
                                    <div className="role-tag-highlight role-industry">
                                        <Building size={16} />
                                        <span>ROLE: <strong>RECYCLING INDUSTRY</strong> — Procures sorted scrap materials in bulk for manufacturing & refinement.</span>
                                    </div>
                                ) : (
                                    <div className="role-tag-highlight role-individual">
                                        <UserIcon size={16} />
                                        <span>ROLE: <strong>HOUSEHOLD INDIVIDUAL</strong> — Listing household recyclable materials for local collection.</span>
                                    </div>
                                )}
                            </div>

                            <div className="chat-messages">
                                <div className="chat-notice-card">
                                    <ShieldCheck size={16} color="var(--accent-mint)" />
                                    <span>
                                        Encrypted conversation with <strong>{activeContact?.name}</strong> ({activeContact?.role}). ReValue guarantees fair scrap pricing & verified pickups.
                                    </span>
                                </div>

                                {loadingMessages && (
                                    <div className="chat-messages-loading">
                                        <RefreshCw size={20} className="spin" />
                                        <span>Loading messages...</span>
                                    </div>
                                )}

                                {!loadingMessages && messages.length === 0 && (
                                    <div className="no-messages-placeholder">
                                        <Sparkles size={28} color="var(--accent-mint)" />
                                        <p>No messages yet with <strong>{activeContact?.name}</strong>.</p>
                                        <span className="sub-hint">Send a greeting or discuss scrap categories, pickup schedules, and pricing!</span>
                                    </div>
                                )}

                                {messages.map((msg, index) => {
                                    const senderId = typeof msg.sender === 'object' && msg.sender !== null ? msg.sender._id : msg.sender;
                                    const isMe = String(senderId) === String(user?._id);

                                    return (
                                        <div
                                            key={msg._id || index}
                                            className={`chat-bubble-wrap ${isMe ? 'mine' : 'theirs'}`}
                                        >
                                            <div className={`chat-bubble ${isMe ? 'mine' : 'theirs'}`}>
                                                {!isMe && (
                                                    <span className="bubble-sender-name">{activeContact?.name?.split(' ')[0]}</span>
                                                )}
                                                <p className="bubble-text">{msg.message}</p>
                                                <div className="cb-meta">
                                                    <span>
                                                        {msg.createdAt
                                                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                            : 'Just now'}
                                                    </span>
                                                    {isMe && <CheckCircle size={12} className="check-icon" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="chat-input-bar" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    placeholder={`Message ${activeContact?.name || 'partner'}...`}
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim() || sending}
                                    className="btn btn-primary btn-icon-only"
                                    title="Send Message"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>

            {/* --- DIRECTORY MODAL FOR STARTING NEW CHATS --- */}
            {showDirectory && (
                <div className="directory-modal-backdrop" onClick={() => setShowDirectory(false)}>
                    <div className="directory-modal glass-pane animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="directory-modal-header">
                            <div>
                                <h2>Circular Network Directory</h2>
                                <p className="subtitle">Connect directly with verified collectors, recycling industries, and households.</p>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowDirectory(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Filter Tabs */}
                        <div className="directory-tabs-row">
                            <div className="directory-tabs">
                                <button
                                    className={`directory-tab ${directoryRoleFilter === 'all' ? 'active' : ''}`}
                                    onClick={() => openDirectory('all')}
                                >
                                    All Partners
                                </button>
                                <button
                                    className={`directory-tab ${directoryRoleFilter === 'collector' ? 'active' : ''}`}
                                    onClick={() => openDirectory('collector')}
                                >
                                    🚛 Collectors
                                </button>
                                <button
                                    className={`directory-tab ${directoryRoleFilter === 'industry' ? 'active' : ''}`}
                                    onClick={() => openDirectory('industry')}
                                >
                                    🏭 Industries
                                </button>
                                <button
                                    className={`directory-tab ${directoryRoleFilter === 'individual' ? 'active' : ''}`}
                                    onClick={() => openDirectory('individual')}
                                >
                                    👤 Households
                                </button>
                            </div>

                            <div className="directory-search-box">
                                <Search size={15} />
                                <input
                                    placeholder="Filter by name, location, material..."
                                    value={directorySearch}
                                    onChange={(e) => setDirectorySearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Contacts Grid */}
                        <div className="directory-list-container">
                            {directoryLoading && (
                                <div className="directory-loading-state">
                                    <RefreshCw size={24} className="spin" />
                                    <p>Loading active network members...</p>
                                </div>
                            )}

                            {!directoryLoading && filteredDirectory.map(contact => (
                                <div key={contact._id} className="directory-contact-card glass-pane">
                                    <div className="dcc-avatar">
                                        {contact.name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="dcc-info">
                                        <div className="dcc-top">
                                            <h4>{contact.name}</h4>
                                            <span className={`badge badge-sm badge-${contact.role}`}>
                                                {getRoleIcon(contact.role)} {contact.role}
                                            </span>
                                        </div>
                                        <p className="dcc-location">
                                            <MapPin size={12} /> {contact.hubLocation || contact.businessAddress || 'India'}
                                        </p>
                                        {contact.materialsAccepted && contact.materialsAccepted.length > 0 && (
                                            <div className="dcc-tags">
                                                {contact.materialsAccepted.slice(0, 3).map((mat, i) => (
                                                    <span key={i} className="mini-tag">♻️ {mat}</span>
                                                ))}
                                            </div>
                                        )}
                                        {contact.industryType && (
                                            <div className="dcc-tags">
                                                <span className="mini-tag">🏭 {contact.industryType}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="btn btn-primary btn-sm dcc-chat-btn"
                                        onClick={() => handleSelectDirectoryContact(contact)}
                                    >
                                        <MessageSquare size={14} /> Chat
                                    </button>
                                </div>
                            ))}

                            {!directoryLoading && filteredDirectory.length === 0 && (
                                <div className="directory-empty-state">
                                    <Search size={36} style={{ opacity: 0.3 }} />
                                    <p>No members found matching your search filter.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;
