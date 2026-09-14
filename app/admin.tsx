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
  const [aba, setAba] = useState("produtos");
  const [filtro, setFiltro] = useState("todos");
  const [config, setConfig] = useState({
    taxaEntrega: 8,
    tempoEntrega: "40 a 60 min",
    tempoRetirada: "15 a 25 min",
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
    let frete = 0;
    if (isRetirada) frete = 0;
    else if (
      pedido.freteGratis === true ||
      pedido.taxaEntrega === 0 ||
      pedido.taxaEntrega === "0" ||
      pedido.frete === 0
    )
      frete = 0;
    else {
      const fb =
        pedido.taxaEntrega ??
        pedido.frete ??
        pedido.valorFrete ??
        pedido.valorEntrega ??
        config.taxaEntrega ??
        8;
      frete = Number(fb) || 0;
    }

    const totalNum =
      Number(
        String(pedido.total || pedido.totalFormatado || "0")
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
      " - PAGO</div><div class='linha'></div><div style='white-space:pre-wrap;font-size:11px;line-height:17px;'>" +
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
        p.statusPagamento === "approved" ||
        p.statusPagamento === "pago" ||
        String(p.formaPagamento || "")
          .toUpperCase()
          .includes("APP");
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
      } else {
        Alert.alert("Erro no upload", JSON.stringify(data));
      }
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
  const salvarConfig = async () => {
    await setDoc(
      doc(db, "config", "loja"),
      {
        taxaEntrega: Number(config.taxaEntrega),
        tempoMedio: config.tempoEntrega,
        tempoEntrega: config.tempoEntrega,
        tempoRetirada: config.tempoRetirada,
        aberto: config.aberto,
      },
      { merge: true },
    );
    window.alert(
      "✅ SALVO! Frete: R$ " +
        config.taxaEntrega +
        " | Agora: " +
        config.tempoEntrega +
        " / " +
        config.tempoRetirada,
    );
  };
  const marcarPago = async (p) => {
    await updateDoc(doc(db, "pedidos", p.id), { pago: true, status: "pago" });
  };
  const marcarEntregue = async (p) => {
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
            <Text style={{ color: "#888", fontSize: 10, marginBottom: 2 }}>
              Nome
            </Text>
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
            <Text style={{ color: "#888", fontSize: 10, marginBottom: 2 }}>
              Preço
            </Text>
            <TextInput
              value={
                editando?.preco !== undefined && editando?.preco !== null
                  ? String(editando.preco)
                  : ""
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
            <Text style={{ color: "#888", fontSize: 10, marginBottom: 2 }}>
              Descrição
            </Text>
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
            <Text style={{ color: "#888", fontSize: 10, marginBottom: 2 }}>
              Estoque
            </Text>
            <TextInput
              value={
                editando?.estoque !== undefined && editando?.estoque !== null
                  ? String(editando.estoque)
                  : ""
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
          <TouchableOpacity
            onPress={corrigirTodoEstoque}
            style={{
              backgroundColor: "#D4AF37",
              padding: 14,
              borderRadius: 10,
              marginTop: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#000", fontWeight: "900", fontSize: 13 }}>
              🔧 CORRIGIR TODO ESTOQUE (50 PRA TODOS ZERADOS)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={exportarClientes}
            style={{
              backgroundColor: "#00C851",
              padding: 14,
              borderRadius: 10,
              marginTop: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>
              📥 BAIXAR CLIENTES ({clientes.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={apagarTodos}
            style={{
              backgroundColor: "#330000",
              borderWidth: 1,
              borderColor: "red",
              padding: 12,
              borderRadius: 10,
              marginTop: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "red", fontWeight: "900", fontSize: 12 }}>
              🗑️ APAGAR TODO HISTÓRICO
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
              onPress={() => setAba("produtos")}
              style={{
                flex: 1,
                padding: 11,
                borderRadius: 10,
                backgroundColor: aba === "produtos" ? "#D4AF37" : "#222",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", fontSize: 10 }}>PRODUTOS</Text>
            </TouchableOpacity>
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
              <Text style={{ fontWeight: "900", fontSize: 10 }}>
                PEDIDOS ({pedidos.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAba("clientes")}
              style={{
                flex: 1,
                padding: 11,
                borderRadius: 10,
                backgroundColor: aba === "clientes" ? "#00C851" : "#222",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", fontSize: 10 }}>
                CLIENTES ({clientes.length})
              </Text>
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
              <Text style={{ fontWeight: "900", fontSize: 10 }}>CONFIG</Text>
            </TouchableOpacity>
          </View>
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
                      source={{ uri: imageUrl }}
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
                {produtos.map((pr) => (
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
                      borderColor: pr.disponivel ? "#333" : "red",
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
                          ? "ESTOQUE: " + pr.estoque
                          : "SEM ESTOQUE"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setEditando(pr);
                        setEditModal(true);
                      }}
                      style={{
                        backgroundColor: "#D4AF37",
                        padding: 10,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: "#000",
                          fontSize: 10,
                          fontWeight: "900",
                        }}
                      >
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
                {pedidosFiltrados.map((p) => {
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
                              MARCAR PAGO + IMPRIMIR
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
                            🖨️
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
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
                  fontSize: 16,
                }}
              >
                CONFIGURAÇÕES - O ADMIN MANDA
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
                  marginBottom: 16,
                }}
              />
              <Text
                style={{
                  color: "#D4AF37",
                  fontSize: 12,
                  marginBottom: 4,
                  fontWeight: "900",
                }}
              >
                ⏱️ TEMPO ENTREGA (cliente vê no checkout)
              </Text>
              <TextInput
                value={config.tempoEntrega}
                onChangeText={(t) =>
                  setConfig({ ...config, tempoEntrega: t, tempoMedio: t })
                }
                placeholder="ex: 30 a 50 min"
                placeholderTextColor="#666"
                style={{
                  backgroundColor: "#000",
                  color: "#fff",
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#D4AF37",
                  marginBottom: 16,
                }}
              />
              <Text
                style={{
                  color: "#00C851",
                  fontSize: 12,
                  marginBottom: 4,
                  fontWeight: "900",
                }}
              >
                ⏱️ TEMPO RETIRADA (cliente vê no checkout)
              </Text>
              <TextInput
                value={config.tempoRetirada}
                onChangeText={(t) => setConfig({ ...config, tempoRetirada: t })}
                placeholder="ex: 10 a 20 min"
                placeholderTextColor="#666"
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
              <Text
                style={{
                  color: "#666",
                  fontSize: 10,
                  marginBottom: 12,
                  fontStyle: "italic",
                }}
              >
                Dica: Mude aqui e todos os celulares dos clientes atualizam na
                hora. O checkout vai obedecer o que está aqui.
              </Text>
              <TouchableOpacity
                onPress={salvarConfig}
                style={{
                  backgroundColor: "#D4AF37",
                  padding: 16,
                  borderRadius: 10,
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <Text style={{ fontWeight: "900", fontSize: 14 }}>
                  💾 SALVAR - TODO SITE VAI OBEDECER
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
