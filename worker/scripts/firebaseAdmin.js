import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function obterContaDeServico() {
  const valor = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!valor) {
    throw new Error("A variável FIREBASE_SERVICE_ACCOUNT não foi configurada.");
  }

  try {
    return JSON.parse(valor);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT deve conter o JSON válido da conta de serviço.");
  }
}

if (!getApps().length) {
  initializeApp({ credential: cert(obterContaDeServico()) });
}

export const db = getFirestore();
