const mongoose = require("mongoose");
const Post = require("./models/Post");
const User = require("./models/User");
const Notification = require("./models/Notification");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const dummyUsers = [
    {
        name: "Rahul Verma",
        email: "rahul@example.com",
        password: "password123",
        role: "individual",
        phone: "+91 98765 43210",
        locationCoordinates: { latitude: 12.9352, longitude: 77.6245 }, // Koramangala
        address: "Koramangala 4th Block, Bengaluru"
    },
    {
        name: "Deepa Nair",
        email: "deepa@example.com",
        password: "password123",
        role: "individual",
        phone: "+91 98765 43211",
        locationCoordinates: { latitude: 12.9121, longitude: 77.6446 }, // HSR Layout
        address: "Sector 2, HSR Layout, Bengaluru"
    },
    {
        name: "Amit Shah",
        email: "amit@example.com",
        password: "password123",
        role: "individual",
        phone: "+91 98765 43212",
        locationCoordinates: { latitude: 12.9784, longitude: 77.6408 }, // Indiranagar
        address: "100ft Road, Indiranagar, Bengaluru"
    },
    {
        name: "GreenHub Connect",
        email: "collector@example.com",
        password: "password123",
        role: "collector",
        phone: "+91 98765 43220",
        collectorType: "organization",
        hubLocation: "Koramangala / BTM Zone, Bengaluru",
        locationCoordinates: { latitude: 12.9250, longitude: 77.6100 },
        materialsAccepted: ["plastic", "paper", "metal", "glass", "ewaste", "organic"],
        vehicleType: "Tata Ace EV (1 Ton)",
        serviceRadiusKm: 15,
        isAvailable: true,
        rating: 4.9
    },
    {
        name: "EcoCycle Industries",
        email: "industry@example.com",
        password: "password123",
        role: "industry",
        phone: "+91 98765 43230",
        industryType: "Plastics & Polymers Recycling",
        materialsRequired: ["plastic", "metal"],
        monthlyDemand: "5 Tons/month",
        minQuantityRequired: 20,
        qualityPreference: "clean",
        gstin: "29AABCU9603R1ZM",
        locationCoordinates: { latitude: 12.9850, longitude: 77.5500 },
        rating: 4.8
    }
];

