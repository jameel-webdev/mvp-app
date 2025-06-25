// src/App.tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Optional: Global error handling (e.g., Sentry or custom)
// import * as Sentry from '@sentry/react-native';
// Sentry.init({
//   dsn: 'YOUR_SENTRY_DSN',
//   // enableInExpoDevelopment: true,
//   // debug: true, // If `true`, Sentry will try to print out useful debugging information.
// });

// Optional: Global context providers
// import { ThemeProvider } from './context/ThemeContext';
// import { AuthProvider } from './context/AuthContext'; // If you build a custom auth context

export default function App() {
  // Wrap with any global providers your app needs
  // For example:
  // return (
  //   <SafeAreaProvider>
  //     <ThemeProvider>
  //       <AuthProvider>
  //         <AppNavigator />
  //         <StatusBar style="auto" />
  //       </AuthProvider>
  //     </ThemeProvider>
  //   </SafeAreaProvider>
  // );

  return (
    <SafeAreaProvider>
      <AppNavigator />
      <StatusBar style="light" backgroundColor="#4285F4" />
    </SafeAreaProvider>
  );
}

// To catch unhandled promise rejections (optional, but good for debugging)
// if (typeof process !== 'undefined' && process.on) { // Check if process.on is available (Node.js like env)
//   process.on('unhandledRejection', (reason, promise) => {
//     console.error('Unhandled Rejection at:', promise, 'reason:', reason);
//     // Application specific logging, throwing an error, or other logic here
//     // Sentry.captureException(reason); // Example with Sentry
//   });
// }