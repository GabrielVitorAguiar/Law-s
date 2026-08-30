import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebaseAdmin.js";
import { consultarProcessoDatajud, extrairMovimentacoes } from "./datajud.js";

function idDaMovimentacao(movimentacao) {
  return Buffer
    .from([movimentacao.codigo, movimentacao.dataHora, movimentacao.descricao].join("|"))
    .toString("base64url");
}

async function registrarLog(processoId, erro) {
  await db.collection("logs_erros_datajud").add({
    processoId,
    timestamp: FieldValue.serverTimestamp(),
    mensagemErro: erro.message || String(erro),
    statusCode: erro.statusCode || null
  });
}

async function consultar(documento) {
  const processo = documento.data();

  try {
    const resultado = await consultarProcessoDatajud(processo.numeroProcesso, processo.tribunal);
    const movimentacoes = extrairMovimentacoes(resultado);
    const indiceDaUltima = movimentacoes.findIndex((item) => idDaMovimentacao(item) === processo.ultimaMovimentacaoId);
    const novas = indiceDaUltima >= 0 ? movimentacoes.slice(0, indiceDaUltima) : movimentacoes;
    const batch = db.batch();

    for (const movimentacao of novas) {
      if (!movimentacao.dataHora) continue;

      const referencia = documento.ref.collection("movimentacoes").doc(idDaMovimentacao(movimentacao));
      const movimentacaoExistente = await referencia.get();

      batch.set(referencia, {
        id: referencia.id,
        ...movimentacao,
        notificacaoEnviada: false,
        visualizada: false
      }, { merge: true });

      if (!movimentacaoExistente.exists) {
        const notificacao = db.collection("notificacoes_usuario").doc();
        batch.set(notificacao, {
          usuarioId: processo.advogadoResponsavelId,
          processoId: documento.id,
          mensagem: `Nova movimentação no processo ${processo.numeroProcesso}: ${movimentacao.descricao}`,
          lida: false,
          dataHora: movimentacao.dataHora
        });
      }
    }

    batch.update(documento.ref, {
      ultimaMovimentacaoId: movimentacoes[0] ? idDaMovimentacao(movimentacoes[0]) : processo.ultimaMovimentacaoId || null,
      ultimaConsulta: FieldValue.serverTimestamp()
    });

    await batch.commit();
  } catch (erro) {
    await registrarLog(documento.id, erro);
    console.error(`Falha ao consultar movimentações do processo ${documento.id}:`, erro.message);
  }
}

const processosAtivos = await db
  .collection("processos_monitorados")
  .where("ativo", "==", true)
  .get();

for (const documento of processosAtivos.docs) {
  if (documento.data().primeiraConsultaFeita) {
    await consultar(documento);
  }
}

console.log(`${processosAtivos.size} processo(s) ativo(s) verificado(s).`);
