import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import API_BASE_URL from '../api';
import {
    Zap, Building, Package, MapPin, Scale, CheckCircle,
    TrendingUp, RefreshCw, ChevronRight, Star, MessageSquare,
    Filter, ArrowUpDown, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './IndustryMatches.css';

const ScoreBar = ({ score, color }) => (
    <div className="score-bar-wrap">
        <div className="score-bar-track">
            <div
                className="score-bar-fill"
                style={{ width: `${score}%`, background: color || 'var(--accent-gradient)' }}
            />
        </div>
        <span className="score-bar-label">{score}%</span>
    </div>
);

const BreakdownTooltip = ({ breakdown }) => (
    <div className="breakdown-tooltip">
        <div className="bd-row"><span>Material match</span><strong>{Math.round(breakdown.materialScore * 100)}%</strong></div>
        <div className="bd-row"><span>Quantity fit</span><strong>{Math.round(breakdown.quantityScore * 100)}%</strong></div>
        <div className="bd-row"><span>Location</span><strong>{Math.round(breakdown.locationScore * 100)}%</strong></div>
        <div className="bd-row"><span>Quality</span><strong>{Math.round(breakdown.qualityScore * 100)}%</strong></div>
    </div>
);

const IndustryMatches = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]);
    const [requirements, setRequirements] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reservingId, setReservingId] = useState(null);
    const [sortBy, setSortBy] = useState('score');
    const [filterCat, setFilterCat] = useState('all');
    const [tooltipId, setTooltipId] = useState(null);
    const [error, setError] = useState(null);

    const fetchMatches = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get(`${API_BASE_URL}/api/matching/for-industry`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMatches(res.data.matches || []);
            setRequirements(res.data.requirements || null);
        } catch (err) {
            console.error('Failed to fetch matches:', err);
            setError(err.response?.data?.message || 'Failed to load matches.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchMatches(); }, [fetchMatches]);

    const handleReserve = async (postId, postTitle) => {
        if (!window.confirm(`Reserve "${postTitle}"? This will lock the listing for your industry.`)) return;
        setReservingId(postId);
        try {
            await axios.post(`${API_BASE_URL}/api/matching/reserve/${postId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMatches(prev => prev.filter(m => m.post._id !== postId));
            alert('Reserved successfully! The seller has been notified.');
        } catch (err) {
            alert(err.response?.data?.message || 'Reservation failed.');
        } finally {
            setReservingId(null);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#10b981';
        if (score >= 60) return '#f59e0b';
        return '#ef4444';
    };

    const getScoreLabel = (score) => {
        if (score >= 80) return { text: 'Excellent Match', cls: 'excellent' };
        if (score >= 60) return { text: 'Good Match', cls: 'good' };
        return { text: 'Partial Match', cls: 'partial' };
    };

    const categories = ['all', ...new Set(matches.map(m => m.post?.category).filter(Boolean))];

    const displayed = matches
        .filter(m => filterCat === 'all' || m.post?.category === filterCat)
        .sort((a, b) => {
            if (sortBy === 'score') return b.matchScore - a.matchScore;
            if (sortBy === 'distance') return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
            if (sortBy === 'weight') return (b.post?.weight || 0) - (a.post?.weight || 0);
            return 0;
        });

    if (user?.role !== 'industry') {
        return (
            <div className="im-page animate-fade-in">
                <div className="notif-empty glass-pane">
                    <Building size={48} color="var(--text-muted)" />
                    <h3>Industry Access Only</h3>
                    <p>This page is exclusive to verified industry accounts.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="im-page animate-fade-in">
            <div className="section-header">
                <div>
                    <h1><Zap size={26} className="inline-icon" /> AI Material Matches</h1>
                    <p className="subtitle">Smart listings matched to your material requirements, ranked by compatibility score.</p>
                </div>
                <button className="btn btn-outline" onClick={fetchMatches} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
                </button>
            </div>

            {/* Requirements Summary */}
            {requirements && (
                <div className="req-summary glass-pane">
                    <h3><Filter size={16} /> Your Procurement Requirements</h3>
                    <div className="req-chips">
                        {(requirements.materialsRequired || []).map(m => (
                            <span key={m} className={`badge badge-${m}`}>{m}</span>
                        ))}
                        {requirements.monthlyDemand && (
                            <span className="req-chip"><TrendingUp size={13} /> {requirements.monthlyDemand}</span>
                        )}
                        {requirements.minQuantityRequired && (
                            <span className="req-chip"><Scale size={13} /> Min {requirements.minQuantityRequired} kg</span>
                        )}
                        {requirements.qualityPreference && requirements.qualityPreference !== 'any' && (
                            <span className="req-chip"><Star size={13} /> {requirements.qualityPreference} quality</span>
                        )}
                    </div>
                    <button className="btn-link" onClick={() => navigate('/profile')}>
                        Update Requirements →
                    </button>
                </div>
            )}

            {/* Controls */}
            <div className="im-controls">
                <div className="im-filters">
                    {categories.map(c => (
                        <button
                            key={c}
                            className={`filter-tab ${filterCat === c ? 'active' : ''}`}
                            onClick={() => setFilterCat(c)}
                        >
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="sort-select-wrap">
                    <ArrowUpDown size={15} />
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
                        <option value="score">Best Match</option>
                        <option value="distance">Nearest First</option>
                        <option value="weight">Most Quantity</option>
                    </select>
                </div>
            </div>

            {/* Results */}
            {loading ? (
                <div className="im-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="im-card glass-pane im-skeleton" />
                    ))}
                </div>
            ) : error ? (
                <div className="notif-empty glass-pane">
                    <Building size={48} color="#ef4444" />
                    <h3>Error Loading Matches</h3>
                    <p>{error}</p>
                    <button className="btn btn-outline" onClick={fetchMatches}>Try Again</button>
                </div>
            ) : displayed.length === 0 ? (
                <div className="notif-empty glass-pane">
                    <Package size={48} color="var(--text-muted)" />
                    <h3>No Matches Found</h3>
                    <p>No available listings match your current material requirements. Try updating your requirements in your profile.</p>
                    <button className="btn btn-outline" onClick={() => navigate('/profile')}>Update Requirements</button>
                </div>
            ) : (
                <>
                    <p className="im-count">{displayed.length} match{displayed.length !== 1 ? 'es' : ''} found</p>
                    <div className="im-grid">
                        {displayed.map(match => {
                            const post = match.post;
                            const scoreLabel = getScoreLabel(match.matchScore);
                            const color = getScoreColor(match.matchScore);
                            const isReserving = reservingId === post._id;

                            return (
                                <div key={post._id} className="im-card glass-pane">
                                    {/* Score Badge */}
                                    <div className="im-score-badge" style={{ background: color }}>
                                        {match.matchScore}%
                                    </div>

                                    {/* Image / Category Icon */}
                                    <div className="im-img-wrap">
                                        {post.image ? (
                                            <img src={post.image} alt={post.title} className="im-img" />
                                        ) : (
                                            <div className="im-img-placeholder">
                                                <Package size={36} color="var(--text-muted)" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="im-content">
                                        <div className="im-top">
                                            <span className={`badge badge-${post.category}`}>{post.category}</span>
                                            <span className={`match-quality-label ${scoreLabel.cls}`}>{scoreLabel.text}</span>
                                        </div>

                                        <h3 className="im-title">{post.title}</h3>

                                        <div className="im-details">
                                            <span className="im-detail">
                                                <Scale size={13} /> {post.weight} {post.unit}
                                            </span>
                                            <span className="im-detail">
                                                <CheckCircle size={13} /> {post.condition || 'Standard'}
                                            </span>
                                            {match.distanceKm !== null && match.distanceKm !== undefined && (
                                                <span className="im-detail">
                                                    <MapPin size={13} /> {match.distanceKm} km
                                                </span>
                                            )}
                                        </div>

                                        {post.priceMin !== undefined && (
                                            <p className="im-price">
                                                ₹{post.priceMin}{post.priceMax ? ` – ₹${post.priceMax}` : ''}
                                                <span className="im-price-unit"> / {post.unit}</span>
                                            </p>
                                        )}

                                        {/* Compatibility Score Bar */}
                                        <div className="im-score-row">
                                            <span className="im-score-label">Compatibility</span>
                                            <ScoreBar score={match.matchScore} color={color} />
                                            <button
                                                className="breakdown-btn"
                                                onClick={() => setTooltipId(tooltipId === post._id ? null : post._id)}
                                            >
                                                <Info size={14} />
                                            </button>
                                        </div>

                                        {tooltipId === post._id && match.breakdown && (
                                            <BreakdownTooltip breakdown={match.breakdown} />
                                        )}

                                        {/* Explanations */}
                                        {match.explanations && match.explanations.length > 0 && (
                                            <ul className="im-explanations">
                                                {match.explanations.slice(0, 2).map((exp, i) => (
                                                    <li key={i}><CheckCircle size={12} color="#10b981" /> {exp}</li>
                                                ))}
                                            </ul>
                                        )}

                                        {/* Seller Info */}
                                        {post.createdBy && (
                                            <div className="im-seller">
                                                <div className="seller-avatar">{post.createdBy.name?.charAt(0)}</div>
                                                <div>
                                                    <p className="seller-name">{post.createdBy.name}</p>
                                                    <p className="seller-role">{post.createdBy.role}</p>
                                                </div>
                                                {post.createdBy.rating > 0 && (
                                                    <span className="seller-rating">
                                                        <Star size={12} fill="#f59e0b" color="#f59e0b" /> {post.createdBy.rating}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="im-actions">
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => navigate('/chat', { state: { contactId: post.createdBy?._id, contactName: post.createdBy?.name } })}
                                            >
                                                <MessageSquare size={14} /> Contact
                                            </button>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleReserve(post._id, post.title)}
                                                disabled={isReserving}
                                            >
                                                {isReserving ? <RefreshCw size={14} className="spin" /> : <ChevronRight size={14} />}
                                                Reserve
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default IndustryMatches;
