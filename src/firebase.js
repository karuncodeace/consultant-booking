import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBXEbwtz8SfeHVdgY2i_YogD6vRxNJsw8c",
  authDomain: "consultant-booking.firebaseapp.com",
  projectId: "consultant-booking",
  storageBucket: "consultant-booking.firebasestorage.app",
  messagingSenderId: "622027081592",
  appId: "1:622027081592:web:6ff6413f0a4707431f6a8d"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export async function requestPermissionAndToken() {
  try {
    console.log("🔄 Registering service worker...");

    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("✅ SW Registered:", swReg);

    console.log("🔄 Asking notification permission...");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Permission not granted!");

    console.log("🔄 Generating FCM token...");
    const token = await getToken(messaging, {
      vapidKey: "BE66LRDqIDAVegEdaetcCDiK1YfYAJ7mYm2rZJUmz7VbvzEmRZVW5yjz-VtxJJDX1hVwkimzrMhJS5lY2PTeV2o",
      serviceWorkerRegistration: swReg,
    });

    console.log("🎉 FCM token generated:", token);
    return token;

  } catch (err) {
    console.error("🔥 Error generating FCM token", err);
    return null;
  }
}
