// @ts-nocheck
import { useCarrinho } from "@/src/context/CarrinhoContext";
import { db } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore";
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

type Produto = any;
type ConfigLoja = any;

function isLojaAbertaAgora(config: ConfigLoja | null) {
  if (!config) return true;
  if (!config.modoAutomatico) return config.aberto;
  try {
    const agora = new Date();
    const horaBR = new Date(
      agora.toLocaleString("en-US", { timeZone: "America/Bahia" }),
    );
    const diaSemana = [
      "domingo",
      "segunda",
      "terca",
      "quarta",
      "quinta",
      "sexta",
      "sabado",
    ][horaBR.getDay()];
    if (!(config.diasAbertos || []).includes(diaSemana)) return false;
    const [hAbre, mAbre] = (config.horarioAbre || "17:00")
      .split(":")
      .map(Number);
    const [hFecha, mFecha] = (config.horarioFecha || "22:00")
      .split(":")
      .map(Number);
    const minAgora = horaBR.getHours() * 60 + horaBR.getMinutes();
    const minAbre = hAbre * 60 + mAbre;
    const minFecha = hFecha * 60 + mFecha;
    if (minFecha < minAbre) return minAgora >= minAbre || minAgora <= minFecha;
    return minAgora >= minAbre && minAgora <= minFecha;
  } catch {
    return config.aberto;
  }
}

export default function Catalogo() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [filtro, setFiltro] = useState("TODOS");
  const [configLoja, setConfigLoja] = useState<ConfigLoja | null>(null);
  const router = useRouter();
  const { carrinho } = useCarrinho() as any;

  const totalItens = (carrinho || []).reduce(
    (acc: number, item: any) => acc + Number(item.qtd || item.quantidade || 0),
    0,
  );
  const lojaAberta = isLojaAbertaAgora(configLoja);

  useEffect(() => {
    carregarProdutos();
    const unsub = onSnapshot(doc(db, "config", "loja"), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setConfigLoja({
          aberto: data.aberto ?? true,
          modoAutomatico: data.modoAutomatico ?? true,
          horarioAbre: data.horarioAbre || "17:00",
          horarioFecha: data.horarioFecha || "22:00",
          diasAbertos: data.diasAbertos || [
            "segunda",
            "terca",
            "quarta",
            "quinta",
            "sexta",
            "sabado",
          ],
        });
      }
    });
    return () => unsub();
  }, []);

  async function carregarProdutos() {
    const snap = await getDocs(collection(db, "produtos"));
    setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  const produtosFiltrados =
    filtro === "TODOS"
      ? produtos
      : produtos.filter((p) => {
          const cat = String(p.categoria || "").toUpperCase();
          if (filtro === "PRATO")
            return (
              cat.includes("COMIDA") ||
              cat.includes("PRATO") ||
              cat.includes("ACARAJ")
            );
          if (filtro === "BEBIDA")
            return cat.includes("BEBIDA") || cat.includes("DRINK");
          return cat === filtro;
        });

  const categorias = ["TODOS", "PRATO", "BEBIDA"];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Cardápio</Text>
        <TouchableOpacity
          style={styles.btnCarrinhoHeader}
          onPress={() => router.push("/(tabs)/carrinho" as any)}
        >
          <Ionicons name="cart" size={26} color="#D4AF37" />
          {totalItens > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{totalItens}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {!lojaAberta && (
        <View style={styles.bannerFechado}>
          <Ionicons name="time" size={18} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitulo}>⛔ LOJA FECHADA</Text>
            <Text style={styles.bannerSub}>
              Abre {configLoja?.horarioAbre} às {configLoja?.horarioFecha}
            </Text>
          </View>
        </View>
      )}

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
        contentContainerStyle={{ padding: 6, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/detalhe/${item.id}` as any)}
            activeOpacity={0.85}
          >
            {item.imagemURL ? (
              <Image source={{ uri: item.imagemURL }} style={styles.imagem} />
            ) : (
              <View
                style={[
                  styles.imagem,
                  { justifyContent: "center", alignItems: "center" },
                ]}
              >
                <Text style={{ fontSize: 40 }}>🍽️</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.nome} numberOfLines={1}>
                {String(item.nome || "").toUpperCase()}
              </Text>
              <Text style={styles.preco}>
                R${" "}
                {Number(item.preco || 0)
                  .toFixed(2)
                  .replace(".", ",")}
              </Text>
            </View>
            <View style={styles.btnDetalhe}>
              <Text style={styles.btnDetalheTxt}>Ver Detalhes</Text>
            </View>
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
  titulo: { color: "#D4AF37", fontSize: 28, fontWeight: "900" },
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
  bannerFechado: {
    backgroundColor: "#ff4444",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  bannerTitulo: { color: "#fff", fontWeight: "900", fontSize: 12 },
  bannerSub: { color: "#ffdddd", fontSize: 10, marginTop: 2 },
  filtros: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  btnFiltro: {
    backgroundColor: "#222",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  btnFiltroAtivo: { backgroundColor: "#D4AF37", borderColor: "#D4AF37" },
  txtFiltro: { color: "#FFFFFF", fontWeight: "bold" },
  txtFiltroAtivo: { color: "#000" },
  card: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    margin: 5,
    borderWidth: 1.2,
    borderColor: "#D4AF37",
    overflow: "hidden",
    paddingBottom: 6,
  },
  imagem: { width: "100%", height: 210, backgroundColor: "#222" },
  info: { paddingHorizontal: 8, paddingTop: 5, paddingBottom: 2 },
  nome: { color: "#fff", fontSize: 11, fontWeight: "900", marginBottom: 1 },
  preco: { color: "#D4AF37", fontSize: 14, fontWeight: "900" },
  btnDetalhe: {
    backgroundColor: "#D4AF37",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 6,
    marginTop: 4,
    paddingVertical: 6,
    borderRadius: 7,
  },
  btnDetalheTxt: { color: "#000", fontWeight: "900", fontSize: 10 },
});
