importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBXEbwtz8SfeHVdgY2i_YogD6vRxNJsw8c",
  authDomain: "consultant-booking.firebaseapp.com",
  projectId: "consultant-booking",
  storageBucket: "consultant-booking.firebasestorage.app",
  messagingSenderId: "622027081592",
  appId: "1:622027081592:web:6ff6413f0a4707431f6a8d",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationOptions = {
    body: payload.notification.body,
  };
  
  // Only add icon if it exists (optional)
  if (payload.notification.icon) {
    notificationOptions.icon = payload.notification.icon;
  }
  
  self.registration.showNotification(payload.notification.title, notificationOptions);
});
