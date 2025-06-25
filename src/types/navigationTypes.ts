// src/types/navigationTypes.ts
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Define the parameters for each screen in the stack
export type RootStackParamList = {
    Login: undefined; // No params expected for Login
    Dashboard: undefined;
    VideoPlayer: { videoId: string };
    AddVideo: undefined;
    ScheduleSession: { videoId: string };
    // Add other screens and their params here as the app grows
};

// Define prop types for each screen component
export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type DashboardScreenProps = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;
export type VideoPlayerScreenProps = NativeStackScreenProps<RootStackParamList, 'VideoPlayer'>;
export type AddVideoScreenProps = NativeStackScreenProps<RootStackParamList, 'AddVideo'>;
export type ScheduleSessionScreenProps = NativeStackScreenProps<RootStackParamList, 'ScheduleSession'>;

// If you use @react-navigation/bottom-tabs or other navigators, define their param lists here too
// export type BottomTabParamList = {
//   Home: undefined;
//   Profile: { userId: string };
