import { useCarrinho } from "@/src/context/CarrinhoContext";
import { db } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Checkout() {
  const { resumo, subtotal, taxa, total, tipo } = useLocalSearchParams<{
    resumo: string;
    subtotal: string;
    taxa: string;
    total: string;
    tipo: "entrega" | "retirada";
  }>();
  const router = useRouter();
  const { carrinho } = useCarrinho();
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [endereco, setEndereco] = useState("");
  const [loading, setLoading] = useState(false);
  const ehRetirada = tipo === "retirada";
  const subtotalNum = Number(subtotal || 0);
  const freteNum = Number(taxa || 0);
  const totalNum = Number(total || 0);

  const enviar = async () => {
    if (!nome.trim() || !whatsapp.trim() || (!ehRetirada && !endereco.trim())) {
      Alert.alert("Atenção", "Preencha todos os dados!");
      return;
    }
    setLoading(true);
    try {
      // CRIA COMO PENDENTE AINDA, NÃO PAGO
      const docRef = await addDoc(collection(db, "pedidos"), {
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
        telefone: whatsapp.trim(),
        endereco: ehRetirada
          ? "RETIRADA NO LOCAL - Santo Amaro"
          : endereco.trim(),
        resumo: resumo ? decodeURIComponent(resumo as string) : "",
        itens: carrinho,
        subtotal: subtotalNum,
        taxaEntrega: ehRetirada ? 0 : freteNum,
        total: totalNum,
        totalFormatado: totalNum.toFixed(2).replace(".", ","),
        tipoEntrega: tipo || "entrega",
        formaPagamento: "MERCADO_PAGO",
        pago: false,
        status: "pendente",
        statusPagamento: "pending",
        criadoEm: serverTimestamp(),
      });

      // VAI PRO PAGAMENTO QUE JÁ ESTAVA FUNCIONANDO
      router.replace(`/pagamento?pedidoId=${docRef.id}`);
    } catch (e) {
      Alert.alert("Erro", "Não foi possível criar pedido");
      console.log(e);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#D4AF37" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Checkout</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 150 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.badge,
              ehRetirada ? styles.badgeVerde : styles.badgeDourado,
            ]}
          >
            <Text style={styles.badgeTxt}>
              {ehRetirada
                ? "🏃 RETIRADA - GRÁTIS"
                : `🛵 ENTREGA - R$ ${freteNum.toFixed(2).replace(".", ",")}`}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resumo</Text>
            <Text style={styles.resumo}>
              {resumo ? decodeURIComponent(resumo as string) : ""}
            </Text>
            <View style={styles.divisor} />
            <View style={styles.linha}>
              <Text style={styles.lb}>Subtotal</Text>
              <Text style={styles.vl}>
                R$ {subtotalNum.toFixed(2).replace(".", ",")}
              </Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.lb}>Frete</Text>
              <Text style={[styles.vl, ehRetirada && { color: "#00C851" }]}>
                {ehRetirada
                  ? "GRÁTIS"
                  : `R$ ${freteNum.toFixed(2).replace(".", ",")}`}
              </Text>
            </View>
            <View style={[styles.linha, { marginTop: 8 }]}>
              <Text style={styles.total}>TOTAL</Text>
              <Text style={styles.total}>
                R$ {totalNum.toFixed(2).replace(".", ",")}
              </Text>
            </View>
          </View>
          <TextInput
            placeholder="Seu nome completo"
            placeholderTextColor="#888"
            value={nome}
            onChangeText={setNome}
            style={styles.input}
            returnKeyType="next"
          />
          <TextInput
            placeholder="WhatsApp"
            placeholderTextColor="#888"
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
            style={styles.input}
            returnKeyType="next"
          />
          {!ehRetirada ? (
            <TextInput
              placeholder="Endereço completo"
              placeholderTextColor="#888"
              value={endereco}
              onChangeText={setEndereco}
              style={[styles.input, { height: 90, textAlignVertical: "top" }]}
              multiline
              returnKeyType="done"
            />
          ) : (
            <View style={styles.avisoVerde}>
              <Text style={styles.avisoTxt}>📍 Retirada em Santo Amaro</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.btn, loading && { backgroundColor: "#555" }]}
            onPress={enviar}
            disabled={loading}
          >
            <Text style={styles.btnTxt}>
              {loading ? "CRIANDO PEDIDO..." : "IR PARA PAGAMENTO"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
  },
  titulo: {
    color: "#D4AF37",
    fontSize: 28,
    fontWeight: "900",
    flex: 1,
    textAlign: "center",
    marginRight: 28,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
  },
  badgeDourado: { backgroundColor: "#D4AF37" },
  badgeVerde: { backgroundColor: "#00C851" },
  badgeTxt: { color: "#000", fontWeight: "900", fontSize: 12 },
  card: {
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  cardTitle: { color: "#D4AF37", fontWeight: "bold", marginBottom: 6 },
  resumo: { color: "#fff", fontSize: 13, lineHeight: 18 },
  divisor: { height: 1, backgroundColor: "#333", marginVertical: 12 },
  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  lb: { color: "#aaa" },
  vl: { color: "#fff" },
  total: { color: "#D4AF37", fontWeight: "900", fontSize: 16 },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
    fontSize: 16,
  },
  avisoVerde: {
    backgroundColor: "#102a15",
    borderColor: "#00C851",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  avisoTxt: { color: "#00C851", fontSize: 13, fontWeight: "600" },
  btn: {
    backgroundColor: "#D4AF37",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  btnTxt: { color: "#000", fontWeight: "900", fontSize: 16 },
});
