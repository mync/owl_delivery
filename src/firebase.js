import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { setPersistence,browserLocalPersistence,browserSessionPersistence} from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDWpa5FtdVzpzbhPkXO9f9vMX3ALwLHHDc",
    authDomain: "chatapp-618e4.firebaseapp.com",
    projectId: "chatapp-618e4",
    storageBucket: "chatapp-618e4.appspot.com",
    messagingSenderId: "165590254391",
    appId: "1:165590254391:web:71d63b3030025b5bdad0b2",
    measurementId: "G-J1YVZEQVXN"
};

export const app = await initializeApp(firebaseConfig);
// await setPersistence(getAuth(app), browserLocalPersistence)
await getAuth(app).setPersistence(browserSessionPersistence)
export const auth = await getAuth(app);
export const storage = await getStorage(app);
export const db = await getFirestore(app)