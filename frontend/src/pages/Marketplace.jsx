import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, MapPin, Scale, Filter, Search, Star, Eye, X, Calendar, Package, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../api';
import { demoPosts } from '../data/demoData';
import './Marketplace.css';

const categoryColors = { plastic: '#3b82f6', paper: '#f59e0b', metal: '#6b7280', ewaste: '#ef4444', glass: '#10b981' };

const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=400';
    if (img.startsWith('http')) return img;
    return `${API_BASE_URL}${img}`;
};

const getSellerInfo = (post) => {
    if (post?.createdBy && typeof post.createdBy === 'object') {
        return {
            id: post.createdBy._id || 'unknown',
            name: post.createdBy.name || 'Verified Member',
            rating: Number(post.createdBy.rating) || 4.8
        };
    }
    return {
        id: post?.createdBy || 'unknown',
        name: 'Verified Member',
        rating: 4.8
    };
};

const PostModal = ({ post, onClose, onChat }) => {
    if (!post) return null;
    const seller = getSellerInfo(post);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="post-modal glass-pane animate-fade-in" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}><X size={22} /></button>

                <div className="modal-image" style={{ backgroundImage: `url(${getImageUrl(post.image)})` }}>
                    <span className={`badge badge-${post.category || 'plastic'} category-badge`}>{post.category || 'plastic'}</span>
                    {post.status === 'requested' && <span className="badge badge-warning status-badge">Requested</span>}
                </div>

                <div className="modal-body">
                    <h2>{post.title || 'Recyclable Material'}</h2>
                    <p className="modal-desc">{post.description || 'Verified scrap material available for pickup and trade.'}</p>

                    <div className="modal-details-grid">
                        <div className="md-item">
                            <span className="md-label">Weight</span>
                            <span className="md-val">{post.weight || 0} {post.unit || 'kg'}</span>
                        </div>
                        <div className="md-item">
                            <span className="md-label">Condition</span>
                            <span className="md-val">{post.condition || 'Good'}</span>
                        </div>
                        <div className="md-item">
                            <span className="md-label">Price Range</span>
                            <span className="md-val">₹{post.priceMin || 0} - ₹{post.priceMax || post.priceMin || 0}/{post.unit || 'kg'}</span>
                        </div>
                        <div className="md-item">
                            <span className="md-label">Location</span>
                            <span className="md-val"><MapPin size={14} /> {post.location || 'India'}</span>
                        </div>
                        <div className="md-item">
                            <span className="md-label">Pincode</span>
                            <span className="md-val">{post.pincode || 'N/A'}</span>
                        </div>
                        <div className="md-item">
                            <span className="md-label">Posted On</span>
                            <span className="md-val"><Calendar size={14} /> {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recent'}</span>
                        </div>
                    </div>

                    <div className="modal-seller">
                        <div className="seller-avatar">{seller.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <p className="seller-n">{seller.name}</p>
                            <div className="stars-row">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={14} fill={s <= Math.round(seller.rating) ? '#f59e0b' : 'none'} color="#f59e0b" />
                                ))}
                                <span className="rating-val">{seller.rating.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-primary chat-modal-btn" onClick={() => onChat(seller.id, seller.name)}>
                        <MessageSquare size={18} /> Negotiate with {seller.name.split(' ')[0]}
                    </button>
                </div>
            </div>
        </div>
    );
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
    const { user } = useAuth();
    const navigate = useNavigate();

    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [filter, setFilter] = useState({ category: 'all', location: '', search: '', sort: 'newest', minWeight: '', maxWeight: '' });
    const [selectedPost, setSelectedPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilter(prev => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
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
            result.sort((a, b) => (Number(a.priceMin) || 0) - (Number(b.priceMin) || 0));
        } else if (filter.sort === 'price-desc') {
            result.sort((a, b) => (Number(b.priceMin) || 0) - (Number(a.priceMin) || 0));
        } else if (filter.sort === 'weight') {
            result.sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0));
        }

        setFilteredPosts(result);
    }, [filter, posts]);

    const handleChat = (contactId, contactName) => {
        setSelectedPost(null);
        navigate('/chat', { state: { contactId, contactName } });
    };

    return (
        <div className="marketplace-page animate-fade-in">
            <div className="section-header">
                <h1>Waste Marketplace</h1>
                <p className="subtitle">Browse recyclable materials — filter by type, weight, location and negotiate directly.</p>
            </div>

            {/* Search Bar */}
            <div className="top-search glass-pane">
                <Search size={20} className="ts-icon" />
                <input
                    name="search"
                    value={filter.search}
                    onChange={handleFilterChange}
                    placeholder="Search by material name or keyword..."
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
                        <select name="category" value={filter.category} onChange={handleFilterChange}>
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
                                onChange={handleFilterChange}
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
                                onChange={handleFilterChange}
                            />
                            <span>—</span>
                            <input
                                type="number"
                                name="maxWeight"
                                placeholder="Max"
                                value={filter.maxWeight}
                                onChange={handleFilterChange}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Sort By</label>
                        <select name="sort" value={filter.sort} onChange={handleFilterChange}>
                            <option value="newest">🕓 Newest First</option>
                            <option value="price-asc">💰 Price: Low to High</option>
                            <option value="price-desc">💰 Price: High to Low</option>
                            <option value="weight">⚖️ Weight: Heaviest First</option>
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
                                    : 'Verified recyclable material ready for pickup and trade.';
                                const loc = post.location ? post.location.split(',')[0] : 'India';

                                return (
                                    <div key={post._id} className="post-card glass-pane">
                                        <div className="post-image" style={{ backgroundImage: `url(${getImageUrl(post.image)})` }}>
                                            <span className={`badge badge-${post.category || 'plastic'} category-badge`}>{post.category || 'plastic'}</span>
                                            {post.status && post.status !== 'available' && (
                                                <span className="status-label-card">{post.status}</span>
                                            )}
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
                                                <div className="price-badge">₹{post.priceMin || 0}/{post.unit || 'kg'}</div>
                                            </div>

                                            <div className="post-actions">
                                                <button className="btn btn-secondary view-btn" onClick={() => setSelectedPost(post)}>
                                                    <Eye size={15} /> View
                                                </button>
                                                {user && user._id !== seller.id && (
                                                    <button className="btn btn-primary chat-btn" onClick={() => handleChat(seller.id, seller.name)}>
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

            {/* Post Detail Modal */}
            {selectedPost && (
                <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} onChat={handleChat} />
            )}
        </div>
    );
};

export default Marketplace;
