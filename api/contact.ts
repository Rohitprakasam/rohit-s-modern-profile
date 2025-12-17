import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO = 'Rohitprakasam/rohit-s-modern-profile'; // Hardcoded for this specific project

    if (!GITHUB_TOKEN) {
        console.error('GITHUB_TOKEN is missing');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const response = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: `Contact Form: ${name}`,
                body: `**Name:** ${name}\n**Email:** ${email}\n\n**Message:**\n${message}`,
                labels: ['contact-form']
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('GitHub API Error:', errorData);
            return res.status(response.status).json({ error: 'Failed to create issue', details: errorData });
        }

        const data = await response.json();
        return res.status(200).json({ success: true, issueUrl: data.html_url });

    } catch (error) {
        console.error('Internal Server Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
