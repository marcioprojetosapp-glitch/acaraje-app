// @ts-nocheck
import { useCarrinho } from "@/src/context/CarrinhoContext";
import { db } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Carrinho() {
  const { carrinho, removerDoCarrinho } = useCarrinho() as any;
  const [configLoja, setConfigLoja] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "loja"), (snap) => {
      if (snap.exists()) setConfigLoja(snap.data());
    });
    return () => unsub();
  }, []);

  const getQtd = (i: any) => i.quantidade ?? i.qtd ?? 1;
  const taxa = Number(configLoja?.taxaEntrega ?? configLoja?.valorFrete ?? 8);
  const subtotal = carrinho.reduce(
    (a: number, it: any) => a + Number(it.preco) * getQtd(it),
    0,
  );
  const total = subtotal + taxa;

  const resumo = carrinho
    .map((it: any) => {
      const qtd = getQtd(it);
      const ads = (it.adicionais || [])
        .map((a: any) => (typeof a === "string" ? a : a.nome))
        .join(", ");
      const obs = it.obs ? ` OBS:${it.obs}` : "";
      return `${qtd}x ${it.nome}${ads ? ` + ${ads}` : ""}${obs}`;
    })
    .join(" | ");

  function irParaCheckout() {
    router.push({
      pathname: "/checkout",
      params: {
        subtotal: String(subtotal),
        taxa: String(taxa),
        total: String(total),
        resumo: encodeURIComponent(resumo),
        tempo: "30-45 min",
        tipo: "entrega",
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#D4AF37" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.titulo}>Carrinho</Text>
          <Text style={styles.qtd}>{carrinho.length} itens</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 180 }}>
        {carrinho.length === 0 ? (
          <Text style={{ color: "#888", textAlign: "center", marginTop: 60 }}>
            Carrinho vazio
          </Text>
        ) : (
          carrinho.map((item: any, idx: number) => {
            const qtd = getQtd(item);
            return (
              <View key={idx} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={styles.nome}>
                      {qtd}x {String(item.nome).toUpperCase()}
                    </Text>
                    <Text style={styles.preco}>
                      R${" "}
                      {(Number(item.preco) * qtd).toFixed(2).replace(".", ",")}
                    </Text>
                  </View>
                  {(item.adicionais || []).map((ad: any, i: number) => (
                    <Text key={i} style={styles.adicional}>
                      +{" "}
                      {String(
                        typeof ad === "string" ? ad : ad.nome,
                      ).toUpperCase()}
                    </Text>
                  ))}
                  {item.obs ? (
                    <Text style={styles.obs}>
                      OBS: {String(item.obs).toUpperCase()}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => removerDoCarrinho(idx)}
                  style={styles.trash}
                >
                  <Ionicons name="trash-outline" size={18} color="#ff5555" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {carrinho.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.linha}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.valor}>
              R$ {subtotal.toFixed(2).replace(".", ",")}
            </Text>
          </View>
          <View style={styles.linha}>
            <Text style={styles.label}>Taxa de entrega</Text>
            <Text style={styles.valor}>
              R$ {taxa.toFixed(2).replace(".", ",")}
            </Text>
          </View>
          <View style={styles.div} />
          <View style={styles.linha}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValor}>
              R$ {total.toFixed(2).replace(".", ",")}
            </Text>
          </View>
          <TouchableOpacity style={styles.btn} onPress={irParaCheckout}>
            <Text style={styles.btnTxt}>FINALIZAR PEDIDO</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },
  header: {
    padding: 16,
    paddingTop: 50,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    backgroundColor: "#1E1E1E",
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  titulo: { color: "#D4AF37", fontSize: 28, fontWeight: "900" },
  qtd: { color: "#888", fontSize: 12 },
  card: {
    backgroundColor: "#1E1E1E",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  nome: { color: "#fff", fontWeight: "900", fontSize: 13, flex: 1 },
  preco: { color: "#D4AF37", fontWeight: "900", fontSize: 13, marginLeft: 10 },
  adicional: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  obs: { color: "#9ca3af", fontSize: 10, marginTop: 6, fontStyle: "italic" },
  trash: {
    marginLeft: 12,
    padding: 8,
    backgroundColor: "#2a1a1a",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#111",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#222",
  },
  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: { color: "#9ca3af", fontSize: 13 },
  valor: { color: "#fff", fontWeight: "700", fontSize: 13 },
  div: { height: 1, backgroundColor: "#222", marginVertical: 8 },
  totalLabel: { color: "#fff", fontSize: 20, fontWeight: "900" },
  totalValor: { color: "#D4AF37", fontSize: 20, fontWeight: "900" },
  btn: {
    backgroundColor: "#D4AF37",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  btnTxt: { color: "#000", fontWeight: "900", fontSize: 15 },
});
