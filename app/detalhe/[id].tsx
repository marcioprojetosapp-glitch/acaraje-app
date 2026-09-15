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
  ScrollView,
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
  const { adicionarAoCarrinho, carrinho } = useCarrinho();

  const [produto, setProduto] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState(1);

  const [camarao, setCamarao] = useState(false);
  const [vatapa, setVatapa] = useState(true);
  const [salada, setSalada] = useState(true);
  const [pimenta, setPimenta] = useState<"sem" | "com" | null>(null);
  const [qtdCopos, setQtdCopos] = useState(0);

  const totalItens = carrinho.reduce(
    (acc, item) => acc + (item.qtd || item.quantidade || 0),
    0,
  );

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
  const nomeLower = produto?.nome.toLowerCase() || "";

  const ehComida =
    cat.includes("comida") ||
    nomeLower.includes("acarajé") ||
    nomeLower.includes("acaraje") ||
    nomeLower.includes("abará") ||
    nomeLower.includes("abara") ||
    nomeLower.includes("esfiha");
  const ehBebida =
    cat.includes("bebida") ||
    nomeLower.includes("refrigerante") ||
    nomeLower.includes("suco") ||
    nomeLower.includes("agua") ||
    nomeLower.includes("lata");

  const adicionalComida = ehComida && camarao ? 3 : 0;
  const precoUnitario = produto ? produto.preco + adicionalComida : 0;
  const precoTotal = precoUnitario * quantidade;

  function handleAdicionar() {
    if (!produto) return;

    const adicionaisLista: string[] = [];
    if (ehComida) {
      if (camarao) adicionaisLista.push("Camarão");
      if (vatapa) adicionaisLista.push("Vatapá");
      if (salada) adicionaisLista.push("Salada");
      if (pimenta === "sem") adicionaisLista.push("Sem pimenta");
      if (pimenta === "com") adicionaisLista.push("Com pimenta");
    }
    if (ehBebida && qtdCopos > 0) {
      adicionaisLista.push(`${qtdCopos} Copo(s) descartável`);
    }

    const listaUnica = [...new Set(adicionaisLista)];
    const listaOrdenada = listaUnica.sort();

    const adicionaisKey = listaOrdenada.join("-");
    const itemId = `${produto.id}-${adicionaisKey}-${qtdCopos}`;

    adicionarAoCarrinho({
      id: itemId,
      nome: produto.nome,
      preco: precoUnitario,
      qtd: quantidade,
      quantidade: quantidade,
      obs: listaOrdenada.join(", "),
      adicionais: listaOrdenada,
      imagem: produto.imagemURL,
      imagemURL: produto.imagemURL,
    } as any);

    Alert.alert("Sucesso", `${quantidade}x ${produto.nome} adicionado!`);
    router.push("/(tabs)/carrinho");
  }

  if (!produto) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.containerImagem}>
          <Image
            source={{ uri: produto.imagemURL }}
            style={styles.imagem}
            resizeMode="cover"
          />
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
                />
              </View>
              <View style={styles.item}>
                <Text style={styles.itemNome}>Vatapá</Text>
                <Switch
                  value={vatapa}
                  onValueChange={setVatapa}
                  trackColor={{ false: "#555", true: "#D4AF37" }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.item}>
                <Text style={styles.itemNome}>Salada</Text>
                <Switch
                  value={salada}
                  onValueChange={setSalada}
                  trackColor={{ false: "#555", true: "#D4AF37" }}
                  thumbColor="#fff"
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
                />
              </View>
              <View style={[styles.item, { borderBottomWidth: 0 }]}>
                <Text style={styles.itemNome}>Com pimenta</Text>
                <Switch
                  value={pimenta === "com"}
                  onValueChange={(v) => setPimenta(v ? "com" : null)}
                  trackColor={{ false: "#555", true: "#D4AF37" }}
                  thumbColor="#fff"
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
      </ScrollView>

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
  containerImagem: {
    width: "100%",
    height: 420, // ANTES 230 -> AGORA 420 GIGANTE
  },
  imagem: { width: "100%", height: "100%" },
  btnVoltar: {
    position: "absolute",
    top: 50,
    left: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 10,
    borderRadius: 22,
  },
  btnCarrinho: {
    position: "absolute",
    top: 50,
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 10,
    borderRadius: 22,
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
  info: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  nome: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  descricao: { color: "#aaa", fontSize: 13, marginVertical: 4, lineHeight: 16 },
  preco: { color: "#fff", fontSize: 20, fontWeight: "900", marginTop: 4 },
  cardPersonalizar: {
    backgroundColor: "#1a1a1a",
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  tituloPersonalizar: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  itemNome: { color: "#fff", fontSize: 14, fontWeight: "600" },
  itemPreco: { color: "#D4AF37", fontSize: 11, marginTop: 2 },
  subtitulo: {
    color: "#888",
    fontSize: 11,
    marginTop: 10,
    marginBottom: 2,
    fontWeight: "700",
  },
  quantidade: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginTop: 18,
    marginBottom: 10,
  },
  btnQtd: {
    backgroundColor: "#D4AF37",
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  btnQtdTxt: { color: "#000", fontSize: 22, fontWeight: "900" },
  qtd: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    minWidth: 24,
    textAlign: "center",
  },
  qtdCoposContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnQtdCopos: {
    backgroundColor: "#D4AF37",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  btnQtdCoposTxt: { color: "#000", fontSize: 16, fontWeight: "900" },
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
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  btnAdicionar: {
    backgroundColor: "#D4AF37",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  btnAdicionarTxt: { color: "#000", fontSize: 16, fontWeight: "900" },
});
