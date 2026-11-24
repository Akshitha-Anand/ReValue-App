import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, MapPin, Scale, Filter, Search, Star, Eye, X, Calendar, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../api';
import './Marketplace.css';


const categoryColors = { plastic: '#3b82f6', paper: '#f59e0b', metal: '#6b7280', ewaste: '#ef4444', glass: '#10b981' };

const getImageUrl = (img) => {
    if (!img) return 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=400';
    if (img.startsWith('http')) return img;
    return `${API_BASE_URL}${img}`;
};

const PostModal = ({ post, onClose, onChat }) => {
    if (!post) return null;
    const sellerName = post.createdBy?.name || 'Verified Member';
    const sellerId = post.createdBy?._id || post.createdBy;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="post-modal glass-pane animate-fade-in" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}><X size={22} /></button>

                <div className="modal-image" style={{ backgroundImage: `url(${getImageUrl(post.image)})` }}>
                    <span className={`badge badge-${post.category} category-badge`}>{post.category}</span>
                    {post.status === 'requested' && <span className="badge badge-warning status-badge">Requested</span>}
                </div>

                <div className="modal-body">
                    <h2>{post.title}</h2>
                    <p className="modal-desc">{post.description}</p>

                    <div className="modal-details-grid">
                        <div className="md-item">
                            <span className="md-label">Weight</span>
                            <span className="md-val">{post.weight} {post.unit || 'kg'}</span>
                        </div>
                        <div className="md-item">
                            <span className="md-label">Condition</span>
                            <span className="md-val">{post.condition}</span>
                        </div>
                        <div className="md-item">
                            <span className="md-label">Price Range</span>
                            <span className="md-val">₹{post.priceMin} - ₹{post.priceMax || post.priceMin}/{post.unit || 'kg'}</span>
                        </div>
                        <div className="md-item">
                            <span className="md-label">Location</span>
                            <span className="md-val"><MapPin size={14} /> {post.location}</span>
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
                        <div className="seller-avatar">{sellerName.charAt(0)}</div>
                        <div>
                            <p className="seller-n">{sellerName}</p>
                            <div className="stars-row">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={14} fill={s <= Math.round(post.createdBy?.rating || 5) ? '#f59e0b' : 'none'} color="#f59e0b" />
                                ))}
                                <span className="rating-val">{post.createdBy?.rating || 5.0}</span>
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-primary chat-modal-btn" onClick={() => onChat(sellerId, sellerName)}>
                        <MessageSquare size={18} /> Negotiate with {sellerName.split(' ')[0]}
                    </button>
                </div>
            </div>
        </div>
    );
};

const StarRating = ({ rating }) => (
    <div className="mini-stars">
        {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} size={12} fill={s <= Math.round(rating) ? '#f59e0b' : 'none'} color="#f59e0b" />
        ))}
        <span>{rating}</span>
    </div>
);

const Marketplace = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [filter, setFilter] = useState({ category: 'all', location: '', search: '', sort: 'newest', minWeight: '', maxWeight: '' });
    const [selectedPost, setSelectedPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/posts`);
                // Backend might return nested objects. Ensure we have the list.

                setPosts(res.data);
                setFilteredPosts(res.data);
            } catch (err) {
                console.error("Error fetching posts:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilter(prev => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
        let result = [...posts];
        if (filter.category !== 'all') result = result.filter(p => p.category === filter.category);
        if (filter.location) result = result.filter(p => p.location.toLowerCase().includes(filter.location.toLowerCase()));
        if (filter.search) result = result.filter(p => p.title.toLowerCase().includes(filter.search.toLowerCase()) || p.description.toLowerCase().includes(filter.search.toLowerCase()));
        if (filter.minWeight) result = result.filter(p => p.weight >= Number(filter.minWeight));
        if (filter.maxWeight) result = result.filter(p => p.weight <= Number(filter.maxWeight));
        if (filter.sort === 'price-asc') result.sort((a, b) => a.priceMin - b.priceMin);
        else if (filter.sort === 'price-desc') result.sort((a, b) => b.priceMin - a.priceMin);
        else if (filter.sort === 'weight') result.sort((a, b) => b.weight - a.weight);
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
                <input name="search" value={filter.search} onChange={handleFilterChange} placeholder="Search by material name or keyword..." />
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
                            <input type="text" name="location" placeholder="City or area..." value={filter.location} onChange={handleFilterChange} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Weight Range (kg)</label>
                        <div className="range-inputs">
                            <input type="number" name="minWeight" placeholder="Min" value={filter.minWeight} onChange={handleFilterChange} />
                            <span>—</span>
                            <input type="number" name="maxWeight" placeholder="Max" value={filter.maxWeight} onChange={handleFilterChange} />
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

                    <button className="btn btn-outline" style={{ width: '100%' }}
                        onClick={() => setFilter({ category: 'all', location: '', search: '', sort: 'newest', minWeight: '', maxWeight: '' })}>
                        Clear Filters
                    </button>

                    <div className="filter-results-count">
                        <Package size={16} /> {filteredPosts.length} listings found
                    </div>
                </aside>

                {/* Posts Grid */}
                <div className="posts-container">
                    <div className="posts-grid">
                        {filteredPosts.map(post => (
                            <div key={post._id} className="post-card glass-pane">
                                <div className="post-image" style={{ backgroundImage: `url(${getImageUrl(post.image)})` }}>
                                    <span className={`badge badge-${post.category} category-badge`}>{post.category}</span>
                                    {post.status !== 'available' && (
                                        <span className="status-label-card">{post.status}</span>
                                    )}
                                </div>

                                <div className="post-content">
                                    <h3 className="post-title">{post.title}</h3>
                                    <p className="post-desc">{post.description.substring(0, 70)}...</p>

                                    <div className="post-meta">
                                        <span className="meta-item"><Scale size={13} /> {post.weight} kg</span>
                                        <span className="meta-item"><MapPin size={13} /> {post.location.split(',')[0]}</span>
                                    </div>

                                    <div className="post-seller-row">
                                        <div className="mini-seller">
                                            <div className="mini-avatar">{post.createdBy?.name?.charAt(0) || '?'}</div>
                                            <div>
                                                <p className="mini-name">{post.createdBy?.name?.split(' ')[0] || 'User'}</p>
                                                <StarRating rating={post.createdBy?.rating || 5} />
                                            </div>
                                        </div>
                                        <div className="price-badge">₹{post.priceMin}/kg</div>
                                    </div>

                                    <div className="post-actions">
                                        <button className="btn btn-secondary view-btn" onClick={() => setSelectedPost(post)}>
                                            <Eye size={15} /> View
                                        </button>
                                        {user && post.createdBy && user._id !== post.createdBy._id && (
                                            <button className="btn btn-primary chat-btn" onClick={() => handleChat(post.createdBy._id, post.createdBy.name)}>
                                                <MessageSquare size={15} /> Chat
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredPosts.length === 0 && (
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
