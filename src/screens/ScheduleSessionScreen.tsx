// src/screens/ScheduleSessionScreen.tsx
import { AntDesign } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, firebase, firestore } from '../services/firebase';
import { scheduleSessionNotification } from '../services/notificationService'; // Import notification functions
import { LearningSession, Video } from '../types/firebaseTypes';
import { ScheduleSessionScreenProps } from '../types/navigationTypes';

const ScheduleSessionScreen: React.FC<ScheduleSessionScreenProps> = ({ route, navigation }) => {
  const { videoId } = route.params;
  const [videoInfo, setVideoInfo] = useState<Video | null>(null);
  const [date, setDate] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000)); // Default to 1 hour from now
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [duration, setDuration] = useState<string>('30'); // Default duration in minutes, as string for TextInput
  const [loading, setLoading] = useState<boolean>(false);
  const [isFetchingVideo, setIsFetchingVideo] = useState<boolean>(true);

  // Fetch video details to display title and potentially existing session info
  useEffect(() => {
    const fetchVideoInfo = async () => {
      setIsFetchingVideo(true);
      try {
        const videoDoc = await firestore.collection('videos').doc(videoId).get();
        if (videoDoc.exists) {
          setVideoInfo({ id: videoDoc.id, ...videoDoc.data() } as Video);
          // Check for existing upcoming session for this video to prefill (optional)
          // const existingSession = ...
        } else {
          Alert.alert("Error", "Video details not found.");
          navigation.goBack();
        }
      } catch (error) {
        console.error("Error fetching video info:", error);
        Alert.alert("Error", "Could not load video details.");
        navigation.goBack();
      } finally {
        setIsFetchingVideo(false);
      }
    };
    fetchVideoInfo();
  }, [videoId, navigation]);

  const onDateTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    if (Platform.OS === 'android') {
      setShowDatePicker(false); // Hide picker after selection on Android
      setShowTimePicker(false);
    }

    if (event.type === "set") { // Only update if a date/time was actually selected
      setDate(currentDate);
    } else { // "dismissed" or other event types
        setShowDatePicker(false);
        setShowTimePicker(false);
    }
  };

  const handleScheduleSession = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to schedule a session.");
      return;
    }
    if (!videoInfo) {
      Alert.alert("Error", "Video information is not loaded yet.");
      return;
    }

    const sessionDuration = parseInt(duration, 10);
    if (isNaN(sessionDuration) || sessionDuration <= 0) {
      Alert.alert("Invalid Duration", "Please enter a valid session duration (e.g., 30 minutes).");
      return;
    }

    if (date.getTime() <= Date.now() + 60 * 1000) { // Check if scheduled time is at least 1 min in future
      Alert.alert("Invalid Time", "Cannot schedule a session in the past or too close to the current time. Please choose a future time.");
      return;
    }

    setLoading(true);
    const newSessionData: Omit<LearningSession, 'id' | 'notificationId'> = { // Exclude id and notificationId initially
      videoId,
      userId: currentUser.uid,
      scheduledFor: firebase.firestore.Timestamp.fromDate(date),
      duration: sessionDuration,
      completed: false,
      createdAt: firebase.firestore.Timestamp.now(),
    };

    try {
      // Add session to Firestore
      const sessionRef = await firestore.collection('sessions').add(newSessionData);

      // Schedule a local notification
      const notificationId = await scheduleSessionNotification(
        { ...newSessionData, id: sessionRef.id }, // Pass the full session object with its new ID
        videoInfo.title
      );

      // Update the session document with the notification ID if scheduling was successful
      if (notificationId) {
        await sessionRef.update({ notificationId: notificationId });
      }

      Alert.alert("Success", `Session for "${videoInfo.title}" scheduled! A reminder will be sent.`);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Error", "Could not schedule session. " + error.message);
      console.error("Scheduling error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isFetchingVideo) {
    return <View style={styles.centeredLoader}><ActivityIndicator size="large" color="#4285F4" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <AntDesign name="calendar" size={30} color="#4285F4" />
        <Text style={styles.title}>Schedule Learning Session</Text>
      </View>

      {videoInfo && (
        <View style={styles.videoInfoContainer}>
            <Image source={{uri: videoInfo.thumbnailUrl}} style={styles.videoThumbnail} />
            <Text style={styles.videoTitleText} numberOfLines={2}>{videoInfo.title}</Text>
        </View>
      )}

      <Text style={styles.label}>Session Date:</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.pickerButton}>
        <AntDesign name="calendar" size={20} color="#555" style={styles.pickerIcon} />
        <Text style={styles.pickerText}>{date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateTimeChange}
          minimumDate={new Date(Date.now() + 5 * 60 * 1000)} // Min 5 mins from now
          // maximumDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)} // Optional: Max 30 days in future
        />
      )}

      <Text style={styles.label}>Session Time:</Text>
      <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.pickerButton}>
        <AntDesign name="clockcircleo" size={20} color="#555" style={styles.pickerIcon} />
        <Text style={styles.pickerText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
      </TouchableOpacity>
      {showTimePicker && (
        <DateTimePicker
          value={date}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateTimeChange}
          minuteInterval={5} // Optional: Set minute interval
        />
      )}

      <Text style={styles.label}>Session Duration (minutes):</Text>
      <View style={styles.durationInputContainer}>
        <AntDesign name="hourglass" size={20} color="#555" style={styles.pickerIcon} />
        <TextInput
            style={styles.durationInput}
            keyboardType="number-pad"
            value={duration}
            onChangeText={(text) => setDuration(text.replace(/[^0-9]/g, ''))} // Allow only numbers
            placeholder="e.g., 30"
            maxLength={3} // Max 999 minutes
        />
      </View>

      <TouchableOpacity
        style={[styles.scheduleButton, loading && styles.scheduleButtonDisabled]}
        onPress={handleScheduleSession}
        disabled={loading || isFetchingVideo}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <AntDesign name="checkcircleo" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.scheduleButtonText}>Confirm & Schedule</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Modal background
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Extra padding at bottom
  },
  centeredLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  videoInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  videoThumbnail: {
      width: 80,
      height: 60,
      borderRadius: 4,
      marginRight: 10,
      backgroundColor: '#e0e0e0',
  },
  videoTitleText: {
    flex: 1, // Allow text to wrap
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#444',
    marginBottom: 8,
    marginTop: 15,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  pickerIcon: {
    marginRight: 10,
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  durationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 50, // Match picker button height
  },
  durationInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%', // Ensure TextInput takes full height of container
  },
  scheduleButton: {
    backgroundColor: '#4CAF50', // Green for confirm
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  scheduleButtonDisabled: {
    backgroundColor: '#A5D6A7', // Lighter green when disabled
  },
  buttonIcon: {
    marginRight: 10,
  },
  scheduleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ScheduleSessionScreen;
