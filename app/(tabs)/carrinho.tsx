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
        });
      }
    });
    return () => unsub();
  }, []);

  const getQtd = (item: any) =>
    item.quantidade ?? item.qtd ?? item.quantity ?? 1;
  const total = carrinho.reduce(
    (acc: number, item: any) => acc + item.preco * getQtd(item),
    0,
  );

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
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 120 }}>
        {carrinho.length === 0 ? (
          <Text style={{ color: "#888", textAlign: "center", marginTop: 50 }}>
            Carrinho vazio
          </Text>
        ) : (
          carrinho.map((item: any) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.nome}>
                {item.nome} x{getQtd(item)}
              </Text>
              <Text style={styles.preco}>
                R$ {(item.preco * getQtd(item)).toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
      {carrinho.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.total}>
            Total: R$ {total.toFixed(2).replace(".", ",")}
          </Text>
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
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nome: { color: "#fff", fontWeight: "700" },
  preco: { color: "#D4AF37", fontWeight: "900" },
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
  total: { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 10 },
  btnFinalizar: {
    backgroundColor: "#D4AF37",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  btnFechado: { backgroundColor: "#333" },
  btnTxt: { color: "#000", fontWeight: "900", fontSize: 16 },
});
