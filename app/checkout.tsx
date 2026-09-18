// @ts-nocheck
import { useCarrinho } from "@/src/context/CarrinhoContext";
import { db } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Checkout() {
  const { carrinho } = useCarrinho() as any;
  const router = useRouter();
  const [config, setConfig] = useState<any>(null);
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [end, setEnd] = useState("");
  const [pag, setPag] = useState("pix");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "loja"), (s) => {
      if (s.exists()) setConfig(s.data());
    });
    return () => unsub();
  }, []);

  const getQtd = (i: any) => Number(i?.quantidade ?? i?.qtd ?? 1) || 1;
  const getPreco = (i: any) => Number(i?.preco ?? 0) || 0;
  const taxa = Number(config?.taxaEntrega ?? 8);
  const subtotal = (carrinho || []).reduce(
    (a: number, it: any) => a + getPreco(it) * getQtd(it),
    0,
  );
  const total = subtotal + taxa;

  const resumo = (carrinho || [])
    .map((it: any) => {
      const qtd = getQtd(it);
      const ads = (it.adicionais || [])
        .map((a: any) => (typeof a === "string" ? a : a?.nome))
        .join(", ");
      // só mostra OBS se for diferente dos adicionais
      const obs = it.obs && it.obs !== ads ? ` OBS:${it.obs}` : "";
      return `${qtd}x ${it.nome}${ads ? ` + ${ads}` : ""}${obs}`;
    })
    .join(" | ");

  async function finalizar() {
    if (!nome.trim() || !tel.trim() || !end.trim()) {
      Alert.alert("Falta info", "Preencha nome, WhatsApp e endereço");
      return;
    }
    if (!carrinho?.length) return;
    try {
      setEnviando(true);
      const isRetirada = String(end).toUpperCase().includes("RETIRADA");
      const ref = await addDoc(collection(db, "pedidos"), {
        cliente: nome.trim(),
        telefone: tel.trim(),
        endereco: end.trim(),
        pagamento: pag,
        tipoEntrega: isRetirada ? "retirada" : "entrega",
        subtotal,
        taxa,
        taxaEntrega: taxa,
        frete: taxa,
        valorFrete: taxa,
        total,
        resumo,
        itens: carrinho,
        status: "aguardando_pagamento",
        statusPagamento: "pendente",
        criadoEm: serverTimestamp(),
      });
      router.replace(`/pagamento?pedidoId=${ref.id}` as any);
    } catch (e) {
      console.log(e);
      Alert.alert("Erro", "Não deu pra enviar, tenta de novo");
      setEnviando(false);
    }
  }

  if (!carrinho?.length) {
    return (
      <View style={styles.safe}>
        <Text style={{ color: "#fff", padding: 20, marginTop: 50 }}>
          Carrinho vazio
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/" as any)}
          style={styles.btn}
        >
          <Text style={styles.btnTxt}>VOLTAR AO CARDÁPIO</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#D4AF37" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Finalizar Pedido</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }}>
        <View style={styles.card}>
          <Text style={styles.labR}>RESUMO</Text>
          <Text style={{ color: "#fff", lineHeight: 20 }}>{resumo}</Text>
          <View style={styles.div} />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: "#9ca3af" }}>Subtotal</Text>
            <Text style={{ color: "#fff" }}>
              R$ {subtotal.toFixed(2).replace(".", ",")}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <Text style={{ color: "#9ca3af" }}>Entrega</Text>
            <Text style={{ color: "#fff" }}>
              R$ {taxa.toFixed(2).replace(".", ",")}
            </Text>
          </View>
          <View style={styles.div} />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ color: "#9ca3af" }}>Total</Text>
            <Text style={{ color: "#D4AF37", fontWeight: "900", fontSize: 16 }}>
              R$ {total.toFixed(2).replace(".", ",")}
            </Text>
          </View>
        </View>
        <Text style={styles.lab}>Seu nome *</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Maria"
          placeholderTextColor="#666"
        />
        <Text style={styles.lab}>WhatsApp *</Text>
        <TextInput
          style={styles.input}
          value={tel}
          onChangeText={setTel}
          placeholder="71 99999-9999"
          placeholderTextColor="#666"
          keyboardType="phone-pad"
        />
        <Text style={styles.lab}>Endereço completo *</Text>
        <TextInput
          style={styles.input}
          value={end}
          onChangeText={setEnd}
          placeholder="Rua, número, bairro (ou RETIRADA)"
          placeholderTextColor="#666"
          multiline
        />
        <Text style={styles.lab}>Pagamento</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
          {["pix", "dinheiro", "cartao"].map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPag(p)}
              style={[styles.pagBtn, pag === p && styles.pagAtivo]}
            >
              <Text style={[styles.pagTxt, pag === p && { color: "#000" }]}>
                {p.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.btn, enviando && { opacity: 0.6 }]}
          onPress={finalizar}
          disabled={enviando}
        >
          <Text style={styles.btnTxt}>
            {enviando
              ? "CRIANDO PEDIDO..."
              : `PAGAR R$ ${total.toFixed(2).replace(".", ",")}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000", paddingTop: 45 },
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 20,
  },
  backBtn: {
    backgroundColor: "#1E1E1E",
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  titulo: { color: "#D4AF37", fontSize: 20, fontWeight: "900" },
  card: {
    backgroundColor: "#1E1E1E",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    marginBottom: 20,
  },
  labR: { color: "#D4AF37", fontSize: 11, fontWeight: "900", marginBottom: 6 },
  div: { height: 1, backgroundColor: "#222", marginVertical: 10 },
  lab: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#1E1E1E",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  pagBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
  },
  pagAtivo: { backgroundColor: "#D4AF37", borderColor: "#D4AF37" },
  pagTxt: { color: "#888", fontWeight: "900", fontSize: 12 },
  btn: {
    backgroundColor: "#D4AF37",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  btnTxt: { color: "#000", fontWeight: "900", fontSize: 15 },
});
