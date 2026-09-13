const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const mpToken = defineSecret("MP_ACCESS_TOKEN");
const db = getFirestore();

exports.criarPagamento = onRequest(
  { cors: true, secrets: [mpToken] },
  async (req, res) => {
    try {
      const { tipo, external_reference, email } = req.body;
      console.log("CRIANDO PAGAMENTO TIPO:", tipo);

      if (!external_reference) {
        return res.status(400).json({ error: "pedidoId obrigatório" });
      }

      const pedidoSnap = await db
        .collection("pedidos")
        .doc(external_reference)
        .get();
      if (!pedidoSnap.exists) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      const pedido = pedidoSnap.data();
      let totalItens = 0;
      let itemsFinal = [];

      if (pedido.itens && pedido.itens.length > 0) {
        for (const it of pedido.itens) {
          const preco = Number(it.preco);
          const qtd = Number(it.qtd || it.quantity || it.quantidade || 1);
          if (!preco || preco <= 0) continue;
          totalItens += preco * qtd;
          itemsFinal.push({
            title: (it.nome || "ACARAJÉ").slice(0, 50),
            quantity: qtd,
            unit_price: preco,
            currency_id: "BRL",
          });
        }
      }

      // ===== FIX FRETE - AQUI QUE CONSERTA TUDO =====
      const isRetirada =
        pedido.tipoEntrega === "retirada" ||
        String(pedido.endereco || "")
          .toUpperCase()
          .includes("RETIRADA");
      const freteSalvo = Number(
        pedido.taxaEntrega || pedido.frete || pedido.valorFrete || 0,
      );
      const freteFinal = isRetirada ? 0 : freteSalvo > 0 ? freteSalvo : 8;

      // Se tiver frete, adiciona como item separado pro Mercado Pago mostrar
      if (freteFinal > 0) {
        itemsFinal.push({
          title: "Taxa de Entrega",
          quantity: 1,
          unit_price: freteFinal,
          currency_id: "BRL",
        });
      }

      // Total REAL com frete = itens + frete OU usa o total já salvo no pedido (que já tem frete)
      const totalReal = Number(pedido.total || totalItens + freteFinal);

      console.log(
        "SUBTOTAL ITENS:",
        totalItens,
        "FRETE:",
        freteFinal,
        "TOTAL COM FRETE:",
        totalReal,
      );

      if (totalReal < 5) {
        return res
          .status(400)
          .json({ error: "Total inválido - menor que R$ 5" });
      }

      // ===== PIX DIRETO =====
      if (tipo === "pix") {
        const pixPayment = {
          transaction_amount: totalReal, // AGORA COM FRETE!
          description: `Pedido ${external_reference.slice(-6)} - Acarajé da Benção - R$ ${totalReal}`,
          payment_method_id: "pix",
          external_reference: external_reference,
          notification_url:
            "https://us-central1-acaraje-da-bencao.cloudfunctions.net/webhookMercadoPago",
          payer: {
            email: `pix.${Date.now()}@gmail.com`,
            first_name: "Cliente",
            last_name: "Acaraje",
          },
        };

        const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mpToken.value()}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": `${external_reference}-${Date.now()}`,
          },
          body: JSON.stringify(pixPayment),
        });

        const mpData = await mpRes.json();
        console.log("PIX CRIADO COM FRETE:", mpData.id, "VALOR:", totalReal);

        if (!mpRes.ok) return res.status(400).json(mpData);

        await db.collection("pedidos").doc(external_reference).update({
          pagamentoId: mpData.id,
          statusPagamento: mpData.status,
          totalCobrado: totalReal,
          freteCobrado: freteFinal,
          pix_qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
          pix_qr_base64:
            mpData.point_of_interaction?.transaction_data?.qr_code_base64,
          pix_ticket_url:
            mpData.point_of_interaction?.transaction_data?.ticket_url,
        });

        return res.json({
          id: mpData.id,
          status: mpData.status,
          tipo: "pix_direto",
          qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64:
            mpData.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: mpData.point_of_interaction?.transaction_data?.ticket_url,
          totalCobrado: totalReal,
        });
      }

      // ===== CARTÃO =====
      const emailFinal = email || pedido.clienteEmail || pedido.email;
      if (!emailFinal || !emailFinal.includes("@")) {
        return res
          .status(400)
          .json({ error: "E-mail válido obrigatório para cartão" });
      }

      const preference = {
        items: itemsFinal, // AGORA JÁ TEM O FRETE COMO ITEM
        external_reference: external_reference,
        payer: {
          email: emailFinal,
          name: (pedido.nome || "Cliente Acaraje").slice(0, 50),
        },
        statement_descriptor: "ACARAJE DA BENCAO",
        binary_mode: true,
        back_urls: {
          success: "https://acaraje-da-bencao.web.app/sucesso",
          failure: "https://acaraje-da-bencao.web.app/falha",
          pending: "https://acaraje-da-bencao.web.app/pendente",
        },
        auto_return: "approved",
        notification_url:
          "https://us-central1-acaraje-da-bencao.cloudfunctions.net/webhookMercadoPago",
      };

      const response = await fetch(
        "https://api.mercadopago.com/checkout/preferences",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mpToken.value()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(preference),
        },
      );

      const data = await response.json();
      console.log("PREFERENCE CARTAO COM FRETE:", data.id, "TOTAL:", totalReal);
      if (!response.ok) return res.status(400).json(data);

      return res.json({ ...data, tipo: "cartao", totalCobrado: totalReal });
    } catch (e) {
      console.error("ERRO criarPagamento", e);
      return res.status(500).json({ error: e.message });
    }
  },
);

exports.webhookMercadoPago = onRequest(
  { cors: true, secrets: [mpToken] },
  async (req, res) => {
    try {
      const { type, data } = req.body;
      console.log("WEBHOOK:", type, data?.id);
      if (type === "payment") {
        const paymentId = data.id;
        const mpResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          {
            headers: { Authorization: `Bearer ${mpToken.value()}` },
          },
        );
        const payment = await mpResponse.json();
        const pedidoId = payment.external_reference;
        if (pedidoId) {
          await db
            .collection("pedidos")
            .doc(pedidoId)
            .update({
              statusPagamento: payment.status,
              status:
                payment.status === "approved" ? "pago" : "aguardando_pagamento",
              pagamentoId: paymentId,
              totalPago: payment.transaction_amount,
              pagoEm: payment.status === "approved" ? new Date() : null,
            });
          console.log(
            "PEDIDO ATUALIZADO",
            pedidoId,
            payment.status,
            "VALOR:",
            payment.transaction_amount,
          );
        }
      }
      res.status(200).send("OK");
    } catch (e) {
      console.error("ERRO WEBHOOK", e);
      res.status(500).send(e.message);
    }
  },
);
