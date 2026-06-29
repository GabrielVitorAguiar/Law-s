import { auth } from "./firebase.js";

const LIMITE_RECENTES = 30;

export function registrarRecente(item) {

  if (!item?.chave || !item?.nome || !item?.link || !item?.tipo) return;

  const storageKey = chaveRecentes();
  const recentes = JSON.parse(localStorage.getItem(storageKey)) || [];
  const semRepeticao = recentes.filter((recente) => recente.chave !== item.chave);

  const atualizados = [
    {
      ...item,
      acessadoEm: new Date().toISOString()
    },
    ...semRepeticao
  ].slice(0, LIMITE_RECENTES);

  localStorage.setItem(storageKey, JSON.stringify(atualizados));

}

function chaveRecentes() {

  const userId = auth.currentUser?.uid || "anonimo";

  return `recentes:${userId}`;

}
