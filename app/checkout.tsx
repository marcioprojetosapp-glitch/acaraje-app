// @ts-nocheck
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../src/lib/firebase";

export default function Checkout() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [endereco, setEndereco] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState("entrega");
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [trocoPara, setTrocoPara] = useState("");
  const [config, setConfig] = useState({
    taxaEntrega: 8,
    tempoEntrega: "11a 24min",
    tempoRetirada: "11a 24min",
  });
  const [carrinho, setCarrinho] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Config da loja
    getDoc(doc(db, "config", "loja"))
      .then((s) => {
        if (s.exists()) setConfig(s.data());
      })
      .catch(() => {});

    // CARREGA CARRINHO - FUNCIONA NO VERCEL E NO APP
    try {
      let raw = params.carrinho as string;

      // Se não veio por params (bug do Vercel), tenta localStorage
      if (!raw && typeof window !== "undefined") {
        raw =
          localStorage.getItem("carrinho") ||
          localStorage.getItem("carrinho_acaraje") ||
          localStorage.getItem("@acaraje:carrinho") ||
          localStorage.getItem("acareje-cart") ||
          "";
      }

      if (raw) {
        const c = JSON.parse(raw);
        if (Array.isArray(c) && c.length > 0) {
          setCarrinho(c);
          const tot = c.reduce(
            (a, b) =>
              a +
              Number(b.preco || b.valor || 0) *
                Number(b.qtd || b.quantidade || 1),
            0,
          );
          setTotal(tot);
        }
      }
    } catch (e) {
      console.log("erro carrinho", e);
    }

    if (params.tipo) setTipoEntrega(params.tipo as string);
  }, []);

  const isRetirada = tipoEntrega === "retirada";
  const frete = isRetirada ? 0 : Number(config.taxaEntrega || 8);
  const totalFinal = total + frete;
  const valorTrocoPara =
    Number(
      String(trocoPara).replace(",", ".").replace("R$", "").replace(" ", ""),
    ) || 0;
  const troco = valorTrocoPara - totalFinal;

  const finalizar = async () => {
    if (!nome || !whatsapp || (!isRetirada && !endereco)) {
      Alert.alert("Falta info", "Preencha nome, WhatsApp e endereço");
      return;
    }
    if (formaPagamento === "DINHEIRO" && !trocoPara) {
      Alert.alert("Troco", "Digite para quanto precisa de troco");
      return;
    }
    if (carrinho.length === 0) {
      Alert.alert("Carrinho vazio", "Volte e adicione itens");
      return;
    }

    const resumoDetalhado = carrinho
      .map(
        (i) =>
          `${i.qtd || i.quantidade}x ${i.nome} ${i.obs ? `(${i.obs})` : ""}`,
      )
      .join("\n");

    const pedido = {
      nome,
      whatsapp: whatsapp.replace(/\D/g, ""),
      telefone: whatsapp.replace(/\D/g, ""),
      endereco: isRetirada ? "RETIRADA EM SANTO AMARO" : endereco,
      tipoEntrega,
      formaPagamento,
      trocoPara: formaPagamento === "DINHEIRO" ? trocoPara : null,
      troco: formaPagamento === "DINHEIRO" && troco > 0 ? troco : 0,
      total: totalFinal.toFixed(2),
      subtotal: total.toFixed(2),
      taxaEntrega: frete,
      itens: carrinho,
      resumo: resumoDetalhado,
      resumoDetalhado,
      status:
        formaPagamento === "DINHEIRO"
          ? "aguardando_confirmacao"
          : "aguardando_pagamento",
      pago: false,
      statusPagamento:
        formaPagamento === "DINHEIRO" ? "aguardando_confirmacao" : "pendente",
      criadoEm: serverTimestamp(),
      aceitaPromo: true,
    };

    try {
      if (formaPagamento === "DINHEIRO") {
        await addDoc(collection(db, "pedidos"), pedido);
        Alert.alert(
          "✅ Pedido enviado!",
          isRetirada
            ? "Vamos confirmar seu dinheiro e já vai pra cozinha!"
            : "Vamos confirmar e levar seu troco!",
        );
        if (typeof window !== "undefined") localStorage.removeItem("carrinho");
        router.replace("/");
      } else {
        const paramsPedido = encodeURIComponent(JSON.stringify(pedido));
        router.push(`/pagamento?dados=${paramsPedido}`);
      }
    } catch (e) {
      Alert.alert("Erro", e.message);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#000", padding: 14, paddingTop: 50 }}
    >
      <Text
        style={{
          color: "#D4AF37",
          fontSize: 24,
          fontWeight: "900",
          textAlign: "center",
          marginBottom: 14,
        }}
      >
        Checkout
      </Text>

      <View
        style={{
          backgroundColor: "#1E1E1E",
          padding: 14,
          borderRadius: 14,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: "#333",
        }}
      >
        <Text style={{ color: "#D4AF37", fontWeight: "900", fontSize: 14 }}>
          TOTAL
        </Text>
        <Text style={{ color: "#fff", marginTop: 4 }}>
          Subtotal: R$ {total.toFixed(2)}
        </Text>
        <Text style={{ color: frete === 0 ? "#00FF7F" : "#aaa", marginTop: 2 }}>
          Frete ({isRetirada ? config.tempoRetirada : config.tempoEntrega}):{" "}
          {frete === 0 ? "GRÁTIS" : `R$ ${frete.toFixed(2)}`}
        </Text>
        <Text
          style={{
            color: "#D4AF37",
            fontWeight: "900",
            fontSize: 20,
            marginTop: 8,
          }}
        >
          TOTAL: R$ {totalFinal.toFixed(2)}
        </Text>
      </View>

      <TextInput
        placeholder="Seu nome completo"
        placeholderTextColor="#777"
        value={nome}
        onChangeText={setNome}
        style={{
          backgroundColor: "#1E1E1E",
          color: "#fff",
          padding: 16,
          borderRadius: 14,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: "#333",
        }}
      />
      <TextInput
        placeholder="WhatsApp"
        placeholderTextColor="#777"
        value={whatsapp}
        onChangeText={setWhatsapp}
        keyboardType="phone-pad"
        style={{
          backgroundColor: "#1E1E1E",
          color: "#fff",
          padding: 16,
          borderRadius: 14,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: "#333",
        }}
      />

      {!isRetirada ? (
        <TextInput
          placeholder="Endereço completo"
          placeholderTextColor="#777"
          value={endereco}
          onChangeText={setEndereco}
          style={{
            backgroundColor: "#1E1E1E",
            color: "#fff",
            padding: 16,
            borderRadius: 14,
            marginBottom: 12,
            height: 80,
            borderWidth: 1,
            borderColor: "#333",
          }}
          multiline
        />
      ) : (
        <View
          style={{
            backgroundColor: "#0a1f0a",
            borderWidth: 1,
            borderColor: "#00C851",
            padding: 14,
            borderRadius: 14,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#00FF7F", fontWeight: "900" }}>
            📍 Retirada em Santo Amaro - {config.tempoRetirada}
          </Text>
        </View>
      )}

      <Text
        style={{
          color: "#D4AF37",
          fontWeight: "900",
          marginTop: 12,
          marginBottom: 10,
        }}
      >
        FORMA DE PAGAMENTO
      </Text>

      <TouchableOpacity
        onPress={() => setFormaPagamento("PIX")}
        style={{
          backgroundColor: formaPagamento === "PIX" ? "#3a3000" : "#1E1E1E",
          borderWidth: 2,
          borderColor: formaPagamento === "PIX" ? "#D4AF37" : "#333",
          padding: 16,
          borderRadius: 14,
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            color: formaPagamento === "PIX" ? "#D4AF37" : "#fff",
            fontWeight: "900",
          }}
        >
          💚 PIX - Aprovação na hora {formaPagamento === "PIX" ? "✓" : ""}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setFormaPagamento("CARTAO")}
        style={{
          backgroundColor: formaPagamento === "CARTAO" ? "#3a3000" : "#1E1E1E",
          borderWidth: 2,
          borderColor: formaPagamento === "CARTAO" ? "#D4AF37" : "#333",
          padding: 16,
          borderRadius: 14,
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            color: formaPagamento === "CARTAO" ? "#D4AF37" : "#fff",
            fontWeight: "900",
          }}
        >
          💳 Cartão de Crédito {formaPagamento === "CARTAO" ? "✓" : ""}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setFormaPagamento("DINHEIRO")}
        style={{
          backgroundColor:
            formaPagamento === "DINHEIRO" ? "#332200" : "#1E1E1E",
          borderWidth: 2,
          borderColor: formaPagamento === "DINHEIRO" ? "#FFAA00" : "#333",
          padding: 16,
          borderRadius: 14,
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            color: formaPagamento === "DINHEIRO" ? "#FFAA00" : "#fff",
            fontWeight: "900",
          }}
        >
          💵 {isRetirada ? "Dinheiro na retirada" : "Dinheiro na entrega"}{" "}
          {formaPagamento === "DINHEIRO" ? "✓" : ""}
        </Text>
      </TouchableOpacity>

      {formaPagamento === "DINHEIRO" && (
        <View
          style={{
            backgroundColor: "#332200",
            padding: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#FFAA00",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              color: "#FFAA00",
              fontSize: 13,
              marginBottom: 8,
              fontWeight: "700",
            }}
          >
            Troco para quanto?
          </Text>
          <TextInput
            placeholder="Ex: 50, 100"
            placeholderTextColor="#777"
            value={trocoPara}
            onChangeText={setTrocoPara}
            keyboardType="numeric"
            style={{
              backgroundColor: "#000",
              color: "#fff",
              padding: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#553300",
            }}
          />
          {troco > 0 && (
            <Text style={{ color: "#00FF7F", marginTop: 8, fontWeight: "900" }}>
              Seu troco: R$ {troco.toFixed(2)}
            </Text>
          )}
          {troco < 0 && (
            <Text style={{ color: "#ff4444", marginTop: 8 }}>
              Valor menor que o total!
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={finalizar}
        style={{
          backgroundColor: "#D4AF37",
          padding: 18,
          borderRadius: 14,
          alignItems: "center",
          marginTop: 10,
          marginBottom: 50,
        }}
      >
        <Text style={{ fontWeight: "900", fontSize: 16, color: "#000" }}>
          {formaPagamento === "DINHEIRO"
            ? "ENVIAR PEDIDO 💵"
            : "IR PARA PAGAMENTO"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
