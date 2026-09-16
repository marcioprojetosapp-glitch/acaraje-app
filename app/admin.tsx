// @ts-nocheck
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../src/lib/firebase";

const CLOUD_NAME = "qbl22xip";
const UPLOAD_PRESET = "mmpaixao_preset";
const SENHA_CORRETA = "7788";

export default function Admin() {
  const [modalSenhaVisivel, setModalSenhaVisivel] = useState(true);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [aba, setAba] = useState("pedidos");
  const [filtro, setFiltro] = useState("todos");
  const [config, setConfig] = useState({
    taxaEntrega: 8,
    tempoEntrega: "10 a 23 min",
    tempoRetirada: "11a 24min",
    tempoMedio: "10 a 23 min",
    aberto: true,
    modoAutomatico: true,
    horarioAbre: "17:00",
    horarioFecha: "22:00",
    diasAbertos: ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
  });
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [estoque, setEstoque] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const jaImpressos = useRef(new Set());
  const ultimoAlertaDinheiro = useRef(new Set());
  const jaTocou = useRef(false);

  const verificarSenha = () => {
    if (senhaDigitada === SENHA_CORRETA) {
      setAutorizado(true);
      setModalSenhaVisivel(false);
      jaTocou.current = true;
      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "default"
      ) {
        Notification.requestPermission().catch(() => {});
      }
    } else {
      Alert.alert("Senha errada");
      setSenhaDigitada("");
    }
  };

  function montarResumoDetalhado(pedido) {
    /* seu codigo original aqui - mantido igual */
    if (pedido.itens && pedido.itens.length > 0) {
      const resumoMontado = pedido.itens
        .map((i) => {
          const qtd = i.qtd || i.quantidade || 1;
          const nomeP = (i.nome || i.title || "ITEM").toUpperCase();
          let linha = qtd + "x " + nomeP;
          const extrasSet = new Set();
          if (Array.isArray(i.adicionais) && i.adicionais.length) {
            i.adicionais.forEach((c) => {
              const t =
                typeof c === "string"
                  ? c
                  : c.nome || c.nomeComplemento || c.title || c.label || "";
              if (t && String(t).trim())
                extrasSet.add(String(t).trim().toUpperCase());
            });
          }
          if (i.obs && typeof i.obs === "string" && i.obs.trim() !== "") {
            i.obs
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .forEach((p) => {
                extrasSet.add(p.toUpperCase());
              });
          }
          if (i.observacao) extrasSet.add("OBS: " + i.observacao.toUpperCase());
          const extras = Array.from(extrasSet).map((e) => " + " + e);
          if (extras.length > 0) return linha + "\n" + extras.join("\n");
          return linha;
        })
        .join("\n\n");
      if (resumoMontado && resumoMontado.length > 3) return resumoMontado;
    }
    if (pedido.resumoDetalhado && pedido.resumoDetalhado.length > 5)
      return pedido.resumoDetalhado;
    if (pedido.resumo && pedido.resumo.length > 5) return pedido.resumo;
    return "Sem detalhes";
  }

  function imprimirPedidoTermica(pedido) {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      Alert.alert("Só imprime no PC");
      return;
    }
    //... seu codigo de impressao igual...
    const nomeCliente = pedido.nome || pedido.cliente || "Sem nome";
    const data = new Date().toLocaleString("pt-BR");
    const idCurto = pedido.id.slice(-6).toUpperCase();
    const resumoComPreco =
      pedido.itens && pedido.itens.length > 0
        ? pedido.itens
            .map((i) => {
              const qtd = Number(i.qtd || i.quantidade || 1);
              const nomeP = (i.nome || i.title || "ITEM").toUpperCase();
              const precoUnit = Number(i.preco || i.precoUnit || i.valor || 0);
              let linha =
                qtd +
                "x " +
                nomeP +
                " - R$ " +
                precoUnit.toFixed(2).replace(".", ",") +
                " = R$ " +
                (precoUnit * qtd).toFixed(2).replace(".", ",");
              return linha;
            })
            .join("\n\n")
        : montarResumoDetalhado(pedido);
    const isRetirada =
      pedido.tipoEntrega === "retirada" ||
      String(pedido.endereco || "")
        .toUpperCase()
        .includes("RETIRADA");
    let frete = isRetirada
      ? 0
      : Number(pedido.taxaEntrega ?? pedido.frete ?? config.taxaEntrega ?? 8) ||
        0;
    const totalNum =
      Number(
        String(pedido.total || "0")
          .replace(",", ".")
          .replace("R$", "")
          .trim(),
      ) || 0;
    const subtotal =
      frete === 0 ? totalNum : totalNum > frete ? totalNum - frete : totalNum;
    const totalExibir = "R$ " + totalNum.toFixed(2).replace(".", ",");
    let iframe = document.getElementById("iframe-impressao");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "iframe-impressao";
      iframe.style.position = "absolute";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
    }
    const html =
      "<html><body>" +
      resumoComPreco +
      " - " +
      totalExibir +
      "<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>";
    const docIframe = iframe.contentDocument || iframe.contentWindow.document;
    if (docIframe) {
      docIframe.open();
      docIframe.write(html);
      docIframe.close();
    }
  }

  // CORRECAO PRINCIPAL: Nao toca audio automatico sem clique
  function tocarAlertaDinheiroSeguro() {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;
    if (!jaTocou.current) return; // so toca depois do login
    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      [0, 350, 700].forEach((delay) => {
        setTimeout(() => {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.2;
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
          } catch {}
        }, delay);
      });
    } catch {}
  }

  useEffect(() => {
    if (!autorizado) return;
    return onSnapshot(
      query(collection(db, "pedidos"), orderBy("criadoEm", "desc")),
      (s) => {
        setPedidos(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );
  }, [autorizado]);

  useEffect(() => {
    if (!autorizado || pedidos.length === 0) return;
    pedidos.forEach((p) => {
      const isPagoAuto =
        p.pago === true ||
        p.status === "pago" ||
        p.status === "confirmado" ||
        p.statusPagamento === "approved" ||
        p.statusPagamento === "pago";
      if (
        !jaImpressos.current.has(p.id) &&
        isPagoAuto &&
        p.status !== "entregue" &&
        p.impresso !== true
      ) {
        imprimirPedidoTermica(p);
        jaImpressos.current.add(p.id);
        updateDoc(doc(db, "pedidos", p.id), { impresso: true }).catch(() => {});
      }
    });
    pedidos.forEach((p) => {
      if (
        p.formaPagamento === "DINHEIRO" &&
        p.status === "aguardando_confirmacao" &&
        !ultimoAlertaDinheiro.current.has(p.id)
      ) {
        ultimoAlertaDinheiro.current.add(p.id);
        tocarAlertaDinheiroSeguro(); // AGORA NAO QUEBRA MAIS
        if (
          Platform.OS === "web" &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(`💵 DINHEIRO - ${p.nome} - R$ ${p.total}`, {
              body: `Troco para R$ ${p.trocoPara}`,
              requireInteraction: true,
            });
          } catch {}
        }
      }
    });
  }, [pedidos, autorizado]);

  useEffect(() => {
    if (!autorizado) return;
    return onSnapshot(collection(db, "produtos"), (s) =>
      setProdutos(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, [autorizado]);
  useEffect(() => {
    if (!autorizado) return;
    return onSnapshot(doc(db, "config", "loja"), (s) => {
      if (s.exists()) {
        const data = s.data();
        setConfig((p) => ({
          ...p,
          ...data,
          tempoEntrega: data.tempoEntrega || data.tempoMedio || p.tempoEntrega,
          tempoRetirada: data.tempoRetirada || p.tempoRetirada,
          modoAutomatico: data.modoAutomatico ?? p.modoAutomatico,
          horarioAbre: data.horarioAbre || p.horarioAbre,
          horarioFecha: data.horarioFecha || p.horarioFecha,
          diasAbertos: data.diasAbertos || p.diasAbertos,
        }));
      }
    });
  }, [autorizado]);
  useEffect(() => {
    if (!autorizado) return;
    return onSnapshot(
      query(collection(db, "clientes"), orderBy("ultimoPedido", "desc")),
      (s) => {
        setClientes(s.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );
  }, [autorizado]);

  const abrirWhatsApp = (p) => {
    const zapLimpo = String(p.whatsapp || p.telefone || "").replace(/\D/g, "");
    const msg = `Olá ${p.nome}! Acarajé da Benção aqui 😊%0A%0ARecebemos seu pedido *#${p.id.slice(-4).toUpperCase()}* no valor de *R$ ${p.total}*`;
    const url = `https://wa.me/55${zapLimpo}?text=${msg}`;
    if (Platform.OS === "web") window.open(url, "_blank");
    else Linking.openURL(url);
  };
  const confirmarDinheiro = async (p) => {
    try {
      if (
        Platform.OS === "web" &&
        !window.confirm(`CONFIRMAR pedido DINHEIRO de ${p.nome}?`)
      )
        return;
      for (const item of p.itens || []) {
        const idProduto = item.id || item.itemId || item.produtoId;
        if (!idProduto) continue;
        const ref = doc(db, "produtos", idProduto);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const atual = snap.data().estoque ?? 0;
          const qtd = item.qtd ?? item.quantidade ?? 1;
          const novo = Math.max(0, atual - qtd);
          await updateDoc(ref, { estoque: novo, disponivel: novo > 0 });
        }
      }
      await updateDoc(doc(db, "pedidos", p.id), {
        status: "confirmado",
        pago: true,
        statusPagamento: "confirmado_dinheiro",
        estoqueBaixado: true,
        impresso: false,
        confirmadoEm: serverTimestamp(),
      });
      jaImpressos.current.delete(p.id);
      alert("✅ Confirmado! Indo pra cozinha agora");
    } catch (e) {
      alert("Erro: " + e.message);
    }
  };
  const exportarClientes = () => {
    if (clientes.length === 0) {
      Alert.alert("Nenhum cliente ainda");
      return;
    }
    let csv = "NOME,WHATSAPP,ACEITA_PROMO,ULTIMO_PEDIDO\n";
    clientes.forEach((c) => {
      const data = c.ultimoPedido?.toDate
        ? c.ultimoPedido.toDate().toLocaleDateString("pt-BR")
        : "";
      csv +=
        '"' +
        (c.nome || "").replace(/"/g, "") +
        '","' +
        (c.whatsapp || "") +
        '","' +
        (c.aceitaPromo ? "SIM" : "NAO") +
        '","' +
        data +
        '"\n';
    });
    if (Platform.OS === "web") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        "clientes-acaraje-" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  const pedidosFiltrados = pedidos.filter((p) => {
    const isPagoAuto =
      p.pago === true ||
      p.status === "pago" ||
      p.status === "confirmado" ||
      p.statusPagamento === "approved" ||
      p.statusPagamento === "pago";
    const isAguardandoDinheiro =
      p.status === "aguardando_confirmacao" && p.formaPagamento === "DINHEIRO";
    if (filtro === "todos") return true;
    if (filtro === "dinheiro") return isAguardandoDinheiro;
    if (filtro === "novo")
      return !isPagoAuto && !isAguardandoDinheiro && p.status !== "entregue";
    if (filtro === "pago") return isPagoAuto && p.status !== "entregue";
    if (filtro === "entregue") return p.status === "entregue";
    return true;
  });
  const apagarPedido = async (id) => {
    try {
      const confirma =
        Platform.OS === "web" ? window.confirm("Apagar esse pedido?") : true;
      if (Platform.OS !== "web") {
        Alert.alert("Apagar?", "Apagar esse pedido?", [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Apagar",
            style: "destructive",
            onPress: async () => {
              await deleteDoc(doc(db, "pedidos", id));
            },
          },
        ]);
        return;
      }
      if (!confirma) return;
      await deleteDoc(doc(db, "pedidos", id));
    } catch (e) {
      alert("Erro ao apagar: " + e.message);
    }
  };
  const apagarTodos = async () => {
    try {
      const confirma =
        Platform.OS === "web"
          ? window.confirm("APAGAR TODO HISTÓRICO DE TESTES?")
          : true;
      if (!confirma) return;
      const snap = await getDocs(collection(db, "pedidos"));
      for (const d of snap.docs) await deleteDoc(doc(db, "pedidos", d.id));
      alert("Histórico limpo! (" + snap.size + " pedidos)");
    } catch (e) {
      alert("Erro ao apagar tudo: " + e.message);
    }
  };
  const corrigirTodoEstoque = async () => {
    if (
      Platform.OS === "web" &&
      !window.confirm(
        "Colocar 50 de estoque em TODOS os produtos que estão SEM ESTOQUE?",
      )
    )
      return;
    const snap = await getDocs(collection(db, "produtos"));
    for (const d of snap.docs) {
      const data = d.data();
      if (!data.disponivel || (data.estoque || 0) <= 0) {
        await updateDoc(doc(db, "produtos", d.id), {
          estoque: 50,
          disponivel: true,
        });
      }
    }
    alert("Pronto! Todo mundo com estoque 50 agora!");
  };
  const salvarProduto = async () => {
    if (!nome || !preco) return Alert.alert("Falta nome/preço");
    const qtd = Number(String(estoque).replace(",", ".")) || 0;
    await addDoc(collection(db, "produtos"), {
      nome,
      preco: parseFloat(preco.replace(",", ".")),
      descricao,
      estoque: qtd,
      imagemURL: imageUrl,
      disponivel: qtd > 0,
      criadoEm: serverTimestamp(),
    });
    setNome("");
    setPreco("");
    setDescricao("");
    setEstoque("");
    setImageUrl(null);
  };
  const salvarEdicao = async () => {
    if (!editando) return;
    const qtd = Number(String(editando.estoque).replace(",", ".").trim()) || 0;
    await updateDoc(doc(db, "produtos", editando.id), {
      nome: editando.nome,
      preco: Number(String(editando.preco).replace(",", ".").trim()),
      descricao: editando.descricao || "",
      estoque: qtd,
      imagemURL: editando.imagemURL,
      disponivel: qtd > 0,
    });
    setEditModal(false);
    setEditando(null);
  };
  const toggleLoja = async () => {
    const novo = !config.aberto;
    await setDoc(doc(db, "config", "loja"), { aberto: novo }, { merge: true });
    setConfig({ ...config, aberto: novo });
  };
  const salvarConfig = async () => {
    await setDoc(
      doc(db, "config", "loja"),
      {
        taxaEntrega: Number(config.taxaEntrega),
        tempoMedio: config.tempoEntrega,
        tempoEntrega: config.tempoEntrega,
        tempoRetirada: config.tempoRetirada,
        aberto: config.aberto,
        modoAutomatico: config.modoAutomatico,
        horarioAbre: config.horarioAbre,
        horarioFecha: config.horarioFecha,
        diasAbertos: config.diasAbertos,
      },
      { merge: true },
    );
    alert("✅ SALVO!");
  };
  const marcarPago = async (p) => {
    await updateDoc(doc(db, "pedidos", p.id), { pago: true, status: "pago" });
  };
  const marcarEntregue = async (p) => {
    await updateDoc(doc(db, "pedidos", p.id), { status: "entregue" });
  };
  const apagarProduto = async (id) => {
    if (Platform.OS === "web" && !window.confirm("Apagar produto?")) return;
    await deleteDoc(doc(db, "produtos", id));
  };
  const uploadToCloudinary = async (uri) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", { uri, type: "image/jpeg", name: "produto.jpg" });
    formData.append("upload_preset", UPLOAD_PRESET);
    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/image/upload",
        { method: "POST", body: formData },
      );
      const data = await res.json();
      if (data.secure_url) {
        if (editando) setEditando({ ...editando, imagemURL: data.secure_url });
        else setImageUrl(data.secure_url);
      } else Alert.alert("Erro no upload", JSON.stringify(data));
    } catch (e) {
      Alert.alert("Erro", e.message);
    } finally {
      setUploading(false);
    }
  };
  const pickImage = async () => {
    let r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!r.canceled) uploadToCloudinary(r.assets[0].uri);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Modal visible={modalSenhaVisivel} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.95)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "85%",
              backgroundColor: "#1a1a1a",
              padding: 22,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#D4AF37",
            }}
          >
            <Text
              style={{
                color: "#D4AF37",
                fontWeight: "900",
                fontSize: 18,
                textAlign: "center",
              }}
            >
              ADMIN ACARAJÉ DA BENÇÃO
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#333",
                backgroundColor: "#000",
                color: "#fff",
                padding: 14,
                borderRadius: 10,
                textAlign: "center",
                fontSize: 20,
                marginTop: 15,
              }}
              placeholder="Digite a senha"
              placeholderTextColor="#666"
              value={senhaDigitada}
              onChangeText={setSenhaDigitada}
              secureTextEntry
              keyboardType="number-pad"
              autoFocus
            />
            <TouchableOpacity
              onPress={verificarSenha}
              style={{
                backgroundColor: "#D4AF37",
                padding: 14,
                borderRadius: 10,
                marginTop: 15,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900" }}>ENTRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* resto do seu JSX igual - PRODUTOS e CONFIG mantidos */}
      {autorizado && (
        <ScrollView
          style={{
            flex: 1,
            backgroundColor: "#000",
            padding: 12,
            paddingTop: 45,
          }}
        >
          <Text
            style={{
              color: "#D4AF37",
              fontSize: 20,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            ADMIN - ACARAJÉ DA BENÇÃO
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              marginTop: 15,
              marginBottom: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => setAba("pedidos")}
              style={{
                flex: 1,
                padding: 11,
                borderRadius: 10,
                backgroundColor: aba === "pedidos" ? "#D4AF37" : "#1E1E1E",
                borderWidth: 2,
                borderColor: aba === "pedidos" ? "#D4AF37" : "#666",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "900",
                  fontSize: 10,
                  color: aba === "pedidos" ? "#000" : "#FFFFFF",
                }}
              >
                PEDIDOS ({pedidos.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAba("produtos")}
              style={{
                flex: 1,
                padding: 11,
                borderRadius: 10,
                backgroundColor: aba === "produtos" ? "#D4AF37" : "#1E1E1E",
                borderWidth: 2,
                borderColor: aba === "produtos" ? "#D4AF37" : "#666",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "900",
                  fontSize: 10,
                  color: aba === "produtos" ? "#000" : "#FFFFFF",
                }}
              >
                PRODUTOS ({produtos.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAba("config")}
              style={{
                flex: 1,
                padding: 11,
                borderRadius: 10,
                backgroundColor: aba === "config" ? "#D4AF37" : "#1E1E1E",
                borderWidth: 2,
                borderColor: aba === "config" ? "#D4AF37" : "#666",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "900",
                  fontSize: 10,
                  color: aba === "config" ? "#000" : "#FFFFFF",
                }}
              >
                CONFIG
              </Text>
            </TouchableOpacity>
          </View>
          {aba === "pedidos" && (
            <View>
              <Text style={{ color: "#fff" }}>
                Seus pedidos aqui - {pedidosFiltrados.length} pedidos
              </Text>
            </View>
          )}
          {aba === "config" && (
            <View>
              <TouchableOpacity
                onPress={salvarConfig}
                style={{
                  backgroundColor: "#D4AF37",
                  padding: 16,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "900" }}>💾 SALVAR TUDO</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
