import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { portfolioData } = req.body;

    if (!portfolioData) {
        return res.status(400).json({ error: 'Missing portfolio data' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = 'Rohitprakasam/rohit-s-modern-profile';
    const FILE_PATH = 'src/data/portfolio.ts';

    if (!GITHUB_TOKEN) {
        console.error('GITHUB_TOKEN is missing');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        // 1. Get current file SHA (needed for update)
        const getFileResponse = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });

        if (!getFileResponse.ok) {
            const err = await getFileResponse.json().catch(() => ({}));
            throw new Error(`GitHub GET Error ${getFileResponse.status}: ${JSON.stringify(err)}`);
        }

        const fileData = await getFileResponse.json();
        const sha = fileData.sha;

        // 2. Prepare new content
        // We need to keep the interfaces at the bottom of the file
        const interfaces = `
export interface Post {
    id: string;
    title: string;
    subtitle: string;
    content: string;
    image: string;
    author: {
        name: string;
        avatar: string; // url or path
        role: string;
    };
    date: string;
    readTime: string;
    likes: number;
    comments: Comment[];
    tags: string[];
}

export interface Comment {
    id: string;
    user: string;
    avatar: string;
    text: string;
    date: string;
    replies: Comment[];
}
`;

        // Convert data to JSON string, then prepend export
        const newContent = `export const portfolioData = ${JSON.stringify(portfolioData, null, 4)};\n${interfaces}`;

        // Convert to Base64 for GitHub API
        const contentBase64 = Buffer.from(newContent).toString('base64');

        // 3. Update file
        const updateResponse = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'chore(cms): update portfolio data via admin panel',
                content: contentBase64,
                sha: sha,
                sha: sha,
                branch: 'main',
                committer: {
                    name: 'Rajalakshmi G',
                    email: 'rajalakshmig1981@gmail.com'
                },
                author: {
                    name: 'Rajalakshmi G',
                    email: 'rajalakshmig1981@gmail.com'
                }
            }),
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('GitHub API Update Error:', errorData);
            return res.status(updateResponse.status).json({ error: 'Failed to update file', details: errorData });
        }

        const data = await updateResponse.json();
        return res.status(200).json({ success: true, commit: data.commit.html_url });

    } catch (error: any) {
        console.error('Internal Server Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: { message: error.message || String(error) } });
    }
}
