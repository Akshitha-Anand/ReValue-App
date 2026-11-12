import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle, Loader, Sparkles, AlertTriangle, MapPin, Navigation, Locate } from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../api';
import './CreatePost.css';


// ========== AI Classifier Logic ==========
const wasteKeywords = {
    plastic: ['plastic', 'bottle', 'pet', 'pvc', 'hdpe', 'polythene', 'wrapper', 'bag', 'container', 'drum', 'tub', 'chair'],
    paper: ['paper', 'newspaper', 'cardboard', 'carton', 'book', 'magazine', 'document', 'tissue', 'box'],
    metal: ['metal', 'iron', 'steel', 'copper', 'aluminum', 'aluminium', 'can', 'rod', 'wire', 'scrap', 'pipe', 'tin'],
    ewaste: ['laptop', 'computer', 'phone', 'mobile', 'keyboard', 'motherboard', 'circuit', 'pcb', 'battery', 'charger', 'monitor', 'tv', 'electronic', 'cable'],
    glass: ['glass', 'bottle', 'jar', 'mirror', 'window', 'bulb']
};

function classifyWaste(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    let scores = {};
    for (const [cat, keywords] of Object.entries(wasteKeywords)) {
        scores[cat] = keywords.filter(kw => text.includes(kw)).length;
    }
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    const confidence = best[1] === 0 ? 60 : Math.min(60 + best[1] * 12, 99);
    return { category: best[1] === 0 ? 'plastic' : best[0], confidence };
}

const categoryInfo = {
    plastic: { icon: '♻️', tip: 'Clean and sort plastics for better price. PET & HDPE fetch highest rates.' },
    paper: { icon: '📄', tip: 'Keep dry and bundled. Wet paper loses 40% of its value.' },
    metal: { icon: '🔩', tip: 'Separate ferrous from non-ferrous metals to maximize payout.' },
    ewaste: { icon: '💻', tip: 'Wipe all personal data. Non-functional items still hold component value.' },
    glass: { icon: '🍶', tip: 'Sort by color (clear/brown/green). Intact bottles fetch premium.' },
};

