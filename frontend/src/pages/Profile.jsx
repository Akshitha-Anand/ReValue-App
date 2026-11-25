import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Star, Package, Award, MapPin, Phone, Mail, Edit3, CheckCircle, MessageSquare, TrendingUp, BarChart2 } from 'lucide-react';
import { demoPosts, demoTransactions, demoFeedback, demoCollectors } from '../data/demoData';
import axios from 'axios';
import API_BASE_URL from '../api';
import './Profile.css';

const StarRow = ({ rating, size = 16 }) => (
    <div className="stars-row">
        {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} size={size} fill={s <= Math.round(rating) ? '#f59e0b' : 'none'} color="#f59e0b" />
        ))}
        <span className="rating-val">{rating}</span>
    </div>
);

const Profile = () => {
    const { id } = useParams();
    const { user: currentUser, token } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [viewedUser, setViewedUser] = useState(null);

    useEffect(() => {
        let isMounted = true;
        if (!id) {
            setViewedUser(currentUser);
            // Fetch live profile with latest collection metrics
            if (token) {
                axios.get(`${API_BASE_URL}/api/auth/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                .then(res => {
                    if (isMounted && res.data) {
                        setViewedUser(res.data);
                    }
                })
                .catch(err => console.warn("Live profile fetch fallback:", err.message));
            }
        } else {
            // Find user in demo data (simulating backend fetch)
            const foundCollector = demoCollectors.find(c => c._id === id);
            if (foundCollector) {
                // Map collector demo data to user format
                setViewedUser({
                    ...foundCollector,
                    role: 'collector',
                    email: `${foundCollector.name.replace(/\s/g, '').toLowerCase()}@demo.com`
                });
            } else {
                // Check if it's one of the individual users from demoPosts
                const foundPost = demoPosts.find(p => p.createdBy._id === id);
                if (foundPost) {
                    setViewedUser(foundPost.createdBy);
                }
            }
        }
        return () => { isMounted = false; };
    }, [id, currentUser, token]);

    if (!viewedUser) return <div className="loading">Loading Profile...</div>;

    const isOwnProfile = !id || id === currentUser?._id;
    const canSeePrivateStats = isOwnProfile || currentUser?.role === 'industry';

    const userPosts = demoPosts.filter(p => p.createdBy._id === viewedUser._id).slice(0, 3);
    const userFeedback = demoFeedback.filter(f => f.target === viewedUser._id);

    const profileStats = {
        rating: viewedUser.rating || 4.8,
        reviews: viewedUser.reviewCount || 32,
        transactions: viewedUser.totalPickups || (viewedUser.role === 'collector' ? 18 : 6),
        totalWeight: viewedUser.totalCollected ? `${viewedUser.totalCollected.toLocaleString()} kg` : (viewedUser.role === 'collector' ? '850 kg' : '140 kg'),
        earnings: viewedUser.totalSpent ? `₹${viewedUser.totalSpent.toLocaleString()}` : (viewedUser.role === 'collector' ? '₹4,200' : '₹1,680')
    };

    const achievements = [
        { title: 'Eco Starter', desc: 'Completed first waste listing', icon: '🌱', earned: true },
        { title: '100kg Club', desc: 'Listed over 100kg of recyclables', icon: '♻️', earned: true },
        { title: 'Top Seller', desc: 'Completed 10+ successful trades', icon: '⭐', earned: false },
        { title: 'Zero Litter Hero', desc: 'Listed every category of waste', icon: '🏆', earned: false },
    ];

    const handleChat = () => {
        navigate('/chat', { state: { contactId: viewedUser._id, contactName: viewedUser.name } });
    };

    return (
        <div className="profile-page animate-fade-in">

            {/* Profile Header */}
            <div className="profile-header glass-pane">
                <div className="profile-avatar-wrap">
                    <div className="profile-avatar-xl">{viewedUser?.name?.charAt(0) || 'U'}</div>
                    <div className="profile-rating-badge"><Star size={13} fill="#f59e0b" color="#f59e0b" /> {profileStats.rating}</div>
                </div>

                <div className="profile-main">
                    <div className="profile-name-row">
                        <h2>{viewedUser?.name || 'ReValue User'}</h2>
                        {viewedUser?.role === 'industry' && <CheckCircle size={22} color="#10b981" title="Verified Organization" />}
                        {viewedUser?.verified && viewedUser?.role === 'collector' && <CheckCircle size={22} color="#10b981" title="Verified Collector" />}
                    </div>
                    <div className="profile-role-row">
                        <span className={`badge badge-${viewedUser?.role || 'individual'}`}>{viewedUser?.role || 'Individual'}</span>
                        <span className="profile-location"><MapPin size={14} /> {viewedUser.hubLocation || 'Bengaluru, Karnataka'}</span>
                    </div>
                    <p className="profile-bio">Passionate about sustainability and the circular economy. Helping turn waste into resources since 2023.</p>
                    <div className="profile-quick-stats">
                        <div className="pqs-item"><span className="pqs-val">{profileStats.transactions}</span><span className="pqs-lbl">Transactions</span></div>
                        <div className="pqs-item"><span className="pqs-val">{profileStats.totalWeight}</span><span className="pqs-lbl">{viewedUser?.role === 'collector' ? 'Collected' : 'Listed'}</span></div>
                        <div className="pqs-item"><span className="pqs-val">{profileStats.earnings}</span><span className="pqs-lbl">{viewedUser?.role === 'collector' ? 'Purchased' : 'Earned'}</span></div>
                        <div className="pqs-item"><span className="pqs-val">{profileStats.reviews}</span><span className="pqs-lbl">Reviews</span></div>
                    </div>
                </div>

                <div className="profile-actions">
                    {isOwnProfile ? (
                        <button className="btn btn-outline edit-profile-btn"><Edit3 size={16} /> Edit Profile</button>
                    ) : (
                        <button className="btn btn-primary" onClick={handleChat}>
                            <MessageSquare size={16} /> Message {viewedUser.name.split(' ')[0]}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="profile-tabs">
                {[
                    { id: 'overview', label: 'Overview' },
                    ...(viewedUser.role === 'collector' && canSeePrivateStats ? [{ id: 'performance', label: 'Performance' }] : []),
                    ...(viewedUser.role !== 'collector' ? [{ id: 'posts', label: 'Listings' }] : []),
                    { id: 'transactions', label: 'History' },
                    { id: 'feedback', label: 'Reviews' }
                ].map(tab => (
                    <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="profile-tab-content">

                {activeTab === 'overview' && (
                    <div className="overview-grid">
                        <div className="detail-card glass-pane">
                            <h3>Personal Details</h3>
                            <div className="detail-row"><Mail size={16} /><span className="dl">Email</span><span className="dv">{viewedUser?.email || 'user@revalue.com'}</span></div>
                            <div className="detail-row"><Phone size={16} /><span className="dl">Phone</span><span className="dv">{viewedUser.contact || '+91 98765 43210'}</span></div>
                            <div className="detail-row"><MapPin size={16} /><span className="dl">Address</span><span className="dv">{viewedUser.hubLocation || 'Koramangala, Bengaluru 560034'}</span></div>
                            {viewedUser?.role === 'collector' && (
                                <div className="detail-row"><Package size={16} /><span className="dl">Areas Served</span><span className="dv">{viewedUser.areasServed?.join(', ')}</span></div>
                            )}
                            {viewedUser?.role === 'industry' && (
                                <div className="detail-row"><CheckCircle size={16} color="#10b981" /><span className="dl">GSTIN</span><span className="dv">{viewedUser.gstin || '22ABCDE1234F1Z5 ✅'}</span></div>
                            )}
                        </div>

                        <div className="detail-card glass-pane">
                            <h3>🏅 Achievements</h3>
                            <div className="achievements-grid">
                                {achievements.map((ach, i) => (
                                    <div key={i} className={`ach-item ${ach.earned ? 'earned' : 'locked'}`}>
                                        <span className="ach-icon">{ach.earned ? ach.icon : '🔒'}</span>
                                        <div><p className="ach-title">{ach.title}</p><p className="ach-desc">{ach.desc}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'performance' && viewedUser.role === 'collector' && canSeePrivateStats && (
                    <div className="performance-tab animate-fade-in">
                        <div className="perf-grid">
                            <div className="stat-card glass-pane">
                                <TrendingUp size={24} color="#10b981" />
                                <h3>Materials Collected</h3>
                                <div className="materials-list">
                                    {(viewedUser.materialsAccepted || ['plastic', 'paper', 'metal']).map(m => (
                                        <div key={m} className="m-stat">
                                            <span className={`badge badge-${m}`}>{m}</span>
                                            <span className="m-val">280 kg</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="stat-card glass-pane">
                                <BarChart2 size={24} color="#3b82f6" />
                                <h3>Market Rates & Purchases</h3>
                                <p className="perf-note">Average rate at which materials were purchased from individuals.</p>
                                <div className="rates-list">
                                    <div className="rate-item"><span>Plastic (PET)</span> <b>₹12/kg</b></div>
                                    <div className="rate-item"><span>Paper waste</span> <b>₹8/kg</b></div>
                                    <div className="rate-item"><span>Iron scrap</span> <b>₹24/kg</b></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'posts' && (
                    <div className="posts-tab">
                        <h2>{currentUser?.role === 'collector' ? 'Collected Items' : 'My Listings'}</h2>
                        {userPosts.length === 0 ? (
                            <div className="empty-state"><p>{currentUser?.role === 'collector' ? "You haven't collected any items yet." : "You haven't posted any items yet."}</p></div>
                        ) : userPosts.map(p => (
                            <div key={p._id} className="post-list-item glass-pane">
                                <div className="pli-img" style={{ backgroundImage: `url(${p.image})` }}></div>
                                <div className="pli-info">
                                    <h3>{p.title}</h3>
                                    <p className="pli-meta"><span className={`badge badge-${p.category}`}>{p.category}</span> • {p.weight} kg • {p.location}</p>
                                    <p className="pli-price">{p.price}</p>
                                </div>
                                <span className={`status-pill ${p.status}`}>{p.status}</span>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'transactions' && (
                    <div className="txn-tab glass-pane">
                        <h2>{viewedUser?.role === 'collector' ? 'Waste Purchased & Fulfilled Pickups' : 'Transaction History'}</h2>
                        <div className="table-wrapper">
                            <table className="hub-table">
                                <thead><tr><th>Date</th><th>Item</th><th>Party</th><th>Weight</th><th>Amount</th><th>Status</th></tr></thead>
                                <tbody>
                                    {viewedUser?.collectionHistory && viewedUser.collectionHistory.map((t, idx) => (
                                        <tr key={t.postId || idx}>
                                            <td>{new Date(t.date).toLocaleDateString()}</td>
                                            <td><strong>{t.title}</strong> ({t.category})</td>
                                            <td>{t.sellerName || 'Household Seller'}</td>
                                            <td>{t.weight} {t.unit || 'kg'}</td>
                                            <td className="positive">₹{t.pricePaid || 0}</td>
                                            <td><span className="status-chip bought" style={{ background: 'rgba(16,185,129,0.18)', color: '#10b981' }}>✓ Bought</span></td>
                                        </tr>
                                    ))}
                                    {demoTransactions.map(t => (
                                        <tr key={t._id}>
                                            <td>{t.date}</td><td>{t.postTitle}</td>
                                            <td>{viewedUser?.role === 'individual' ? t.buyer : t.seller}</td>
                                            <td>{t.weight}</td>
                                            <td className="positive">{t.amount}</td>
                                            <td><span className={`status-chip ${t.status}`}>{t.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'feedback' && (
                    <div className="feedback-tab">
                        <h2>Reviews About You</h2>
                        {userFeedback.length === 0 ? (
                            <div className="empty-state"><p>No reviews yet. Complete a transaction to get your first rating!</p></div>
                        ) : userFeedback.map(f => (
                            <div key={f._id} className="fb-card glass-pane">
                                <div className="fb-card-header">
                                    <div className="mini-avatar">{f.reviewer.charAt(0)}</div>
                                    <div><p className="fb-name">{f.reviewer}</p><p className="fb-date">{f.date}</p></div>
                                    <div className="ml-auto"><StarRow rating={f.rating} /></div>
                                </div>
                                <p className="fb-comment">"{f.comment}"</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
