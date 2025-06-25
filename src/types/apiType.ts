// src/types/apiTypes.ts

// Interface for the snippet part of a YouTube video item
export interface YouTubeVideoSnippet {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
        default: { url: string; width: number; height: number; };
        medium: { url: string; width: number; height: number; };
        high: { url: string; width: number; height: number; };
        standard?: { url: string; width: number; height: number; };
        maxres?: { url: string; width: number; height: number; };
    };
    channelTitle: string;
    tags?: string[];
    categoryId?: string;
    liveBroadcastContent?: string;
    localized?: {
        title: string;
        description: string;
    };
}

// Interface for the contentDetails part of a YouTube video item
export interface YouTubeVideoContentDetails {
    duration: string; // ISO 8601 duration (e.g., "PT15M33S")
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
    contentRating?: {};
    projection?: string;
}

// Interface for a single video item in the YouTube API response
export interface YouTubeVideoItem {
    kind: string;
    etag: string;
    id: string; // This is the YouTube video ID
    snippet: YouTubeVideoSnippet;
    contentDetails: YouTubeVideoContentDetails;
    // Add other parts like 'status', 'statistics', 'player' if needed
}

// Interface for the overall YouTube Data API response for videos
export interface YouTubeApiResponse {
    kind: string;
    etag: string;
    items?: YouTubeVideoItem[];
    pageInfo?: {
        totalResults: number;
        resultsPerPage: number;
    };
    error?: {
        code: number;
        message: string;
        errors: Array<{
            message: string;
            domain: string;
            reason: string;
        }>;
    };
}

// Interface for the structured metadata we want to extract and use in our app
export interface FetchedVideoMetadata {
    youtubeId: string;
    title: string;
    thumbnailUrl: string;
    duration: number; // Duration in seconds
}



