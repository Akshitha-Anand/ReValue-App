import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    MessageSquare, MapPin, Scale, Filter, Search, Star, Eye, X,
    Calendar, Package, Loader, CheckCircle, Tag, Truck, Building,
    Sparkles, ShieldCheck, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../api';
import { demoPosts, demoCollectors } from '../data/demoData';
import './Marketplace.css';

const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=400';
    if (img.startsWith('http')) return img;
    return `${API_BASE_URL}${img}`;
};

const getSellerInfo = (post) => {
    if (post?.createdBy && typeof post.createdBy === 'object') {
        return {
            id: post.createdBy._id || 'unknown',
            name: post.createdBy.name || 'Verified Household',
            rating: Number(post.createdBy.rating) || 4.8
        };
    }
    return {
        id: post?.createdBy || 'unknown',
        name: 'Verified Household',
        rating: 4.8
    };
};

const StarRating = ({ rating }) => {
    const num = Number(rating) || 5;
    return (
        <div className="mini-stars">
            {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={12} fill={s <= Math.round(num) ? '#f59e0b' : 'none'} color="#f59e0b" />
            ))}
            <span>{num.toFixed(1)}</span>
        </div>
    );
};

const Marketplace = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();

    const isIndustry = user?.role === 'industry';
    const isCollector = user?.role === 'collector';

    // State for individual waste posts
    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [filter, setFilter] = useState({ category: 'all', location: '', search: '', sort: 'newest', minWeight: '', maxWeight: '' });
    const [selectedPost, setSelectedPost] = useState(null);
    const [loading, setLoading] = useState(true);

    // State for industry collector stock view
    const [collectorStocks, setCollectorStocks] = useState([]);
    const [stockFilter, setStockFilter] = useState({ material: 'all', search: '' });

    // Modals state for collectors
    const [quoteModalPost, setQuoteModalPost] = useState(null);
    const [quoteForm, setQuoteForm] = useState({ priceMin: '', priceMax: '', note: '' });
    const [quoting, setQuoting] = useState(false);

    const [buyModalPost, setBuyModalPost] = useState(null);
    const [buyForm, setBuyForm] = useState({ pricePaid: '' });
    const [buying, setBuying] = useState(false);

    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4500);
    };

    // 1. Fetch individual posts (for Individuals & Collectors)
    useEffect(() => {
        if (isIndustry) return;

        let isMounted = true;
        const fetchPosts = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/posts`);
                if (isMounted) {
                    const list = Array.isArray(res.data) && res.data.length > 0 ? res.data : demoPosts;
                    setPosts(list);
                    setFilteredPosts(list);
                }
            } catch (err) {
                console.warn("Could not fetch backend posts, using demo catalog:", err.message);
                if (isMounted) {
                    setPosts(demoPosts);
                    setFilteredPosts(demoPosts);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchPosts();
        return () => { isMounted = false; };
    }, [isIndustry]);

    // 2. Fetch collector stock inventory (for Industry view)
    useEffect(() => {
        if (!isIndustry) return;

        let isMounted = true;
        const fetchCollectorStocks = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_BASE_URL}/api/posts/collector-stock`);
                if (isMounted) {
                    const list = Array.isArray(res.data) && res.data.length > 0 ? res.data : demoCollectors.map(dc => ({
                        _id: dc._id,
                        name: dc.name,
                        hubLocation: dc.hubLocation || dc.location,
                        rating: dc.rating,
                        verified: true,
                        totalCollected: dc.totalCollected || 850,
                        materialsAccepted: dc.materialsAccepted || ['plastic', 'paper', 'metal'],
                        inventory: {
                            plastic: Math.round((dc.totalCollected || 850) * 0.45),
                            paper: Math.round((dc.totalCollected || 850) * 0.30),
                            metal: Math.round((dc.totalCollected || 850) * 0.15),
                            ewaste: Math.round((dc.totalCollected || 850) * 0.10)
                        }
                    }));
                    setCollectorStocks(list);
                }
            } catch (err) {
                console.warn("Collector stock fetch error, using fallback:", err.message);
                if (isMounted) {
                    setCollectorStocks(demoCollectors.map(dc => ({
                        _id: dc._id,
                        name: dc.name,
                        hubLocation: dc.hubLocation || dc.location,
                        rating: dc.rating,
                        verified: true,
                        totalCollected: dc.totalCollected || 850,
                        materialsAccepted: dc.materialsAccepted || ['plastic', 'paper', 'metal'],
                        inventory: {
                            plastic: 380,
                            paper: 240,
                            metal: 130,
                            ewaste: 65
                        }
                    })));
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchCollectorStocks();
        return () => { isMounted = false; };
    }, [isIndustry]);

    // Filter individual posts
    useEffect(() => {
        if (isIndustry) return;

        let result = Array.isArray(posts) ? [...posts] : [];

        if (filter.category !== 'all') {
            result = result.filter(p => (p.category || '').toLowerCase() === filter.category.toLowerCase());
        }

        if (filter.location && filter.location.trim()) {
            const locQ = filter.location.toLowerCase().trim();
            result = result.filter(p => (p.location || '').toLowerCase().includes(locQ));
        }

        if (filter.search && filter.search.trim()) {
            const searchQ = filter.search.toLowerCase().trim();
            result = result.filter(p =>
                (p.title || '').toLowerCase().includes(searchQ) ||
                (p.description || '').toLowerCase().includes(searchQ) ||
                (p.category || '').toLowerCase().includes(searchQ)
            );
        }

        if (filter.minWeight) {
            result = result.filter(p => (Number(p.weight) || 0) >= Number(filter.minWeight));
        }

        if (filter.maxWeight) {
            result = result.filter(p => (Number(p.weight) || 0) <= Number(filter.maxWeight));
        }

        if (filter.sort === 'price-asc') {
            result.sort((a, b) => (Number(a.quotedPriceMin || a.priceMin) || 0) - (Number(b.quotedPriceMin || b.priceMin) || 0));
        } else if (filter.sort === 'price-desc') {
            result.sort((a, b) => (Number(b.quotedPriceMin || b.priceMin) || 0) - (Number(a.quotedPriceMin || a.priceMin) || 0));
        } else if (filter.sort === 'weight') {
            result.sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0));
        }

        setFilteredPosts(result);
    }, [filter, posts, isIndustry]);

    const handleChat = (contactId, contactName) => {
        setSelectedPost(null);
        navigate('/chat', { state: { contactId, contactName } });
    };

    // Collector: Submit Quote on a post
    const handleQuoteSubmit = async (e) => {
        e.preventDefault();
        if (!quoteModalPost || !quoteForm.priceMin) return;

        setQuoting(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/posts/${quoteModalPost._id}/quote`, {
                priceMin: quoteForm.priceMin,
                priceMax: quoteForm.priceMax || quoteForm.priceMin,
                note: quoteForm.note
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update post in local state
            const updated = res.data?.post || {
                ...quoteModalPost,
                quotedPriceMin: Number(quoteForm.priceMin),
                quotedPriceMax: Number(quoteForm.priceMax || quoteForm.priceMin),
                status: 'quoted'
            };

            setPosts(prev => prev.map(p => p._id === quoteModalPost._id ? updated : p));
            setFilteredPosts(prev => prev.map(p => p._id === quoteModalPost._id ? updated : p));
            if (selectedPost && selectedPost._id === quoteModalPost._id) {
                setSelectedPost(updated);
            }

            showToast(`✅ Price quote of ₹${quoteForm.priceMin} - ₹${quoteForm.priceMax || quoteForm.priceMin} sent to seller!`);
            setQuoteModalPost(null);
            setQuoteForm({ priceMin: '', priceMax: '', note: '' });
        } catch (err) {
            console.error("Error submitting quote:", err);
            showToast(`❌ Failed to send quote: ${err.response?.data?.message || err.message}`);
        } finally {
            setQuoting(false);
        }
    };

    // Collector: Mark post as Bought
    const handleBuySubmit = async (e) => {
        e.preventDefault();
        if (!buyModalPost) return;

        setBuying(true);
        try {
            const res = await axios.put(`${API_BASE_URL}/api/posts/${buyModalPost._id}/buy`, {
                pricePaid: buyForm.pricePaid
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const updated = res.data?.post || {
                ...buyModalPost,
                status: 'bought',
                collectorId: user?._id
            };

            setPosts(prev => prev.map(p => p._id === buyModalPost._id ? updated : p));
            setFilteredPosts(prev => prev.map(p => p._id === buyModalPost._id ? updated : p));
            if (selectedPost && selectedPost._id === buyModalPost._id) {
                setSelectedPost(updated);
            }

            showToast(`🎉 Marked as Bought! Added ${buyModalPost.weight} ${buyModalPost.unit || 'kg'} to your collection history.`);
            setBuyModalPost(null);
            setBuyForm({ pricePaid: '' });
        } catch (err) {
            console.error("Error marking as bought:", err);
            showToast(`❌ Could not mark as bought: ${err.response?.data?.message || err.message}`);
        } finally {
            setBuying(false);
        }
    };

    // Filter collector stocks for Industry view
    const filteredCollectorStocks = collectorStocks.filter(c => {
        const matchSearch = !stockFilter.search ||
            c.name.toLowerCase().includes(stockFilter.search.toLowerCase()) ||
            (c.hubLocation || '').toLowerCase().includes(stockFilter.search.toLowerCase());
        const matchMaterial = stockFilter.material === 'all' ||
            (c.materialsAccepted || []).includes(stockFilter.material);
        return matchSearch && matchMaterial;
    });

    return (
        <div className="marketplace-page animate-fade-in">
            {toastMessage && (
                <div className="chat-notification glass-pane animate-slide-in" style={{ top: '80px', right: '20px' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{toastMessage}</p>
                </div>
            )}

            <div className="section-header">
                <h1>{isIndustry ? 'Collector Materials & Stock Hubs' : 'Waste Marketplace'}</h1>
                <p className="subtitle">
                    {isIndustry
                        ? 'Procure sorted recyclable material stocks and aggregated bulk inventory directly from verified collection hubs.'
                        : isCollector
                            ? 'Browse waste posted by households. Quote competitive scrap rates, negotiate in chat, and mark fulfilled pickups as Bought.'
                            : 'Browse recyclable materials posted by fellow households. Local verified collectors will evaluate and quote fair prices.'}
                </p>
            </div>

            {/* ======================================================== */}
            {/* VIEW A: INDUSTRY VIEW - COLLECTOR MATERIAL STOCKS        */}
            {/* ======================================================== */}
            {isIndustry ? (
                <div>
                    {/* Industry Top Search & Material Filters */}
                    <div className="top-search glass-pane" style={{ marginBottom: '1.5rem' }}>
                        <Search size={20} className="ts-icon" />
                        <input
                            placeholder="Search collectors by name, city, or hub location..."
                            value={stockFilter.search}
                            onChange={(e) => setStockFilter(p => ({ ...p, search: e.target.value }))}
                        />
                        <select
                            value={stockFilter.material}
                            onChange={(e) => setStockFilter(p => ({ ...p, material: e.target.value }))}
                            style={{
                                background: 'rgba(7, 21, 16, 0.8)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)',
                                padding: '0.4rem 0.85rem',
                                borderRadius: '8px'
                            }}
                        >
                            <option value="all">All Material Streams</option>
                            <option value="plastic">♻️ Plastic Hubs</option>
                            <option value="paper">📄 Paper Hubs</option>
                            <option value="metal">🔩 Metal Hubs</option>
                            <option value="ewaste">💻 E-Waste Hubs</option>
                            <option value="glass">🍶 Glass Hubs</option>
                        </select>
                    </div>

                    {loading ? (
                        <div className="marketplace-loading-state" style={{ padding: '3rem', textAlign: 'center' }}>
                            <Loader size={36} className="spin" color="var(--accent-mint)" />
                            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading verified collector material stocks...</p>
                        </div>
                    ) : (
                        <div className="collector-stock-grid">
                            {filteredCollectorStocks.map(collector => (
                                <div key={collector._id} className="collector-stock-card glass-pane">
                                    <div className="csc-header">
                                        <div className="csc-avatar">{collector.name.charAt(0).toUpperCase()}</div>
                                        <div className="csc-title-area">
                                            <h3>
                                                {collector.name}
                                                <CheckCircle size={16} color="#10b981" title="Verified Collection Hub" />
                                            </h3>
                                            <span className="csc-location">
                                                <MapPin size={13} /> {collector.hubLocation}
                                            </span>
                                            <div style={{ marginTop: '3px' }}>
                                                <StarRating rating={collector.rating || 4.8} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stock breakdown section */}
                                    <div className="csc-stock-section">
                                        <div className="csc-stock-title">Available Material Inventory</div>
                                        <div className="stock-pills-wrap">
                                            {collector.inventory?.plastic > 0 && (
                                                <span className="stock-pill">♻️ Plastic: {collector.inventory.plastic} kg</span>
                                            )}
                                            {collector.inventory?.paper > 0 && (
                                                <span className="stock-pill">📄 Paper: {collector.inventory.paper} kg</span>
                                            )}
                                            {collector.inventory?.metal > 0 && (
                                                <span className="stock-pill">🔩 Metal: {collector.inventory.metal} kg</span>
                                            )}
                                            {collector.inventory?.ewaste > 0 && (
                                                <span className="stock-pill">💻 E-Waste: {collector.inventory.ewaste} kg</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="csc-metrics-row">
                                        <div className="csc-metric">
                                            <span className="csc-metric-lbl">Total Processed</span>
                                            <span className="csc-metric-val">{collector.totalCollected.toLocaleString()} kg</span>
                                        </div>
                                        <div className="csc-metric">
                                            <span className="csc-metric-lbl">Pickups Completed</span>
                                            <span className="csc-metric-val">{collector.totalPickups || 18}+</span>
                                        </div>
                                        <div className="csc-metric">
                                            <span className="csc-metric-lbl">Offtake Readiness</span>
                                            <span className="csc-metric-val" style={{ color: '#10b981' }}>Immediate</span>
                                        </div>
                                    </div>

                                    <div className="csc-actions">
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => navigate(`/profile/${collector._id}`)}
                                        >
                                            <Package size={15} /> Hub Profile
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => handleChat(collector._id, collector.name)}
                                        >
                                            <MessageSquare size={15} /> Procure Stock
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {filteredCollectorStocks.length === 0 && (
                                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                                    <Search size={48} color="var(--text-secondary)" style={{ opacity: 0.4 }} />
                                    <h3>No collector stocks found</h3>
                                    <p>Try adjusting your search criteria or material stream filter.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* ======================================================== */
                /* VIEW B: INDIVIDUAL & COLLECTOR VIEW - WASTE POSTINGS      */
                /* ======================================================== */
                <>
                    {/* Top Search Bar */}
                    <div className="top-search glass-pane">
                        <Search size={20} className="ts-icon" />
                        <input
                            name="search"
                            value={filter.search}
                            onChange={(e) => setFilter(p => ({ ...p, search: e.target.value }))}
                            placeholder="Search waste listings by material, description, or keyword..."
                        />
                    </div>

                    <div className="marketplace-container">
                        {/* Filter Sidebar */}
                        <aside className="filter-sidebar glass-pane">
                            <div className="filter-header">
                                <Filter size={18} />
                                <h3>Filters</h3>
                            </div>

                            <div className="form-group">
                                <label>Material Type</label>
                                <select
                                    name="category"
                                    value={filter.category}
                                    onChange={(e) => setFilter(p => ({ ...p, category: e.target.value }))}
                                >
                                    <option value="all">All Categories</option>
                                    <option value="plastic">♻️ Plastic</option>
                                    <option value="paper">📄 Paper</option>
                                    <option value="metal">🔩 Metal</option>
                                    <option value="ewaste">💻 E-Waste</option>
                                    <option value="glass">🍶 Glass</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Location</label>
                                <div className="input-with-icon">
                                    <MapPin size={15} className="input-icon" />
                                    <input
                                        type="text"
                                        name="location"
                                        placeholder="City or area..."
                                        value={filter.location}
                                        onChange={(e) => setFilter(p => ({ ...p, location: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Weight Range (kg)</label>
                                <div className="range-inputs">
                                    <input
                                        type="number"
                                        name="minWeight"
                                        placeholder="Min"
                                        value={filter.minWeight}
                                        onChange={(e) => setFilter(p => ({ ...p, minWeight: e.target.value }))}
                                    />
                                    <span>—</span>
                                    <input
                                        type="number"
                                        name="maxWeight"
                                        placeholder="Max"
                                        value={filter.maxWeight}
                                        onChange={(e) => setFilter(p => ({ ...p, maxWeight: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Sort By</label>
                                <select
                                    name="sort"
                                    value={filter.sort}
                                    onChange={(e) => setFilter(p => ({ ...p, sort: e.target.value }))}
                                >
                                    <option value="newest">🕓 Newest First</option>
                                    <option value="weight">⚖️ Weight: Heaviest First</option>
                                    <option value="price-asc">💰 Price: Low to High</option>
                                    <option value="price-desc">💰 Price: High to Low</option>
                                </select>
                            </div>

                            <button
                                className="btn btn-outline"
                                style={{ width: '100%' }}
                                onClick={() => setFilter({ category: 'all', location: '', search: '', sort: 'newest', minWeight: '', maxWeight: '' })}
                            >
                                Clear Filters
                            </button>

                            <div className="filter-results-count">
                                <Package size={16} /> {filteredPosts.length} listings found
                            </div>
                        </aside>

                        {/* Posts Grid */}
                        <div className="posts-container">
                            {loading ? (
                                <div className="marketplace-loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem', color: 'var(--text-muted)' }}>
                                    <Loader size={36} className="spin" color="var(--accent-mint)" />
                                    <p>Loading marketplace listings...</p>
                                </div>
                            ) : (
                                <div className="posts-grid">
                                    {filteredPosts.map(post => {
                                        const seller = getSellerInfo(post);
                                        const desc = post.description
                                            ? (post.description.length > 70 ? `${post.description.substring(0, 70)}...` : post.description)
                                            : 'Verified household waste material available for collection.';
                                        const loc = post.location ? post.location.split(',')[0] : 'India';

                                        const isBought = post.status === 'bought' || post.status === 'completed';
                                        const isQuoted = post.quotedPriceMin !== null && post.quotedPriceMin !== undefined;

                                        return (
                                            <div key={post._id} className="post-card glass-pane">
                                                <div className="post-image" style={{ backgroundImage: `url(${getImageUrl(post.image)})` }}>
                                                    <span className={`badge badge-${post.category || 'plastic'} category-badge`}>{post.category || 'plastic'}</span>
                                                    {isBought ? (
                                                        <span className="status-label-card" style={{ background: 'rgba(16, 185, 129, 0.9)', color: '#042f1a', fontWeight: 700 }}>
                                                            ✓ Bought
                                                        </span>
                                                    ) : isQuoted ? (
                                                        <span className="status-label-card" style={{ background: 'rgba(245, 158, 11, 0.9)', color: '#042f1a', fontWeight: 700 }}>
                                                            Quote Available
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <div className="post-content">
                                                    <h3 className="post-title">{post.title || 'Recyclable Material'}</h3>
                                                    <p className="post-desc">{desc}</p>

                                                    <div className="post-meta">
                                                        <span className="meta-item"><Scale size={13} /> {post.weight || 0} {post.unit || 'kg'}</span>
                                                        <span className="meta-item"><MapPin size={13} /> {loc}</span>
                                                    </div>

                                                    <div className="post-seller-row">
                                                        <div className="mini-seller">
                                                            <div className="mini-avatar">{seller.name.charAt(0).toUpperCase()}</div>
                                                            <div>
                                                                <p className="mini-name">{seller.name.split(' ')[0]}</p>
                                                                <StarRating rating={seller.rating} />
                                                            </div>
                                                        </div>

                                                        {/* Price / Quote Status Badge */}
                                                        {isBought ? (
                                                            <div className="price-badge badge-bought">✅ Bought</div>
                                                        ) : isQuoted ? (
                                                            <div className="price-badge badge-quoted">₹{post.quotedPriceMin}-{post.quotedPriceMax}/{post.unit || 'kg'}</div>
                                                        ) : post.priceMin ? (
                                                            <div className="price-badge">₹{post.priceMin}/{post.unit || 'kg'}</div>
                                                        ) : (
                                                            <div className="price-badge badge-awaiting">Awaiting Quote</div>
                                                        )}
                                                    </div>

                                                    <div className="post-actions" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
                                                        <button className="btn btn-secondary view-btn" onClick={() => setSelectedPost(post)}>
                                                            <Eye size={15} /> View
                                                        </button>

                                                        {/* Collector Quoting & Bought Controls */}
                                                        {isCollector && !isBought && (
                                                            <>
                                                                <button
                                                                    className="btn btn-outline"
                                                                    title="Submit a price quote to the seller"
                                                                    onClick={() => {
                                                                        setQuoteModalPost(post);
                                                                        setQuoteForm({
                                                                            priceMin: post.quotedPriceMin || '',
                                                                            priceMax: post.quotedPriceMax || '',
                                                                            note: post.quoteNote || ''
                                                                        });
                                                                    }}
                                                                >
                                                                    <Tag size={14} /> Quote
                                                                </button>
                                                                <button
                                                                    className="btn btn-primary"
                                                                    title="Mark this waste as collected & bought"
                                                                    onClick={() => {
                                                                        setBuyModalPost(post);
                                                                        setBuyForm({
                                                                            pricePaid: post.quotedPriceMin
                                                                                ? Math.round(Number(post.quotedPriceMin) * Number(post.weight || 1))
                                                                                : ''
                                                                        });
                                                                    }}
                                                                >
                                                                    <CheckCircle size={14} /> Bought
                                                                </button>
                                                            </>
                                                        )}

                                                        {/* Chat Button (for anyone chatting with seller) */}
                                                        {user && user._id !== seller.id && (
                                                            <button className="btn btn-outline chat-btn" onClick={() => handleChat(seller.id, seller.name)}>
                                                                <MessageSquare size={15} /> Chat
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {!loading && filteredPosts.length === 0 && (
                                <div className="empty-state">
                                    <Search size={48} color="var(--text-secondary)" style={{ opacity: 0.4 }} />
                                    <h3>No listings match your filters</h3>
                                    <p>Try adjusting your search criteria or clear all filters.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ======================================================== */}
            {/* POST DETAIL MODAL                                        */}
            {/* ======================================================== */}
            {selectedPost && (
                <div className="modal-backdrop" onClick={() => setSelectedPost(null)}>
                    <div className="post-modal glass-pane animate-fade-in" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedPost(null)}><X size={22} /></button>

                        <div className="modal-image" style={{ backgroundImage: `url(${getImageUrl(selectedPost.image)})` }}>
                            <span className={`badge badge-${selectedPost.category || 'plastic'} category-badge`}>{selectedPost.category || 'plastic'}</span>
                            {selectedPost.status === 'bought' && <span className="badge badge-success status-badge">Bought & Collected</span>}
                            {selectedPost.status === 'quoted' && <span className="badge badge-warning status-badge">Quote Submitted</span>}
                        </div>

                        <div className="modal-body">
                            <h2>{selectedPost.title || 'Recyclable Material'}</h2>
                            <p className="modal-desc">{selectedPost.description || 'Verified household scrap material available for pickup and trade.'}</p>

                            <div className="modal-details-grid">
                                <div className="md-item">
                                    <span className="md-label">Weight</span>
                                    <span className="md-val">{selectedPost.weight || 0} {selectedPost.unit || 'kg'}</span>
                                </div>
                                <div className="md-item">
                                    <span className="md-label">Condition</span>
                                    <span className="md-val">{selectedPost.condition || 'Good'}</span>
                                </div>
                                <div className="md-item">
                                    <span className="md-label">Price / Quote</span>
                                    <span className="md-val">
                                        {selectedPost.status === 'bought'
                                            ? '✅ Bought'
                                            : selectedPost.quotedPriceMin
                                                ? `₹${selectedPost.quotedPriceMin} - ₹${selectedPost.quotedPriceMax}/${selectedPost.unit || 'kg'}`
                                                : 'Awaiting Collector Quote'}
                                    </span>
                                </div>
                                <div className="md-item">
                                    <span className="md-label">Location</span>
                                    <span className="md-val"><MapPin size={14} /> {selectedPost.location || 'India'}</span>
                                </div>
                                <div className="md-item">
                                    <span className="md-label">Pincode</span>
                                    <span className="md-val">{selectedPost.pincode || 'N/A'}</span>
                                </div>
                                <div className="md-item">
                                    <span className="md-label">Posted On</span>
                                    <span className="md-val"><Calendar size={14} /> {selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleDateString() : 'Recent'}</span>
                                </div>
                            </div>

                            <div className="modal-seller">
                                <div className="seller-avatar">{getSellerInfo(selectedPost).name.charAt(0).toUpperCase()}</div>
                                <div>
                                    <p className="seller-n">{getSellerInfo(selectedPost).name}</p>
                                    <div className="stars-row">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} size={14} fill={s <= Math.round(getSellerInfo(selectedPost).rating) ? '#f59e0b' : 'none'} color="#f59e0b" />
                                        ))}
                                        <span className="rating-val">{getSellerInfo(selectedPost).rating.toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Collector actions in modal */}
                            {isCollector && selectedPost.status !== 'bought' && (
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <button
                                        className="btn btn-outline"
                                        style={{ flex: 1 }}
                                        onClick={() => {
                                            setQuoteModalPost(selectedPost);
                                            setQuoteForm({
                                                priceMin: selectedPost.quotedPriceMin || '',
                                                priceMax: selectedPost.quotedPriceMax || '',
                                                note: selectedPost.quoteNote || ''
                                            });
                                        }}
                                    >
                                        <Tag size={16} /> Quote Price
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        style={{ flex: 1 }}
                                        onClick={() => {
                                            setBuyModalPost(selectedPost);
                                            setBuyForm({
                                                pricePaid: selectedPost.quotedPriceMin
                                                    ? Math.round(Number(selectedPost.quotedPriceMin) * Number(selectedPost.weight || 1))
                                                    : ''
                                            });
                                        }}
                                    >
                                        <CheckCircle size={16} /> Mark as Bought
                                    </button>
                                </div>
                            )}

                            <button className="btn btn-primary chat-modal-btn" onClick={() => handleChat(getSellerInfo(selectedPost).id, getSellerInfo(selectedPost).name)}>
                                <MessageSquare size={18} /> Chat with {getSellerInfo(selectedPost).name.split(' ')[0]}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* COLLECTOR QUOTE MODAL                                    */}
            {/* ======================================================== */}
            {quoteModalPost && (
                <div className="modal-backdrop" onClick={() => setQuoteModalPost(null)}>
                    <div className="post-modal glass-pane quote-modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="quote-modal-header">
                            <h3><Tag size={20} color="var(--accent-mint)" /> Quote Scrap Price</h3>
                            <button className="modal-close-btn" onClick={() => setQuoteModalPost(null)}><X size={20} /></button>
                        </div>

                        <div className="quote-meta-preview">
                            <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {quoteModalPost.title}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.8rem' }}>
                                Quantity: <strong>{quoteModalPost.weight} {quoteModalPost.unit || 'kg'}</strong> • Category: <strong>{quoteModalPost.category}</strong>
                            </p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>
                                Seller: <strong>{getSellerInfo(quoteModalPost).name}</strong> ({quoteModalPost.location})
                            </p>
                        </div>

                        <form onSubmit={handleQuoteSubmit}>
                            <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="form-group flex-1">
                                    <label>Min Rate (₹/{quoteModalPost.unit || 'kg'}) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        placeholder="E.g. 15"
                                        value={quoteForm.priceMin}
                                        onChange={(e) => setQuoteForm(p => ({ ...p, priceMin: e.target.value }))}
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group flex-1">
                                    <label>Max Rate (₹/{quoteModalPost.unit || 'kg'})</label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="E.g. 20"
                                        value={quoteForm.priceMax}
                                        onChange={(e) => setQuoteForm(p => ({ ...p, priceMax: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label>Pickup Note & Terms (Optional)</label>
                                <textarea
                                    rows="2"
                                    placeholder="E.g. Can pick up today between 4 PM - 6 PM. Spot digital payment."
                                    value={quoteForm.note}
                                    onChange={(e) => setQuoteForm(p => ({ ...p, note: e.target.value }))}
                                />
                            </div>

                            <button type="submit" disabled={quoting} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                {quoting ? <><Loader size={16} className="spin" /> Sending Quote Offer...</> : <><Tag size={16} /> Submit Quote & Message Seller</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* COLLECTOR "BOUGHT" CONFIRMATION MODAL                    */}
            {/* ======================================================== */}
            {buyModalPost && (
                <div className="modal-backdrop" onClick={() => setBuyModalPost(null)}>
                    <div className="post-modal glass-pane quote-modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="quote-modal-header">
                            <h3><CheckCircle size={22} color="#10b981" /> Confirm Waste Purchase</h3>
                            <button className="modal-close-btn" onClick={() => setBuyModalPost(null)}><X size={20} /></button>
                        </div>

                        <div className="quote-meta-preview" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {buyModalPost.title}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.82rem' }}>
                                Material Collected: <strong>{buyModalPost.weight} {buyModalPost.unit || 'kg'}</strong> of {buyModalPost.category}
                            </p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>
                                Seller: <strong>{getSellerInfo(buyModalPost).name}</strong>
                            </p>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            Marking this listing as <strong>Bought</strong> will officially log the collected weight in your collector profile metrics, total volume, and collection history.
                        </p>

                        <form onSubmit={handleBuySubmit}>
                            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                <label>Total Amount Paid to Individual (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Enter total amount paid"
                                    value={buyForm.pricePaid}
                                    onChange={(e) => setBuyForm({ pricePaid: e.target.value })}
                                    autoFocus
                                />
                            </div>

                            <button type="submit" disabled={buying} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                {buying ? <><Loader size={16} className="spin" /> Updating Records...</> : <><CheckCircle size={16} /> Confirm Bought & Add to History</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketplace;
