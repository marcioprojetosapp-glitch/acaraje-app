// @ts-nocheck
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useCarrinho } from "../src/context/CarrinhoContext";
import { db } from "../src/lib/firebase";

export default function Pagamento() {
  const params = useLocalSearchParams() as any;
  const pedidoId = params.pedidoId as string;
  const dadosParam = params.dados as string;
  const router = useRouter();
  const { limparCarrinho } = useCarrinho();
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [email, setEmail] = useState("");
  const [mostrarEmail, setMostrarEmail] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [pedido, setPedido] = useState<any>(null);
  const [idReal, setIdReal] = useState(pedidoId);

  // SE VEIO PELO FLUXO ANTIGO ?dados= , CRIA O PEDIDO AQUI E EVITA TELA BRANCA
  useEffect(() => {
    if (!pedidoId && dadosParam) {
      (async () => {
        try {
          const obj = JSON.parse(decodeURIComponent(dadosParam));
          const ref = await addDoc(collection(db, "pedidos"), {
            ...obj,
            status: "aguardando_pagamento",
            statusPagamento: "pendente",
            criadoEm: serverTimestamp(),
          });
          setIdReal(ref.id);
          router.replace(`/pagamento?pedidoId=${ref.id}`);
        } catch (e) {
          console.log("erro dadosParam", e);
        }
      })();
    } else {
      setIdReal(pedidoId);
    }
  }, [pedidoId, dadosParam]);

  useEffect(() => {
    if (!idReal) return;
    const unsub = onSnapshot(doc(db, "pedidos", idReal), async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setPedido(data);
      if (
        (data?.statusPagamento === "approved" || data?.status === "pago") &&
        !data?.estoqueBaixado
      ) {
        try {
          const itens = data?.itens || [];
          for (const item of itens) {
            const idProduto = item.id || item.itemId || item.produtoId;
            if (!idProduto) continue;
            const ref = doc(db, "produtos", idProduto);
            const prodSnap = await getDoc(ref);
            if (prodSnap.exists()) {
              const atual = prodSnap.data().estoque ?? 0;
              const qtd = item.qtd ?? item.quantidade ?? 1;
              const novo = Math.max(0, atual - qtd);
              await updateDoc(ref, { estoque: novo, disponivel: novo > 0 });
            }
          }
          await updateDoc(doc(db, "pedidos", idReal), {
            estoqueBaixado: true,
            estoqueBaixadoEm: new Date(),
          });
        } catch (e) {
          console.log("Erro baixa estoque", e);
        }
        limparCarrinho();
        router.replace("/sucesso");
      }
      if (
        (data?.statusPagamento === "approved" || data?.status === "pago") &&
        data?.estoqueBaixado
      ) {
        limparCarrinho();
        router.replace("/sucesso");
      }
    });
    return () => unsub();
  }, [idReal]);

  const criarLink = async (tipo: "pix" | "cartao") => {
    try {
      if (tipo === "cartao" && !email) {
        setMostrarEmail(true);
        Alert.alert("E-mail necessário", "Para cartão, digite seu e-mail");
        return;
      }
      if (tipo === "cartao" && !email.includes("@")) {
        Alert.alert("E-mail inválido", "Digite um e-mail válido");
        return;
      }
      setLoading(true);
      if (!idReal) {
        Alert.alert("Erro", "Pedido não encontrado");
        return;
      }
      const response = await fetch(
        "https://criarpagamento-2mfyfptukq-uc.a.run.app",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo,
            external_reference: idReal,
            email: tipo === "cartao" ? email : undefined,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || JSON.stringify(result));
      if (result.tipo === "pix_direto") {
        setPixData(result);
        return;
      }
      const link = result.init_point || result.sandbox_init_point;
      if (link) {
        setCheckoutUrl(link);
        // NA WEB NÃO USA WEBVIEW - SENÃO FICA TELA BRANCA
        if (Platform.OS === "web") {
          window.open(link, "_blank");
        }
      } else {
        Alert.alert("Erro MP", JSON.stringify(result).slice(0, 400));
      }
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  };

  const copiarPix = async () => {
    if (pixData?.qr_code) {
      await Clipboard.setStringAsync(pixData.qr_code);
      Alert.alert("Copiado!", "Código PIX copiado");
    }
  };

  if (!idReal) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color="#D4AF37" />
        <Text style={{ color: "#fff", marginTop: 10 }}>
          Carregando pedido...
        </Text>
      </View>
    );
  }

  if (pixData) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#000" }}
        contentContainerStyle={{ padding: 20, alignItems: "center" }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "#D4AF37",
            marginTop: 20,
          }}
        >
          Pague com PIX
        </Text>
        <Text style={{ color: "#fff", marginTop: 10, fontSize: 18 }}>
          Total: R$ {pedido?.total || pixData.totalCobrado?.toFixed(2)}
        </Text>
        {pixData.qr_code_base64 && (
          <View
            style={{
              backgroundColor: "#fff",
              padding: 10,
              borderRadius: 15,
              marginTop: 25,
            }}
          >
            <Image
              source={{
                uri: `data:image/png;base64,${pixData.qr_code_base64}`,
              }}
              style={{ width: 260, height: 260 }}
            />
          </View>
        )}
        <View
          style={{
            backgroundColor: "#1a1a1a",
            padding: 15,
            borderRadius: 10,
            width: "100%",
            marginTop: 25,
          }}
        >
          <Text style={{ color: "#888", fontSize: 12, marginBottom: 5 }}>
            CÓDIGO COPIA E COLA:
          </Text>
          <Text style={{ color: "#fff", fontSize: 11 }} numberOfLines={4}>
            {pixData.qr_code}
          </Text>
        </View>
        <TouchableOpacity
          onPress={copiarPix}
          style={{
            backgroundColor: "#00b050",
            width: "100%",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 20,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
            COPIAR CÓDIGO PIX
          </Text>
        </TouchableOpacity>
        <View
          style={{ marginTop: 30, flexDirection: "row", alignItems: "center" }}
        >
          <ActivityIndicator color="#D4AF37" />
          <Text style={{ color: "#fff", marginLeft: 10 }}>
            Aguardando confirmação...
          </Text>
        </View>
        <Text style={{ color: "#666", marginTop: 10, textAlign: "center" }}>
          Deixe essa tela aberta. Assim que pagar, vai pra tela verde
          automático.
        </Text>
      </ScrollView>
    );
  }

  if (checkoutUrl) {
    if (Platform.OS === "web") {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: "#000",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text
            style={{
              color: "#D4AF37",
              fontSize: 22,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Checkout aberto em outra aba!
          </Text>
          <Text style={{ color: "#fff", marginTop: 10, textAlign: "center" }}>
            Finalize o pagamento no Mercado Pago. Depois volte aqui, vamos
            detectar automático.
          </Text>
          <TouchableOpacity
            onPress={() => window.open(checkoutUrl, "_blank")}
            style={{
              backgroundColor: "#D4AF37",
              padding: 16,
              borderRadius: 12,
              marginTop: 20,
              width: "100%",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#000", fontWeight: "bold" }}>
              ABRIR MERCADO PAGO NOVAMENTE
            </Text>
          </TouchableOpacity>
          <View
            style={{
              marginTop: 30,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <ActivityIndicator color="#D4AF37" />
            <Text style={{ color: "#fff", marginLeft: 10 }}>
              Aguardando confirmação...
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <View
          style={{
            padding: 12,
            backgroundColor: "#D4AF37",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#000", fontWeight: "bold" }}>
            Finalize no Mercado Pago - Aguardando confirmação...
          </Text>
        </View>
        <WebView source={{ uri: checkoutUrl }} />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#000",
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 10,
          color: "#D4AF37",
        }}
      >
        Pedido #{idReal?.slice(0, 5)}
      </Text>
      <Text style={{ color: "#888", marginBottom: 30 }}>
        Escolha como quer pagar - Total R$ {pedido?.total}
      </Text>
      {loading ? (
        <ActivityIndicator size="large" color="#D4AF37" />
      ) : (
        <>
          <TouchableOpacity
            onPress={() => criarLink("pix")}
            style={{
              backgroundColor: "#00b050",
              width: "100%",
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              PAGAR COM PIX
            </Text>
          </TouchableOpacity>
          {mostrarEmail && (
            <View style={{ width: "100%", marginBottom: 15 }}>
              <TextInput
                placeholder="Seu e-mail para o cartão"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  borderWidth: 1,
                  borderColor: "#D4AF37",
                  backgroundColor: "#1a1a1a",
                  color: "#fff",
                  borderRadius: 10,
                  padding: 15,
                  width: "100%",
                }}
              />
            </View>
          )}
          <TouchableOpacity
            onPress={() => criarLink("cartao")}
            style={{
              backgroundColor: "#0070ba",
              width: "100%",
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              {mostrarEmail
                ? "CONFIRMAR E PAGAR COM CARTÃO"
                : "PAGAR COM CARTÃO"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
