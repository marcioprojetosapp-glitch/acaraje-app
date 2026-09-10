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
const SENHA_CORRETA = "7788"; // <-- TROCA AQUI SUA SENHA NOVA

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

  function imprimirPedidoTermica(pedido: any) {
    if (Platform.OS !== "web") {
      Alert.alert("Só imprime no PC");
      return;
    }
    const win = window.open("", "_blank", "width=320,height=800");
    if (!win) return;
    const nomeCliente = pedido.nome || pedido.cliente || "Sem nome";
    const totalExibir = pedido.totalFormatado || pedido.total || "0";
    const data = new Date().toLocaleString("pt-BR");
    const idCurto = pedido.id.slice(-6).toUpperCase();
    const resumo =
      pedido.resumo ||
      pedido.itens
        ?.map((i: any) => `${i.qtd || i.quantidade || 1}x ${i.nome || i.title}`)
        .join("\n") ||
      "Sem detalhes";

    win.document.write(`
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
      <body onload="setTimeout(()=>{window.print(); window.close();}, 400);">
        <div class="titulo">COZINHA - FRITAR</div>
        <div class="sub">${data} | #${idCurto}</div>
        <div class="linha2"></div>
        <div class="big">${nomeCliente.toUpperCase()}</div>
        <div class="linha"></div>
        <div style="white-space:pre-wrap; font-size:15px; font-weight:bold; line-height:18px;">${resumo}</div>
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
        <div><b>PAG:</b> ${(pedido.formaPagamento || "").toUpperCase()} - ${(pedido.status || "").toUpperCase()}</div>
        <div class="linha"></div>
        <div style="white-space:pre-wrap; font-size:13px;">${resumo}</div>
        <div class="linha"></div>
        <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:900;"><span>TOTAL</span><span>R$ ${totalExibir}</span></div>
        <div class="linha2"></div>
        <div style="text-align:center; font-weight:900;">*** MOTOBOY ***</div>
      </body></html>
    `);
    win.document.close();
  }

  useEffect(() => {
    if (!autorizado) return;
    return onSnapshot(
      query(collection(db, "pedidos"), orderBy("criadoEm", "desc")),
      async (s) => {
        const lista = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPedidos(lista);
        if (Platform.OS === "web") {
          for (const pedido of lista as any[]) {
            const isPago =
              pedido.status === "pago" ||
              pedido.pago === true ||
              pedido.statusPagamento === "pago";
            const jaFoi =
              pedido.impresso === true || jaImpressos.current.has(pedido.id);
            if (isPago && !jaFoi) {
              jaImpressos.current.add(pedido.id);
              imprimirPedidoTermica(pedido);
              try {
                await updateDoc(doc(db, "pedidos", pedido.id), {
                  impresso: true,
                  impressoEm: new Date(),
                });
              } catch {}
              try {
                const a = new Audio(
                  "https://cdn.pixabay.com/audio/2022/03/10/audio_55117a64d4.mp3",
                );
                a.play().catch(() => {});
              } catch {}
            }
          }
        }
      },
    );
  }, [autorizado]);

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
      String(p.formaPagamento || "")
        .toUpperCase()
        .includes("APP");
    if (filtro === "todos") return true;
    if (filtro === "novo") return !isPagoAuto && p.status !== "entregue";
    if (filtro === "pago") return isPagoAuto && p.status !== "entregue";
    if (filtro === "entregue") return p.status === "entregue";
    return true;
  });

  const marcarPago = async (p) => {
    await updateDoc(doc(db, "pedidos", p.id), { pago: true, status: "pago" });
  };
  const marcarEntregue = async (p) => {
    await updateDoc(doc(db, "pedidos", p.id), { status: "entregue" });
  };
  const apagarPedido = (id) => {
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
  };
  const apagarTodos = () => {
    Alert.alert(
      "APAGAR TUDO?",
      "Isso vai apagar TODOS os pedidos de teste. Não volta mais!",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "APAGAR TUDO",
          style: "destructive",
          onPress: async () => {
            try {
              const snap = await getDocs(collection(db, "pedidos"));
              for (const d of snap.docs) {
                await deleteDoc(doc(db, "pedidos", d.id));
              }
              Alert.alert("Limpo!", "Histórico apagado com sucesso");
            } catch (e) {
              Alert.alert("Erro", "Não deu pra apagar");
            }
          },
        },
      ],
    );
  };

  const uploadToCloudinary = async (uri) => {
    setUploading(true);
    const formData = new FormData(); // @ts-ignore
    formData.append("file", { uri, type: "image/jpeg", name: "produto.jpg" });
    formData.append("upload_preset", UPLOAD_PRESET);
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData },
      );
      const data = await res.json();
      if (data.secure_url) {
        if (editando) setEditando({ ...editando, imagemURL: data.secure_url });
        else setImageUrl(data.secure_url);
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
    const qtd = Number(editando.estoque) || 0;
    await updateDoc(doc(db, "produtos", editando.id), {
      nome: editando.nome,
      preco: Number(editando.preco),
      descricao: editando.descricao,
      estoque: qtd,
      imagemURL: editando.imagemURL,
      disponivel: qtd > 0 ? editando.disponivel : false,
    });
    setEditModal(false);
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
                  { id: "novo", lb: `A PAGAR` },
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
                        {p.resumo ||
                          p.itens
                            ?.map(
                              (i: any) =>
                                `${i.qtd || i.quantidade || 1}x ${i.nome || i.title}`,
                            )
                            .join("\n") ||
                          "Sem detalhes"}
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
                  padding: 15,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#D4AF37",
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
                {imageUrl && (
                  <Image
                    source={{ uri: imageUrl }}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 10,
                      alignSelf: "center",
                      marginBottom: 10,
                    }}
                  />
                )}
                <TouchableOpacity
                  onPress={pickImage}
                  style={{
                    backgroundColor: "#222",
                    padding: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: "#fff" }}>
                    {uploading ? "Enviando..." : "📷 Escolher Foto"}
                  </Text>
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
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#333",
                  }}
                />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <TextInput
                    placeholder="Preço"
                    placeholderTextColor="#666"
                    value={preco}
                    onChangeText={setPreco}
                    keyboardType="numeric"
                    style={{
                      flex: 1,
                      backgroundColor: "#000",
                      color: "#fff",
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#333",
                    }}
                  />
                  <TextInput
                    placeholder="Estoque"
                    placeholderTextColor="#D4AF37"
                    value={estoque}
                    onChangeText={setEstoque}
                    keyboardType="numeric"
                    style={{
                      flex: 1,
                      backgroundColor: "#000",
                      color: "#D4AF37",
                      padding: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#D4AF37",
                    }}
                  />
                </View>
                <TextInput
                  placeholder="Descrição"
                  placeholderTextColor="#666"
                  value={descricao}
                  onChangeText={setDescricao}
                  style={{
                    backgroundColor: "#000",
                    color: "#fff",
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#333",
                    marginTop: 10,
                  }}
                />
                <TouchableOpacity
                  onPress={salvarProduto}
                  style={{
                    backgroundColor: "#D4AF37",
                    padding: 14,
                    borderRadius: 10,
                    marginTop: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>ADICIONAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {aba === "config" && (
            <View
              style={{
                backgroundColor: "#1a1a1a",
                padding: 20,
                borderRadius: 14,
              }}
            >
              <Text style={{ color: "#fff" }}>Taxa Entrega R$</Text>
              <TextInput
                value={String(config.taxaEntrega)}
                onChangeText={(v) =>
                  setConfig({ ...config, taxaEntrega: Number(v) })
                }
                keyboardType="numeric"
                style={{
                  backgroundColor: "#000",
                  color: "#fff",
                  padding: 12,
                  borderRadius: 10,
                  marginTop: 5,
                  borderWidth: 1,
                  borderColor: "#333",
                }}
              />
              <TouchableOpacity
                onPress={async () => {
                  await setDoc(doc(db, "config", "loja"), config, {
                    merge: true,
                  });
                  Alert.alert("Salvo!");
                }}
                style={{
                  backgroundColor: "#D4AF37",
                  padding: 15,
                  borderRadius: 12,
                  marginTop: 20,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "900" }}>SALVAR</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