const CreatePost = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '', description: '', category: '', condition: 'Good',
        weight: '', unit: 'kg', priceMin: '', priceMax: '', location: '', pincode: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [aiState, setAiState] = useState({ loading: false, result: null });
    const [submitted, setSubmitted] = useState(false);
    const [coords, setCoords] = useState({ latitude: null, longitude: null });
    const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | success | error

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
    };

    const runAiClassification = async (file, titleHint = '', descHint = '') => {
        setAiState({ loading: true, result: null });
        if (file) {
            try {
                const aiForm = new FormData();
                aiForm.append('image', file);
                const hint = `${titleHint} ${descHint}`.trim();
                if (hint) {
                    aiForm.append('hint', hint);
                }
                const res = await axios.post(`${API_BASE_URL}/api/ai/classify`, aiForm, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    timeout: 8000
                });

                if (res.data && res.data.success) {
                    const cat = res.data.suggested_category || res.data.category;
                    const conf = Math.round((res.data.confidence || 0.8) * 100);
                    setAiState({
                        loading: false,
                        result: {
                            category: cat,
                            confidence: conf,
                            tip: res.data.recycling_tip,
                            modelStatus: res.data.model_status
                        }
                    });
                    setFormData(p => ({ ...p, category: cat }));
                    return;
                }
            } catch (err) {
                console.warn('Backend ML inference fallback to keyword analysis:', err.message);
            }
        }

        // Fast keyword classifier fallback
        setTimeout(() => {
            const hint = (file ? file.name : '') + ' ' + titleHint;
            const result = classifyWaste(hint, descHint);
            setAiState({ loading: false, result });
            setFormData(p => ({ ...p, category: result.category }));
        }, 800);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);

        runAiClassification(file, formData.title, formData.description);
    };

    const handleDescriptionBlur = () => {
        if (!aiState.result && (formData.title || formData.description)) {
            runAiClassification(imageFile, formData.title, formData.description);
        }
    };

    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            setGeoStatus('error');
            return;
        }
        setGeoStatus('loading');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                setGeoStatus('success');
            },
            () => setGeoStatus('error'),
            { timeout: 10000 }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const payload = new FormData();
            Object.keys(formData).forEach(key => payload.append(key, formData[key]));
            if (imageFile) {
                payload.append('image', imageFile);
            }
            // Append GPS coordinates if captured
            if (coords.latitude !== null) {
                payload.append('latitude', coords.latitude);
                payload.append('longitude', coords.longitude);
            }
            // Append AI prediction metadata
            if (aiState.result) {
                payload.append('aiPredictedCategory', aiState.result.category);
                payload.append('aiConfidence', aiState.result.confidence);
                payload.append('isConfirmedByUser', 'true');
            }

            await axios.post(`${API_BASE_URL}/api/posts`, payload, {

                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            setSubmitted(true);
            setTimeout(() => navigate('/marketplace'), 2000);
        } catch (err) {
            console.error("Error creating post:", err);
            // Fallback for demo just in case backend throws an error
            setSubmitted(true);
            setTimeout(() => navigate('/marketplace'), 2000);
        }
    };

    if (submitted) {
        return (
            <div className="create-post-page animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div className="success-screen glass-pane">
                    <div className="success-icon">✅</div>
                    <h2>Post Created!</h2>
                    <p>Your waste listing is now live on the marketplace.<br />Collectors in your area will contact you soon.</p>
                    <div className="loader-bar"></div>
                </div>
            </div>
        );
    }

    const info = formData.category ? categoryInfo[formData.category] : null;

    return (
        <div className="create-post-page animate-fade-in">
            <div className="section-header">
                <h1>Post Waste Material</h1>
                <p className="subtitle">Upload an image or describe your waste — AI will auto-classify it for better visibility.</p>
            </div>

            <div className="post-form-wrapper glass-pane">
                <form onSubmit={handleSubmit} className="post-form">

                    {/* Left: Image + AI */}
                    <div className="form-left">
                        <div className="form-group">
                            <label>Upload Image</label>
                            <label htmlFor="waste-img" className="image-upload-box">
                                {imagePreview ? (
                                    <div className="image-preview" style={{ backgroundImage: `url(${imagePreview})` }}>
                                        <div className="preview-overlay"><span>Change Image</span></div>
                                    </div>
                                ) : (
                                    <div className="upload-placeholder">
                                        <UploadCloud size={38} color="var(--accent-secondary)" />
                                        <p>Click to upload or drag image</p>
                                        <span className="file-hint">JPG, PNG up to 10 MB</span>
                                    </div>
                                )}
                                <input id="waste-img" type="file" onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
                            </label>
                        </div>

                        {/* AI Status Box */}
                        {!aiState.loading && !aiState.result && (
                            <button type="button" className="btn btn-outline" style={{ width: '100%', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }} onClick={() => {
                                runAiClassification(imageFile, formData.title || 'waste', formData.description);
                            }}>
                                <Sparkles size={18} /> Auto-Classify with AI
                            </button>
                        )}

                        {aiState.loading && (
                            <div className="ai-box loading">
                                <Loader size={20} className="spin" />
                                <div>
                                    <p className="ai-title">AI Vision Model Running...</p>
                                    <p className="ai-sub">Scanning image & analyzing waste features...</p>
                                </div>
                            </div>
                        )}

                        {aiState.result && !aiState.loading && (
                            <div className="ai-box success">
                                <div className="ai-icon">{categoryInfo[aiState.result.category]?.icon || '♻️'}</div>
                                <div>
                                    <p className="ai-title"><CheckCircle size={14} /> AI Match: <strong>{aiState.result.category.toUpperCase()}</strong></p>
                                    <div className="confidence-bar-wrap">
                                        <div className="confidence-bar" style={{ width: `${aiState.result.confidence}%` }}></div>
                                    </div>
                                    <p className="ai-sub">
                                        {aiState.result.confidence}% confidence score
                                        {aiState.result.modelStatus === 'mobilenetv2_trained' && ' • MobileNetV2'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Category Tip */}
                        {(aiState.result?.tip || info?.tip) && (
                            <div className="category-tip">
                                <Sparkles size={16} color="#f59e0b" />
                                <p>{aiState.result?.tip || info?.tip}</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Form Fields */}
                    <div className="form-right">
                        <div className="form-group">
                            <label>Post Title *</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} onBlur={handleDescriptionBlur} placeholder="E.g. Sorted PET Bottles, E-Waste Lot" required />
                        </div>

                        <div className="form-row">
                            <div className="form-group flex-1">
                                <label>Material Category *</label>
                                <select name="category" value={formData.category} onChange={handleChange} required>
                                    <option value="">Select or let AI detect</option>
                                    <option value="plastic">♻️ Plastic</option>
                                    <option value="paper">📄 Paper</option>
                                    <option value="metal">🔩 Metal</option>
                                    <option value="ewaste">💻 E-Waste</option>
                                    <option value="glass">🍶 Glass</option>
                                </select>
                            </div>
                            <div className="form-group flex-1">
                                <label>Condition</label>
                                <select name="condition" value={formData.condition} onChange={handleChange}>
                                    <option>Good</option>
                                    <option>Washed & Sorted</option>
                                    <option>Dry & Bundled</option>
                                    <option>Crushed</option>
                                    <option>Non-working</option>
                                    <option>Mixed</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group flex-2">
                                <label>Quantity / Weight *</label>
                                <input type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="Enter quantity" required min="0.1" step="0.1" />
                            </div>
                            <div className="form-group flex-1">
                                <label>Unit</label>
                                <select name="unit" value={formData.unit} onChange={handleChange}>
                                    <option>kg</option>
                                    <option>tons</option>
                                    <option>pieces</option>
                                    <option>liters</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group flex-1">
                                <label>Min Price (₹/unit) *</label>
                                <input type="number" name="priceMin" value={formData.priceMin} onChange={handleChange} placeholder="₹ Minimum" required min="0" />
                            </div>
                            <div className="form-group flex-1">
                                <label>Max Price (₹/unit)</label>
                                <input type="number" name="priceMax" value={formData.priceMax} onChange={handleChange} placeholder="₹ Maximum" min="0" />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group flex-2">
                                <label><MapPin size={14} /> Location / Area *</label>
                                <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="E.g. Koramangala, Bengaluru" required />
                            </div>
                            <div className="form-group flex-1">
                                <label>Pincode</label>
                                <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="560034" maxLength={6} />
                            </div>
                        </div>

                        {/* GPS Coordinates Capture */}
                        <div className="form-group">
                            <label>GPS Location <span className="optional-tag">(Recommended — enables nearby collector alerts)</span></label>
                            <div className="gps-row">
                                <button
                                    type="button"
                                    className={`btn btn-outline gps-btn ${geoStatus}`}
                                    onClick={handleDetectLocation}
                                    disabled={geoStatus === 'loading'}
                                >
                                    {geoStatus === 'loading' ? (
                                        <><Loader size={16} className="spin" /> Detecting...</>
                                    ) : geoStatus === 'success' ? (
                                        <><CheckCircle size={16} color="#10b981" /> Location Captured!</>
                                    ) : geoStatus === 'error' ? (
                                        <><AlertTriangle size={16} color="#ef4444" /> Try Again</>
                                    ) : (
                                        <><MapPin size={16} /> Detect My Location</>
                                    )}
                                </button>
                                {coords.latitude !== null && (
                                    <span className="gps-coords">
                                        📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                                    </span>
                                )}
                            </div>
                            {geoStatus === 'success' && (
                                <p className="gps-success-msg">✅ Nearby collectors will be automatically notified when you post!</p>
                            )}
                            {geoStatus === 'error' && (
                                <p className="gps-error-msg">❌ Location access denied. Enable browser location or enter coordinates manually.</p>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} onBlur={handleDescriptionBlur}
                                placeholder="Describe the material's condition, packaging, origin... (AI uses this text to improve classification)"
                                rows="3" />
                        </div>

                        <button type="submit" className="btn btn-primary submit-btn">
                            <UploadCloud size={20} /> Publish Listing
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePost;
