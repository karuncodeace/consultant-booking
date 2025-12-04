import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBXEbwtz8SfeHVdgY2i_YogD6vRxNJsw8c",
  authDomain: "consultant-booking.firebaseapp.com",
  projectId: "consultant-booking",
  storageBucket: "consultant-booking.firebasestorage.app",
  messagingSenderId: "622027081592",
  appId: "1:622027081592:web:6ff6413f0a4707431f6a8d"
};

let app = null;
let messaging = null;

// Initialize Firebase only if supported
try {
  app = initializeApp(firebaseConfig);
  // Check if messaging is supported before initializing
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  }).catch(() => {
    // Messaging not supported, continue without it
    console.log("Firebase messaging not supported");
  });
} catch (error) {
  console.warn("Firebase initialization failed (optional feature):", error);
}

export async function requestPermissionAndToken() {
  // Silently fail if Firebase is not available
  if (!messaging) {
    return null;
  }

  try {
    console.log("🔄 Asking notification permission...");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("❌ Permission denied");
      return null;
    }

    console.log("🔄 Registering Firebase service worker...");
    try {
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      
      console.log("🔄 Generating FCM token...");
      return await getToken(messaging, {
        vapidKey: "BE66LRDqIDAVegEdaetcCDiK1YfYAJ7mYm2rZJUmz7VbvzEmRZVW5yjz-VtxJJDX1hVwkimzrMhJS5lY2PTeV2o",
        serviceWorkerRegistration: registration
      });
    } catch (swError) {
      console.warn("Service worker registration failed (optional feature):", swError);
      return null;
    }
  } catch (error) {
    console.warn("Push notification setup failed (optional feature):", error);
    return null;
  }
}

export { onMessage };
