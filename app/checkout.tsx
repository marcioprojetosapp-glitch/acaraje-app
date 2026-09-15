// @ts-nocheck
import { useCarrinho } from "@/src/context/CarrinhoContext";
import { db } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
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

export default function Checkout() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { carrinho, total: totalContext } = useCarrinho();

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [endereco, setEndereco] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState("entrega");
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [trocoPara, setTrocoPara] = useState("");
  const [config, setConfig] = useState({ taxaEntrega: 8 });

  const subtotalParam = Number(params.subtotal) || totalContext || 0;
  const taxaParam = Number(params.taxa) || 0;
  const totalParam = Number(params.total) || subtotalParam + taxaParam;
  const resumoParam = params.resumo
    ? decodeURIComponent(params.resumo as string)
    : "";
  const tempoParam = params.tempo
    ? decodeURIComponent(params.tempo as string)
    : "";

  useEffect(() => {
    getDoc(doc(db, "config", "loja")).then((s) => {
      if (s.exists()) setConfig(s.data());
    });
    if (params.tipo) setTipoEntrega(params.tipo as string);
  }, []);

  const isRetirada = tipoEntrega === "retirada";
  const frete = isRetirada ? 0 : taxaParam || Number(config.taxaEntrega || 8);
  const subtotal = subtotalParam;
  const totalFinal = isRetirada ? subtotal : totalParam;

  const valorTrocoPara =
    Number(String(trocoPara).replace(",", ".").replace("R$", "")) || 0;
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
      subtotal: subtotal.toFixed(2),
      taxaEntrega: frete,
      itens: carrinho.length > 0 ? carrinho : [{ nome: resumoParam }],
      resumo: resumoParam,
      resumoDetalhado: resumoParam,
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
        Alert.alert("✅ Pedido enviado!", "Vamos confirmar seu pagamento!");
        router.replace("/");
      } else {
        router.push(
          `/pagamento?dados=${encodeURIComponent(JSON.stringify(pedido))}`,
        );
      }
    } catch (e) {
      Alert.alert("Erro", e.message);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#000", padding: 14, paddingTop: 50 }}
    >
      {/* HEADER COM SETA */}
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: "#1E1E1E", padding: 10, borderRadius: 20 }}
        >
          <Ionicons name="arrow-back" size={26} color="#D4AF37" />
        </TouchableOpacity>
        <Text
          style={{
            color: "#D4AF37",
            fontSize: 24,
            fontWeight: "900",
            flex: 1,
            textAlign: "center",
            marginRight: 46,
          }}
        >
          Confira
        </Text>
      </View>

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
        <Text style={{ color: "#fff", marginTop: 4, fontSize: 14 }}>
          Subtotal: R$ {subtotal.toFixed(2).replace(".", ",")}
        </Text>
        <Text
          style={{
            color: frete === 0 ? "#00FF7F" : "#aaa",
            marginTop: 2,
            fontSize: 13,
          }}
        >
          Frete ({tempoParam || (isRetirada ? "retirada" : "entrega")}):{" "}
          {frete === 0 ? "GRÁTIS" : `R$ ${frete.toFixed(2).replace(".", ",")}`}
        </Text>
        <Text
          style={{
            color: "#D4AF37",
            fontWeight: "900",
            fontSize: 22,
            marginTop: 8,
          }}
        >
          TOTAL: R$ {totalFinal.toFixed(2).replace(".", ",")}
        </Text>

        {/* PRODUTOS COM COR FORTE */}
        {resumoParam ? (
          <View
            style={{
              marginTop: 12,
              backgroundColor: "#000",
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#D4AF37",
            }}
          >
            <Text
              style={{
                color: "#D4AF37",
                fontSize: 11,
                fontWeight: "900",
                marginBottom: 6,
              }}
            >
              SEU PEDIDO:
            </Text>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: "800",
                lineHeight: 20,
              }}
            >
              {resumoParam}
            </Text>
          </View>
        ) : null}
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
            📍 Retirada em Santo Amaro
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
            }}
          />
          {troco > 0 && (
            <Text style={{ color: "#00FF7F", marginTop: 8, fontWeight: "900" }}>
              Seu troco: R$ {troco.toFixed(2).replace(".", ",")}
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
