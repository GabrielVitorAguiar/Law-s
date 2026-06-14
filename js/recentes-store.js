const LIMITE_RECENTES = 30;

export function registrarRecente(item) {

  if (!item?.chave || !item?.nome || !item?.link || !item?.tipo) return;

  const recentes = JSON.parse(localStorage.getItem("recentes")) || [];
  const semRepeticao = recentes.filter((recente) => recente.chave !== item.chave);

  const atualizados = [
    {
      ...item,
      acessadoEm: new Date().toISOString()
    },
    ...semRepeticao
  ].slice(0, LIMITE_RECENTES);

  localStorage.setItem("recentes", JSON.stringify(atualizados));

}
