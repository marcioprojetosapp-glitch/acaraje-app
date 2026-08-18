import { Linking } from "react-native";

const NUMERO_DONO = "5575992341355"; // <-- SEU NUMERO COM DDD

function formatarPedido(pedido: any) {
  let msg = `*PEDIDO ${pedido.status} - ACARAJÉ DA BENÇÃO*%0A%0A`;
  msg += `*Pedido:* #${pedido.id?.substring(0, 5) || "---"}%0A`;
  msg += `*Hora:* ${new Date().toLocaleTimeString("pt-BR")}%0A%0A`;
  msg += `*Cliente:* ${pedido.nome}%0A`;
  msg += `*WhatsApp:* ${pedido.whatsapp}%0A`;
  msg += `*Endereço:* ${pedido.endereco}%0A`;
  if (pedido.observacao) msg += `*Obs:* ${pedido.observacao}%0A`;
  msg += `%0A*ITENS:*%0A`;
  pedido.itens.forEach(
    (i: any) =>
      (msg += `${i.quantidade}x ${i.nome} - R$ ${i.preco.toFixed(2)}%0A`),
  );
  msg += `%0A*TOTAL: R$ ${pedido.total.toFixed(2)}*`;
  return msg;
}

export async function enviarParaDono(pedido: any) {
  const mensagem = formatarPedido(pedido);
  const url = `https://wa.me/${NUMERO_DONO}?text=${mensagem}`;
  await Linking.openURL(url);
}
