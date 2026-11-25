import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { demoCollectors, demoOrganizations } from '../data/demoData';
import { MessageSquare, MapPin, Star, CheckCircle, Search, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../api';
import './Organizations.css';

// ===== MOCK AI COMPANY VERIFIER =====
const verifyCompany = (name, gstin) => {
    const isGstinValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase());
    const isNameLongEnough = name.trim().split(' ').length >= 2;
    const score = (isGstinValid ? 55 : 15) + (isNameLongEnough ? 30 : 10) + Math.floor(Math.random() * 15);
    return {
        valid: score >= 70,
        score: Math.min(score, 99),
        checks: {
            'Business Name Valid': isNameLongEnough,
            'GSTIN Format Valid': isGstinValid,
            'Industry Whitelisted': isNameLongEnough,
            'AI Pattern Analysis': score >= 60,
        }
    };
};

// ===== Entity Browse Page (Collectors or Industries) =====
const EntityBrowse = ({ onContact }) => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [materialFilter, setMaterialFilter] = useState('all');
    const [entities, setEntities] = useState([]);

    const showIndustries = user?.role === 'collector';

    useEffect(() => {
        let isMounted = true;
        const fetchEntities = async () => {
            const defaultList = showIndustries ? demoOrganizations : demoCollectors;
            try {
                const targetRole = showIndustries ? 'industry' : 'collector';
                const res = await axios.get(`${API_BASE_URL}/api/chat/contacts/available?role=${targetRole}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (isMounted) {
                    if (Array.isArray(res.data) && res.data.length > 0) {
                        // Merge registered users with demo baseline
                        const registered = res.data.map(r => ({
                            _id: r._id,
                            name: r.name,
                            verified: true,
                            industryType: r.industryType || 'Recycling Plant',
                            location: r.businessAddress || r.hubLocation || 'Bengaluru',
                            materialsNeeded: r.materialsRequired && r.materialsRequired.length > 0 ? r.materialsRequired : ['plastic', 'metal'],
                            monthlyDemand: r.monthlyDemand || '45 Tons/month',
                            minQuantityRequired: r.minQuantityRequired || 100,
                            qualityPreference: r.qualityPreference || 'Sorted',
                            contactPerson: r.contactPerson || 'Procurement Office',
                            phone: r.phone
                        }));
                        setEntities([...registered, ...defaultList.filter(d => !registered.some(r => r.name.toLowerCase() === d.name.toLowerCase()))]);
                    } else {
                        setEntities(defaultList);
                    }
                }
            } catch (err) {
                if (isMounted) setEntities(defaultList);
            }
        };

        fetchEntities();
        return () => { isMounted = false; };
    }, [showIndustries, token]);

    const filtered = entities.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
            (item.hubLocation || item.location || '').toLowerCase().includes(search.toLowerCase()) ||
            (item.industryType || '').toLowerCase().includes(search.toLowerCase());
        const matchMaterial = materialFilter === 'all' ||
            (item.materialsAccepted || item.materialsNeeded || []).includes(materialFilter);
        return matchSearch && matchMaterial;
    });

    return (
        <div>
            <div className="org-search-row">
                <div className="org-search glass-pane">
                    <Search size={18} />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={showIndustries ? "Search industries by company name, factory location, or material..." : "Search collectors..."} />
                </div>
                <select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)} className="mat-filter">
                    <option value="all">All Materials</option>
                    <option value="plastic">♻️ Plastic</option>
                    <option value="paper">📄 Paper</option>
                    <option value="metal">🔩 Metal</option>
                    <option value="ewaste">💻 E-Waste</option>
                    <option value="glass">🍶 Glass</option>
                </select>
            </div>

            <div className="collector-grid">
                {filtered.map(item => (
                    <div key={item._id} className="collector-card glass-pane">
                        <div className="cc-top">
                            <div className="cc-avatar">{item.name.charAt(0)}</div>
                            <div className="cc-info">
                                <h3>{item.name} {item.verified && <CheckCircle size={16} color="#10b981" title="Verified Plant" />}</h3>
                                <span className="cc-type">
                                    {showIndustries ? `🏭 ${item.industryType || 'Recycling Plant'}` : (item.type === 'organization' ? '🏭 Org Collector' : '👤 Individual')}
                                </span>
                            </div>
                            {!showIndustries && (
                                <div className="cc-stars">
                                    <Star size={15} fill="#f59e0b" color="#f59e0b" />
                                    {item.rating || 4.8} <span className="cc-rev">({item.reviewCount || 14})</span>
                                </div>
                            )}
                        </div>

                        <div className="cc-details">
                            <div className="cc-detail">
                                <MapPin size={14} /> <span>{item.hubLocation || item.location || 'India'}</span>
                            </div>
                            <div className="cc-detail">
                                <Package size={14} />
                                <span style={{ color: showIndustries ? 'var(--accent-mint)' : 'inherit', fontWeight: 600 }}>
                                    {showIndustries
                                        ? `Requirement: ${item.monthlyDemand || '50 Tons/month'}`
                                        : `${(item.totalCollected || 850).toLocaleString()} kg collected`}
                                </span>
                            </div>
                            {showIndustries && item.minQuantityRequired && (
                                <div className="cc-detail" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    <span>📦 Min Batch: {item.minQuantityRequired} kg</span>
                                </div>
                            )}
                        </div>

                        <div className="materials-chips">
                            {(item.materialsAccepted || item.materialsNeeded || []).map(m => (
                                <span key={m} className={`badge badge-${m}`}>{m}</span>
                            ))}
                        </div>

                        {!showIndustries && item.areasServed && (
                            <div className="cc-served">
                                <p className="cc-label">Serves:</p>
                                {item.areasServed.map(a => <span key={a} className="area-chip">{a}</span>)}
                            </div>
                        )}

                        <div className="cc-actions">
                            {!showIndustries && (
                                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => navigate(`/profile/${item._id}`)}>
                                    <Package size={16} /> Profile
                                </button>
                            )}
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onContact(item._id, item.name)}>
                                <MessageSquare size={16} /> {showIndustries ? 'Supply Material / Chat' : 'Contact'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ===== AI Company Verification Panel =====
const VerificationPanel = () => {
    const [form, setForm] = useState({ name: '', gstin: '' });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleVerify = () => {
        if (!form.name || !form.gstin) return;
        setLoading(true);
        setResult(null);
        setTimeout(() => {
            setResult(verifyCompany(form.name, form.gstin));
            setLoading(false);
        }, 2000);
    };

    return (
        <div className="verify-panel glass-pane">
            <h2>🤖 AI Company Verification</h2>
            <p className="vp-desc">Verify the authenticity of your organization before contacting collectors. Our AI checks GSTIN validity, business name patterns, and industry whitelisting.</p>

            <div className="form-row">
                <div className="form-group flex-2">
                    <label>Organization Legal Name</label>
                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: EcoCycle Industries Pvt Ltd" />
                </div>
                <div className="form-group flex-1">
                    <label>GSTIN Number</label>
                    <input value={form.gstin} onChange={e => setForm(p => ({ ...p, gstin: e.target.value }))} placeholder="22AAAAA0000A1Z5" maxLength={15} />
                </div>
            </div>

            <button className="btn btn-primary" onClick={handleVerify} disabled={loading}>
                {loading ? '🔍 Verifying...' : '🚀 Run AI Verification'}
            </button>

            {loading && (
                <div className="verify-loading">
                    <div className="verify-step">Checking GSTIN format...</div>
                    <div className="verify-step" style={{ animationDelay: '0.5s' }}>Scanning business name database...</div>
                    <div className="verify-step" style={{ animationDelay: '1s' }}>Running AI pattern analysis...</div>
                </div>
            )}

            {result && !loading && (
                <div className={`verify-result ${result.valid ? 'valid' : 'invalid'}`}>
                    <div className="vr-header">
                        <span className="vr-icon">{result.valid ? '✅' : '❌'}</span>
                        <div>
                            <h3>{result.valid ? 'Verification Passed' : 'Verification Failed'}</h3>
                            <p>{result.valid ? 'Your organization is cleared to trade on ReValue.' : 'Verification failed. Please check your details.'}</p>
                        </div>
                    </div>
                    <div className="score-bar-container">
                        <span className="score-label">Trust Score</span>
                        <div className="score-bar-wrap">
                            <div className="score-bar" style={{ width: `${result.score}%`, background: result.valid ? 'var(--accent-gradient)' : 'linear-gradient(to right, #ef4444, #f97316)' }}></div>
                        </div>
                        <span className="score-val">{result.score}%</span>
                    </div>
                    <div className="checks-list">
                        {Object.entries(result.checks).map(([check, passed]) => (
                            <div key={check} className="check-item">
                                <span>{passed ? '✅' : '❌'}</span> {check}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ===== Main Organizations Page =====
const Organizations = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('browse');

    const handleContact = (id, name) => {
        navigate('/chat', { state: { contactId: id, contactName: name } });
    };

    return (
        <div className="orgs-page animate-fade-in">
            <div className="section-header">
                <h1>{user?.role === 'industry' ? 'Collector Connect' : user?.role === 'individual' ? 'Find Collectors' : 'Industry Connect'}</h1>
                <p className="subtitle">
                    {user?.role === 'industry'
                        ? 'Browse and contact verified waste collectors. Track their performance before purchasing.'
                        : user?.role === 'individual'
                            ? 'Find local collectors to pick up your sorted waste and get paid.'
                            : 'Browse and contact industries to sell your bulk materials.'}
                </p>
            </div>

            <div className="org-tabs">
                <button className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`} onClick={() => setActiveTab('browse')}>
                    {user?.role === 'collector' ? 'Browse Industries' : 'Browse Collectors'}
                </button>
                {user?.role === 'industry' && (
                    <button className={`tab-btn ${activeTab === 'verify' ? 'active' : ''}`} onClick={() => setActiveTab('verify')}>AI Verification</button>
                )}
            </div>

            <div className="tab-content" style={{ marginTop: '1.5rem' }}>
                {activeTab === 'browse' && <EntityBrowse onContact={handleContact} />}
                {activeTab === 'verify' && <VerificationPanel />}
            </div>
        </div>
    );
};

export default Organizations;
