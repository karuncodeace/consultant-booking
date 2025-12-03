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

export async function requestFCMPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: "BE66LRDqIDAVegEdaetcCDiK1YfYAJ7mYm2rZJUmz7VbvzEmRZVW5yjz-VtxJJDX1hVwkimzrMhJS5lY2PTeV2o"
    });

    console.log("🌟 FCM TOKEN:", token);

    onMessage(messaging, (payload) => {
      console.log("Foreground message:", payload);
      new Notification(payload.notification.title, {
        body: payload.notification.body
      });
    });
  } catch (err) {
    console.error("Error generating FCM token", err);
  }
}
