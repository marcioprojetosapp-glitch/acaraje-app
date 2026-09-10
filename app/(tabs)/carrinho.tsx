import { useCarrinho } from "@/src/context/CarrinhoContext";
import { db } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
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

type TipoEntrega = "entrega" | "retirada";

export default function Carrinho() {
  const { carrinho, remover, aumentar, diminuir, total } = useCarrinho();
  const router = useRouter();

  const [tipo, setTipo] = useState<TipoEntrega>("entrega");
  const [taxaEntrega, setTaxaEntrega] = useState(8);
  const [tempoMedio, setTempoMedio] = useState("40-60 min");
  const [aberto, setAberto] = useState(true);

  // LÊ AO VIVO DO FIREBASE QUE VOCÊ CRIOU
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "loja"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setTaxaEntrega(d.taxaEntrega ?? 8);
        setTempoMedio(d.tempoMedio ?? "40-60 min");
        setAberto(d.aberto ?? true);
      }
    });
    return () => unsub();
  }, []);

  const getQtd = (item: any) => item.quantidade || item.qtd || 1;
  const getId = (item: any) => item.itemId || item.id;

  const frete = tipo === "retirada" ? 0 : taxaEntrega;
  const totalFinal = total + frete;

  const handleFinalizar = () => {
    if (!aberto) {
      alert("Loja fechada no momento!");
      return;
    }
    const textoDoCarrinho = carrinho
      .map((item: any) => {
        let texto = `${getQtd(item)}x ${item.nome.toUpperCase()}`;
        if (item.adicionais?.length > 0)
          texto += `\n   + ${item.adicionais.join(", ")}`;
        return texto;
      })
      .join("\n\n");

    // AGORA MANDA AS 2 OPÇÕES PARA O CHECKOUT
    router.push(
      `/checkout?resumo=${encodeURIComponent(textoDoCarrinho)}&subtotal=${total}&taxa=${frete}&total=${totalFinal}&tipo=${tipo}`,
    );
  };

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/(tabs)/catalogo")}>
          <Ionicons name="arrow-back" size={28} color="#D4AF37" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Carrinho</Text>
      </View>

      <FlatList
        data={carrinho}
        keyExtractor={(item: any, index) => `${getId(item)}-${index}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 260 }}
        ListFooterComponent={
          <View style={{ marginTop: 20 }}>
            <Text style={styles.secaoTitulo}>COMO QUER RECEBER?</Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setTipo("entrega")}
                style={[
                  styles.cardTipo,
                  tipo === "entrega" && styles.cardTipoAtivo,
                ]}
              >
                <Text
                  style={[
                    styles.tipoTitulo,
                    tipo === "entrega" && styles.tipoAtivo,
                  ]}
                >
                  🛵 ENTREGA
                </Text>
                <Text style={styles.tipoSub}>
                  R$ {taxaEntrega.toFixed(2).replace(".", ",")}
                </Text>
                <Text style={styles.tipoTempo}>{tempoMedio}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTipo("retirada")}
                style={[
                  styles.cardTipo,
                  tipo === "retirada" && styles.cardTipoAtivoVerde,
                ]}
              >
                <Text
                  style={[
                    styles.tipoTitulo,
                    tipo === "retirada" && styles.tipoAtivoVerdeTxt,
                  ]}
                >
                  🏃 RETIRADA
                </Text>
                <Text style={styles.tipoSub}>GRÁTIS</Text>
                <Text style={styles.tipoTempo}>{tempoMedio}</Text>
              </TouchableOpacity>
            </View>

            {!aberto && (
              <View style={styles.alertaFechado}>
                <Text style={styles.alertaTxt}>⛔ LOJA FECHADA NO MOMENTO</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <Image
              source={{ uri: item.imagemURL || item.imagem }}
              style={styles.imagem}
            />
            <TouchableOpacity
              style={styles.btnLixo}
              onPress={() => remover(getId(item))}
            >
              <Ionicons name="trash" size={22} color="red" />
            </TouchableOpacity>
            <View style={styles.info}>
              <Text style={styles.nome}>
                {getQtd(item)}x {item.nome.toUpperCase()}
              </Text>
              {item.adicionais?.length > 0 && (
                <Text style={styles.adicionais}>
                  + {item.adicionais.join(", ")}
                </Text>
              )}
              <Text style={styles.preco}>
                R${" "}
                {(Number(item.preco) * getQtd(item))
                  .toFixed(2)
                  .replace(".", ",")}
              </Text>
              <View style={styles.qtdContainer}>
                <Text style={styles.qtdLabel}>Quantidade</Text>
                <View style={styles.qtdBotoes}>
                  <TouchableOpacity
                    style={styles.btnQtd}
                    onPress={() => diminuir(getId(item))}
                  >
                    <Text style={styles.btnQtdTxt}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtd}>{getQtd(item)}</Text>
                  <TouchableOpacity
                    style={styles.btnQtd}
                    onPress={() => aumentar(getId(item))}
                  >
                    <Text style={styles.btnQtdTxt}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={{ gap: 4, marginBottom: 10 }}>
          <View style={styles.linhaTotal}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalLabel}>
              R$ {total.toFixed(2).replace(".", ",")}
            </Text>
          </View>
          <View style={styles.linhaTotal}>
            <Text style={styles.totalLabel}>Frete ({tipo})</Text>
            <Text style={styles.totalLabel}>
              {frete === 0
                ? "GRÁTIS"
                : `R$ ${frete.toFixed(2).replace(".", ",")}`}
            </Text>
          </View>
          <View style={[styles.linhaTotal, { marginTop: 6 }]}>
            <Text style={styles.total}>Total:</Text>
            <Text style={styles.total}>
              R$ {totalFinal.toFixed(2).replace(".", ",")}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnFinalizar, !aberto && { backgroundColor: "#555" }]}
          onPress={handleFinalizar}
          disabled={!aberto}
        >
          <Text style={styles.btnFinalizarTxt}>
            {tipo === "retirada"
              ? "CONFIRMAR RETIRADA"
              : "FINALIZAR COM ENTREGA"}
          </Text>
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
  secaoTitulo: {
    color: "#D4AF37",
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: 1,
  },
  cardTipo: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: "#222",
  },
  cardTipoAtivo: { borderColor: "#D4AF37", backgroundColor: "#2a2210" },
  cardTipoAtivoVerde: { borderColor: "#00C851", backgroundColor: "#102a15" },
  tipoTitulo: { color: "#fff", fontWeight: "900", fontSize: 14 },
  tipoAtivo: { color: "#D4AF37" },
  tipoAtivoVerdeTxt: { color: "#00C851" },
  tipoSub: { color: "#fff", fontSize: 13, marginTop: 4, fontWeight: "bold" },
  tipoTempo: { color: "#888", fontSize: 11, marginTop: 2 },
  alertaFechado: {
    backgroundColor: "#ff4444",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    alignItems: "center",
  },
  alertaTxt: { color: "#fff", fontWeight: "900" },
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
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  linhaTotal: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { color: "#aaa", fontSize: 14 },
  total: { color: "#fff", fontSize: 19, fontWeight: "bold" },
  btnFinalizar: {
    backgroundColor: "#D4AF37",
    padding: 17,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  btnFinalizarTxt: { color: "#000", fontSize: 17, fontWeight: "bold" },
});
