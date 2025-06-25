// src/services/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { LearningSession } from '../types/firebaseTypes'; // Assuming you have this type

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true, // Show an alert
        shouldPlaySound: true, // Play a sound
        shouldSetBadge: false, // Don't set the app icon badge count (can be true if desired)
    }),
});

/**
 * Requests notification permissions from the user.
 * Should be called at an appropriate time in the app (e.g., on load or in settings).
 * @returns {Promise<boolean>} True if permission granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250], // Vibrate pattern
            lightColor: '#FF231F7C', // Light color for the notification
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        // Optionally, inform the user that they need to enable notifications in settings
        return false;
    }
    return true;
}

/**
 * Schedules a local notification for a learning session.
 * @param session The learning session object.
 * @param videoTitle The title of the video for the session.
 * @returns {Promise<string | null>} The notification ID if scheduled, or null if failed.
 */
export async function scheduleSessionNotification(
    session: LearningSession,
    videoTitle: string
): Promise<string | null> {
    // Ensure permissions are granted before trying to schedule
    const permissionGranted = await requestNotificationPermissions();
    if (!permissionGranted) {
        console.warn("Notification permission not granted. Cannot schedule notification.");
        return null;
    }

    const scheduledDate = session.scheduledFor.toDate();
    const now = new Date();

    // Schedule 5 minutes before the session starts, or at session time if it's very soon
    let triggerTime = new Date(scheduledDate.getTime() - 5 * 60 * 1000); // 5 minutes before
    if (triggerTime < now) {
        triggerTime = scheduledDate; // If 5 mins before is in the past, schedule for actual time
    }

    // Ensure trigger is in the future
    if (triggerTime.getTime() <= now.getTime()) {
        console.log("Cannot schedule notification for a past event or an event starting too soon for a reminder.");
        // Optionally, schedule immediately if scheduledFor is in the very near future but still ahead
        if (scheduledDate.getTime() > now.getTime()) {
            triggerTime = scheduledDate;
        } else {
            return null; // Don't schedule if scheduledFor is also in the past
        }
    }

    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: "🌱 Learning Session Reminder!",
                body: `Time for your session: "${videoTitle}" (${session.duration} min). Let's get focused!`,
                data: { sessionId: session.id, videoId: session.videoId, type: 'sessionReminder' }, // Custom data for handling taps
                sound: 'default', // Use the default notification sound
                // categoryIdentifier: 'sessionReminder', // For iOS custom actions
            },
            trigger: triggerTime,
        });
        console.log(`Notification scheduled for session ${session.id} with notification ID: ${notificationId}`);
        return notificationId;
    } catch (e) {
        console.error("Error scheduling notification:", e);
        return null;
    }
}

/**
 * Cancels a previously scheduled notification.
 * @param notificationId The ID of the notification to cancel.
 */
export async function cancelNotification(notificationId: string | undefined | null) {
    if (!notificationId) return;
    try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log('Notification cancelled:', notificationId);
    } catch (e) {
        console.error("Error cancelling notification:", e);
    }
}

/**
 * Sets up listeners for notification interactions (tap).
 * This should be called once, e.g., in your main App component or navigator.
 * @param navigation The navigation object to handle navigation on notification tap.
 */
export function setupNotificationListeners(navigation: any /* Adjust type based on your navigation setup */) {
    // Listener for when a user taps on a notification (foreground or background)
    const responseReceivedListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response received:', response);
        const notificationData = response.notification.request.content.data;

        if (notificationData && notificationData.type === 'sessionReminder' && notificationData.videoId) {
            console.log(`Navigating to VideoPlayer for videoId: ${notificationData.videoId}`);
            // Ensure your navigation stack is set up to handle this when app is in various states
            navigation.navigate('VideoPlayer', { videoId: notificationData.videoId });
        }
    });

    // Listener for when a notification is received while the app is foregrounded
    // (Covered by setNotificationHandler, but can add specific logic here if needed)
    // const notificationReceivedListener = Notifications.addNotificationReceivedListener(notification => {
    //   console.log('Notification received while app is foregrounded:', notification);
    // });

    return () => {
        // Clean up listeners when the component unmounts or app closes
        Notifications.removeNotificationSubscription(responseReceivedListener);
        // Notifications.removeNotificationSubscription(notificationReceivedListener);
    };
}

// Call this early in your app, e.g., in App.tsx
// requestNotificationPermissions();









