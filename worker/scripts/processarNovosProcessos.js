import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebaseAdmin.js";
import { consultarProcessoDatajud, extrairMetadados } from "./datajud.js";

async function registrarLog(processoId, erro) {
  await db.collection("logs_erros_datajud").add({
    processoId,
    timestamp: FieldValue.serverTimestamp(),
    mensagemErro: erro.message || String(erro),
    statusCode: erro.statusCode || null
  });
}

async function processar(documento) {
  const processo = documento.data();

  try {
    const resultado = await consultarProcessoDatajud(processo.numeroProcesso, processo.tribunal);
    const dados = resultado ? extrairMetadados(resultado) : {
      classeProcessual: null,
      assunto: null,
      orgaoJulgador: null
    };

    await documento.ref.update({
      ...dados,
      primeiraConsultaFeita: true,
      ultimaConsulta: FieldValue.serverTimestamp()
    });

    if (!resultado) {
      await registrarLog(documento.id, new Error("Processo não encontrado no DataJud durante a primeira consulta."));
    }
  } catch (erro) {
    await registrarLog(documento.id, erro);
    console.error(`Falha ao consultar o processo ${documento.id}:`, erro.message);
  }
}

const novosProcessos = await db
  .collection("processos_monitorados")
  .where("primeiraConsultaFeita", "==", false)
  .get();

for (const documento of novosProcessos.docs) {
  await processar(documento);
}

console.log(`${novosProcessos.size} processo(s) novo(s) processado(s).`);
