// src/services/youtubeApi.ts

import { FetchedVideoMetadata, YouTubeApiResponse } from "../types/apiType";
import { YOUTUBE_API_KEY } from '@env';

// IMPORTANT: Store your YouTube Data API Key securely.
// For client-side apps, consider using a backend proxy to make API calls
// to avoid exposing the API key directly in the app.
// For this MVP, it's placed here but with a strong recommendation for better security.

/**
 * Extracts the YouTube Video ID from various YouTube URL formats.
 * @param url The YouTube URL.
 * @returns The YouTube Video ID string, or null if not found.
 */
export const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    // Regex to capture video ID from various YouTube URL formats
    const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

/**
 * Converts an ISO 8601 duration string (e.g., "PT15M33S") to seconds.
 * @param durationISO The ISO 8601 duration string.
 * @returns The duration in seconds.
 */
export const convertISO8601ToSeconds = (durationISO: string): number => {
    if (!durationISO) return 0;
    // Regex to parse ISO 8601 duration format
    const match = durationISO.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return (hours * 3600) + (minutes * 60) + seconds;
};

/**
 * Fetches video metadata from the YouTube Data API v3.
 * @param youtubeUrl The URL of the YouTube video.
 * @returns A Promise resolving to FetchedVideoMetadata.
 * @throws Error if the URL is invalid, video not found, or API error.
 */
export const fetchVideoMetadata = async (youtubeUrl: string): Promise<FetchedVideoMetadata> => {
    const youtubeId = extractYouTubeId(youtubeUrl);
    if (!youtubeId) {
        throw new Error('Invalid YouTube URL provided.');
    }

    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === 'YOUR_YOUTUBE_DATA_API_KEY') {
        console.error(`YouTube API Key ${YOUTUBE_API_KEY} is not configured. Please set it in src/services/youtubeApi.ts`);
        throw new Error('YouTube API Key not configured.');
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${youtubeId}&part=snippet,contentDetails&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            // Attempt to parse error from YouTube API response
            const errorData = await response.json().catch(() => ({})); // Catch if error response isn't JSON
            const errorMessage = errorData?.error?.message || `HTTP error! status: ${response.status}`;
            console.error('YouTube API request failed:', errorMessage, errorData);
            throw new Error(`Failed to fetch video data: ${errorMessage}`);
        }

        const data: YouTubeApiResponse = await response.json();

        if (data.error) {
            console.error("YouTube API Error:", data.error.message);
            throw new Error(`YouTube API Error: ${data.error.message}`);
        }

        if (data.items && data.items.length > 0) {
            const video = data.items[0];
            const title = video.snippet.title;
            // Prefer high quality thumbnail, fallback to medium or default
            const thumbnailUrl = video.snippet.thumbnails.high?.url ||
                video.snippet.thumbnails.medium?.url ||
                video.snippet.thumbnails.default?.url;
            const durationISO = video.contentDetails.duration;
            const durationInSeconds = convertISO8601ToSeconds(durationISO);

            if (!thumbnailUrl) {
                console.warn("Thumbnail URL not found for video:", youtubeId);
            }

            return {
                youtubeId,
                title,
                thumbnailUrl: thumbnailUrl || `https://placehold.co/480x360/000000/FFFFFF?text=No+Thumbnail&font=Inter`, // Fallback placeholder
                duration: durationInSeconds,
            };
        }

        throw new Error('Video not found or API response format incorrect.');

    } catch (error: any) {
        console.error('Error in fetchVideoMetadata:', error);
        // Re-throw the error or throw a more specific one
        throw new Error(error.message || 'An unexpected error occurred while fetching video metadata.');
    }
};