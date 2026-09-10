import { useCarrinho } from "@/src/context/CarrinhoContext";
import { db } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Switch,
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
  categoria: string;
};

export default function DetalheProduto() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { adicionarAoCarrinho, carrinho } = useCarrinho(); // 1. CORRIGIDO

  const [produto, setProduto] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState(1);

  const [camarao, setCamarao] = useState(false);
  const [vatapa, setVatapa] = useState(true);
  const [salada, setSalada] = useState(true);
  const [pimenta, setPimenta] = useState<"sem" | "com" | null>(null);
  const [qtdCopos, setQtdCopos] = useState(0);

  const totalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0); // 2. CORRIGIDO: qtd

  useEffect(() => {
    carregarProduto();
  }, [id]);

  async function carregarProduto() {
    const snap = await getDoc(doc(db, "produtos", id as string));
    if (snap.exists()) {
      setProduto({ id: snap.id, ...snap.data() } as Produto);
    }
  }

  const cat = produto?.categoria?.toLowerCase() || "";
  const nome = produto?.nome.toLowerCase() || "";

  const ehComida =
    cat.includes("comida") ||
    nome.includes("acarajé") ||
    nome.includes("acaraje") ||
    nome.includes("abará") ||
    nome.includes("abara") ||
    nome.includes("esfiha");
  const ehBebida =
    cat.includes("bebida") ||
    nome.includes("refrigerante") ||
    nome.includes("suco") ||
    nome.includes("agua");

  const adicionalComida = ehComida && camarao ? 3 : 0;
  const adicional = adicionalComida;

  const adicionaisLista: string[] = [];
  if (ehComida && camarao) adicionaisLista.push("Camarão");
  if (ehComida && vatapa) adicionaisLista.push("Vatapá");
  if (ehComida && salada) adicionaisLista.push("Salada");
  if (ehComida && pimenta === "sem") adicionaisLista.push("Sem pimenta");
  if (ehComida && pimenta === "com") adicionaisLista.push("Com pimenta");
  if (ehBebida && qtdCopos > 0) adicionaisLista.push(`${qtdCopos} Copo(s)`);

  const precoUnitario = produto ? produto.preco + adicional : 0;
  const precoTotal = precoUnitario * quantidade;

  function handleAdicionar() {
    if (!produto) return;

    const adicionaisListaOrdenada = [...adicionaisLista].sort();
    const adicionaisKey = adicionaisListaOrdenada.join("-");
    const itemId = `${produto.id}-${adicionaisKey}-${pimenta || "normal"}-${qtdCopos}`;

    adicionarAoCarrinho({
      // 3. CORRIGIDO
      id: itemId, // tem que ser id
      nome: produto.nome,
      preco: precoUnitario,
      qtd: quantidade, // tem que ser qtd
      obs: adicionaisListaOrdenada.join(", "), // tem que ser obs
      imagem: produto.imagemURL,
    });

    Alert.alert(
      "Sucesso",
      `${quantidade}x ${produto.nome} adicionado ao carrinho!`,
    );

    router.push("/(tabs)/carrinho");
  }

  if (!produto) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={() => router.push("/(tabs)/catalogo")}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnCarrinho}
          onPress={() => router.push("/(tabs)/carrinho")}
        >
          <Ionicons name="cart-outline" size={24} color="#fff" />
          {totalItens > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{totalItens}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.containerImagem}>
          <Image
            source={{ uri: produto.imagemURL }}
            style={styles.imagem}
            resizeMode="cover"
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.nome}>{produto.nome}</Text>
          <Text style={styles.descricao}>{produto.descricao}</Text>
          <Text style={styles.preco}>
            R$ {precoUnitario.toFixed(2).replace(".", ",")} cada
          </Text>
        </View>

        <View style={styles.cardPersonalizar}>
          <Text style={styles.tituloPersonalizar}>Personalize seu pedido</Text>

          {ehComida && (
            <>
              <View style={styles.item}>
                <View>
                  <Text style={styles.itemNome}>Camarão</Text>
                  <Text style={styles.itemPreco}>+ R$ 3,00</Text>
                </View>
                <Switch
                  value={camarao}
                  onValueChange={setCamarao}
                  trackColor={{ false: "#555", true: "#D4AF37" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#555"
                />
              </View>
              <View style={styles.item}>
                <Text style={styles.itemNome}>Vatapá</Text>
                <Switch
                  value={vatapa}
                  onValueChange={setVatapa}
                  trackColor={{ false: "#555", true: "#D4AF37" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#555"
                />
              </View>
              <View style={styles.item}>
                <Text style={styles.itemNome}>Salada</Text>
                <Switch
                  value={salada}
                  onValueChange={setSalada}
                  trackColor={{ false: "#555", true: "#D4AF37" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#555"
                />
              </View>
              <Text style={styles.subtitulo}>Pimenta</Text>
              <View style={styles.item}>
                <Text style={styles.itemNome}>Sem pimenta</Text>
                <Switch
                  value={pimenta === "sem"}
                  onValueChange={(v) => setPimenta(v ? "sem" : null)}
                  trackColor={{ false: "#555", true: "#D4AF37" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#555"
                />
              </View>
              <View style={[styles.item, { borderBottomWidth: 0 }]}>
                <Text style={styles.itemNome}>Com pimenta</Text>
                <Switch
                  value={pimenta === "com"}
                  onValueChange={(v) => setPimenta(v ? "com" : null)}
                  trackColor={{ false: "#555", true: "#D4AF37" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#555"
                />
              </View>
            </>
          )}

          {ehBebida && (
            <View style={styles.item}>
              <View>
                <Text style={styles.itemNome}>Copo descartável</Text>
                <Text style={styles.itemPreco}>Grátis</Text>
              </View>
              <View style={styles.qtdCoposContainer}>
                <TouchableOpacity
                  style={styles.btnQtdCopos}
                  onPress={() => setQtdCopos(Math.max(0, qtdCopos - 1))}
                >
                  <Text style={styles.btnQtdCoposTxt}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtdCoposNum}>{qtdCopos}</Text>
                <TouchableOpacity
                  style={styles.btnQtdCopos}
                  onPress={() => setQtdCopos(qtdCopos + 1)}
                >
                  <Text style={styles.btnQtdCoposTxt}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.quantidade}>
          <TouchableOpacity
            style={styles.btnQtd}
            onPress={() => setQuantidade(Math.max(1, quantidade - 1))}
          >
            <Text style={styles.btnQtdTxt}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtd}>{quantidade}</Text>
          <TouchableOpacity
            style={styles.btnQtd}
            onPress={() => setQuantidade(quantidade + 1)}
          >
            <Text style={styles.btnQtdTxt}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnAdicionar} onPress={handleAdicionar}>
          <Text style={styles.btnAdicionarTxt}>
            Adicionar - R$ {precoTotal.toFixed(2).replace(".", ",")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },
  container: { flex: 1, paddingBottom: 80 },
  btnVoltar: {
    position: "absolute",
    top: 40,
    left: 16,
    zIndex: 10,
    backgroundColor: "rgba(50,50,50,0.6)",
    padding: 9,
    borderRadius: 20,
  },
  btnCarrinho: {
    position: "absolute",
    top: 40,
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(50,50,50,0.6)",
    padding: 9,
    borderRadius: 20,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#D4AF37",
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeTxt: { color: "#000", fontSize: 10, fontWeight: "bold" },
  containerImagem: { width: "100%", height: 230 },
  imagem: { width: "100%", height: "100%" },
  info: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  nome: {
    color: "#D4AF37",
    fontSize: 21,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  descricao: { color: "#aaa", fontSize: 12, marginVertical: 1 },
  preco: { color: "#fff", fontSize: 19, fontWeight: "bold", marginTop: 1 },
  cardPersonalizar: {
    backgroundColor: "#1a1a1a",
    marginHorizontal: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  tituloPersonalizar: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  itemNome: { color: "#fff", fontSize: 13 },
  itemPreco: { color: "#D4AF37", fontSize: 10, marginTop: 1 },
  subtitulo: { color: "#888", fontSize: 11, marginTop: 6, marginBottom: 1 },
  quantidade: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginTop: 12,
    marginBottom: 0,
  },
  btnQtd: {
    backgroundColor: "#D4AF37",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  btnQtdTxt: { color: "#000", fontSize: 18, fontWeight: "bold" },
  qtd: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    minWidth: 20,
    textAlign: "center",
  },
  qtdCoposContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnQtdCopos: {
    backgroundColor: "#D4AF37",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnQtdCoposTxt: { color: "#000", fontSize: 15, fontWeight: "bold" },
  qtdCoposNum: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    minWidth: 18,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000",
    padding: 14,
    paddingBottom: 24,
  },
  btnAdicionar: {
    backgroundColor: "#D4AF37",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnAdicionarTxt: { color: "#000", fontSize: 15, fontWeight: "bold" },
});
