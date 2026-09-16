import { useCarrinho } from "@/src/context/CarrinhoContext";
import { db } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ConfigLoja = {
  aberto: boolean;
  modoAutomatico: boolean;
  horarioAbre: string;
  horarioFecha: string;
  diasAbertos: string[];
  taxaEntrega?: number;
};

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
    const minutosAgora = horaBR.getHours() * 60 + horaBR.getMinutes();
    const minutosAbre = hAbre * 60 + mAbre;
    const minutosFecha = hFecha * 60 + mFecha;
    if (minutosFecha < minutosAbre)
      return minutosAgora >= minutosAbre || minutosAgora <= minutosFecha;
    return minutosAgora >= minutosAbre && minutosAgora <= minutosFecha;
  } catch {
    return config.aberto;
  }
}

export default function Carrinho() {
  const { carrinho } = useCarrinho();
  const [configLoja, setConfigLoja] = useState<ConfigLoja | null>(null);
  const router = useRouter();
  const lojaAberta = isLojaAbertaAgora(configLoja);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "loja"), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as any;
        setConfigLoja({
          aberto: d.aberto ?? true,
          modoAutomatico: d.modoAutomatico ?? true,
          horarioAbre: d.horarioAbre || "17:00",
          horarioFecha: d.horarioFecha || "22:00",
          diasAbertos: d.diasAbertos || [
            "segunda",
            "terca",
            "quarta",
            "quinta",
            "sexta",
            "sabado",
          ],
          taxaEntrega: d.taxaEntrega ?? d.valorFrete ?? 8,
        });
      }
    });
    return () => unsub();
  }, []);

  const getQtd = (item: any) =>
    item.quantidade ?? item.qtd ?? item.quantity ?? 1;
  const subtotal = carrinho.reduce(
    (acc: number, item: any) => acc + item.preco * getQtd(item),
    0,
  );
  const frete = Number(configLoja?.taxaEntrega ?? 8);
  const total = subtotal + frete;

  function handleFinalizar() {
    if (!lojaAberta) {
      Alert.alert(
        "⛔ Loja Fechada",
        `Abrimos das ${configLoja?.horarioAbre} às ${configLoja?.horarioFecha}`,
      );
      return;
    }
    router.push("/checkout");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Carrinho</Text>
      </View>
      {!lojaAberta && (
        <View style={styles.bannerFechado}>
          <Ionicons name="lock-closed" size={18} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitulo}>LOJA FECHADA - NÃO FINALIZA</Text>
            <Text style={styles.bannerSub}>
              Horário: {configLoja?.horarioAbre} às {configLoja?.horarioFecha}
            </Text>
          </View>
        </View>
      )}
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 180 }}>
        {carrinho.length === 0 ? (
          <Text style={{ color: "#888", textAlign: "center", marginTop: 50 }}>
            Carrinho vazio
          </Text>
        ) : (
          carrinho.map((item: any, idx: number) => {
            const qtd = getQtd(item);
            const adicionais = item.adicionais || item.extras || [];
            const obs = item.obs || item.observacao || "";
            return (
              <View key={item.id + idx} style={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nome}>
                    {qtd}x {item.nome?.toUpperCase()}
                  </Text>
                  {adicionais.length > 0 && (
                    <View style={{ marginTop: 6 }}>
                      {adicionais.map((ad: any, i: number) => {
                        const nomeAd =
                          typeof ad === "string"
                            ? ad
                            : ad.nome || ad.title || "";
                        const precoAd = ad.preco
                          ? ` (+ R$ ${Number(ad.preco).toFixed(2).replace(".", ",")})`
                          : "";
                        return (
                          <Text key={i} style={styles.adicional}>
                            + {String(nomeAd).toUpperCase()}
                            {precoAd}
                          </Text>
                        );
                      })}
                    </View>
                  )}
                  {obs ? (
                    <Text style={styles.obs}>
                      OBS: {String(obs).toUpperCase()}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.preco}>
                  R$ {(item.preco * qtd).toFixed(2).replace(".", ",")}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
      {carrinho.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.linhaResumo}>
            <Text style={styles.labelResumo}>Subtotal</Text>
            <Text style={styles.valorResumo}>
              R$ {subtotal.toFixed(2).replace(".", ",")}
            </Text>
          </View>
          <View style={styles.linhaResumo}>
            <Text style={styles.labelResumo}>Taxa de entrega</Text>
            <Text style={styles.valorResumo}>
              R$ {frete.toFixed(2).replace(".", ",")}
            </Text>
          </View>
          <View
            style={[
              styles.linhaResumo,
              {
                borderTopWidth: 1,
                borderColor: "#222",
                paddingTop: 10,
                marginTop: 6,
              },
            ]}
          >
            <Text style={styles.total}>Total</Text>
            <Text style={styles.totalValor}>
              R$ {total.toFixed(2).replace(".", ",")}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.btnFinalizar, !lojaAberta && styles.btnFechado]}
            onPress={handleFinalizar}
          >
            <Text style={[styles.btnTxt, !lojaAberta && { color: "#888" }]}>
              {lojaAberta ? "FINALIZAR PEDIDO" : "⛔ LOJA FECHADA"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },
  header: { padding: 16, paddingTop: 50 },
  titulo: { color: "#D4AF37", fontSize: 28, fontWeight: "900" },
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
  item: {
    backgroundColor: "#1a1a1a",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#222",
  },
  nome: { color: "#fff", fontWeight: "900", fontSize: 14 },
  adicional: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  obs: { color: "#aaa", fontSize: 11, marginTop: 6, fontStyle: "italic" },
  preco: { color: "#D4AF37", fontWeight: "900", marginLeft: 10 },
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
  linhaResumo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  labelResumo: { color: "#888", fontSize: 13 },
  valorResumo: { color: "#fff", fontSize: 13, fontWeight: "700" },
  total: { color: "#fff", fontSize: 18, fontWeight: "900" },
  totalValor: { color: "#D4AF37", fontSize: 18, fontWeight: "900" },
  btnFinalizar: {
    backgroundColor: "#D4AF37",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  btnFechado: { backgroundColor: "#333" },
  btnTxt: { color: "#000", fontWeight: "900", fontSize: 16 },
});
