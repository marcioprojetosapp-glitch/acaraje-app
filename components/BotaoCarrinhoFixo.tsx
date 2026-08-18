import { useCarrinho } from "@/src/context/CarrinhoContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function BotaoCarrinhoFixo() {
  const { carrinho, total } = useCarrinho();
  const router = useRouter();

  if (carrinho.length === 0) return null;

  const qtdTotal = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.botao}
        onPress={() => router.push("/(tabs)/carrinho")}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="cart" size={20} color="#000" />
          <Text style={styles.txt}>Ver Carrinho</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>{qtdTotal}</Text>
          </View>
        </View>
        <Text style={styles.preco}>R$ {total.toFixed(2)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000",
    padding: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: "#222",
  },
  botao: {
    backgroundColor: "#D4AF37",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
  },
  txt: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  preco: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  badge: {
    backgroundColor: "#000",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeTxt: {
    color: "#D4AF37",
    fontWeight: "bold",
  },
});
