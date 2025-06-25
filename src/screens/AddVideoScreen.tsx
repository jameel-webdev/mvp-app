// src/screens/AddVideoScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { firestore, auth, firebase } from '../services/firebase'; // firebase for Timestamp
import { fetchVideoMetadata, extractYouTubeId } from '../services/youtubeApi';
import { AddVideoScreenProps } from '../types/navigationTypes';
import { Video } from '../types/firebaseTypes'; // Import the Video type
import { AntDesign } from '@expo/vector-icons'; // For icons

const AddVideoScreen: React.FC<AddVideoScreenProps> = ({ navigation }) => {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddVideo = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL.');
      return;
    }
    const videoId = extractYouTubeId(url);
    if (!videoId) {
        setError('Invalid YouTube URL. Please check and try again.');
        return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('User not authenticated. Please login again.');
      // Potentially navigate to Login or show a more permanent error
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Check if video already exists for this user
      const existingVideoQuery = await firestore.collection('videos')
        .where('userId', '==', currentUser.uid)
        .where('youtubeId', '==', videoId)
        .limit(1)
        .get();

      if (!existingVideoQuery.empty) {
        setError('This video is already in your library.');
        setLoading(false);
        return;
      }

      const videoMetadata = await fetchVideoMetadata(url);

      const newVideo: Omit<Video, 'id'> = { // Omit 'id' as Firestore generates it
        youtubeId: videoMetadata.youtubeId,
        title: videoMetadata.title,
        thumbnailUrl: videoMetadata.thumbnailUrl,
        duration: videoMetadata.duration,
        userId: currentUser.uid,
        dateAdded: firebase.firestore.Timestamp.now(),
        progress: {
          lastPosition: 0,
          completionPercentage: 0,
          completed: false,
          lastUpdated: firebase.firestore.Timestamp.now(),
        },
      };

      await firestore.collection('videos').add(newVideo);

      Alert.alert("Success", `"${videoMetadata.title}" added to your library!`);
      navigation.goBack();

    } catch (err: any) {
      setError(err.message || 'Could not add video. Please check the URL and try again.');
      console.error("Add Video Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
            <AntDesign name="youtube" size={40} color="#FF0000" />
            <Text style={styles.title}>Add YouTube Video</Text>
        </View>
        <Text style={styles.subtitle}>
            Paste a YouTube video URL below to add it to your learning library.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            value={url}
            onChangeText={(text) => {
                setUrl(text);
                if (error) setError(null); // Clear error on input change
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#888"
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={handleAddVideo}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <AntDesign name="pluscircleo" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Add Video to Library</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.helpTextContainer}>
            <AntDesign name="infocirlceo" size={18} color="#666" />
            <Text style={styles.helpText}>
                Track progress, schedule focused learning sessions, and achieve your educational goals.
            </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Changed to white for modal presentation
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  addButtonDisabled: {
    backgroundColor: '#A0C6FF', // Lighter blue when disabled
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: '#D32F2F', // Material Design error red
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  helpTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    borderRadius: 8,
  },
  helpText: {
    marginLeft: 10,
    color: '#555',
    textAlign: 'left',
    lineHeight: 20,
    fontSize: 13,
    flex: 1, // Allow text to wrap
  },
});

export default AddVideoScreen;