const dummyPosts = [
    {
        title: 'Clean PET Plastic Bottles', category: 'plastic', condition: 'Washed & Sorted',
        weight: 50, priceMin: 10, priceMax: 14,
        location: 'Koramangala, Bengaluru', pincode: '560034',
        latitude: 12.9352, longitude: 77.6245,
        exactAddress: 'Flat 402, Green Glen Layout, Koramangala 4th Block',
        description: 'Bulk PET bottles, thoroughly washed and compressed. Ready for pickup.',
        image: 'https://images.unsplash.com/photo-1611284446314-60a5840ce3d2?auto=format&fit=crop&q=80&w=400',
        creatorEmail: "rahul@example.com",
        aiPredictedCategory: "plastic",
        aiConfidence: 0.94,
        isConfirmedByUser: true
    },
    {
        title: 'Office Paper Waste Bundle', category: 'paper', condition: 'Dry & Bundled',
        weight: 120, priceMin: 7, priceMax: 10,
        location: 'HSR Layout, Bengaluru', pincode: '560102',
        latitude: 12.9121, longitude: 77.6446,
        exactAddress: 'House 88, 14th Main, Sector 2, HSR Layout',
        description: 'Office paper waste, shredded and bundled. No food contamination.',
        image: 'https://images.unsplash.com/photo-1595278148419-3549e3e3bdf5?auto=format&fit=crop&q=80&w=400',
        creatorEmail: "deepa@example.com",
        aiPredictedCategory: "paper",
        aiConfidence: 0.91,
        isConfirmedByUser: true
    },
    {
        title: 'Old Laptops & Motherboards', category: 'ewaste', condition: 'Non-working',
        weight: 9, priceMin: 100, priceMax: 150,
        location: 'Electronic City, Bengaluru', pincode: '560100',
        latitude: 12.8399, longitude: 77.6770,
        exactAddress: 'TechPark Gate 3, Electronic City Phase 1',
        description: 'Non-functional laptops, PCBs, RAM sticks. Data wiped.',
        image: 'https://images.unsplash.com/photo-1550083395-65abdb20b606?auto=format&fit=crop&q=80&w=400',
        creatorEmail: "amit@example.com",
        aiPredictedCategory: "ewaste",
        aiConfidence: 0.88,
        isConfirmedByUser: true
    },
    {
        title: 'Scrap Aluminum Cans', category: 'metal', condition: 'Crushed',
        weight: 35, priceMin: 80, priceMax: 100,
        location: 'Whitefield, Bengaluru', pincode: '560066',
        latitude: 12.9698, longitude: 77.7500,
        exactAddress: 'Prestige Boulevard Villa 12, Whitefield',
        description: 'Aluminum beverage cans, well crushed and packed.',
        image: 'https://images.unsplash.com/photo-1572205336214-41d89bf44a7f?auto=format&fit=crop&q=80&w=400',
        creatorEmail: "rahul@example.com",
        aiPredictedCategory: "metal",
        aiConfidence: 0.93,
        isConfirmedByUser: true
    },
    {
        title: 'Glass Bottles - Mixed Colors', category: 'glass', condition: 'Intact',
        weight: 60, priceMin: 3, priceMax: 5,
        location: 'Indiranagar, Bengaluru', pincode: '560038',
        latitude: 12.9784, longitude: 77.6408,
        exactAddress: 'Behind Toit Pub, 100 Feet Road, Indiranagar',
        description: 'Mixed glass bottles from restaurant. Rinsed and sorted by color.',
        image: 'https://images.unsplash.com/photo-1517524285303-d6fc683dddf8?auto=format&fit=crop&q=80&w=400',
        creatorEmail: "deepa@example.com",
        aiPredictedCategory: "glass",
        aiConfidence: 0.89,
        isConfirmedByUser: true
    },
    {
        title: 'HDPE Plastic Drums', category: 'plastic', condition: 'Cleaned',
        weight: 200, priceMin: 16, priceMax: 20,
        location: 'Peenya, Bengaluru', pincode: '560058',
        latitude: 13.0300, longitude: 77.5200,
        exactAddress: 'Industrial Shed 44, 2nd Stage Peenya',
        description: 'Large HDPE industrial drums, cleaned and ready for recycling.',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=400',
        creatorEmail: "amit@example.com",
        aiPredictedCategory: "plastic",
        aiConfidence: 0.96,
        isConfirmedByUser: true
    }
];

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/revalueDB").then(async () => {
    console.log("Connected to MongoDB for seeding...");

    await Post.deleteMany({});
    await Notification.deleteMany({});
    console.log("Cleared old posts and notifications.");

    const userMap = {};
    for (const u of dummyUsers) {
        let user = await User.findOne({ email: u.email });
        if (!user) {
            const hashedPassword = await bcrypt.hash(u.password, 10);
            user = new User({ ...u, password: hashedPassword });
            await user.save();
            console.log(`Created user: ${u.name} (${u.role})`);
        } else {
            // Update location fields if they didn't have coordinates
            user.locationCoordinates = u.locationCoordinates;
            user.serviceRadiusKm = u.serviceRadiusKm || 5;
            user.materialsAccepted = u.materialsAccepted || [];
            user.materialsRequired = u.materialsRequired || [];
            user.monthlyDemand = u.monthlyDemand || "";
            user.minQuantityRequired = u.minQuantityRequired || 10;
            user.qualityPreference = u.qualityPreference || "any";
            await user.save();
            console.log(`Updated user coordinates: ${u.name}`);
        }
        userMap[u.email] = user._id;
    }

    const postsToInsert = dummyPosts.map(p => {
        const { creatorEmail, ...postData } = p;
        return {
            ...postData,
            createdBy: userMap[creatorEmail],
            status: "available",
            unit: "kg",
        };
    });

    const inserted = await Post.insertMany(postsToInsert);
    console.log(`Successfully seeded ${inserted.length} posts with geo-coordinates!`);

    process.exit(0);
}).catch(err => {
    console.error("Failed to seed data:", err);
    process.exit(1);
});
