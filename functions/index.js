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
      let totalReal = 0;
      let itemsFinal = [];

      if (pedido.itens && pedido.itens.length > 0) {
        for (const it of pedido.itens) {
          const preco = Number(it.preco);
          const qtd = Number(it.qtd || it.quantity || 1);
          if (!preco || preco <= 0) continue;
          totalReal += preco * qtd;
          itemsFinal.push({
            title: (it.nome || "ACARAJÉ").slice(0, 50),
            quantity: qtd,
            unit_price: preco,
            currency_id: "BRL",
          });
        }
      }

      if (totalReal < 5) {
        return res.status(400).json({
          error: "Total inválido - pedido sem itens ou menor que R$ 5",
        });
      }

      // ===== PIX DIRETO - VAI DIRETO PRO QR CODE DENTRO DO APP =====
      if (tipo === "pix") {
        const pixPayment = {
          transaction_amount: totalReal,
          description: `Pedido ${external_reference} - Acarajé da Benção`,
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
        console.log("PIX CRIADO:", mpData.id, mpData.status);

        if (!mpRes.ok) {
          return res.status(400).json(mpData);
        }

        await db.collection("pedidos").doc(external_reference).update({
          pagamentoId: mpData.id,
          statusPagamento: mpData.status,
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

      // ===== CARTÃO - BLINDADO, SEM ERRO DE account_money =====
      const emailFinal =
        email || pedido.clienteEmail || pedido.email || pedido.cliente?.email;
      if (!emailFinal || !emailFinal.includes("@")) {
        return res
          .status(400)
          .json({ error: "E-mail válido obrigatório para cartão" });
      }

      const preference = {
        items: itemsFinal,
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
      console.log("PREFERENCE CARTAO:", data.id);
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
          console.log("PEDIDO ATUALIZADO", pedidoId, payment.status);
        }
      }
      res.status(200).send("OK");
    } catch (e) {
      console.error("ERRO WEBHOOK", e);
      res.status(500).send(e.message);
    }
  },
);
