// src/navigation/AppNavigator.tsx
import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { auth } from '../services/firebase';
import type firebase from 'firebase/compat/app';

// Screen components
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import VideoPlayerScreen from '../screens/VideoPlayerScreen';
import AddVideoScreen from '../screens/AddVideoScreen';
import ScheduleSessionScreen from '../screens/ScheduleSessionScreen';

// Types
import { RootStackParamList } from '../types/navigationTypes';
import { ActivityIndicator, View, StyleSheet, AppState, AppStateStatus } from 'react-native';

// Notification service
import { requestNotificationPermissions, setupNotificationListeners } from '../services/notificationService';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
    const [user, setUser] = useState<firebase.User | null>(null);
    const [initializing, setInitializing] = useState<boolean>(true);
    const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

    // Handle user state changes
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((authUser) => {
            setUser(authUser);
            if (initializing) {
                setInitializing(false);
            }
        });
        return unsubscribe; // Unsubscribe on unmount
    }, [initializing]);

    // Request notification permissions and setup listeners on mount
    useEffect(() => {
        const initializeNotifications = async () => {
            // Request permissions when the app loads or at an appropriate time
            await requestNotificationPermissions();

            // Setup listeners for notification interactions
            // Ensure navigationRef.current is available
            if (navigationRef.current) {
                const cleanupListeners = setupNotificationListeners(navigationRef.current);
                return cleanupListeners; // Return cleanup function for useEffect
            }
        };

        // Delay setup until navigationRef is likely initialized
        const timeoutId = setTimeout(() => {
            if (navigationRef.current) {
                initializeNotifications();
            } else {
                // Retry or handle if nav ref not ready (less common for root navigator)
                console.warn("Navigation ref not ready for notification listener setup, retrying...");
                const retryTimeoutId = setTimeout(() => {
                    if (navigationRef.current) initializeNotifications();
                }, 1000);
                return () => clearTimeout(retryTimeoutId);
            }
        }, 0); // Execute after current event loop cycle

        return () => clearTimeout(timeoutId);
    }, []); // Empty dependency array ensures this runs once on mount


    // Handle AppState changes for potential background tasks or notifications
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                console.log('App has come to the foreground!');
                // You could re-check notification permissions or refresh data here
            } else if (nextAppState === 'background') {
                console.log('App has gone to the background!');
                // Schedule background tasks if any (e.g., using expo-task-manager)
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);


    if (initializing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#4285F4" />
            </View>
        );
    }

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
                screenOptions={{
                    headerStyle: { backgroundColor: '#4285F4' },
                    headerTintColor: '#fff',
                    headerTitleStyle: { fontWeight: 'bold' },
                }}
            >
                {!user ? (
                    // Auth screens
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }} // No header for Login screen
                    />
                ) : (
                    // App screens
                    <>
                        <Stack.Screen
                            name="Dashboard"
                            component={DashboardScreen}
                            options={{ title: 'Learning Dashboard' }}
                        />
                        <Stack.Screen
                            name="VideoPlayer"
                            component={VideoPlayerScreen}
                            options={({ route }) => ({
                                title: 'Video Player', // Can be customized further based on route.params
                                headerBackTitleVisible: false,
                            })}
                        />
                        <Stack.Screen
                            name="AddVideo"
                            component={AddVideoScreen}
                            options={{ title: 'Add New Video', presentation: 'modal' }}
                        />
                        <Stack.Screen
                            name="ScheduleSession"
                            component={ScheduleSessionScreen}
                            options={{ title: 'Schedule Session', presentation: 'modal' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
});

export default AppNavigator;