import { Link } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../src/lib/firebase";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  imagemURL: string;
  estoque: number;
  descricao?: string;
};

const IMAGEM_PADRAO = "https://unsplash.com";

export default function Catalogo() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarProdutos() {
      try {
        const querySnapshot = await getDocs(collection(db, "produtos"));
        const listaProdutos: Produto[] = [];
        querySnapshot.forEach((doc) => {
          listaProdutos.push({ id: doc.id, ...doc.data() } as Produto);
        });
        setProdutos(listaProdutos);
      } catch (error) {
        console.error("Erro ao buscar produtos: ", error);
      } finally {
        setCarregando(false);
      }
    }
    carregarProdutos();
  }, []);

  if (carregando) {
    return (
      <View style={styles.containerLoader}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  const pratos = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes("acarajé") ||
      p.nome.toLowerCase().includes("abará") ||
      p.nome.toLowerCase().includes("porção"),
  );

  const bebidas = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes("refrigerante") ||
      p.nome.toLowerCase().includes("pepsi") ||
      p.nome.toLowerCase().includes("antártica") ||
      p.nome.toLowerCase().includes("coca") ||
      p.nome.toLowerCase().includes("suco") ||
      p.nome.toLowerCase().includes("água") ||
      p.nome.toLowerCase().includes("lata") ||
      p.nome.toLowerCase().includes("limoneto") ||
      p.nome.toLowerCase().includes("h2oh"),
  );

  const outros = produtos.filter(
    (p) => !pratos.includes(p) && !bebidas.includes(p),
  );

  const renderItemCard = (item: Produto) => {
    const esgotado = item.estoque <= 0;

    return (
      <Link
        key={item.id}
        href={esgotado ? "" : "/detalhe/" + item.id}
        asChild
        disabled={esgotado}
      >
        <TouchableOpacity
          style={[styles.card, esgotado && styles.cardEsgotado]}
          disabled={esgotado}
        >
          <View style={styles.containerImagem}>
            <Image
              source={{
                uri:
                  item.imagemURL &&
                  (item.imagemURL.startsWith("http") ||
                    item.imagemURL.startsWith("data:"))
                    ? item.imagemURL
                    : IMAGEM_PADRAO,
              }}
              style={[styles.imagem, esgotado && styles.imagemEsgotada]}
            />
            {esgotado && (
              <View style={styles.badgeEsgotado}>
                <Text style={styles.txtEsgotadoTag}>ESGOTADO</Text>
              </View>
            )}
          </View>
          <View style={styles.infoContainer}>
            <Text
              style={[styles.nome, esgotado && styles.txtApagado]}
              numberOfLines={2}
            >
              {item.nome}
            </Text>
            <Text style={[styles.preco, esgotado && styles.txtApagado]}>
              {esgotado ? "Indisponível" : `R$ ${item.preco.toFixed(2)}`}
            </Text>
          </View>
        </TouchableOpacity>
      </Link>
    );
  };

  const renderGrid = (lista: Produto[]) => {
    const linhas = [];
    for (let i = 0; i < lista.length; i += 2) {
      linhas.push(lista.slice(i, i + 2));
    }
    return (
      <View style={styles.gridContainer}>
        {linhas.map((linha, index) => (
          <View key={index} style={styles.linhaProdutos}>
            {linha.map((item) => renderItemCard(item))}
            {linha.length === 1 && <View style={styles.cardInvisivel} />}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.tituloSecao}>Nosso Cardápio</Text>

      {pratos.length > 0 && (
        <View style={styles.secaoContainer}>
          <View style={styles.linhaTituloSecao}>
            <Text style={styles.tituloCategoria}>Acarajés & Abarás</Text>
          </View>
          {renderGrid(pratos)}
        </View>
      )}

      {bebidas.length > 0 && (
        <View style={styles.secaoContainer}>
          <View style={styles.linhaTituloSecao}>
            <Text style={styles.tituloCategoria}>Bebidas Geladas</Text>
          </View>
          {renderGrid(bebidas)}
        </View>
      )}

      {outros.length > 0 && (
        <View style={styles.secaoContainer}>
          <View style={styles.linhaTituloSecao}>
            <Text style={styles.tituloCategoria}>Outras Opções</Text>
          </View>
          {renderGrid(outros)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  scrollContent: { paddingBottom: 40 },
  containerLoader: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
  },
  tituloSecao: {
    color: "#D4AF37",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    letterSpacing: 2,
  },
  secaoContainer: { marginBottom: 25, paddingHorizontal: 14 },
  linhaTituloSecao: {
    borderBottomWidth: 2,
    borderBottomColor: "#D4AF37",
    paddingBottom: 6,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  tituloCategoria: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  gridContainer: { width: "100%" },
  linhaProdutos: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    width: "48%",
    backgroundColor: "#161616",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#D4AF37",
    marginBottom: 10,
  },

  cardEsgotado: { borderColor: "#222", opacity: 0.35 },
  cardInvisivel: { width: "48%", backgroundColor: "transparent" },
  containerImagem: {
    width: "100%",
    height: 160,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#161616",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 10,
  },

  imagem: { width: "100%", height: "100%", resizeMode: "cover" },
  imagemEsgotada: { opacity: 0.1 },
  badgeEsgotado: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    position: "absolute",
    top: "40%",
  },
  txtEsgotadoTag: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  infoContainer: { width: "100%", alignItems: "center", marginTop: 10 },
  nome: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    color: "#fff",
    height: 36,
    lineHeight: 18,
  },
  preco: {
    marginTop: 6,
    fontSize: 15,
    color: "#D4AF37",
    fontWeight: "bold",
    textAlign: "center",
  },
  txtApagado: { color: "#444" },
});
