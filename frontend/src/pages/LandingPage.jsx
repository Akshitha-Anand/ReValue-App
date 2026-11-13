import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Leaf, Recycle, Droplets, Zap, ShieldCheck, ArrowRight,
    TrendingUp, BarChart3, Globe, Cpu, FileText, Apple, Box,
    CheckCircle2, Sparkles, Building2, Users2, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    return (
        <div className="landing-page animate-fade-in">
            {/* Top Navigation */}
            <nav className="landing-nav glass-pane">
                <div className="nav-brand" onClick={() => navigate('/')}>
                    <div className="brand-icon-box">
                        <Recycle size={24} className="brand-spin-icon" />
                    </div>
                    <span className="brand-name">Re<span className="text-gradient">Value</span></span>
                    <span className="brand-pill">Eco-Marketplace</span>
                </div>
                <div className="nav-links-desktop">
                    <a href="#how-it-works">How It Works</a>
                    <a href="#impact">Environmental Impact</a>
                    <a href="#materials">Materials</a>
                    <a href="#sdgs">UN Goals</a>
                </div>
                <div className="nav-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/login')}>
                        Sign In
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>
                        Get Started <ArrowRight size={15} />
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="hero-section">
                <div className="hero-content">
                    <div className="hero-badge">
                        <Sparkles size={14} className="sparkle-icon" />
                        <span>India's Premier Smart Circular Economy Platform</span>
                    </div>

                    <h1 className="hero-title">
                        Turn Recyclable Waste into <span className="text-gradient">Real Environmental Value</span>
                    </h1>

                    <p className="hero-subtitle">
                        Seamlessly connecting households, verified collection agents, and recycling industries. Monetize your scrap, streamline supply chains, and cut carbon emissions in real-time.
                    </p>

                    <div className="hero-cta-group">
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                            <Leaf size={18} /> Start Trading Waste
                        </button>
                        <button className="btn btn-outline btn-lg" onClick={() => navigate('/login')}>
                            Explore Live Marketplace <ArrowUpRight size={18} />
                        </button>
                    </div>

                    {/* Verified Platform Stats */}
                    <div className="hero-stats-strip">
                        <div className="stat-pill">
                            <span className="stat-num text-gradient">18,500+ kg</span>
                            <span className="stat-label">Diverted from Landfill</span>
                        </div>
                        <div className="stat-separator" />
                        <div className="stat-pill">
                            <span className="stat-num text-gradient">640+</span>
                            <span className="stat-label">Verified Collectors</span>
                        </div>
                        <div className="stat-separator" />
                        <div className="stat-pill">
                            <span className="stat-num text-gradient">99.4%</span>
                            <span className="stat-label">Recycling Match Rate</span>
                        </div>
                    </div>
                </div>

                {/* Hero Interactive Visual: Material Spectrum */}
                <div className="hero-visual-card glass-pane">
                    <div className="visual-card-header">
                        <div className="status-indicator">
                            <span className="pulse-dot" />
                            <span>Active Circular Feed</span>
                        </div>
                        <span className="badge badge-glass">Live Pricing</span>
                    </div>

                    <div className="materials-grid-modern">
                        <div className="material-tile plastic">
                            <div className="mt-icon-box"><Recycle size={20} /></div>
                            <div className="mt-info">
                                <h4>PET & Hard Plastic</h4>
                                <span className="mt-rate">₹18 - ₹26 / kg</span>
                            </div>
                            <span className="mt-demand">High Demand</span>
                        </div>

                        <div className="material-tile ewaste">
                            <div className="mt-icon-box"><Cpu size={20} /></div>
                            <div className="mt-info">
                                <h4>E-Waste & PCBs</h4>
                                <span className="mt-rate">₹120 - ₹450 / kg</span>
                            </div>
                            <span className="mt-demand">Premium</span>
                        </div>

                        <div className="material-tile paper">
                            <div className="mt-icon-box"><FileText size={20} /></div>
                            <div className="mt-info">
                                <h4>Cardboard & Kraft</h4>
                                <span className="mt-rate">₹14 - ₹19 / kg</span>
                            </div>
                            <span className="mt-demand">Bulk Buy</span>
                        </div>

                        <div className="material-tile metal">
                            <div className="mt-icon-box"><Box size={20} /></div>
                            <div className="mt-info">
                                <h4>Aluminium & Copper</h4>
                                <span className="mt-rate">₹145 - ₹480 / kg</span>
                            </div>
                            <span className="mt-demand">Instant Pickup</span>
                        </div>

                        <div className="material-tile organic">
                            <div className="mt-icon-box"><Apple size={20} /></div>
                            <div className="mt-info">
                                <h4>Bio & Agro Organic</h4>
                                <span className="mt-rate">₹4 - ₹8 / kg</span>
                            </div>
                            <span className="mt-demand">Composting</span>
                        </div>
                    </div>

                    <div className="visual-card-footer">
                        <span>🌱 Powered by AI Material Classification</span>
                    </div>
                </div>
            </header>

            {/* How It Works Section */}
            <section id="how-it-works" className="how-section">
                <div className="section-header-center">
                    <span className="section-eyebrow">The Circular Journey</span>
                    <h2>How ReValue Closes the Recycling Loop</h2>
                    <p>A transparent, high-efficiency network connecting every participant in the waste value chain.</p>
                </div>

                <div className="steps-container">
                    <div className="step-card glass-pane">
                        <div className="step-number">01</div>
                        <div className="step-icon-wrap"><Leaf size={28} /></div>
                        <h3>1. Post & Value Waste</h3>
                        <p>Individuals & businesses photograph recyclables. Our AI auto-identifies material grade and suggests optimal market prices.</p>
                        <div className="step-tag">For Individuals</div>
                    </div>

                    <div className="step-arrow"><ArrowRight size={24} /></div>

                    <div className="step-card glass-pane active-step">
                        <div className="step-number">02</div>
                        <div className="step-icon-wrap"><Users2 size={28} /></div>
                        <h3>2. Collect & Aggregate</h3>
                        <p>Certified local collectors receive geo-located alerts, coordinate doorstep pickup via chat, and aggregate clean bulk batches.</p>
                        <div className="step-tag">For Collectors</div>
                    </div>

                    <div className="step-arrow"><ArrowRight size={24} /></div>

                    <div className="step-card glass-pane">
                        <div className="step-number">03</div>
                        <div className="step-icon-wrap"><Building2 size={28} /></div>
                        <h3>3. Industrial Valorization</h3>
                        <p>Processing factories and mills buy verified feedstock in volume, closing the loop and manufacturing recycled consumer goods.</p>
                        <div className="step-tag">For Industries</div>
                    </div>
                </div>
            </section>

            {/* Environmental Impact Metrics Section */}
            <section id="impact" className="impact-section">
                <div className="section-header-center">
                    <span className="section-eyebrow">Real Environmental ROI</span>
                    <h2>Measurable Ecological Footprint Saved</h2>
                    <p>Every transaction on ReValue translates directly into verified environmental conservation metrics.</p>
                </div>

                <div className="impact-cards-grid">
                    <div className="impact-card glass-pane">
                        <div className="ic-header">
                            <div className="ic-icon cloud"><Globe size={26} /></div>
                            <span className="ic-pill">+18% MoM</span>
                        </div>
                        <h3>Carbon Offset</h3>
                        <div className="ic-value text-gradient">14,250 kg</div>
                        <p className="ic-sub">Equivalent to saving 712 mature trees from being logged</p>
                        <div className="ic-bar"><div className="ic-bar-fill" style={{ width: '78%' }} /></div>
                    </div>

                    <div className="impact-card glass-pane">
                        <div className="ic-header">
                            <div className="ic-icon water"><Droplets size={26} /></div>
                            <span className="ic-pill">+24% MoM</span>
                        </div>
                        <h3>Freshwater Conserved</h3>
                        <div className="ic-value text-gradient">320,000 L</div>
                        <p className="ic-sub">Enough clean drinking water to sustain 450 families for a year</p>
                        <div className="ic-bar"><div className="ic-bar-fill" style={{ width: '85%' }} /></div>
                    </div>

                    <div className="impact-card glass-pane">
                        <div className="ic-header">
                            <div className="ic-icon land"><ShieldCheck size={26} /></div>
                            <span className="ic-pill">+31% MoM</span>
                        </div>
                        <h3>Landfill Diversion</h3>
                        <div className="ic-value text-gradient">28.4 Tons</div>
                        <p className="ic-sub">Prevented soil leaching and dangerous open dump methane fires</p>
                        <div className="ic-bar"><div className="ic-bar-fill" style={{ width: '92%' }} /></div>
                    </div>

                    <div className="impact-card glass-pane">
                        <div className="ic-header">
                            <div className="ic-icon energy"><Zap size={26} /></div>
                            <span className="ic-pill">+15% MoM</span>
                        </div>
                        <h3>Clean Energy Saved</h3>
                        <div className="ic-value text-gradient">42,800 kWh</div>
                        <p className="ic-sub">Sufficient electricity to power 180 Indian urban homes for a month</p>
                        <div className="ic-bar"><div className="ic-bar-fill" style={{ width: '70%' }} /></div>
                    </div>
                </div>
            </section>

            {/* UN Sustainable Development Goals */}
            <section id="sdgs" className="sdg-section">
                <div className="sdg-container glass-pane">
                    <div className="sdg-text">
                        <span className="sdg-badge-top">Global Standards</span>
                        <h2>Engineered to Fulfill UN SDGs</h2>
                        <p>ReValue's marketplace algorithms directly benchmark impact against the United Nations Sustainable Development Goals for 2030.</p>
                    </div>

                    <div className="sdg-grid">
                        <div className="sdg-item">
                            <div className="sdg-tag-num">12</div>
                            <div>
                                <h4>Responsible Consumption</h4>
                                <p>Promoting resource efficiency and recycling cultures.</p>
                            </div>
                        </div>
                        <div className="sdg-item">
                            <div className="sdg-tag-num">13</div>
                            <div>
                                <h4>Climate Action</h4>
                                <p>Direct reduction of greenhouse emissions in waste handling.</p>
                            </div>
                        </div>
                        <div className="sdg-item">
                            <div className="sdg-tag-num">11</div>
                            <div>
                                <h4>Sustainable Cities</h4>
                                <p>Cleaner urban neighborhoods with smart waste logistics.</p>
                            </div>
                        </div>
                        <div className="sdg-item">
                            <div className="sdg-tag-num">08</div>
                            <div>
                                <h4>Decent Work & Growth</h4>
                                <p>Fair prices and dignified livelihoods for waste workers.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom Call to Action */}
            <section className="cta-banner-section">
                <div className="cta-card glass-pane">
                    <div className="cta-badge">Ready to Make an Impact?</div>
                    <h2>Join Thousands Diverting Waste Today</h2>
                    <p>Sign up in under 60 seconds. List your first batch or connect directly with certified recyclers in your neighborhood.</p>
                    <div className="cta-buttons">
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                            Create Free Account <ArrowRight size={18} />
                        </button>
                        <button className="btn btn-outline btn-lg" onClick={() => navigate('/login')}>
                            Sign In to Portal
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <div className="nav-brand">
                            <Recycle size={22} color="var(--accent-mint)" />
                            <span>Re<span className="text-gradient">Value</span></span>
                        </div>
                        <p>Empowering the circular economy through technology, trust, and environmental stewardship.</p>
                    </div>
                    <div className="footer-links">
                        <span className="footer-col-title">Platform</span>
                        <a href="#how-it-works">How It Works</a>
                        <a href="#impact">Impact Metrics</a>
                        <a href="#sdgs">UN SDGs</a>
                    </div>
                    <div className="footer-links">
                        <span className="footer-col-title">Portals</span>
                        <a onClick={() => navigate('/login')}>Individual Seller</a>
                        <a onClick={() => navigate('/login')}>Collector Hub</a>
                        <a onClick={() => navigate('/login')}>Industry Sourcing</a>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} ReValue Circular Technologies. Made with 🌿 for a cleaner planet.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;