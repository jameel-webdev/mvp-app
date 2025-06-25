// src/types/firebaseTypes.ts
import firebase from 'firebase/compat/app'; // Using compat for v8 style
import 'firebase/compat/firestore';

export interface UserPreferences {
    defaultSessionDuration: number; // minutes
    notificationEnabled: boolean;
}

export interface UserStats {
    totalVideosAdded: number;
    totalMinutesWatched: number;
    sessionsCompleted: number;
}

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL?: string | null; // From Google OAuth
    preferences: UserPreferences;
    stats: UserStats;
    createdAt: firebase.firestore.Timestamp;
}

export interface VideoProgress {
    lastPosition: number; // seconds
    completionPercentage: number;
    completed: boolean;
    lastUpdated: firebase.firestore.Timestamp;
}

export interface Video {
    id?: string; // Firestore document ID, optional before creation
    youtubeId: string;
    title: string;
    thumbnailUrl: string;
    duration: number; // seconds
    userId: string;
    dateAdded: firebase.firestore.Timestamp;
    progress: VideoProgress;
}

export interface LearningSession {
    id?: string; // Firestore document ID
    videoId: string;
    userId: string;
    scheduledFor: firebase.firestore.Timestamp;
    duration: number; // minutes
    completed: boolean;
    createdAt: firebase.firestore.Timestamp;
    notificationId?: string | null; // To store the ID of the scheduled notification
}

