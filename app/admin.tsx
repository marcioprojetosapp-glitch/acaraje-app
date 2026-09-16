// @ts-nocheck
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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
  Image,
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

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

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
  // MANTIDO SEU TEMPO ATUAL DO PRINT
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

  const verificarSenha = () => {
    if (senhaDigitada === SENHA_CORRETA) {
      setAutorizado(true);
      setModalSenhaVisivel(false);
      if (
        Platform.OS === "web" &&
        "Notification" in window &&
        Notification.permission === "default"
      ) {
        Notification.requestPermission();
      }
      if (Platform.OS !== "web") {
        Notifications.requestPermissionsAsync();
      }
    } else {
      Alert.alert("Senha errada");
      setSenhaDigitada("");
    }
  };

  function montarResumoDetalhado(pedido) {
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
    if (Platform.OS !== "web") {
      Alert.alert("Só imprime no PC");
      return;
    }
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
              if (i.observacao)
                extrasSet.add("OBS: " + i.observacao.toUpperCase());
              const extras = Array.from(extrasSet).map((e) => " + " + e);
              if (extras.length > 0) return linha + "\n" + extras.join("\n");
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
      "<html><head><title>" +
      idCurto +
      "</title><style>@page{size:80mm auto;margin:0}body{width:72mm;font-family:'Courier New',monospace;font-size:13px;padding:4mm;margin:0;color:#000}.titulo{text-align:center;font-weight:900;font-size:18px}.sub{text-align:center;font-size:11px}.linha{border-top:1px dashed #000;margin:8px 0}.linha2{border-top:2px solid #000;margin:8px 0}.big{font-size:16px;font-weight:900}.tot{display:flex;justify-content:space-between;font-size:13px}</style></head><body><div class='titulo'>COZINHA - FRITAR</div><div class='sub'>" +
      data +
      " | #" +
      idCurto +
      "</div><div class='linha2'></div><div class='big'>" +
      nomeCliente.toUpperCase() +
      "</div><div class='linha'></div><div style='white-space:pre-wrap;font-size:13px;font-weight:bold;line-height:19px;'>" +
      resumoComPreco +
      "</div><div class='linha2'></div><div style='text-align:center;font-weight:900;font-size:14px;'>*** COZINHA ***</div><br><br><div style='text-align:center;'>- - - - - - - - - - - - - - - -</div><br><br><div class='titulo'>ACARAJE DA BENCAO</div><div class='sub'>VIA ENTREGA | #" +
      idCurto +
      "<br>" +
      data +
      "</div><div class='linha2'></div><div><b>CLIENTE:</b> " +
      nomeCliente +
      "</div><div><b>ZAP:</b> " +
      (pedido.whatsapp || pedido.telefone || "") +
      "</div><div><b>END:</b> " +
      (pedido.endereco || "RETIRADA NO BALCAO") +
      "</div><div><b>PAG:</b> " +
      (pedido.formaPagamento || "").toUpperCase() +
      (pedido.formaPagamento === "DINHEIRO"
        ? " - TROCO P/ R$ " +
          pedido.trocoPara +
          " | TROCO R$ " +
          Number(pedido.troco || 0).toFixed(2)
        : " - PAGO") +
      "</div><div class='linha'></div><div style='white-space:pre-wrap;font-size:11px;line-height:17px;'>" +
      resumoComPreco +
      "</div><div class='linha'></div><div class='tot'><span>SUBTOTAL</span><span>R$ " +
      subtotal.toFixed(2).replace(".", ",") +
      "</span></div><div class='tot'><span>FRETE</span><span>" +
      (frete === 0 ? "GRATIS" : "R$ " + frete.toFixed(2).replace(".", ",")) +
      "</span></div><div style='display:flex;justify-content:space-between;font-size:18px;font-weight:900;margin-top:6px;border-top:1px dashed #000;padding-top:6px;'><span>TOTAL</span><span>" +
      totalExibir +
      "</span></div><div class='linha2'></div><div style='text-align:center;font-weight:900;'>*** MOTOBOY ***</div><br><br><br><br><br><br><br><script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>";
    const docIframe = iframe.contentDocument || iframe.contentWindow.document;
    if (docIframe) {
      docIframe.open();
      docIframe.write(html);
      docIframe.close();
    }
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
        if (Platform.OS === "web") {
          try {
            const ctx = new (
              window.AudioContext || window.webkitAudioContext
            )();
            [0, 350, 700].forEach((delay) => {
              setTimeout(() => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 880;
                gain.gain.value = 0.8;
                osc.start();
                osc.stop(ctx.currentTime + 0.25);
              }, delay);
            });
          } catch {}
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(`💵 DINHEIRO - ${p.nome} - R$ ${p.total}`, {
              body: `Troco para R$ ${p.trocoPara} | ${p.endereco?.slice(0, 40)}`,
              requireInteraction: true,
            });
          }
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Notifications.scheduleNotificationAsync({
            content: {
              title: `💵 ${p.nome} - R$ ${p.total}`,
              body: `Troco p/ R$ ${p.trocoPara} - Toque pra confirmar`,
              sound: true,
            },
            trigger: null,
          });
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
    const msg = `Olá ${p.nome}! Acarajé da Benção aqui 😊%0A%0ARecebemos seu pedido *#${p.id.slice(-4).toUpperCase()}* no valor de *R$ ${p.total}*%0AForma: *DINHEIRO* - Troco para R$ ${p.trocoPara} (troco R$ ${Number(p.troco || 0).toFixed(2)})%0A%0A${montarResumoDetalhado(p).slice(0, 200)}%0A%0AConfirma seu pedido?`;
    const url = `https://wa.me/55${zapLimpo}?text=${msg}`;
    if (Platform.OS === "web") window.open(url, "_blank");
    else Linking.openURL(url);
  };

  const confirmarDinheiro = async (p) => {
    try {
      if (
        Platform.OS === "web" &&
        !window.confirm(
          `CONFIRMAR pedido DINHEIRO de ${p.nome}? Vai baixar estoque e mandar pra cozinha!`,
        )
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
    if (Platform.OS === "web") window.alert("✅ SALVO!");
    else Alert.alert("✅ SALVO!");
  };

  const marcarPago = async (p) => {
    await updateDoc(doc(db, "pedidos", p.id), { pago: true, status: "pago" });
  };
  const marcarEntregue = async (p) => {
    await updateDoc(doc(db, "pedidos", p.id), { status: "entregue" });
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

      <Modal visible={editModal} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.95)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <ScrollView
            style={{ width: "95%" }}
            contentContainerStyle={{
              backgroundColor: "#1a1a1a",
              padding: 18,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#D4AF37",
            }}
          >
            <Text
              style={{
                color: "#D4AF37",
                fontWeight: "900",
                fontSize: 16,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              EDITAR PRODUTO
            </Text>
            <TouchableOpacity
              onPress={pickImage}
              style={{
                backgroundColor: "#222",
                height: 120,
                borderRadius: 10,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 10,
                borderWidth: 1,
                borderColor: "#333",
              }}
            >
              {editando?.imagemURL ? (
                <Image
                  source={{ uri: editando.imagemURL }}
                  style={{ width: "100%", height: "100%", borderRadius: 10 }}
                />
              ) : (
                <Text style={{ color: "#888" }}>
                  {uploading ? "ENVIANDO..." : "📷 FOTO"}
                </Text>
              )}
            </TouchableOpacity>
            <Text style={{ color: "#888", fontSize: 10 }}>Nome</Text>
            <TextInput
              value={editando?.nome || ""}
              onChangeText={(t) => setEditando({ ...editando, nome: t })}
              style={{
                backgroundColor: "#000",
                color: "#fff",
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#333",
                marginBottom: 8,
              }}
            />
            <Text style={{ color: "#888", fontSize: 10 }}>Preço</Text>
            <TextInput
              value={
                editando?.preco !== undefined ? String(editando.preco) : ""
              }
              onChangeText={(t) => setEditando({ ...editando, preco: t })}
              keyboardType="numeric"
              style={{
                backgroundColor: "#000",
                color: "#fff",
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#333",
                marginBottom: 8,
              }}
            />
            <Text style={{ color: "#888", fontSize: 10 }}>Descrição</Text>
            <TextInput
              value={editando?.descricao || ""}
              onChangeText={(t) => setEditando({ ...editando, descricao: t })}
              style={{
                backgroundColor: "#000",
                color: "#fff",
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#333",
                marginBottom: 8,
              }}
            />
            <Text style={{ color: "#888", fontSize: 10 }}>Estoque</Text>
            <TextInput
              value={
                editando?.estoque !== undefined ? String(editando.estoque) : ""
              }
              onChangeText={(t) => setEditando({ ...editando, estoque: t })}
              keyboardType="numeric"
              style={{
                backgroundColor: "#000",
                color: "#D4AF37",
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#D4AF37",
                marginBottom: 10,
                fontWeight: "900",
              }}
            />
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              {[10, 30, 50, 100].map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setEditando({ ...editando, estoque: v })}
                  style={{
                    flex: 1,
                    backgroundColor: "#333",
                    padding: 8,
                    borderRadius: 8,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}
                  >
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={salvarEdicao}
              style={{
                backgroundColor: "#D4AF37",
                padding: 14,
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900" }}>SALVAR EDIÇÃO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setEditModal(false);
                setEditando(null);
              }}
              style={{
                backgroundColor: "#222",
                padding: 14,
                borderRadius: 10,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>CANCELAR</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

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
                PRODUTOS
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
              {/* AQUI ESTÁ SEU FILTRO QUE SUMIU - VOLTEI */}
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                {[
                  { id: "todos", lb: "TODOS" },
                  { id: "dinheiro", lb: "💵 DINHEIRO" },
                  { id: "novo", lb: "A PAGAR" },
                  { id: "pago", lb: "PAGOS" },
                  { id: "entregue", lb: "ENTREGUES" },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => setFiltro(f.id)}
                    style={{
                      flex: 1,
                      padding: 9,
                      borderRadius: 20,
                      backgroundColor:
                        filtro === f.id
                          ? f.id === "dinheiro"
                            ? "#00C851"
                            : "#D4AF37"
                          : "#222",
                      borderWidth: filtro === f.id ? 0 : 1,
                      borderColor: "#555",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: "900",
                        color:
                          filtro === f.id
                            ? f.id === "dinheiro"
                              ? "#fff"
                              : "#000"
                            : "#fff",
                      }}
                    >
                      {f.lb}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ gap: 12 }}>
                {pedidosFiltrados.map((p) => {
                  const isEntrega = p.tipoEntrega !== "retirada";
                  const isAguardandoDinheiro =
                    p.status === "aguardando_confirmacao" &&
                    p.formaPagamento === "DINHEIRO";
                  const isPagoAuto =
                    p.pago === true ||
                    p.status === "pago" ||
                    p.status === "confirmado" ||
                    p.statusPagamento === "approved" ||
                    p.statusPagamento === "pago";
                  const isEntregue = p.status === "entregue";
                  const hora = p.criadoEm?.toDate
                    ? p.criadoEm.toDate().toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  return (
                    <View
                      key={p.id}
                      style={{
                        backgroundColor: isAguardandoDinheiro
                          ? "#332200"
                          : isEntregue
                            ? "#111"
                            : isPagoAuto
                              ? "#112911"
                              : "#1a1a1a",
                        padding: 14,
                        borderRadius: 14,
                        borderWidth: 2,
                        borderColor: isAguardandoDinheiro
                          ? "#FFAA00"
                          : isEntregue
                            ? "#333"
                            : isPagoAuto
                              ? "#00C851"
                              : "#444",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: isAguardandoDinheiro
                              ? "#FFAA00"
                              : isEntrega
                                ? "#D4AF37"
                                : "#00C851",
                            fontWeight: "900",
                            fontSize: 12,
                          }}
                        >
                          {isAguardandoDinheiro
                            ? "💵 DINHEIRO - CONFIRMAR"
                            : isEntrega
                              ? "🛵 ENTREGA"
                              : "🟢 RETIRADA"}{" "}
                          • {hora} {p.impresso ? "🖨️" : ""}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 6,
                            alignItems: "center",
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: isAguardandoDinheiro
                                ? "#FFAA00"
                                : isEntregue
                                  ? "#333"
                                  : isPagoAuto
                                    ? "#00C851"
                                    : "#442200",
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 12,
                            }}
                          >
                            <Text
                              style={{
                                color: isAguardandoDinheiro
                                  ? "#000"
                                  : isEntregue
                                    ? "#aaa"
                                    : isPagoAuto
                                      ? "#fff"
                                      : "#ffaa00",
                                fontWeight: "900",
                                fontSize: 9,
                              }}
                            >
                              {isAguardandoDinheiro
                                ? "⚠️ AGUARDANDO"
                                : isEntregue
                                  ? "ENTREGUE"
                                  : isPagoAuto
                                    ? "✓ PAGO"
                                    : "A PAGAR"}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => apagarPedido(p.id)}
                            style={{
                              backgroundColor: "#330000",
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 12,
                            }}
                          >
                            <Text
                              style={{
                                color: "red",
                                fontSize: 10,
                                fontWeight: "900",
                              }}
                            >
                              X
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "900",
                          fontSize: 16,
                          marginTop: 8,
                        }}
                      >
                        {p.nome || "Cliente"} • R$ {p.total}
                      </Text>
                      {isAguardandoDinheiro && (
                        <View
                          style={{
                            backgroundColor: "#000",
                            padding: 10,
                            borderRadius: 8,
                            marginTop: 8,
                            borderWidth: 1,
                            borderColor: "#FFAA00",
                          }}
                        >
                          <Text
                            style={{
                              color: "#FFAA00",
                              fontWeight: "900",
                              fontSize: 14,
                            }}
                          >
                            💰 TROCO PARA R$ {p.trocoPara} | TROCO: R${" "}
                            {Number(p.troco || 0).toFixed(2)}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={{
                          color: "#ddd",
                          marginTop: 6,
                          fontSize: 13,
                          lineHeight: 19,
                          backgroundColor: "#000",
                          padding: 8,
                          borderRadius: 8,
                        }}
                      >
                        {montarResumoDetalhado(p)}
                      </Text>
                      <View style={{ marginTop: 8, gap: 3 }}>
                        <Text style={{ color: "#aaa", fontSize: 12 }}>
                          {isEntrega ? "📍 " + p.endereco : "📍 Retira na loja"}
                        </Text>
                        <Text style={{ color: "#aaa", fontSize: 12 }}>
                          📱 {p.telefone || p.whatsapp} • 💳{" "}
                          {p.formaPagamento || "APP"}
                        </Text>
                      </View>
                      {isAguardandoDinheiro ? (
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            marginTop: 12,
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => abrirWhatsApp(p)}
                            style={{
                              flex: 1,
                              backgroundColor: "#25D366",
                              padding: 14,
                              borderRadius: 10,
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "900",
                                fontSize: 12,
                              }}
                            >
                              💬 WHATSAPP
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => confirmarDinheiro(p)}
                            style={{
                              flex: 1.5,
                              backgroundColor: "#00C851",
                              padding: 14,
                              borderRadius: 10,
                              alignItems: "center",
                              borderWidth: 2,
                              borderColor: "#fff",
                            }}
                          >
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "900",
                                fontSize: 12,
                              }}
                            >
                              ✅ CONFIRMAR + COZINHA
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            marginTop: 12,
                          }}
                        >
                          {!isPagoAuto && (
                            <TouchableOpacity
                              onPress={() => marcarPago(p)}
                              style={{
                                flex: 1,
                                backgroundColor: "#222",
                                borderWidth: 1,
                                borderColor: "#00C851",
                                padding: 11,
                                borderRadius: 10,
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  color: "#00C851",
                                  fontWeight: "900",
                                  fontSize: 12,
                                }}
                              >
                                MARCAR PAGO + IMPRIMIR
                              </Text>
                            </TouchableOpacity>
                          )}
                          {!isEntregue && (
                            <TouchableOpacity
                              onPress={() => marcarEntregue(p)}
                              style={{
                                flex: 1,
                                backgroundColor: isPagoAuto
                                  ? "#D4AF37"
                                  : "#333",
                                padding: 11,
                                borderRadius: 10,
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  fontWeight: "900",
                                  fontSize: 12,
                                  color: isPagoAuto ? "#000" : "#fff",
                                }}
                              >
                                📦 ENTREGUE
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => imprimirPedidoTermica(p)}
                            style={{
                              backgroundColor: "#fff",
                              padding: 11,
                              borderRadius: 10,
                              alignItems: "center",
                            }}
                          >
                            <Text style={{ fontWeight: "900", fontSize: 12 }}>
                              🖨️
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {aba === "config" && (
            <View style={{ gap: 14 }}>
              <View
                style={{
                  backgroundColor: "#1a1a1a",
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#333",
                }}
              >
                <Text
                  style={{
                    color: "#D4AF37",
                    fontWeight: "900",
                    marginBottom: 10,
                    fontSize: 14,
                  }}
                >
                  MODO DE FUNCIONAMENTO
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={async () => {
                      await setDoc(
                        doc(db, "config", "loja"),
                        { modoAutomatico: false },
                        { merge: true },
                      );
                      setConfig({ ...config, modoAutomatico: false });
                    }}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 10,
                      backgroundColor: !config.modoAutomatico
                        ? "#D4AF37"
                        : "#222",
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor: !config.modoAutomatico ? "#D4AF37" : "#555",
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "900",
                        color: !config.modoAutomatico ? "#000" : "#fff",
                        fontSize: 11,
                      }}
                    >
                      🔘 MANUAL
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      await setDoc(
                        doc(db, "config", "loja"),
                        { modoAutomatico: true },
                        { merge: true },
                      );
                      setConfig({ ...config, modoAutomatico: true });
                    }}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 10,
                      backgroundColor: config.modoAutomatico
                        ? "#00C851"
                        : "#222",
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor: config.modoAutomatico ? "#00C851" : "#555",
                    }}
                  >
                    <Text
                      style={{ fontWeight: "900", color: "#fff", fontSize: 11 }}
                    >
                      ⏰ AUTOMÁTICO
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!config.modoAutomatico && (
                <View
                  style={{
                    backgroundColor: config.aberto ? "#102a15" : "#2a1010",
                    padding: 20,
                    borderRadius: 16,
                    borderWidth: 3,
                    borderColor: config.aberto ? "#00C851" : "#ff4444",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: config.aberto ? "#00C851" : "#ff4444",
                      fontWeight: "900",
                      fontSize: 20,
                    }}
                  >
                    {config.aberto ? "🟢 LOJA ABERTA" : "🔴 LOJA FECHADA"}
                  </Text>
                  <TouchableOpacity
                    onPress={toggleLoja}
                    style={{
                      width: "100%",
                      backgroundColor: config.aberto ? "#ff4444" : "#00C851",
                      padding: 16,
                      borderRadius: 12,
                      alignItems: "center",
                      marginTop: 14,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900" }}>
                      {config.aberto ? "FECHAR LOJA" : "ABRIR LOJA"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {config.modoAutomatico && (
                <View
                  style={{
                    backgroundColor: "#1a1a1a",
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: "#00C851",
                  }}
                >
                  <Text
                    style={{
                      color: "#00C851",
                      fontWeight: "900",
                      marginBottom: 12,
                    }}
                  >
                    ⏰ HORÁRIO AUTOMÁTICO
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#888", fontSize: 10 }}>
                        ABRE ÀS
                      </Text>
                      <TextInput
                        value={config.horarioAbre}
                        onChangeText={(t) =>
                          setConfig({ ...config, horarioAbre: t })
                        }
                        style={{
                          backgroundColor: "#000",
                          color: "#fff",
                          padding: 14,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: "#00C851",
                          textAlign: "center",
                          fontWeight: "900",
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#888", fontSize: 10 }}>
                        FECHA ÀS
                      </Text>
                      <TextInput
                        value={config.horarioFecha}
                        onChangeText={(t) =>
                          setConfig({ ...config, horarioFecha: t })
                        }
                        style={{
                          backgroundColor: "#000",
                          color: "#fff",
                          padding: 14,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: "#ff4444",
                          textAlign: "center",
                          fontWeight: "900",
                        }}
                      />
                    </View>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 14,
                    }}
                  >
                    {[
                      { id: "segunda", lb: "SEG" },
                      { id: "terca", lb: "TER" },
                      { id: "quarta", lb: "QUA" },
                      { id: "quinta", lb: "QUI" },
                      { id: "sexta", lb: "SEX" },
                      { id: "sabado", lb: "SÁB" },
                      { id: "domingo", lb: "DOM" },
                    ].map((dia) => {
                      const ativo = (config.diasAbertos || []).includes(dia.id);
                      return (
                        <TouchableOpacity
                          key={dia.id}
                          onPress={() => {
                            const lista = config.diasAbertos || [];
                            const nova = ativo
                              ? lista.filter((x) => x !== dia.id)
                              : [...lista, dia.id];
                            setConfig({ ...config, diasAbertos: nova });
                          }}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            backgroundColor: ativo ? "#00C851" : "#222",
                            borderWidth: 1,
                            borderColor: ativo ? "#00C851" : "#444",
                            minWidth: 45,
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: ativo ? "#fff" : "#888",
                              fontWeight: "900",
                              fontSize: 10,
                            }}
                          >
                            {dia.lb}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View
                style={{
                  backgroundColor: "#1a1a1a",
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#333",
                }}
              >
                <Text
                  style={{
                    color: "#D4AF37",
                    fontWeight: "900",
                    marginBottom: 12,
                  }}
                >
                  TAXAS E TEMPOS
                </Text>
                <Text style={{ color: "#888", fontSize: 10 }}>
                  Taxa Entrega
                </Text>
                <TextInput
                  value={String(config.taxaEntrega)}
                  onChangeText={(t) =>
                    setConfig({ ...config, taxaEntrega: Number(t) || 0 })
                  }
                  keyboardType="numeric"
                  style={{
                    backgroundColor: "#000",
                    color: "#fff",
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#333",
                    marginBottom: 12,
                  }}
                />
                <Text
                  style={{ color: "#D4AF37", fontSize: 10, fontWeight: "900" }}
                >
                  ⏱️ TEMPO ENTREGA
                </Text>
                <TextInput
                  value={config.tempoEntrega}
                  onChangeText={(t) =>
                    setConfig({ ...config, tempoEntrega: t, tempoMedio: t })
                  }
                  style={{
                    backgroundColor: "#000",
                    color: "#fff",
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#D4AF37",
                    marginBottom: 12,
                  }}
                />
                <Text
                  style={{ color: "#00C851", fontSize: 10, fontWeight: "900" }}
                >
                  ⏱️ TEMPO RETIRADA
                </Text>
                <TextInput
                  value={config.tempoRetirada}
                  onChangeText={(t) =>
                    setConfig({ ...config, tempoRetirada: t })
                  }
                  style={{
                    backgroundColor: "#000",
                    color: "#fff",
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#00C851",
                    marginBottom: 16,
                  }}
                />
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
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
