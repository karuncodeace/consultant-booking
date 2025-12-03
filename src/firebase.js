import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

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
  console.log("🔄 Asking notification permission...");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.log("❌ Permission denied");
    return null;
  }

  console.log("🔄 Registering Firebase service worker...");
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  console.log("🔄 Generating FCM token...");

  return await getToken(messaging, {
    vapidKey: "BE66LRDqIDAVegEdaetcCDiK1YfYAJ7mYm2rZJUmz7VbvzEmRZVW5yjz-VtxJJDX1hVwkimzrMhJS5lY2PTeV2o", // Keep your VAPID KEY here
    serviceWorkerRegistration: registration
  });
}

export { onMessage };
