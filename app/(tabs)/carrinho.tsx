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
  const { carrinho, removerDoCarrinho, removerItem, limparCarrinho } =
    useCarrinho() as any;
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

  function handleRemover(index: number) {
    if (removerDoCarrinho) return removerDoCarrinho(index);
    if (removerItem) return removerItem(index);
    if (limparCarrinho && carrinho.length === 1) return limparCarrinho();
    // fallback se não tiver função
    Alert.alert("Remover?", "Deseja remover este item?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          // tenta remover local se não tiver função no context
          carrinho.splice(index, 1);
          router.replace("/(tabs)/carrinho");
        },
      },
    ]);
  }

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
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 200 }}>
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
              <View key={idx} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={styles.nomeCard}>
                      {qtd}x {String(item.nome).toUpperCase()}
                    </Text>
                    <Text style={styles.precoCard}>
                      R$ {(item.preco * qtd).toFixed(2).replace(".", ",")}
                    </Text>
                  </View>
                  {adicionais.length > 0 &&
                    adicionais.map((ad: any, i: number) => {
                      const txt =
                        typeof ad === "string" ? ad : ad.nome || ad.title || "";
                      const qtdAd = ad.quantidade ? `${ad.quantidade} ` : "";
                      return (
                        <Text key={i} style={styles.adicional}>
                          + {qtdAd}
                          {String(txt).toUpperCase()}
                        </Text>
                      );
                    })}
                  {obs ? (
                    <Text style={styles.obs}>
                      OBS: {String(obs).toUpperCase()}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => handleRemover(idx)}
                  style={styles.btnExcluir}
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
              R$ {frete.toFixed(2).replace(".", ",")}
            </Text>
          </View>
          <View style={styles.divisor} />
          <View style={styles.linhaTotal}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValor}>
              R$ {total.toFixed(2).replace(".", ",")}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.btnFinalizar, !lojaAberta && styles.btnFechado]}
            onPress={handleFinalizar}
          >
            <Text style={styles.btnTxt}>
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
  card: {
    backgroundColor: "#1E1E1E",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  nomeCard: { color: "#fff", fontWeight: "900", fontSize: 14, flex: 1 },
  precoCard: {
    color: "#D4AF37",
    fontWeight: "900",
    fontSize: 14,
    marginLeft: 8,
  },
  adicional: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  obs: { color: "#9ca3af", fontSize: 11, marginTop: 6, fontStyle: "italic" },
  btnExcluir: {
    marginLeft: 12,
    padding: 6,
    backgroundColor: "#2a1a1a",
    borderRadius: 8,
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
  label: { color: "#9ca3af", fontSize: 14 },
  valor: { color: "#fff", fontSize: 14, fontWeight: "700" },
  divisor: { height: 1, backgroundColor: "#222", marginVertical: 8 },
  linhaTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { color: "#fff", fontSize: 22, fontWeight: "900" },
  totalValor: { color: "#D4AF37", fontSize: 22, fontWeight: "900" },
  btnFinalizar: {
    backgroundColor: "#D4AF37",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 14,
  },
  btnFechado: { backgroundColor: "#333" },
  btnTxt: { color: "#000", fontWeight: "900", fontSize: 16 },
});
