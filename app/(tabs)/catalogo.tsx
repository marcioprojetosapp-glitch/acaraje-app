import { useCarrinho } from "@/src/context/CarrinhoContext";
import { db } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  descricao: string;
  imagemURL: string;
  categoria?: string; // <- coloquei ? pq pode não existir
  estoque: number;
};

export default function Catalogo() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [filtro, setFiltro] = useState("TODOS");
  const router = useRouter();
  const { carrinho } = useCarrinho();

  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function carregarProdutos() {
    const snap = await getDocs(collection(db, "produtos"));
    const lista = snap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Produto,
    );
    setProdutos(lista);
  }

  // CORREÇÃO AQUI: (p.categoria || "") evita o erro se categoria for undefined
  const produtosFiltrados =
    filtro === "TODOS"
      ? produtos
      : produtos.filter((p) => (p.categoria || "").toUpperCase() === filtro);

  function irParaDetalhe(id: string) {
    router.push(`/detalhe/${id}`);
  }

  const categorias = ["TODOS", "PRATO", "BEBIDA", "OUTRO"];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Cardápio</Text>
        <TouchableOpacity
          style={styles.btnCarrinhoHeader}
          onPress={() => router.push("/(tabs)/carrinho")}
        >
          <Ionicons name="cart" size={26} color="#D4AF37" />
          {totalItens > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{totalItens}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.filtros}>
        {categorias.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.btnFiltro, filtro === cat && styles.btnFiltroAtivo]}
            onPress={() => setFiltro(cat)}
          >
            <Text
              style={[
                styles.txtFiltro,
                filtro === cat && styles.txtFiltroAtivo,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={produtosFiltrados}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        ListEmptyComponent={() => (
          // <- AVISO SE NÃO TIVER PRODUTO NA CATEGORIA
          <Text style={{ color: "#888", textAlign: "center", marginTop: 40 }}>
            Nenhum produto encontrado nesta categoria
          </Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => irParaDetalhe(item.id)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.imagemURL }} style={styles.imagem} />
            <View style={styles.info}>
              <Text style={styles.nome} numberOfLines={2}>
                {item.nome}
              </Text>
              <Text style={styles.preco}>
                R$ {item.preco.toFixed(2).replace(".", ",")}
              </Text>
              <Text style={styles.estoque}>Estoque: {item.estoque}</Text>
            </View>
            <TouchableOpacity
              style={styles.btnDetalhe}
              onPress={(e) => {
                e.stopPropagation();
                irParaDetalhe(item.id);
              }}
            >
              <Ionicons name="eye" size={16} color="#000" />
              <Text style={styles.btnDetalheTxt}>Ver Detalhes</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
  },
  titulo: {
    color: "#D4AF37",
    fontSize: 28,
    fontWeight: "900",
  },
  btnCarrinhoHeader: { position: "relative", padding: 4 },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "red",
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 1.5,
    borderColor: "#000",
  },
  badgeTxt: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  filtros: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  btnFiltro: {
    backgroundColor: "#222",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btnFiltroAtivo: { backgroundColor: "#D4AF37" },
  txtFiltro: { color: "#888", fontWeight: "bold" },
  txtFiltroAtivo: { color: "#000" },
  card: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    margin: 6,
    borderWidth: 1.5,
    borderColor: "#D4AF37",
    overflow: "hidden",
    paddingBottom: 8,
  },
  imagem: {
    width: "100%",
    height: 110,
    backgroundColor: "#fff",
    borderRadius: 8,
    margin: 8,
    alignSelf: "center",
  },
  info: { paddingHorizontal: 10, paddingBottom: 8 },
  nome: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  preco: {
    color: "#D4AF37",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  estoque: { color: "#888", fontSize: 11, marginBottom: 6 },
  btnDetalhe: {
    backgroundColor: "#D4AF37",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 8,
  },
  btnDetalheTxt: { color: "#000", fontWeight: "bold", fontSize: 13 },
});
