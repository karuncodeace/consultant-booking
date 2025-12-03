import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your config (USE YOURS)
const firebaseConfig = {
  apiKey: "AIzaSyBXEbwtz8SfeHVdgY2i_YogD6vRxNJsw8c",
  authDomain: "consultant-booking.firebaseapp.com",
  projectId: "consultant-booking",
  storageBucket: "consultant-booking.firebasestorage.app",
  messagingSenderId: "622027081592",
  appId: "1:622027081592:web:6ff6413f0a4707431f6a8d",
  measurementId: "G-1TJ13DCWH5"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Ask for permission + get token
export const requestFcmToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Permission not granted");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: "YOUR_GENERATED_VAPID_PUBLIC_KEY"
    });

    console.log("FCM Token:", token);
    return token;

  } catch (error) {
    console.error("Error getting token:", error);
  }
};

// OPTIONAL: Foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => resolve(payload));
  });
