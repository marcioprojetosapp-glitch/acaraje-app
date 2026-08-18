import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCarrinho } from "../src/context/CarrinhoContext";
import { db } from "../src/lib/firebase";
import { enviarParaDono } from "../src/utils/enviarWhatsAppDono";

export default function Checkout() {
  const router = useRouter();
  const { carrinho, limpar } = useCarrinho();
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [endereco, setEndereco] = useState("");
  const [observacao, setObservacao] = useState("");
  const [carregando, setCarregando] = useState(false);

  const total = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0,
  );

  useEffect(() => {
    AsyncStorage.getItem("cliente").then((data) => {
      if (data) {
        const cliente = JSON.parse(data);
        setNome(cliente.nome || "");
        setWhatsapp(cliente.whatsapp || "");
        setEndereco(cliente.endereco || "");
      }
    });
  }, []);

  async function finalizarPedido() {
    if (!nome || !whatsapp || !endereco) {
      Alert.alert("Atenção", "Preencha Nome, WhatsApp e Endereço");
      return;
    }
    if (carrinho.length === 0) {
      Alert.alert("Carrinho vazio", "Adicione itens antes de finalizar");
      return;
    }

    setCarregando(true);

    const pedido = {
      nome,
      whatsapp,
      endereco,
      observacao,
      itens: carrinho,
      total,
      status: "NOVO",
      criadoEm: serverTimestamp(),
    };

    try {
      // 1. SALVA NO FIREBASE
      const docRef = await addDoc(collection(db, "pedidos"), pedido);

      // 2. MANDA PRO WHATSAPP DO DONO - CONTROLE 1
      await enviarParaDono({ ...pedido, id: docRef.id });

      // 3. PERGUNTA SE QUER SALVAR
      Alert.alert("Pedido Enviado! 🎉", "Salvar dados para a próxima compra?", [
        { text: "Agora não", onPress: () => irPraSucesso() },
        {
          text: "Salvar",
          onPress: () => {
            AsyncStorage.setItem(
              "cliente",
              JSON.stringify({ nome, whatsapp, endereco }),
            );
            irPraSucesso();
          },
        },
      ]);
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível enviar o pedido.");
      setCarregando(false);
    }
  }

  function irPraSucesso() {
    limpar();
    setCarregando(false);
    router.push("/sucesso");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={{ padding: 16 }}>
        <Text style={styles.titulo}>Finalizar Pedido</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Seus Dados</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu Nome"
            value={nome}
            onChangeText={setNome}
          />
          <TextInput
            style={styles.input}
            placeholder="WhatsApp"
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Endereço Completo"
            value={endereco}
            onChangeText={setEndereco}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Observação"
            value={observacao}
            onChangeText={setObservacao}
            multiline
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Resumo</Text>
          {carrinho.map((i) => (
            <Text key={i.itemId}>
              {i.quantidade}x {i.nome}
            </Text>
          ))}
          <Text style={styles.total}>Total: R$ {total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, carregando && { opacity: 0.6 }]}
          onPress={finalizarPedido}
          disabled={carregando}
        >
          <Ionicons name="checkmark-circle" size={20} color="#000" />
          <Text style={styles.btnTxt}>
            {carregando ? "Enviando..." : "Confirmar Pedido"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF" },
  titulo: { fontSize: 22, fontWeight: "900", marginBottom: 16 },
  card: {
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  input: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  total: { fontSize: 18, fontWeight: "900", marginTop: 8, textAlign: "right" },
  btn: {
    backgroundColor: "#D4AF37",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  btnTxt: { fontSize: 16, fontWeight: "900", color: "#000" },
});
