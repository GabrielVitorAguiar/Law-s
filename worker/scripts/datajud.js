const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

export function validarNumeroCnj(numeroProcesso) {
  return CNJ_REGEX.test(numeroProcesso);
}

function obterAliasTribunal(tribunal) {
  const alias = String(tribunal || "").trim().toLowerCase();

  if (!/^(trt|trf|tj|tre|stm|stj|tst|tse|stf)\d*[a-z]*$/.test(alias)) {
    throw new Error(`Tribunal inválido para consulta DataJud: ${tribunal}`);
  }

  return alias;
}

export async function consultarProcessoDatajud(numeroProcesso, tribunal) {
  if (!validarNumeroCnj(numeroProcesso)) {
    throw new Error("O número do processo não está no formato CNJ esperado.");
  }

  if (!process.env.DATAJUD_API_KEY) {
    throw new Error("A variável DATAJUD_API_KEY não foi configurada.");
  }

  const aliasTribunal = obterAliasTribunal(tribunal);
  const resposta = await fetch(
    `https://api-publica.datajud.cnj.jus.br/api_publica_${aliasTribunal}/_search`,
    {
      method: "POST",
      headers: {
        Authorization: `APIKey ${process.env.DATAJUD_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        size: 1,
        query: {
          match: {
            numeroProcesso
          }
        }
      })
    }
  );

  if (!resposta.ok) {
    const erro = new Error(`DataJud respondeu com status ${resposta.status}.`);
    erro.statusCode = resposta.status;
    throw erro;
  }

  const dados = await resposta.json();
  return dados?.hits?.hits?.[0]?._source || null;
}

export function extrairMetadados(processo) {
  return {
    classeProcessual: processo?.classe?.nome || null,
    assunto: processo?.assuntos?.map((item) => item.nome).filter(Boolean).join("; ") || null,
    orgaoJulgador: processo?.orgaoJulgador?.nome || null
  };
}

export function extrairMovimentacoes(processo) {
  return (processo?.movimentos || []).map((movimento) => ({
    codigo: String(movimento.codigo || ""),
    descricao: movimento.nome || movimento.descricao || "Movimentação sem descrição",
    dataHora: movimento.dataHora || null,
    complementos: Array.isArray(movimento.complementos)
      ? movimento.complementos.map((complemento) => complemento.nome || complemento.descricao || String(complemento)).filter(Boolean)
      : []
  }));
}
