import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCqC-pYZCBvolYAgIbFRCXsOyISN76ikQw",
  authDomain: "my-fullstack-demo-c6922.firebaseapp.com",
  databaseURL: "https://my-fullstack-demo-c6922-default-rtdb.firebaseio.com",
  projectId: "my-fullstack-demo-c6922",
  storageBucket: "my-fullstack-demo-c6922.firebasestorage.app",
  messagingSenderId: "20518253214",
  appId: "1:20518253214:web:a552ee9e3f2a25f6fc418f",
  measurementId: "G-MN7ET6F7PH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Session-only: closing the tab logs you out, so next time you run the app you see the login page
setPersistence(auth, browserSessionPersistence).catch(() => {});

export { auth };
export default app;

