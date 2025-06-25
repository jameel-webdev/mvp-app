// src/screens/VideoPlayerScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { firestore, auth, firebase } from '../services/firebase';
import { VideoPlayerScreenProps } from '../types/navigationTypes';
import { Video as VideoData, UserProfile, VideoProgress } from '../types/firebaseTypes';
import { AntDesign, MaterialIcons } from '@expo/vector-icons'; // For icons
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { debounce, formatVideoDuration } from '../utils/helper'; // Assuming debounce is in helpers

// Define YouTube Player State enum
enum YTPlayerState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5
}

// Define the structure of messages passed from WebView to React Native
interface WebViewMessage {
  type: 'PLAYER_READY' | 'PLAYER_STATE_CHANGE' | 'PLAYER_ERROR' | 'TIME_UPDATE' | 'SESSION_END_REQUEST';
  data?: any; // Could be player state, current time, error code etc.
  currentTime?: number; // Specifically for time updates and session end
  playerState?: YTPlayerState; // For state changes
  errorCode?: number; // For player errors
}

const { width } = Dimensions.get('window');

const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({ route, navigation }) => {
  const { videoId } = route.params;
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [userPrefs, setUserPrefs] = useState<{ defaultSessionDuration: number } | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<number | null>(null); // Timestamp for session end
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0); // From player
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);
  const [showControls, setShowControls] = useState(true); // For custom overlay controls

  const webViewRef = useRef<WebView>(null);
  const sessionTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const isFocused = useIsFocused(); // Hook to check if screen is focused

  // Debounced save progress function
  const debouncedSaveProgress = useCallback(
    debounce(async (position: number, isCompleted?: boolean) => {
      if (!videoData || videoData.duration === 0 || !isFocused) return;

      const completionPercentage = Math.min(100, (position / videoData.duration) * 100);
      const newProgress: VideoProgress = {
        lastPosition: Math.floor(position),
        completionPercentage: parseFloat(completionPercentage.toFixed(1)),
        completed: isCompleted || completionPercentage >= 98,
        lastUpdated: firebase.firestore.Timestamp.now(),
      };

      try {
        await firestore.collection('videos').doc(videoId).update({
          progress: newProgress,
        });
        console.log(`Progress saved for ${videoId} at ${Math.floor(position)}s`);
        setVideoData(prev => (prev ? { ...prev, progress: newProgress } : null));
      } catch (error) {
        console.error("Failed to save progress:", error);
      }
    }, 3000), // Save progress at most every 3 seconds
    [videoData, videoId, isFocused] // Dependencies for useCallback
  );


  // Fetch initial video and user data
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Authentication Error", "User not found. Please login again.");
      navigation.goBack();
      return;
    }

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const videoDoc = await firestore.collection('videos').doc(videoId).get();
        if (!videoDoc.exists) {
          Alert.alert("Error", "Video not found.");
          navigation.goBack();
          return;
        }
        const fetchedVideoData = { id: videoDoc.id, ...videoDoc.data() } as VideoData;
        setVideoData(fetchedVideoData);
        setCurrentPlaybackTime(fetchedVideoData.progress?.lastPosition || 0); // Set initial playback time

        const userDoc = await firestore.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
          const profile = userDoc.data() as UserProfile;
          const defaultDuration = profile.preferences?.defaultSessionDuration || 30;
          setUserPrefs({ defaultSessionDuration: defaultDuration });
          // Start session timer only if not already started or if default duration is set
          if (defaultDuration > 0) {
            setSessionEndTime(Date.now() + defaultDuration * 60 * 1000);
          }
        } else {
          setUserPrefs({ defaultSessionDuration: 30 }); // Fallback
          setSessionEndTime(Date.now() + 30 * 60 * 1000);
        }
      } catch (error) {
        console.error("Error fetching video/user data:", error);
        Alert.alert("Error", "Could not load video data.");
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [videoId, navigation]);

  // Effect for managing the session timer
  useEffect(() => {
    if (sessionTimerIntervalRef.current) {
      clearInterval(sessionTimerIntervalRef.current);
    }

    if (sessionEndTime && isFocused) { // Only run timer if session is active and screen is focused
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((sessionEndTime - now) / 1000));
        setSessionTimeRemaining(remaining);

        if (remaining <= 0) {
          console.log("Session time ended.");
          webViewRef.current?.injectJavaScript(`
            try {
              const currentTime = player.getCurrentTime();
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SESSION_END_REQUEST', currentTime: currentTime }));
            } catch(e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SESSION_END_REQUEST', currentTime: ${currentPlaybackTime} }));
            }
            true;
          `);
          if (sessionTimerIntervalRef.current) clearInterval(sessionTimerIntervalRef.current);
        }
      };
      updateTimer(); // Initial call
      sessionTimerIntervalRef.current = setInterval(updateTimer, 1000);
    }

    return () => {
      if (sessionTimerIntervalRef.current) {
        clearInterval(sessionTimerIntervalRef.current);
      }
    };
  }, [sessionEndTime, isFocused, currentPlaybackTime]); // Rerun if sessionEndTime or focus changes


  // Handle AppState changes (e.g., app goes to background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        // Potentially resume video if it was playing, or refresh session timer
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('App has gone to background or become inactive.');
        // App is in background, save current progress
        // Ensure player is ready and we have a valid time
        if (isPlayerReady && webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                try {
                    const time = player.getCurrentTime();
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TIME_UPDATE', currentTime: time, fromBackground: true }));
                } catch(e) { /* ignore if player not ready */ }
                true;
            `);
        } else if (currentPlaybackTime > 0) {
            // Fallback to last known RN state if player interaction fails
            debouncedSaveProgress(currentPlaybackTime);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      // Ensure progress is saved when screen is left
      if (currentPlaybackTime > 0 && videoData) {
          debouncedSaveProgress(currentPlaybackTime);
      }
    };
  }, [isPlayerReady, currentPlaybackTime, videoData, debouncedSaveProgress]);

  // Save progress when screen loses focus (e.g., navigating away)
  useFocusEffect(
    useCallback(() => {
      return () => {
        // This cleanup runs when the screen loses focus
        if (currentPlaybackTime > 0 && videoData) {
          console.log("VideoPlayer screen losing focus, saving progress.");
          // Use a direct save here instead of debounced if immediate save is needed on blur
          // For now, relying on AppState change or explicit exit to save.
          // Or, if you want to ensure save on blur:
          // saveProgress(currentPlaybackTime); // Assuming saveProgress is not debounced
        }
      };
    }, [currentPlaybackTime, videoData])
  );


  const handleFinalSessionEnd = (endedAtPosition: number) => {
    debouncedSaveProgress(endedAtPosition, (endedAtPosition / (videoData?.duration || 1)) * 100 >= 98);
    Alert.alert(
      'Session Ended',
      'Your learning session time is up! Progress has been saved.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
      { cancelable: false }
    );
  };

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
      // console.log("WebView Message:", message.type, message.data, message.currentTime);

      switch (message.type) {
        case 'PLAYER_READY':
          setIsPlayerReady(true);
          console.log('YouTube Player is ready.');
          // Seek to last known position if player starts from 0
          if (currentPlaybackTime > 0 && webViewRef.current) {
            webViewRef.current.injectJavaScript(`player.seekTo(${currentPlaybackTime}, true); true;`);
          }
          break;
        case 'PLAYER_STATE_CHANGE':
          // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
          if (message.playerState === YTPlayerState.PLAYING) {
            // Video is playing
          } else if (message.playerState === YTPlayerState.PAUSED) {
            // Video is paused, save progress
            if (message.currentTime !== undefined) debouncedSaveProgress(message.currentTime);
          } else if (message.playerState === YTPlayerState.ENDED) {
            // Video ended, mark as complete and save
            if (message.currentTime !== undefined) debouncedSaveProgress(message.currentTime, true);
            // Optionally, show a "Video Complete!" message or navigate
          }
          break;
        case 'TIME_UPDATE':
          if (message.currentTime !== undefined) {
            setCurrentPlaybackTime(message.currentTime);
            // Debounced save will handle periodic saving
            debouncedSaveProgress(message.currentTime);
          }
          break;
        case 'SESSION_END_REQUEST':
          if (message.currentTime !== undefined) {
            handleFinalSessionEnd(message.currentTime);
          } else {
             handleFinalSessionEnd(currentPlaybackTime); // Fallback
          }
          break;
        case 'PLAYER_ERROR':
          console.error("YouTube Player Error in WebView:", message.errorCode);
          Alert.alert("Player Error", `The video player encountered an error (Code: ${message.errorCode}). Please try again or check the video URL.`);
          break;
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e, event.nativeEvent.data);
    }
  };

  const handleSaveAndExit = () => {
    if (isPlayerReady && webViewRef.current) {
        webViewRef.current.injectJavaScript(`
            try {
                const time = player.getCurrentTime();
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SESSION_END_REQUEST', currentTime: time }));
            } catch(e) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SESSION_END_REQUEST', currentTime: ${currentPlaybackTime} }));
            }
            true;
        `);
    } else {
        // If player not ready or ref is null, save current RN state and go back
        handleFinalSessionEnd(currentPlaybackTime);
    }
  };

  const handleExtendSession = () => {
    if (sessionEndTime) {
      setSessionEndTime(prev => (prev || Date.now()) + 5 * 60 * 1000); // Add 5 minutes
      Alert.alert("Session Extended", "Added 5 minutes to your session.");
    } else if (userPrefs) {
        const newDuration = (userPrefs.defaultSessionDuration > 0 ? userPrefs.defaultSessionDuration : 0) + 5;
        setSessionEndTime(Date.now() + newDuration * 60 * 1000);
        Alert.alert("Session Started & Extended", `Session started for ${newDuration} minutes.`);
    }
  };

  // Toggle custom controls visibility
  const toggleShowControls = () => {
    setShowControls(prev => !prev);
  };

  if (isLoading || !videoData) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4285F4" /></View>;
  }

  const playerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #000; overflow: hidden; }
            #player { width: 100%; height: 100%; }
        </style>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    </head>
    <body>
        <div id="player"></div>
        <script>
            var tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api"; // Official IFrame Player API script
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            var player;
            var timeUpdateInterval;

            function onYouTubeIframeAPIReady() {
                player = new YT.Player('player', {
                    videoId: '${videoData.youtubeId}',
                    playerVars: {
                        autoplay: 1,
                        playsinline: 1, // Crucial for iOS inline playback
                        start: ${Math.floor(videoData.progress?.lastPosition || 0)},
                        rel: 0, // Show related videos from the same channel (0) or disable (not fully effective)
                        modestbranding: 1, // Remove YouTube logo from control bar (small YT text link remains)
                        fs: 0, // Disable native fullscreen button (you can implement your own)
                        controls: 1, // Show YouTube player controls (0 to hide, 1 to show, 2 for show on load)
                        // cc_load_policy: 1, // Force captions if available
                        // hl: 'en', // Player language
                        // iv_load_policy: 3, // Hide video annotations
                    },
                    events: {
                        'onReady': onPlayerReady,
                        'onStateChange': onPlayerStateChange,
                        'onError': onPlayerError
                    }
                });
            }

            function onPlayerReady(event) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PLAYER_READY' }));
                // Start sending time updates
                if (timeUpdateInterval) clearInterval(timeUpdateInterval);
                timeUpdateInterval = setInterval(sendTimeUpdate, 1000); // Send time every second
            }

            function onPlayerStateChange(event) {
                var currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'PLAYER_STATE_CHANGE',
                    playerState: event.data,
                    currentTime: currentTime
                }));
            }

            function onPlayerError(event) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PLAYER_ERROR', errorCode: event.data }));
            }

            function sendTimeUpdate() {
                if (player && typeof player.getCurrentTime === 'function') {
                    const currentTime = player.getCurrentTime();
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TIME_UPDATE', currentTime: currentTime }));
                }
            }

            // Optional: functions to be called from React Native via injectJavaScript
            // window.playVideo = () => player.playVideo();
            // window.pauseVideo = () => player.pauseVideo();
            // window.seekToTime = (seconds) => player.seekTo(seconds, true);
        </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={1} onPress={toggleShowControls} style={styles.videoPlayerContainer}>
        <WebView
          ref={webViewRef}
          style={styles.videoPlayer}
          source={{ html: playerHtml, baseUrl: 'https://www.youtube.com' }} // baseUrl is important for some API functionalities
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true} // iOS: Play inline
          mediaPlaybackRequiresUserAction={false} // Android: Allow autoplay
          onMessage={handleWebViewMessage}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
            Alert.alert("WebView Error", `Could not load video content. Code: ${nativeEvent.code}, Desc: ${nativeEvent.description}`);
          }}
          onHttpError={(syntheticEvent) => { // Catch HTTP errors
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView HTTP error: ', nativeEvent.url, nativeEvent.statusCode);
            // Alert.alert("Network Error", `Could not load video. Status code: ${nativeEvent.statusCode}`);
          }}
          allowsFullscreenVideo={true} // Allow native fullscreen if desired (though fs=0 in playerVars)
          userAgent={Platform.OS === 'android' ? "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36" : undefined} // Custom user agent for Android if needed
        />
         {showControls && (
            <View style={styles.overlayControls}>
                {/* Add custom play/pause, seek bar, fullscreen toggle here if hiding YouTube's controls */}
                {/* Example: <TouchableOpacity onPress={() => webViewRef.current?.injectJavaScript('player.playVideo(); true;')}><AntDesign name="play" size={30} color="#FFF" /></TouchableOpacity> */}
            </View>
        )}
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Text style={styles.videoTitle} numberOfLines={2}>{videoData.title}</Text>
        {sessionEndTime && (
          <Text style={styles.sessionTimer}>
            <AntDesign name="clockcircleo" size={14} color="#333" /> Session Time: {Math.floor(sessionTimeRemaining / 60)}:{(sessionTimeRemaining % 60).toString().padStart(2, '0')}
          </Text>
        )}
        <Text style={styles.progressText}>
            Watched: {Math.floor(currentPlaybackTime / 60)}m {Math.floor(currentPlaybackTime % 60)}s / {formatVideoDuration(videoData.duration)}
            ({videoData.progress.completionPercentage.toFixed(1)}%)
        </Text>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={[styles.controlButton, styles.exitButton]} onPress={handleSaveAndExit}>
          <MaterialIcons name="exit-to-app" size={24} color="white" />
          <Text style={styles.controlButtonText}>Save & Exit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, styles.extendButton]} onPress={handleExtendSession}>
          <AntDesign name="pluscircleo" size={22} color="white" />
          <Text style={styles.controlButtonText}>Extend (+5m)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark theme for player screen
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  videoPlayerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000', // Black background while player loads
  },
  videoPlayer: {
    flex: 1,
  },
  overlayControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0,0,0,0.3)', // Optional: slight dimming
  },
  infoContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#1e1e1e', // Slightly lighter dark shade
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sessionTimer: {
    fontSize: 14,
    color: '#FFD700', // Gold color for timer
    marginBottom: 5,
  },
  progressText: {
      fontSize: 13,
      color: '#bbb',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#1e1e1e',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20, // Pill shape
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  exitButton: {
    backgroundColor: '#F44336', // Red for exit
  },
  extendButton: {
    backgroundColor: '#4CAF50', // Green for extend
  },
  controlButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
});

export default VideoPlayerScreen;
