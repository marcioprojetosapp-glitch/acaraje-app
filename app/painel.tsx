import { Ionicons } from "@expo/vector-icons";
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../src/lib/firebase";
import { enviarParaDono } from "../src/utils/enviarWhatsAppDono";

type Pedido = {
  id: string;
  nome: string;
  whatsapp: string;
  endereco: string;
  observacao: string;
  itens: any[];
  total: number;
  status: "NOVO" | "PREPARANDO" | "PRONTO" | "CONCLUIDO";
  criadoEm: any;
};

export default function Painel() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "pedidos"),
      where("status", "!=", "CONCLUIDO"),
      orderBy("status"),
      orderBy("criadoEm", "asc"),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const lista: Pedido[] = [];
      snapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() } as Pedido);
      });
      setPedidos(lista);
    });

    return () => unsub();
  }, []);

  async function atualizarStatus(pedido: Pedido, novoStatus: string) {
    const pedidoAtualizado = { ...pedido, status: novoStatus };

    await updateDoc(doc(db, "pedidos", pedido.id), { status: novoStatus });

    if (novoStatus === "CONCLUIDO") {
      await enviarParaDono(pedidoAtualizado); // CONTROLE EXTRA
    }
  }

  function getCorStatus(status: string) {
    if (status === "NOVO") return "#FF3B30";
    if (status === "PREPARANDO") return "#FF9500";
    if (status === "PRONTO") return "#34C759";
    return "#000";
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.titulo}>PAINEL DA COZINHA</Text>
        <Text style={styles.sub}>Pedidos Ativos: {pedidos.length}</Text>
      </View>

      <FlatList
        data={pedidos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={styles.vazio}>Nenhum pedido ativo</Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { borderLeftColor: getCorStatus(item.status) },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.id}>Pedido #{item.id.substring(0, 5)}</Text>
              <Text
                style={[
                  styles.status,
                  { backgroundColor: getCorStatus(item.status) },
                ]}
              >
                {item.status}
              </Text>
            </View>

            <Text style={styles.nome}>{item.nome}</Text>
            <Text style={styles.txt}>📍 {item.endereco}</Text>
            <Text style={styles.txt}>📞 {item.whatsapp}</Text>
            {item.observacao ? (
              <Text style={styles.obs}>Obs: {item.observacao}</Text>
            ) : null}

            <View style={styles.itens}>
              {item.itens.map((i, idx) => (
                <Text key={idx} style={styles.item}>
                  • {i.quantidade}x {i.nome}
                </Text>
              ))}
            </View>

            <Text style={styles.total}>Total: R$ {item.total.toFixed(2)}</Text>

            <View style={styles.botoes}>
              {item.status === "NOVO" && (
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: "#FF9500" }]}
                  onPress={() => atualizarStatus(item, "PREPARANDO")}
                >
                  <Text style={styles.btnTxt}>Iniciar Preparo</Text>
                </TouchableOpacity>
              )}
              {item.status === "PREPARANDO" && (
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: "#34C759" }]}
                  onPress={() => atualizarStatus(item, "PRONTO")}
                >
                  <Text style={styles.btnTxt}>Marcar como Pronto</Text>
                </TouchableOpacity>
              )}
              {item.status === "PRONTO" && (
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: "#007AFF" }]}
                  onPress={() => atualizarStatus(item, "CONCLUIDO")}
                >
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={styles.btnTxt}>Concluir e Enviar WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#111" },
  header: { padding: 16, backgroundColor: "#D4AF37" },
  titulo: { fontSize: 22, fontWeight: "900", color: "#000" },
  sub: { fontSize: 14, color: "#000" },
  vazio: { textAlign: "center", color: "#888", marginTop: 50, fontSize: 16 },
  card: {
    backgroundColor: "#1E1E1E",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  id: { fontSize: 16, fontWeight: "900", color: "#FFF" },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  nome: { fontSize: 18, fontWeight: "700", color: "#FFF", marginBottom: 4 },
  txt: { fontSize: 14, color: "#CCC", marginBottom: 2 },
  obs: {
    fontSize: 14,
    color: "#FFD700",
    marginVertical: 8,
    fontStyle: "italic",
  },
  itens: { marginVertical: 8 },
  item: { fontSize: 14, color: "#FFF" },
  total: {
    fontSize: 18,
    fontWeight: "900",
    color: "#D4AF37",
    textAlign: "right",
    marginVertical: 8,
  },
  botoes: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  btnTxt: { color: "#FFF", fontWeight: "900" },
});
