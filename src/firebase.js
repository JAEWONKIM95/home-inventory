// Firebase 초기화
// 설정값은 .env 파일에서 읽어옵니다 (.env.example 참고).
// Firebase Console → 프로젝트 설정(⚙️) → 일반 → 내 앱 → SDK 설정 및 구성 에서 값을 복사하세요.
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    "Firebase 설정이 없습니다. .env.example 을 .env 로 복사하고 본인의 Firebase 프로젝트 설정값을 채워주세요.\n" +
      "Missing Firebase config: copy .env.example to .env and fill in your own Firebase project values."
  );
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
