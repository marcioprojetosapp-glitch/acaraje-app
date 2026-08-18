import { useCarrinho } from "@/src/context/CarrinhoContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Carrinho() {
  const { carrinho, remover, aumentar, diminuir, total } = useCarrinho();
  const router = useRouter();

  if (carrinho.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/(tabs)/catalogo")}>
            <Ionicons name="arrow-back" size={28} color="#D4AF37" />
          </TouchableOpacity>
          <Text style={styles.titulo}>Carrinho</Text>
        </View>
        <View style={styles.vazio}>
          <Text style={styles.vazioTxt}>Seu carrinho está vazio</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/(tabs)/catalogo")}>
          <Ionicons name="arrow-back" size={28} color="#D4AF37" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Carrinho</Text>
      </View>

      <FlatList
        data={carrinho}
        keyExtractor={(item, index) => `${item.itemId}-${index}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image
              source={{ uri: item.imagemURL || item.imagem }}
              style={styles.imagem}
            />

            <TouchableOpacity
              style={styles.btnLixo}
              onPress={() => remover(item.itemId)}
            >
              <Ionicons name="trash" size={22} color="red" />
            </TouchableOpacity>

            <View style={styles.info}>
              <Text style={styles.nome}>
                {item.quantidade}x {item.nome.toUpperCase()}
              </Text>

              {item.adicionais && item.adicionais.length > 0 && (
                <Text style={styles.adicionais}>
                  + {item.adicionais.join(", ")}
                </Text>
              )}

              <Text style={styles.preco}>
                R$ {(item.preco * item.quantidade).toFixed(2).replace(".", ",")}
              </Text>

              <View style={styles.qtdContainer}>
                <Text style={styles.qtdLabel}>Quantidade</Text>
                <View style={styles.qtdBotoes}>
                  <TouchableOpacity
                    style={styles.btnQtd}
                    onPress={() => diminuir(item.itemId)}
                  >
                    <Text style={styles.btnQtdTxt}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtd}>{item.quantidade}</Text>
                  <TouchableOpacity
                    style={styles.btnQtd}
                    onPress={() => aumentar(item.itemId)}
                  >
                    <Text style={styles.btnQtdTxt}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* FOOTER COM BOTÃO FUNCIONANDO */}
      <View style={styles.footer}>
        <Text style={styles.total}>
          Total: R$ {total.toFixed(2).replace(".", ",")}
        </Text>
        <TouchableOpacity
          style={styles.btnFinalizar}
          onPress={() => router.push("/checkout")} // <-- AQUI QUE FOI ARRUMADO
        >
          <Text style={styles.btnFinalizarTxt}>Finalizar Pedido</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: "#000",
  },
  titulo: {
    color: "#D4AF37",
    fontSize: 34,
    fontWeight: "900",
    flex: 1,
    textAlign: "center",
    marginRight: 32,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  vazio: { flex: 1, justifyContent: "center", alignItems: "center" },
  vazioTxt: { color: "#888", fontSize: 16 },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  imagem: { width: "100%", height: 130 },
  btnLixo: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 9,
    borderRadius: 20,
    zIndex: 10,
  },
  info: { padding: 14 },
  nome: { color: "#D4AF37", fontSize: 17, fontWeight: "bold" },
  adicionais: {
    color: "#D4AF37",
    fontSize: 12,
    backgroundColor: "#222",
    padding: 7,
    borderRadius: 6,
    marginVertical: 7,
  },
  preco: { color: "#fff", fontSize: 17, fontWeight: "bold", marginBottom: 10 },
  qtdContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  qtdLabel: { color: "#D4AF37", fontWeight: "bold", fontSize: 14 },
  qtdBotoes: { flexDirection: "row", alignItems: "center", gap: 14 },
  btnQtd: {
    backgroundColor: "#D4AF37",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  btnQtdTxt: { color: "#000", fontSize: 20, fontWeight: "bold" },
  qtd: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000",
    padding: 16,
    paddingBottom: 30,
  },
  total: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 14,
  },
  btnFinalizar: {
    backgroundColor: "#D4AF37",
    padding: 17,
    borderRadius: 12,
    alignItems: "center",
  },
  btnFinalizarTxt: { color: "#000", fontSize: 17, fontWeight: "bold" },
});
