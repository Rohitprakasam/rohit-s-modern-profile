import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Fetcher function
const fetchData = async (endpoint: string) => {
    try {
        const res = await fetch("/api/" + endpoint);
        if (!res.ok) {
            const errorBody = await res.text().catch(() => "");
            throw new Error("Failed to fetch " + endpoint + ": " + res.status + " " + res.statusText + (errorBody ? " (" + errorBody + ")" : ""));
        }
        return res.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export const usePortfolio = () => {
    const queryClient = useQueryClient();

    // Retry: 1 to avoid infinite loops on 404s, but ensure we try
    // Retry: 1 to avoid infinite loops on 404s, but ensure we try
    const profileQuery = useQuery({ queryKey: ["profile"], queryFn: () => fetchData("profile"), retry: 1 });
    const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => fetchData("crud?collection=projects"), retry: 1 });
    const skillsQuery = useQuery({ queryKey: ["skills"], queryFn: () => fetchData("crud?collection=skills"), retry: 1 });
    const experienceQuery = useQuery({ queryKey: ["experience"], queryFn: () => fetchData("crud?collection=experience"), retry: 1 });
    const educationQuery = useQuery({ queryKey: ["education"], queryFn: () => fetchData("crud?collection=education"), retry: 1 });
    const certificationsQuery = useQuery({ queryKey: ["certifications"], queryFn: () => fetchData("crud?collection=certifications"), retry: 1 });
    const postsQuery = useQuery({ queryKey: ["posts"], queryFn: () => fetchData("crud?collection=posts"), retry: 1 });

    const isLoading =
        profileQuery.isLoading ||
        projectsQuery.isLoading ||
        skillsQuery.isLoading ||
        experienceQuery.isLoading ||
        educationQuery.isLoading ||
        certificationsQuery.isLoading ||
        postsQuery.isLoading;

    const isError =
        profileQuery.isError ||
        projectsQuery.isError ||
        skillsQuery.isError ||
        experienceQuery.isError ||
        educationQuery.isError ||
        certificationsQuery.isError ||
        postsQuery.isError;

    const data = useMemo(() => ({
        // Handling potential undefined data
        siteMeta: profileQuery.data?.siteMeta,
        heroSection: profileQuery.data?.heroSection,
        aboutMe: profileQuery.data?.aboutMe,
        contact: profileQuery.data?.contact,
        interests: profileQuery.data?.interests,

        // Arrays - Default to empty if not loaded yet
        skills: skillsQuery.data || [],
        projects: projectsQuery.data || [],
        experience: experienceQuery.data || [],
        education: educationQuery.data || [],
        certifications: certificationsQuery.data || [],
        posts: postsQuery.data || [],
    }), [
        profileQuery.data,
        skillsQuery.data,
        projectsQuery.data,
        experienceQuery.data,
        educationQuery.data,
        certificationsQuery.data,
        postsQuery.data
    ]);

    return {
        data,
        isLoading,
        isError,
        queries: {
            profile: profileQuery,
            projects: projectsQuery,
            skills: skillsQuery,
            experience: experienceQuery,
            education: educationQuery,
            certifications: certificationsQuery,
            posts: postsQuery
        }
    };
};

export const usePortfolioData = () => {
    const { data } = usePortfolio();
    return data;
}
