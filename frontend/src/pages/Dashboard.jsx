import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    Leaf, Recycle, Users, Building2, Activity, TrendingUp,
    Wind, PlusCircle, ArrowRight, Package, ShoppingBag,
    ShieldCheck, Sparkles, CheckCircle2, MapPin, Zap
} from 'lucide-react';
import { dashboardStats, demoPosts } from '../data/demoData';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Title, Tooltip, Legend);

const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: {
            grid: { color: 'rgba(16, 185, 129, 0.08)' },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
        }
    },
    plugins: {
        legend: {
            position: 'top',
            labels: { color: '#e2e8f0', font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }, boxWidth: 12, padding: 15 }
        },
        tooltip: {
            backgroundColor: 'rgba(7, 21, 16, 0.95)',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            borderWidth: 1,
            titleColor: '#34d399',
            bodyColor: '#f1f5f9',
            padding: 10,
            cornerRadius: 8
        }
    }
};

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const stats = [
        { title: 'Total Waste Listed', value: dashboardStats.totalWasteListed, icon: <Leaf size={22} />, color: '#10b981', trend: '+14.2% MoM' },
        { title: 'Waste Recycled', value: dashboardStats.totalWasteRecycled, icon: <Recycle size={22} />, color: '#06b6d4', trend: '+18.6% MoM' },
        { title: 'Active Collectors', value: dashboardStats.activeCollectors.toLocaleString(), icon: <Users size={22} />, color: '#f59e0b', trend: 'Verified' },
        { title: 'Partner Industries', value: dashboardStats.partnerIndustries, icon: <Building2 size={22} />, color: '#a855f7', trend: 'Direct Offtake' },
        { title: 'Circular Members', value: dashboardStats.totalUsers.toLocaleString(), icon: <ShieldCheck size={22} />, color: '#ec4899', trend: 'Pan-India' },
        { title: 'CO₂ Footprint Saved', value: dashboardStats.co2Saved, icon: <Wind size={22} />, color: '#34d399', trend: 'Eco-Certified' },
    ];

    const trendsData = {
        labels: dashboardStats.trends.labels,
        datasets: [
            {
                label: 'Waste Listed (Tons)',
                data: dashboardStats.trends.listed,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                tension: 0.38,
                fill: true,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointRadius: 4,
            },
            {
                label: 'Waste Recycled (Tons)',
                data: dashboardStats.trends.recycled,
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.08)',
                tension: 0.38,
                fill: true,
                pointBackgroundColor: '#06b6d4',
                pointBorderColor: '#fff',
                pointRadius: 4,
            }
        ]
    };

    const categoryData = {
        labels: dashboardStats.categoryShare.labels,
        datasets: [{
            data: dashboardStats.categoryShare.data,
            backgroundColor: ['#0ea5e9', '#f59e0b', '#94a3b8', '#ef4444', '#10b981', '#a855f7'],
            borderWidth: 2,
            borderColor: '#0d221a',
            hoverOffset: 6,
        }]
    };

    const revenueData = {
        labels: dashboardStats.trends.labels,
        datasets: [{
            label: 'Platform Circular Volume Value (₹)',
            data: dashboardStats.monthlyRevenue,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            hoverBackgroundColor: '#10b981',
            borderRadius: 8,
        }]
    };

    return (
        <div className="dashboard-page animate-fade-in">
            {/* Environmental Hero Header */}
            <header className="dash-hero glass-pane">
                <div className="dash-hero-main">
                    <div className="dash-user-badge">
                        <span className="user-role-pill badge-green">
                            <Sparkles size={13} /> {user?.role ? user.role.toUpperCase() : 'MEMBER'} ACCOUNT
                        </span>
                        <span className="dash-status-dot">
                            <span className="dot-pulse" /> Active Node
                        </span>
                    </div>

                    <h1 className="dash-title">
                        Welcome back, <span className="text-gradient">{user?.name ? user.name.split(' ')[0] : 'Sustainability Leader'}</span>! 🌿
                    </h1>

                    <p className="dash-subtitle">
                        Here is your real-time circular economy overview. Monitor incoming waste streams, tracking metrics, and environmental conservation progress.
                    </p>

                    <div className="dash-hero-actions">
                        {user?.role === 'individual' && (
                            <button className="btn btn-primary" onClick={() => navigate('/create-post')}>
                                <PlusCircle size={18} /> Post Waste Listing
                            </button>
                        )}
                        {user?.role === 'collector' && (
                            <button className="btn btn-primary" onClick={() => navigate('/marketplace')}>
                                <ShoppingBag size={18} /> Claim Waste Pickups
                            </button>
                        )}
                        {user?.role === 'industry' && (
                            <button className="btn btn-primary" onClick={() => navigate('/matches')}>
                                <Zap size={18} /> View AI Matches
                            </button>
                        )}
                        <button className="btn btn-outline" onClick={() => navigate('/marketplace')}>
                            Explore Marketplace <ArrowRight size={17} />
                        </button>
                    </div>
                </div>

                <div className="dash-hero-stats-card">
                    <div className="impact-counter-header">
                        <Leaf size={20} color="var(--accent-mint)" />
                        <span>Eco-Impact Summary</span>
                    </div>
                    <div className="counter-row">
                        <div>
                            <span className="counter-val text-gradient">12.5 T</span>
                            <span className="counter-lbl">Landfill Diverted</span>
                        </div>
                        <div className="counter-divider" />
                        <div>
                            <span className="counter-val text-gradient">32.8 T</span>
                            <span className="counter-lbl">CO₂ Reduced</span>
                        </div>
                    </div>
                    <div className="eco-verified-badge">
                        <CheckCircle2 size={14} color="#10b981" /> Verified against ISO 14040 LCA Standards
                    </div>
                </div>
            </header>

            {/* Key Metrics Grid */}
            <section className="metrics-section">
                <div className="dash-section-header">
                    <h2>Platform Activity & Sustainability Metrics</h2>
                    <span className="header-badge">Live Real-Time Data</span>
                </div>

                <div className="stats-grid-dashboard">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="metric-card glass-pane">
                            <div className="metric-top">
                                <div className="metric-icon" style={{ color: stat.color, background: `${stat.color}18`, border: `1px solid ${stat.color}33` }}>
                                    {stat.icon}
                                </div>
                                <span className="metric-trend">{stat.trend}</span>
                            </div>
                            <div className="metric-bottom">
                                <h3 className="metric-value" style={{ color: stat.color }}>{stat.value}</h3>
                                <p className="metric-label">{stat.title}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Analytics & Charts Grid */}
            <section className="analytics-section">
                <div className="charts-main-grid">
                    {/* Line Chart */}
                    <div className="chart-box glass-pane chart-line-span">
                        <div className="chart-header">
                            <div>
                                <h3><TrendingUp size={18} className="chart-header-icon" /> Material Flow & Recycling Trajectory</h3>
                                <p>Monthly comparison of listed waste versus closed-loop recycling offtake</p>
                            </div>
                        </div>
                        <div className="chart-canvas-wrapper">
                            <Line data={trendsData} options={chartDefaults} />
                        </div>
                    </div>

                    {/* Donut Chart */}
                    <div className="chart-box glass-pane chart-donut-span">
                        <div className="chart-header">
                            <div>
                                <h3><Recycle size={18} className="chart-header-icon" /> Material Distribution</h3>
                                <p>Breakdown by recyclable commodity</p>
                            </div>
                        </div>
                        <div className="chart-canvas-wrapper donut-wrapper">
                            <Doughnut
                                data={categoryData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    cutout: '70%',
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                            labels: { color: '#e2e8f0', font: { family: 'Plus Jakarta Sans', size: 11 }, padding: 12 }
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Revenue & Transaction Bar Chart */}
                <div className="chart-box glass-pane full-width-chart">
                    <div className="chart-header">
                        <div>
                            <h3><Activity size={18} className="chart-header-icon" /> Platform Economic Throughput (₹)</h3>
                            <p>Monthly gross market exchange value generated through valorized materials</p>
                        </div>
                    </div>
                    <div className="chart-canvas-wrapper bar-wrapper">
                        <Bar data={revenueData} options={chartDefaults} />
                    </div>
                </div>
            </section>

            {/* Role-Specific Quick Hub Actions */}
            <section className="role-actions-section">
                <div className="dash-section-header">
                    <h2>Tailored Portals & Next Steps</h2>
                    <p>Direct shortcuts matching your profile role</p>
                </div>

                {user?.role === 'individual' && (
                    <div className="action-tiles-grid">
                        <div className="action-tile glass-pane" onClick={() => navigate('/create-post')}>
                            <div className="tile-icon-box green"><PlusCircle size={26} /></div>
                            <h3>Post New Waste</h3>
                            <p>List paper, plastics, e-waste or scrap with instant AI price estimation.</p>
                            <span className="tile-link">Get Started <ArrowRight size={15} /></span>
                        </div>
                        <div className="action-tile glass-pane" onClick={() => navigate('/marketplace')}>
                            <div className="tile-icon-box blue"><ShoppingBag size={26} /></div>
                            <h3>Browse Marketplace</h3>
                            <p>Explore current market pricing and see what materials are in high demand.</p>
                            <span className="tile-link">Explore Listings <ArrowRight size={15} /></span>
                        </div>
                        <div className="action-tile glass-pane" onClick={() => navigate('/profile')}>
                            <div className="tile-icon-box purple"><Package size={26} /></div>
                            <h3>My Impact & History</h3>
                            <p>Track your past sales, customer ratings, and your total CO₂ savings.</p>
                            <span className="tile-link">View Portfolio <ArrowRight size={15} /></span>
                        </div>
                    </div>
                )}

                {user?.role === 'collector' && (
                    <div className="action-tiles-grid">
                        <div className="action-tile glass-pane" onClick={() => navigate('/marketplace')}>
                            <div className="tile-icon-box green"><ShoppingBag size={26} /></div>
                            <h3>Find Local Waste</h3>
                            <p>Claim nearby individual listings for pickup within your operating radius.</p>
                            <span className="tile-link">View Available Posts <ArrowRight size={15} /></span>
                        </div>
                        <div className="action-tile glass-pane" onClick={() => navigate('/hub')}>
                            <div className="tile-icon-box amber"><Package size={26} /></div>
                            <h3>My Collection Hub</h3>
                            <p>Manage your aggregated inventory and prepare bulk shipments for mills.</p>
                            <span className="tile-link">Open Hub Manager <ArrowRight size={15} /></span>
                        </div>
                        <div className="action-tile glass-pane" onClick={() => navigate('/organizations')}>
                            <div className="tile-icon-box purple"><Building2 size={26} /></div>
                            <h3>Supply to Industry</h3>
                            <p>Connect with verified industrial processing plants seeking bulk feedstock.</p>
                            <span className="tile-link">Browse Partners <ArrowRight size={15} /></span>
                        </div>
                    </div>
                )}

                {user?.role === 'industry' && (
                    <div className="action-tiles-grid">
                        <div className="action-tile glass-pane" onClick={() => navigate('/matches')}>
                            <div className="tile-icon-box green"><Zap size={26} /></div>
                            <h3>AI Industry Matches</h3>
                            <p>View collectors holding the exact scrap grades and quantities your facility requires.</p>
                            <span className="tile-link">Inspect Smart Matches <ArrowRight size={15} /></span>
                        </div>
                        <div className="action-tile glass-pane" onClick={() => navigate('/collectors')}>
                            <div className="tile-icon-box blue"><Users size={26} /></div>
                            <h3>Collector Network</h3>
                            <p>Browse regional aggregator hubs and contract reliable steady supply agreements.</p>
                            <span className="tile-link">Find Suppliers <ArrowRight size={15} /></span>
                        </div>
                        <div className="action-tile glass-pane" onClick={() => navigate('/profile')}>
                            <div className="tile-icon-box purple"><Building2 size={26} /></div>
                            <h3>Company Specs</h3>
                            <p>Update your required material types, acceptable purity levels, and buying prices.</p>
                            <span className="tile-link">Edit Requirements <ArrowRight size={15} /></span>
                        </div>
                    </div>
                )}
            </section>

            {/* Live Marketplace Feed Preview */}
            <section className="recent-feed-section">
                <div className="dash-section-header">
                    <h2>Live Verified Listings</h2>
                    <span className="header-link" onClick={() => navigate('/marketplace')}>View all listings →</span>
                </div>

                <div className="recent-cards-row">
                    {demoPosts.slice(0, 3).map(post => (
                        <div key={post._id} className="mini-post-card glass-pane" onClick={() => navigate('/marketplace')}>
                            <div className="mini-card-img" style={{ backgroundImage: `url(${post.image})` }}>
                                <span className={`badge badge-${post.category}`}>{post.category}</span>
                            </div>
                            <div className="mini-card-body">
                                <h4>{post.title}</h4>
                                <div className="mini-card-meta">
                                    <span className="mini-weight"><Package size={13} /> {post.weight} kg</span>
                                    <span className="mini-price">{post.price}</span>
                                </div>
                                <div className="mini-card-loc">
                                    <MapPin size={12} /> {post.location}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Dashboard;