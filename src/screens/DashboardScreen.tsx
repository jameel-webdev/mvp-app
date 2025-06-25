// src/screens/DashboardScreen.tsx
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, firebase, firestore } from '../services/firebase'; // firebase for Timestamp
import { LearningSession, Video } from '../types/firebaseTypes';
import { DashboardScreenProps } from '../types/navigationTypes';
import { formatDateForSession, formatVideoDuration } from '../utils/helper';

const { width } = Dimensions.get('window');
const SESSION_ITEM_WIDTH = width * 0.45; // Make session items wider

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<LearningSession[]>([]);
  // const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // If needed for preferences
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      if (!isRefresh) setLoading(false);
      // Potentially navigate to login if user becomes null unexpectedly
      return;
    }
    const userId = currentUser.uid;

    try {
      // Fetch videos
      const videosSnapshot = await firestore.collection('videos')
        .where('userId', '==', userId)
        .orderBy('dateAdded', 'desc')
        .get();
      const videoList = videosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Video, 'id'>)
      }));
      setVideos(videoList);

      // Fetch upcoming sessions
      const sessionsSnapshot = await firestore.collection('sessions')
        .where('userId', '==', userId)
        .where('completed', '==', false)
        .where('scheduledFor', '>=', firebase.firestore.Timestamp.now())
        .orderBy('scheduledFor', 'asc')
        .limit(5) // Limit to 5 upcoming sessions for the horizontal list
        .get();
      const sessionList = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<LearningSession, 'id'>)
      }));
      setUpcomingSessions(sessionList);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      Alert.alert("Error", "Could not load dashboard data. Please try again.");
    } finally {
      if (!isRefresh) setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  // Fetch data when the screen comes into focus or on initial load
  useFocusEffect(
    useCallback(() => {
      fetchData();
      // Setup Firestore listeners for real-time updates
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const userId = currentUser.uid;

      const unsubscribeVideos = firestore.collection('videos')
        .where('userId', '==', userId)
        .orderBy('dateAdded', 'desc')
        .onSnapshot(snapshot => {
          const videoList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Video, 'id'>)
          }));
          setVideos(videoList);
        }, error => console.error("Video listener error:", error));

      const unsubscribeSessions = firestore.collection('sessions')
        .where('userId', '==', userId)
        .where('completed', '==', false)
        .where('scheduledFor', '>=', firebase.firestore.Timestamp.now())
        .orderBy('scheduledFor', 'asc')
        .limit(5)
        .onSnapshot(snapshot => {
          const sessionList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<LearningSession, 'id'>)
          }));
          setUpcomingSessions(sessionList);
        }, error => console.error("Session listener error:", error));

      return () => {
        unsubscribeVideos();
        unsubscribeSessions();
      };
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const renderVideoItem = ({ item }: { item: Video }) => (
    <TouchableOpacity
      style={styles.videoItem}
      onPress={() => item.id && navigation.navigate('VideoPlayer', { videoId: item.id })}
      onLongPress={() => { /* Add options like delete or schedule */
        Alert.alert(
            item.title,
            "What would you like to do?",
            [
                { text: "Cancel", style: "cancel"},
                { text: "Schedule Session", onPress: () => item.id && navigation.navigate('ScheduleSession', { videoId: item.id })},
                // Add delete functionality here if desired
            ]
        );
      }}
    >
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={styles.thumbnail}
          onError={(e) => console.log("Failed to load thumbnail:", e.nativeEvent.error)}
        />
        {item.progress && item.progress.completionPercentage > 0 && (
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, item.progress.completionPercentage)}%` } // Cap at 100%
              ]}
            />
          </View>
        )}
        <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatVideoDuration(item.duration)}</Text>
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.videoMeta}>
          {item.progress?.completionPercentage?.toFixed(0) ?? 0}% complete
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSessionItem = ({ item }: { item: LearningSession }) => {
    const video = videos.find(v => v.id === item.videoId);
    return (
      <TouchableOpacity
        style={styles.sessionItem}
        onPress={() => {
            if (item.videoId) {
                navigation.navigate('VideoPlayer', { videoId: item.videoId })
            } else {
                Alert.alert("Error", "Video ID missing for this session.");
            }
        }}
      >
        <View style={styles.sessionTimeContainer}>
            <AntDesign name="calendar" size={16} color="#4285F4" />
            <Text style={styles.sessionDate}>
                {formatDateForSession(item.scheduledFor.toDate())}
            </Text>
        </View>
        <Text style={styles.sessionDuration}>
           <AntDesign name="clockcircleo" size={14} color="#555" /> {item.duration} min session
        </Text>
        {video && (
          <Text style={styles.sessionVideoTitle} numberOfLines={2}>
            {video.title}
          </Text>
        )}
        {!video && <Text style={styles.sessionVideoTitle} numberOfLines={1}>Loading video info...</Text>}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4285F4" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header is managed by Stack.Navigator options */}
      <FlatList
        ListHeaderComponent={
          <>
            {upcomingSessions.length > 0 && (
              <View style={styles.sessionsSection}>
                <Text style={styles.sectionTitle}>📅 Upcoming Sessions</Text>
                <FlatList
                  data={upcomingSessions}
                  renderItem={renderSessionItem}
                  keyExtractor={item => item.id!}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sessionsListContent}
                />
              </View>
            )}
            <Text style={styles.sectionTitle}>📚 My Learning Videos</Text>
          </>
        }
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={item => item.id!}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons name="video-off-outline" size={70} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No Videos Yet</Text>
              <Text style={styles.emptyStateText}>
                Tap the '+' button in the header to add your first learning video!
              </Text>
              <TouchableOpacity style={styles.emptyStateButton} onPress={() => navigation.navigate('AddVideo')}>
                  <AntDesign name="plus" size={18} color="#fff" />
                  <Text style={styles.emptyStateButtonText}>Add Video</Text>
              </TouchableOpacity>
            </View>
          )
        }
        contentContainerStyle={videos.length === 0 ? styles.emptyListContent : styles.videosListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4285F4"]} tintColor={"#4285F4"}/>
        }
      />
       <TouchableOpacity
          style={styles.floatingAddButton}
          onPress={() => navigation.navigate('AddVideo')}
        >
          <AntDesign name="plus" size={28} color="white" />
        </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  // Header styles are now in AppNavigator
  sessionsSection: {
    paddingVertical: 15,
    backgroundColor: '#fff', // Give sessions a distinct background
    marginBottom: 10, // Space before video list
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600', // Slightly bolder
    marginHorizontal: 15,
    marginBottom: 12,
    color: '#333',
  },
  sessionsListContent: {
    paddingHorizontal: 10, // Add padding for first/last item visibility
  },
  sessionItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 7,
    borderRadius: 12,
    width: SESSION_ITEM_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  sessionTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessionDate: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4285F4',
    marginLeft: 5,
  },
  sessionDuration: {
    fontSize: 12,
    color: '#555',
    marginBottom: 8,
  },
  sessionVideoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    lineHeight: 18,
  },
  videosListContent: {
    paddingBottom: 80, // Ensure space for floating action button
  },
  emptyListContent: {
      flexGrow: 1, // Make empty state take full height if no sessions
  },
  videoItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 130, // Slightly wider thumbnail
    height: 90, // Maintain aspect ratio
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: '#e0e0e0', // Placeholder color for image
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 5, // Thicker progress bar
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4285F4',
    borderRadius: 3,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8, // Position above progress bar or if no progress bar
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
  },
  videoInfo: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 15, // Slightly larger title
    fontWeight: '500',
    color: '#222',
    marginBottom: 4,
  },
  videoMeta: {
    fontSize: 12,
    color: '#666',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 20, // Add some margin if there were sessions
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#444',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyStateButtonText: {
      color: '#fff',
      marginLeft: 8,
      fontWeight: 'bold',
  },
  floatingAddButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6F00', // A different, vibrant color for FAB
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default DashboardScreen;