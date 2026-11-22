import { initializeApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Valores públicos de identificação do projeto (vêm do .env). Não são segredos.
const env = import.meta.env;
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL as string,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: env.VITE_FIREBASE_APP_ID as string
};

export const app = getApps()[0] ?? initializeApp(firebaseConfig);

const siteKey = env.VITE_APPCHECK_SITE_KEY as string | undefined;
if (siteKey && typeof window !== 'undefined') {
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true });
}

export const auth = getAuth(app);
export const db = getDatabase(app);
export const functions = getFunctions(app, (env.VITE_FUNCTIONS_REGION as string) || 'us-central1');

/** Sessão por aba (some ao fechar) para equipe; persistente para contas de painel (TV). */
export function setAuthPersistence(persistent: boolean) {
  return setPersistence(auth, persistent ? browserLocalPersistence : browserSessionPersistence);
}

export const LOGIN_EMAIL_DOMAIN = (env.VITE_LOGIN_EMAIL_DOMAIN as string) || 'usuarios.hrpi.local';
export const IDLE_TIMEOUT_MIN = Number(env.VITE_IDLE_TIMEOUT_MIN) || 30;
