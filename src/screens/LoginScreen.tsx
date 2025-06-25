// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { auth } from '../services/firebase'; // Using compat version
// import { LoginScreenProps } from '../types/navigationTypes'; // Not used directly as it's a root before auth

// You might want to add an app logo here
// const AppLogo = require('../../assets/app-logo.png'); // Example path

const LoginScreen: React.FC /* <LoginScreenProps> */ = (/* { navigation } */) => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password.');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await auth.signInWithEmailAndPassword(email, password);
            // Navigation to Dashboard will happen automatically due to onAuthStateChanged in AppNavigator
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred during login.');
            console.error("Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password to sign up.');
            return;
        }
        if (password.length < 6) {
            setError('Password should be at least 6 characters.');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await auth.createUserWithEmailAndPassword(email, password);
            // User will be signed in, and onAuthStateChanged will navigate.
            // Optionally, you might want to set up a user profile document in Firestore here.
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred during sign up.');
            console.error("Sign up error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        // Placeholder for Google Sign-In. This requires platform-specific setup
        // and libraries like @react-native-google-signin/google-signin.
        Alert.alert(
            "Feature Not Implemented",
            "Google Sign-In requires additional setup. Please use email/password for now."
        );
        // Example structure for Google Sign-In (requires setup):
        // try {
        //   setLoading(true);
        //   await GoogleSignin.hasPlayServices();
        //   const { idToken } = await GoogleSignin.signIn();
        //   const googleCredential = auth.GoogleAuthProvider.credential(idToken);
        //   await auth.signInWithCredential(googleCredential);
        // } catch (error: any) {
        //   if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        //     // user cancelled the login flow
        //   } else if (error.code === statusCodes.IN_PROGRESS) {
        //     // operation (e.g. sign in) is in progress already
        //   } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        //     // play services not available or outdated
        //   } else {
        //     // some other error happened
        //     setError(error.message || "Google Sign-In failed.");
        //   }
        //   console.error("Google Sign In Error", error);
        // } finally {
        //   setLoading(false);
        // }
    };


    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.logoContainer}>
                    {/* <Image source={AppLogo} style={styles.logo} resizeMode="contain" /> */}
                    <Text style={styles.appName}>YouTube Learning Manager</Text>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.title}>Welcome Back!</Text>
                    <Text style={styles.subtitle}>Sign in or create an account to continue.</Text>

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholderTextColor="#888"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        placeholderTextColor="#888"
                    />

                    {loading ? (
                        <ActivityIndicator size="large" color="#4285F4" style={styles.loader} />
                    ) : (
                        <>
                            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                                <Text style={styles.buttonText}>Login</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.signUpButton]} onPress={handleSignUp} disabled={loading}>
                                <Text style={[styles.buttonText, styles.signUpButtonText]}>Sign Up with Email</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity style={[styles.button, styles.googleButton]} onPress={handleGoogleSignIn} disabled={loading}>
                        {/* You can add a Google icon here */}
                        <Text style={[styles.buttonText, styles.googleButtonText]}>Sign In with Google</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 10,
    },
    appName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    formContainer: {
        width: '85%',
        maxWidth: 400,
        backgroundColor: '#fff',
        padding: 25,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        height: 50,
        backgroundColor: '#f0f0f0',
        borderColor: '#ddd',
        borderWidth: 1,
        marginBottom: 15,
        paddingHorizontal: 15,
        borderRadius: 8,
        fontSize: 16,
        color: '#333',
    },
    button: {
        backgroundColor: '#4285F4',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    signUpButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#4285F4',
    },
    signUpButtonText: {
        color: '#4285F4',
    },
    googleButton: {
        backgroundColor: '#DB4437', // Google Red
    },
    googleButtonText: {
        color: '#fff',
    },
    errorText: {
        color: 'red',
        textAlign: 'center',
        marginBottom: 15,
        fontSize: 14,
    },
    loader: {
        marginVertical: 20,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#ccc',
    },
    dividerText: {
        marginHorizontal: 10,
        color: '#888',
        fontSize: 14,
    },
});

export default LoginScreen;
