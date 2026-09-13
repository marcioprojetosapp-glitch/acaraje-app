// @ts-nocheck
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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

const CLOUD_NAME = "qbl22xip";
const UPLOAD_PRESET = "mmpaixao_preset";
const SENHA_CORRETA = "7788";

export default function Admin() {
  const [modalSenhaVisivel, setModalSenhaVisivel] = useState(true);
  const [senhaDigitada, setSenhaDigitada] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [aba, setAba] = useState("pedidos");
  const [filtro, setFiltro] = useState("todos");
  const [config, setConfig] = useState({
    taxaEntrega: 8,
    tempoMedio: "40 a 60 min",
    aberto: true,
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

  const verificarSenha = () => {
    if (senhaDigitada === SENHA_CORRETA) {
      setAutorizado(true);
      setModalSenhaVisivel(false);
    } else {
      Alert.alert("Senha errada");
      setSenhaDigitada("");
    }
  };

  // ✅✅ CORRIGIDO - AGORA MOSTRA PIMENTA, CAMARÃO, QTD DE COPOS
  function montarResumoDetalhado(pedido: any) {
    // PRIORIDADE 1: Sempre montar pelos itens (que tem obs com camarão/pimenta)
    if (pedido.itens && pedido.itens.length > 0) {
      const resumoMontado = pedido.itens
        .map((i: any) => {
          const qtd = i.qtd || i.quantidade || 1;
          const nomeP = (i.nome || i.title || "ITEM").toUpperCase();
          let linha = `${qtd}x ${nomeP}`; // AQUI JÁ MOSTRA QTD DE COPOS EX: 3x COPO
          const extrasSet = new Set<string>();

          if (Array.isArray(i.adicionais) && i.adicionais.length) {
            i.adicionais.forEach((c: any) => {
              const t =
                typeof c === "string"
                  ? c
                  : c.nome || c.nomeComplemento || c.title || c.label || "";
              if (t && String(t).trim())
                extrasSet.add(String(t).trim().toUpperCase());
            });
          }
          // SEU CASO ESTÁ AQUI: obs = "Camarão, Com pimenta, Salada, Vatapá"
          if (i.obs && typeof i.obs === "string" && i.obs.trim() !== "") {
            i.obs
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
              .forEach((p: string) => {
                extrasSet.add(p.toUpperCase());
              });
          }
          if (i.observacao) extrasSet.add(`OBS: ${i.observacao.toUpperCase()}`);

          const extras = Array.from(extrasSet).map((e) => ` + ${e}`);
          if (extras.length > 0) return linha + "\n" + extras.join("\n");
          return linha;
        })
        .join("\n\n");

      if (resumoMontado && resumoMontado.length > 3) return resumoMontado;
    }

    // PRIORIDADE 2: Se não tem itens, usa o resumo antigo
    if (pedido.resumoDetalhado && pedido.resumoDetalhado.length > 5)
      return pedido.resumoDetalhado;
    if (pedido.resumo && pedido.resumo.length > 5) return pedido.resumo;

    return "Sem detalhes";
  }

  function imprimirPedidoTermica(pedido: any) {
    if (Platform.OS !== "web") {
      Alert.alert("Só imprime no PC");
      return;
    }
    const nomeCliente = pedido.nome || pedido.cliente || "Sem nome";
    const totalExibir = pedido.totalFormatado || pedido.total || "0";
    const data = new Date().toLocaleString("pt-BR");
    const idCurto = pedido.id.slice(-6).toUpperCase();
    const resumo = montarResumoDetalhado(pedido);

    let iframe = document.getElementById(
      "iframe-impressao",
    ) as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "iframe-impressao";
      iframe.style.position = "absolute";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
    }
    const html = `
      <html><head><title>${idCurto}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body { width: 72mm; font-family: 'Courier New', monospace; font-size: 13px; padding: 4mm; margin:0; color:#000; }
    .titulo { text-align:center; font-weight:900; font-size:18px; }
    .sub { text-align:center; font-size:11px; }
    .linha { border-top:1px dashed #000; margin:8px 0; }
    .linha2 { border-top:2px solid #000; margin:8px 0; }
    .corte { page-break-after: always; }
    .big { font-size:16px; font-weight:900; }
      </style>
      </head>
      <body>
        <div class="titulo">COZINHA - FRITAR</div>
        <div class="sub">${data} | #${idCurto}</div>
        <div class="linha2"></div>
        <div class="big">${nomeCliente.toUpperCase()}</div>
        <div class="linha"></div>
        <div style="white-space:pre-wrap; font-size:15px; font-weight:bold; line-height:20px;">${resumo}</div>
        <div class="linha2"></div>
        <div style="text-align:center; font-weight:900; font-size:14px;">*** COZINHA ***</div>
        <br/><br/><br/>
        <div class="corte"></div>
        <div class="titulo">ACARAJE DA BENCAO</div>
        <div class="sub">VIA ENTREGA | #${idCurto}<br/>${data}</div>
        <div class="linha2"></div>
        <div><b>CLIENTE:</b> ${nomeCliente}</div>
        <div><b>ZAP:</b> ${pedido.whatsapp || pedido.telefone || ""}</div>
        <div><b>END:</b> ${pedido.endereco || "RETIRADA NO BALCAO"}</div>
        <div><b>PAG:</b> ${(pedido.formaPagamento || "").toUpperCase()} - PAGO</div>
        <div class="linha"></div>
        <div style="white-space:pre-wrap; font-size:13px; line-height:18px;">${resumo}</div>
        <div class="linha"></div>
        <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:900;"><span>TOTAL</span><span>R$ ${totalExibir}</span></div>
        <div class="linha2"></div>
        <div style="text-align:center; font-weight:900;">*** MOTOBOY ***</div>
        <script>window.onload = function(){ window.print(); }</script>
      </body></html>
    `;
    const docIframe = iframe.contentDocument || iframe.contentWindow?.document;
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
      async (s) => {
        const lista = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPedidos(lista);
      },
    );
  }, [autorizado]);

  useEffect(() => {
    if (!autorizado || pedidos.length === 0) return;
    pedidos.forEach((p: any) => {
      if (!jaImpressos.current.has(p.id) && p.status !== "entregue") {
        const tempoCriacao = p.criadoEm?.toDate?.()?.getTime() || 0;
        const ehNovo = Date.now() - tempoCriacao < 3 * 60 * 1000;
        if (ehNovo || !p.impresso) {
          console.log("🖨️ Imprimindo automático:", p.id);
          imprimirPedidoTermica(p);
          jaImpressos.current.add(p.id);
          updateDoc(doc(db, "pedidos", p.id), { impresso: true }).catch(
            () => {},
          );
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
      if (s.exists()) setConfig((p) => ({ ...p, ...s.data() }));
    });
  }, [autorizado]);

  const pedidosFiltrados = pedidos.filter((p: any) => {
    const isPagoAuto =
      p.pago === true ||
      p.status === "pago" ||
      p.statusPagamento === "approved" ||
      p.statusPagamento === "pago" ||
      String(p.formaPagamento || "")
        .toUpperCase()
        .includes("APP");
    if (filtro === "todos") return true;
    if (filtro === "novo") return !isPagoAuto && p.status !== "entregue";
    if (filtro === "pago") return isPagoAuto && p.status !== "entregue";
    if (filtro === "entregue") return p.status === "entregue";
    return true;
  });

  const apagarPedido = async (id: string) => {
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
    } catch (e: any) {
      alert("Erro ao apagar: " + e.message);
    }
  };

  const apagarTodos = async () => {
    try {
      const confirma =
        Platform.OS === "web"
          ? window.confirm("APAGAR TODO HISTÓRICO DE TESTES?")
          : true;
      if (Platform.OS !== "web") {
        Alert.alert("APAGAR TUDO?", "Apagar TODOS?", [
          { text: "Cancelar", style: "cancel" },
          {
            text: "APAGAR TUDO",
            style: "destructive",
            onPress: async () => {
              const snap = await getDocs(collection(db, "pedidos"));
              for (const d of snap.docs)
                await deleteDoc(doc(db, "pedidos", d.id));
            },
          },
        ]);
        return;
      }
      if (!confirma) return;
      const snap = await getDocs(collection(db, "pedidos"));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "pedidos", d.id));
      }
      alert("Histórico limpo! (" + snap.size + " pedidos)");
    } catch (e: any) {
      alert("Erro ao apagar tudo: " + e.message);
    }
  };

  const uploadToCloudinary = async (uri: string) => {
    setUploading(true);
    const formData = new FormData();
    // @ts-ignore
    formData.append("file", { uri, type: "image/jpeg", name: "produto.jpg" });
    formData.append("upload_preset", UPLOAD_PRESET);
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData },
      );
      const data = await res.json();
      if (data.secure_url) {
        if (editando)
          setEditando({ ...editando, imagemURL: data.secure_url } as any);
        else setImageUrl(data.secure_url as any);
      }
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
  const salvarProduto = async () => {
    if (!nome || !preco) return Alert.alert("Falta nome/preço");
    const qtd = Number(estoque) || 0;
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
    const qtd = Number((editando as any).estoque) || 0;
    await updateDoc(doc(db, "produtos", (editando as any).id), {
      nome: (editando as any).nome,
      preco: Number((editando as any).preco),
      descricao: (editando as any).descricao,
      estoque: qtd,
      imagemURL: (editando as any).imagemURL,
      disponivel: qtd > 0 ? (editando as any).disponivel : false,
    });
    setEditModal(false);
  };
  const salvarConfig = async () => {
    await setDoc(
      doc(db, "config", "loja"),
      {
        taxaEntrega: Number(config.taxaEntrega),
        tempoMedio: config.tempoMedio,
        aberto: config.aberto,
      },
      { merge: true },
    );
    Alert.alert("Salvo", "Configurações salvas!");
  };
  const marcarPago = async (p: any) => {
    await updateDoc(doc(db, "pedidos", p.id), { pago: true, status: "pago" });
  };
  const marcarEntregue = async (p: any) => {
    await updateDoc(doc(db, "pedidos", p.id), { status: "entregue" });
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
              secureTextEntry={true}
              keyboardType="number-pad"
              autoFocus
              autoComplete="off"
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
            ADMIN - ACARAJÉ DA BENÇÃO (2 VIAS)
          </Text>
          <TouchableOpacity
            onPress={apagarTodos}
            style={{
              backgroundColor: "#330000",
              borderWidth: 1,
              borderColor: "red",
              padding: 12,
              borderRadius: 10,
              marginTop: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "red", fontWeight: "900", fontSize: 12 }}>
              🗑️ APAGAR TODO HISTÓRICO DE TESTES
            </Text>
          </TouchableOpacity>
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
                backgroundColor: aba === "pedidos" ? "#D4AF37" : "#222",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", fontSize: 11 }}>
                PEDIDOS ({pedidos.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAba("produtos")}
              style={{
                flex: 1,
                padding: 11,
                borderRadius: 10,
                backgroundColor: aba === "produtos" ? "#D4AF37" : "#222",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", fontSize: 11 }}>PRODUTOS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAba("config")}
              style={{
                flex: 1,
                padding: 11,
                borderRadius: 10,
                backgroundColor: aba === "config" ? "#D4AF37" : "#222",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", fontSize: 11 }}>CONFIG</Text>
            </TouchableOpacity>
          </View>
          {aba === "pedidos" && (
            <View>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                {[
                  { id: "todos", lb: "TODOS" },
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
                      backgroundColor: filtro === f.id ? "#D4AF37" : "#222",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "900",
                        color: filtro === f.id ? "#000" : "#fff",
                      }}
                    >
                      {f.lb}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ gap: 12 }}>
                {pedidosFiltrados.map((p: any) => {
                  const isEntrega = p.tipoEntrega !== "retirada";
                  const isPagoAuto =
                    p.pago === true ||
                    p.status === "pago" ||
                    p.statusPagamento === "approved" ||
                    p.statusPagamento === "pago" ||
                    String(p.formaPagamento || "")
                      .toUpperCase()
                      .includes("APP");
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
                        backgroundColor: isEntregue
                          ? "#111"
                          : isPagoAuto
                            ? "#112911"
                            : "#1a1a1a",
                        padding: 14,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: isEntregue
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
                            color: isEntrega ? "#D4AF37" : "#00C851",
                            fontWeight: "900",
                            fontSize: 12,
                          }}
                        >
                          {isEntrega ? "🛵 ENTREGA" : "🟢 RETIRADA"} • {hora}{" "}
                          {p.impresso ? "🖨️" : ""}
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
                              backgroundColor: isEntregue
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
                                color: isEntregue
                                  ? "#aaa"
                                  : isPagoAuto
                                    ? "#fff"
                                    : "#ffaa00",
                                fontWeight: "900",
                                fontSize: 9,
                              }}
                            >
                              {isEntregue
                                ? "ENTREGUE"
                                : isPagoAuto
                                  ? "✓ PAGO NO APP"
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
                          {isEntrega ? `📍 ${p.endereco}` : "📍 Retira na loja"}
                        </Text>
                        <Text style={{ color: "#aaa", fontSize: 12 }}>
                          📱 {p.telefone || p.whatsapp} • 💳{" "}
                          {p.formaPagamento || "APP"}
                        </Text>
                      </View>
                      <View
                        style={{ flexDirection: "row", gap: 8, marginTop: 12 }}
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
                              MARCAR PAGO
                            </Text>
                          </TouchableOpacity>
                        )}
                        {!isEntregue && (
                          <TouchableOpacity
                            onPress={() => marcarEntregue(p)}
                            style={{
                              flex: 1,
                              backgroundColor: isPagoAuto ? "#D4AF37" : "#333",
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
                            🖨️ 2 VIAS
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            const tel = String(
                              p.telefone || p.whatsapp || "",
                            ).replace(/\D/g, "");
                            if (tel) Linking.openURL(`https://wa.me/55${tel}`);
                          }}
                          style={{
                            backgroundColor: "#222",
                            padding: 11,
                            borderRadius: 10,
                            alignItems: "center",
                          }}
                        >
                          <Text style={{ color: "#fff" }}>💬</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          {aba === "produtos" && (
            <View>
              <View
                style={{
                  backgroundColor: "#1a1a1a",
                  padding: 14,
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
                  }}
                >
                  CADASTRAR PRODUTO
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
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl as any }}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 10,
                      }}
                    />
                  ) : (
                    <Text style={{ color: "#888" }}>
                      {uploading ? "ENVIANDO..." : "📷 FOTO"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TextInput
                  placeholder="Nome"
                  placeholderTextColor="#666"
                  value={nome}
                  onChangeText={setNome}
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
                <TextInput
                  placeholder="Preço ex: 15.00"
                  placeholderTextColor="#666"
                  value={preco}
                  onChangeText={setPreco}
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
                <TextInput
                  placeholder="Descrição"
                  placeholderTextColor="#666"
                  value={descricao}
                  onChangeText={setDescricao}
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
                <TextInput
                  placeholder="Estoque"
                  placeholderTextColor="#666"
                  value={estoque}
                  onChangeText={setEstoque}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: "#000",
                    color: "#fff",
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#333",
                    marginBottom: 10,
                  }}
                />
                <TouchableOpacity
                  onPress={salvarProduto}
                  style={{
                    backgroundColor: "#D4AF37",
                    padding: 14,
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>SALVAR PRODUTO</Text>
                </TouchableOpacity>
              </View>
              <View style={{ gap: 10, marginTop: 15 }}>
                {produtos.map((pr: any) => (
                  <View
                    key={pr.id}
                    style={{
                      backgroundColor: "#1a1a1a",
                      padding: 12,
                      borderRadius: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      borderWidth: 1,
                      borderColor: "#333",
                    }}
                  >
                    <Image
                      source={{ uri: pr.imagemURL }}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 8,
                        backgroundColor: "#222",
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#fff", fontWeight: "900" }}>
                        {pr.nome}
                      </Text>
                      <Text style={{ color: "#D4AF37" }}>R$ {pr.preco}</Text>
                      <Text
                        style={{
                          color: pr.disponivel ? "#00C851" : "red",
                          fontSize: 10,
                        }}
                      >
                        {pr.disponivel
                          ? `ESTOQUE: ${pr.estoque}`
                          : "SEM ESTOQUE"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setEditando(pr);
                        setEditModal(true);
                      }}
                      style={{
                        backgroundColor: "#333",
                        padding: 10,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 10 }}>
                        EDITAR
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        if (
                          Platform.OS === "web"
                            ? window.confirm("Apagar produto?")
                            : true
                        )
                          await deleteDoc(doc(db, "produtos", pr.id));
                      }}
                      style={{
                        backgroundColor: "#330000",
                        padding: 10,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: "red", fontSize: 10 }}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
          {aba === "config" && (
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
                CONFIGURAÇÕES
              </Text>
              <Text style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>
                Taxa de Entrega (R$)
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
              <Text style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>
                Tempo Médio
              </Text>
              <TextInput
                value={config.tempoMedio}
                onChangeText={(t) => setConfig({ ...config, tempoMedio: t })}
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
              <TouchableOpacity
                onPress={salvarConfig}
                style={{
                  backgroundColor: "#D4AF37",
                  padding: 14,
                  borderRadius: 10,
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <Text style={{ fontWeight: "900" }}>SALVAR CONFIG</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
