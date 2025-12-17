import { useState, useEffect } from 'react';
import { portfolioData as initialData } from '@/data/portfolio';

export const usePortfolioData = () => {
    const [data, setData] = useState(initialData);

    useEffect(() => {
        const loadData = () => {
            const saved = localStorage.getItem("portfolioData");
            if (saved) {
                try {
                    setData(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to load portfolio data", e);
                }
            }
        };

        loadData();

        // Optional: Listen for storage events to update across tabs
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, []);

    return data;
};
