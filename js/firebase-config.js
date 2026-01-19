// Firebase Configuration for ReLoop
// Replace with your own Firebase project credentials
// Get these from: https://console.firebase.google.com/project/_/settings/general/

const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export services
// Export services
const auth = firebase.auth();
const db = firebase.firestore();

// Make globally available
window.auth = auth;
window.db = db;

// Auth state observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('User logged in:', user.uid);
        localStorage.setItem('reloop_userId', user.uid);

        // Fetch user profile to get name
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const userData = doc.data();
                localStorage.setItem('reloop_userName', userData.name || 'User');

                // Dispatch event for UI updates
                window.dispatchEvent(new CustomEvent('userProfileLoaded', {
                    detail: { name: userData.name }
                }));
            }
        } catch (error) {
            console.error('Error fetching user profile in auth observer:', error);
        }
    } else {
        console.log('User logged out');
        localStorage.removeItem('reloop_userId');
        localStorage.removeItem('reloop_userName');
    }
});

// Get current user ID helper
function getCurrentUserId() {
    return localStorage.getItem('reloop_userId');
}

// Check if user is authenticated
function isAuthenticated() {
    return auth.currentUser !== null;
}
