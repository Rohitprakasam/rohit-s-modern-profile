
import { VercelRequest, VercelResponse } from '@vercel/node';
import clientPromise from '../lib/mongodb.js';
import { portfolioData } from '../src/data/portfolio.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.query.secret !== process.env.SEED_SECRET && process.env.NODE_ENV !== 'development') {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const client = await clientPromise;
        const db = client.db("portfolio"); // Using a specific database name

        // 1. Projects
        if (portfolioData.projects) {
            await db.collection("projects").deleteMany({});
            await db.collection("projects").insertMany(portfolioData.projects);
        }

        // 2. Skills
        if (portfolioData.skills) {
            await db.collection("skills").deleteMany({});
            await db.collection("skills").insertMany(portfolioData.skills);
        }

        // 3. Experience
        if (portfolioData.experience) {
            await db.collection("experience").deleteMany({});
            await db.collection("experience").insertMany(portfolioData.experience);
        }

        // 4. Education
        if (portfolioData.education) {
            await db.collection("education").deleteMany({});
            await db.collection("education").insertMany(portfolioData.education);
        }

        // 5. Certifications
        if (portfolioData.certifications) {
            await db.collection("certifications").deleteMany({});
            await db.collection("certifications").insertMany(portfolioData.certifications);
        }

        // 6. Posts (Blogs)
        if (portfolioData.posts) {
            await db.collection("posts").deleteMany({});
            await db.collection("posts").insertMany(portfolioData.posts);
        }

        // 7. General / Profile (Store as a single document)
        const profileData = {
            siteMeta: portfolioData.siteMeta,
            heroSection: portfolioData.heroSection,
            aboutMe: portfolioData.aboutMe,
            contact: portfolioData.contact,
            interests: portfolioData.interests,
        };
        await db.collection("profile").deleteMany({});
        await db.collection("profile").insertOne(profileData);

        return res.status(200).json({ message: 'Database seeded successfully' });
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}
