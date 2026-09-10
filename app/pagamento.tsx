// @ts-nocheck
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  const { pedidoId } = useLocalSearchParams();
  const router = useRouter();
  const { limparCarrinho } = useCarrinho();
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [email, setEmail] = useState("");
  const [mostrarEmail, setMostrarEmail] = useState(false);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [pedido, setPedido] = useState<any>(null);

  useEffect(() => {
    if (!pedidoId) return;
    const unsub = onSnapshot(
      doc(db, "pedidos", pedidoId as string),
      async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setPedido(data);
        if (data?.statusPagamento === "approved" || data?.status === "pago") {
          // BAIXA ESTOQUE AUTOMÁTICO SÓ QUANDO PAGAR DE VERDADE
          try {
            const itens = data?.itens || [];
            for (const item of itens) {
              const idProduto = item.id;
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
          } catch (e) {
            console.log("Erro baixa estoque", e);
          }
          limparCarrinho();
          router.replace("/sucesso");
        }
      },
    );
    return () => unsub();
  }, [pedidoId]);

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
      if (!pedidoId) {
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
            external_reference: pedidoId,
            email: tipo === "cartao" ? email : undefined,
          }),
        },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || JSON.stringify(result));
      }

      if (result.tipo === "pix_direto") {
        setPixData(result);
        setAguardandoConfirmacao(true);
        return;
      }

      const link = result.init_point || result.sandbox_init_point;
      if (link) {
        setCheckoutUrl(link);
        setAguardandoConfirmacao(true);
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
          Total: R${" "}
          {pedido?.total?.toFixed(2) || pixData.totalCobrado?.toFixed(2)}
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

  if (checkoutUrl)
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
            {aguardandoConfirmacao
              ? "Aguardando confirmação do pagamento..."
              : "Finalize no Mercado Pago"}
          </Text>
        </View>
        <WebView
          source={{ uri: checkoutUrl }}
          onNavigationStateChange={(nav) => {
            if (nav.url.includes("sucesso") || nav.url.includes("approved")) {
              Alert.alert(
                "Pagamento enviado!",
                "Aguardando confirmação do Mercado Pago.",
              );
            }
          }}
        />
      </View>
    );

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
        Pedido #{(pedidoId as string)?.slice(0, 5)}
      </Text>
      <Text style={{ color: "#888", marginBottom: 30 }}>
        Escolha como quer pagar
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
