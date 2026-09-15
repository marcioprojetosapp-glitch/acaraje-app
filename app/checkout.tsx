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
  const [tipoEntrega, setTipoEntrega] = useState("entrega"); // entrega | retirada
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [trocoPara, setTrocoPara] = useState("");
  const [config, setConfig] = useState({
    taxaEntrega: 8,
    tempoEntrega: "40 a 60 min",
    tempoRetirada: "15 a 25 min",
  });
  const [carrinho, setCarrinho] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Pega config da loja
    getDoc(doc(db, "config", "loja")).then((s) => {
      if (s.exists()) setConfig(s.data());
    });
    // Pega carrinho do params
    if (params.carrinho) {
      try {
        const c = JSON.parse(params.carrinho as string);
        setCarrinho(c);
        const tot = c.reduce(
          (a, b) => a + Number(b.preco || 0) * Number(b.qtd || 1),
          0,
        );
        setTotal(tot);
      } catch {}
    }
    if (params.tipo) setTipoEntrega(params.tipo as string);
  }, []);

  const isRetirada = tipoEntrega === "retirada";
  const frete = isRetirada ? 0 : Number(config.taxaEntrega || 8);
  const totalFinal = total + frete;
  const troco = trocoPara
    ? Number(String(trocoPara).replace(",", ".").replace("R$", "")) - totalFinal
    : 0;

  const finalizar = async () => {
    if (!nome || !whatsapp || (!isRetirada && !endereco)) {
      Alert.alert("Falta info", "Preencha nome, WhatsApp e endereço");
      return;
    }
    if (formaPagamento === "DINHEIRO" && !trocoPara) {
      Alert.alert("Troco", "Digite para quanto precisa de troco");
      return;
    }

    const resumoDetalhado = carrinho
      .map((i) => `${i.qtd}x ${i.nome} ${i.obs ? `(${i.obs})` : ""}`)
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
        // Salva cliente tbm
        await addDoc(collection(db, "clientes"), {
          nome,
          whatsapp: whatsapp.replace(/\D/g, ""),
          aceitaPromo: true,
          ultimoPedido: serverTimestamp(),
        }).catch(() => {});
        Alert.alert(
          "✅ Pedido enviado!",
          isRetirada
            ? "Vamos confirmar seu dinheiro e já vai pra cozinha!"
            : "Vamos confirmar e levar seu troco!",
        );
        router.replace("/");
      } else {
        // PIX ou CARTAO - vai pro pagamento
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
          fontSize: 22,
          fontWeight: "900",
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        Checkout
      </Text>

      <View
        style={{
          backgroundColor: "#1a1a1a",
          padding: 12,
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#D4AF37", fontWeight: "900" }}>TOTAL</Text>
        <Text style={{ color: "#fff" }}>Subtotal: R$ {total.toFixed(2)}</Text>
        <Text style={{ color: frete === 0 ? "#00C851" : "#fff" }}>
          Frete ({isRetirada ? config.tempoRetirada : config.tempoEntrega}):{" "}
          {frete === 0 ? "GRÁTIS" : `R$ ${frete.toFixed(2)}`}
        </Text>
        <Text
          style={{
            color: "#D4AF37",
            fontWeight: "900",
            fontSize: 18,
            marginTop: 6,
          }}
        >
          TOTAL: R$ {totalFinal.toFixed(2)}
        </Text>
      </View>

      <TextInput
        placeholder="Seu nome completo"
        placeholderTextColor="#888"
        value={nome}
        onChangeText={setNome}
        style={{
          backgroundColor: "#222",
          color: "#fff",
          padding: 14,
          borderRadius: 12,
          marginBottom: 10,
        }}
      />
      <TextInput
        placeholder="WhatsApp"
        placeholderTextColor="#888"
        value={whatsapp}
        onChangeText={setWhatsapp}
        keyboardType="phone-pad"
        style={{
          backgroundColor: "#222",
          color: "#fff",
          padding: 14,
          borderRadius: 12,
          marginBottom: 10,
        }}
      />

      {!isRetirada && (
        <TextInput
          placeholder="Endereço completo"
          placeholderTextColor="#888"
          value={endereco}
          onChangeText={setEndereco}
          style={{
            backgroundColor: "#222",
            color: "#fff",
            padding: 14,
            borderRadius: 12,
            marginBottom: 10,
            height: 70,
          }}
        />
      )}

      {isRetirada && (
        <View
          style={{
            backgroundColor: "#112911",
            borderWidth: 1,
            borderColor: "#00C851",
            padding: 12,
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          <Text style={{ color: "#00C851", fontWeight: "900" }}>
            📍 Retirada em Santo Amaro - {config.tempoRetirada}
          </Text>
        </View>
      )}

      <Text
        style={{
          color: "#D4AF37",
          fontWeight: "900",
          marginTop: 10,
          marginBottom: 8,
        }}
      >
        FORMA DE PAGAMENTO
      </Text>

      <TouchableOpacity
        onPress={() => setFormaPagamento("PIX")}
        style={{
          backgroundColor: formaPagamento === "PIX" ? "#3a3000" : "#222",
          borderWidth: 2,
          borderColor: formaPagamento === "PIX" ? "#D4AF37" : "#333",
          padding: 14,
          borderRadius: 12,
          marginBottom: 8,
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
          backgroundColor: formaPagamento === "CARTAO" ? "#3a3000" : "#222",
          borderWidth: 2,
          borderColor: formaPagamento === "CARTAO" ? "#D4AF37" : "#333",
          padding: 14,
          borderRadius: 12,
          marginBottom: 8,
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
          backgroundColor: formaPagamento === "DINHEIRO" ? "#332200" : "#222",
          borderWidth: 2,
          borderColor: formaPagamento === "DINHEIRO" ? "#FFAA00" : "#333",
          padding: 14,
          borderRadius: 12,
          marginBottom: 8,
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
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#FFAA00",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: "#FFAA00", fontSize: 12, marginBottom: 6 }}>
            Troco para quanto?
          </Text>
          <TextInput
            placeholder="Ex: 50, 100"
            placeholderTextColor="#888"
            value={trocoPara}
            onChangeText={setTrocoPara}
            keyboardType="numeric"
            style={{
              backgroundColor: "#000",
              color: "#fff",
              padding: 12,
              borderRadius: 8,
            }}
          />
          {troco > 0 && (
            <Text style={{ color: "#00C851", marginTop: 6, fontWeight: "900" }}>
              Seu troco: R$ {troco.toFixed(2)}
            </Text>
          )}
          {troco < 0 && (
            <Text style={{ color: "red", marginTop: 6 }}>
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
          marginTop: 12,
          marginBottom: 40,
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
