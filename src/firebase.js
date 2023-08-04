import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { setPersistence,browserLocalPersistence,browserSessionPersistence} from "firebase/auth";

const firebaseConfig = {
    
};

export const app = await initializeApp(firebaseConfig);
// await setPersistence(getAuth(app), browserLocalPersistence)
await getAuth(app).setPersistence(browserSessionPersistence)
export const auth = await getAuth(app);
export const storage = await getStorage(app);
export const db = await getFirestore(app)
