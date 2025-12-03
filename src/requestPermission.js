import { messaging } from "./firebase";
import { getToken } from "firebase/messaging";

export async function requestFCMPermission() {
  console.log("Requesting permission...");

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    alert("Notification permission denied");
    return;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: "BIuJThFy..." // we will generate this next
    });

    console.log("FCM Token:", token);
    return token;
  } catch (err) {
    console.error("Error getting FCM token", err);
  }
}
