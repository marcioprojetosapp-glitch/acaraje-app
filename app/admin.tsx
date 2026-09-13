// @ts-nocheck
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../constants/firebase";

// --- SEU ADMIN ORIGINAL RESGATADO + EDITAR CONSERTADO ---
export default function Admin() {
  const [senha, setSenha] = useState("");
  const [logado, setLogado] = useState(false);
  const [aba, setAba] = useState("pedidos"); // pedidos | produtos | clientes | config
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState("todos"); // todos | pago | a_pagar | preparando | entregue | cancelado

  const [config, setConfig] = useState({
    tempoEntrega: "40",
    taxaEntrega: "5",
    aberto: true,
    msgFechado: "Estamos fechados no momento",
  });

  // PRODUTO - NOVO E EDITAR
  const [novoProduto, setNovoProduto] = useState({
    nome: "",
    preco: "",
    estoque: "",
    descricao: "",
    imagem: "",
  });
  const [editandoProduto, setEditandoProduto] = useState<any>(null);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [produtoEditForm, setProdutoEditForm] = useState({
    nome: "",
    preco: "",
    estoque: "",
    descricao: "",
    imagem: "",
  });

  const senhaCorreta = "7788";

  useEffect(() => {
    if (!logado) return;
    const q = query(collection(db, "pedidos"), orderBy("criadoEm", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [logado]);

  useEffect(() => {
    if (!logado) return;
    const q = query(collection(db, "produtos"), orderBy("nome"));
    const unsub = onSnapshot(q, (snap) => {
      setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [logado]);

  useEffect(() => {
    if (!logado) return;
    const q = query(collection(db, "clientes"), orderBy("nome"));
    const unsub = onSnapshot(q, (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [logado]);

  useEffect(() => {
    if (!logado) return;
    const ref = doc(db, "config", "loja");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setConfig(snap.data() as any);
    });
    return unsub;
  }, [logado]);

  // FUNÇÕES PRODUTOS - EDITAR AMARELO CONSERTADO
  const handleEditarProduto = (produto: any) => {
    setEditandoProduto(produto);
    setProdutoEditForm({
      nome: produto.nome || "",
      preco: String(produto.preco || ""),
      estoque: String(produto.estoque || produto.qtd || ""),
      descricao: produto.descricao || "",
      imagem: produto.imagem || produto.foto || "",
    });
    setModalEditarAberto(true);
  };

  const salvarEdicaoProduto = async () => {
    if (!editandoProduto) return;
    try {
      await updateDoc(doc(db, "produtos", editandoProduto.id), {
        nome: produtoEditForm.nome,
        preco: parseFloat(produtoEditForm.preco.replace(",", ".")),
        estoque: parseInt(produtoEditForm.estoque),
        descricao: produtoEditForm.descricao,
        imagem: produtoEditForm.imagem,
        foto: produtoEditForm.imagem,
      });
      setModalEditarAberto(false);
      setEditandoProduto(null);
      Alert.alert("Sucesso", "Produto atualizado!");
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    }
  };

  const pickImageNovo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setNovoProduto({ ...novoProduto, imagem: result.assets[0].uri });
    }
  };

  const pickImageEdit = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setProdutoEditForm({ ...produtoEditForm, imagem: result.assets[0].uri });
    }
  };

  const criarProduto = async () => {
    if (!novoProduto.nome || !novoProduto.preco) {
      Alert.alert("Preencha nome e preço");
      return;
    }
    await addDoc(collection(db, "produtos"), {
      nome: novoProduto.nome,
      preco: parseFloat(novoProduto.preco.replace(",", ".")),
      estoque: parseInt(novoProduto.estoque || "0"),
      descricao: novoProduto.descricao,
      imagem: novoProduto.imagem,
      foto: novoProduto.imagem,
      criadoEm: serverTimestamp(),
    });
    setNovoProduto({
      nome: "",
      preco: "",
      estoque: "",
      descricao: "",
      imagem: "",
    });
  };

  const atualizarStatusPedido = async (id: string, novoStatus: string) => {
    await updateDoc(doc(db, "pedidos", id), {
      status: novoStatus,
      statusPagamento: novoStatus,
    });
  };

  const imprimirPedido = (pedido: any) => {
    // Só imprime se for PAGO
    if (pedido.status !== "pago" && pedido.statusPagamento !== "pago") {
      Alert.alert(
        "Atenção",
        "Só imprima depois de pagamento! Status atual: " + pedido.status,
      );
      return;
    }
    const texto = `PEDIDO ${pedido.id.slice(0, 5)}\n${pedido.clienteNome}\n${pedido.itens?.map((i: any) => `${i.qtd}x ${i.nome}`).join("\n")}\nTotal: R$${pedido.total}`;
    Linking.openURL(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`,
    );
  };

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroStatus === "todos") return true;
    return p.status === filtroStatus || p.statusPagamento === filtroStatus;
  });

  if (!logado) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
          ADMIN - ACARAJÉ
        </Text>
        <TextInput
          placeholder="Senha"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
          style={{
            borderWidth: 1,
            width: "100%",
            padding: 15,
            borderRadius: 10,
            marginBottom: 10,
          }}
        />
        <TouchableOpacity
          onPress={() =>
            senha === senhaCorreta
              ? setLogado(true)
              : Alert.alert("Senha errada")
          }
          style={{
            backgroundColor: "#000",
            padding: 15,
            width: "100%",
            borderRadius: 10,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>ENTRAR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#000",
          padding: 10,
          gap: 5,
        }}
      >
        {["pedidos", "produtos", "clientes", "config"].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setAba(t)}
            style={{
              padding: 10,
              backgroundColor: aba === t ? "#ffcc00" : "#333",
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: aba === t ? "#000" : "#fff",
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1, padding: 15 }}>
        {aba === "pedidos" && (
          <>
            <Text
              style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}
            >
              PEDIDOS ({pedidosFiltrados.length})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 15 }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[
                  "todos",
                  "a_pagar",
                  "pago",
                  "preparando",
                  "entregue",
                  "cancelado",
                ].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setFiltroStatus(s)}
                    style={{
                      paddingHorizontal: 15,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: filtroStatus === s ? "#000" : "#ddd",
                    }}
                  >
                    <Text
                      style={{
                        color: filtroStatus === s ? "#fff" : "#000",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      {s === "a_pagar" ? "A PAGAR" : s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {pedidosFiltrados.map((ped) => (
              <View
                key={ped.id}
                style={{
                  backgroundColor: "#fff",
                  padding: 15,
                  borderRadius: 12,
                  marginBottom: 10,
                  borderLeftWidth: 5,
                  borderLeftColor:
                    ped.status === "pago"
                      ? "green"
                      : ped.status === "a_pagar"
                        ? "red"
                        : "#ffcc00",
                }}
              >
                <Text style={{ fontWeight: "bold" }}>
                  {ped.clienteNome} - R$ {ped.total}
                </Text>
                <Text>
                  Status: {ped.status || ped.statusPagamento} -{" "}
                  {ped.formaPagamento}
                </Text>
                <Text style={{ fontSize: 12, marginTop: 5 }}>
                  {ped.itens
                    ?.map((i: any) => `${i.qtd}x ${i.nome} ${i.obs || ""}`)
                    .join(" | ")}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 5,
                    marginTop: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => atualizarStatusPedido(ped.id, "pago")}
                    style={{
                      backgroundColor: "green",
                      padding: 8,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      PAGO
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => atualizarStatusPedido(ped.id, "a_pagar")}
                    style={{
                      backgroundColor: "red",
                      padding: 8,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      A PAGAR
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => atualizarStatusPedido(ped.id, "preparando")}
                    style={{
                      backgroundColor: "#ff9900",
                      padding: 8,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      PREPARANDO
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => atualizarStatusPedido(ped.id, "entregue")}
                    style={{
                      backgroundColor: "#000",
                      padding: 8,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      ENTREGUE
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => imprimirPedido(ped)}
                    style={{
                      backgroundColor: "#0066ff",
                      padding: 8,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      IMPRIMIR
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {aba === "produtos" && (
          <>
            <Text
              style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}
            >
              PRODUTOS ({produtos.length})
            </Text>
            {produtos.map((prod) => (
              <View
                key={prod.id}
                style={{
                  backgroundColor: "#fff",
                  padding: 15,
                  borderRadius: 12,
                  marginBottom: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "bold" }}>{prod.nome}</Text>
                  <Text>
                    R$ {prod.preco} - Estoque: {prod.estoque || prod.qtd || 0}
                  </Text>
                  <Text style={{ fontSize: 11 }}>{prod.descricao}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 5 }}>
                  <TouchableOpacity
                    onPress={() => handleEditarProduto(prod)}
                    style={{
                      backgroundColor: "#ffcc00",
                      paddingHorizontal: 15,
                      paddingVertical: 10,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontWeight: "bold", color: "#000" }}>
                      EDITAR
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteDoc(doc(db, "produtos", prod.id))}
                    style={{
                      backgroundColor: "red",
                      paddingHorizontal: 10,
                      paddingVertical: 10,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>X</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View
              style={{
                backgroundColor: "#fff",
                padding: 15,
                borderRadius: 12,
                marginTop: 20,
              }}
            >
              <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
                NOVO PRODUTO
              </Text>
              <TextInput
                placeholder="Nome"
                value={novoProduto.nome}
                onChangeText={(v) =>
                  setNovoProduto({ ...novoProduto, nome: v })
                }
                style={{
                  borderWidth: 1,
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              />
              <TextInput
                placeholder="Preço"
                keyboardType="numeric"
                value={novoProduto.preco}
                onChangeText={(v) =>
                  setNovoProduto({ ...novoProduto, preco: v })
                }
                style={{
                  borderWidth: 1,
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              />
              <TextInput
                placeholder="Estoque"
                keyboardType="numeric"
                value={novoProduto.estoque}
                onChangeText={(v) =>
                  setNovoProduto({ ...novoProduto, estoque: v })
                }
                style={{
                  borderWidth: 1,
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              />
              <TextInput
                placeholder="Descrição"
                value={novoProduto.descricao}
                onChangeText={(v) =>
                  setNovoProduto({ ...novoProduto, descricao: v })
                }
                style={{
                  borderWidth: 1,
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              />
              <TouchableOpacity
                onPress={pickImageNovo}
                style={{
                  backgroundColor: "#eee",
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 8,
                  alignItems: "center",
                }}
              >
                <Text>
                  {novoProduto.imagem
                    ? "Foto selecionada ✓"
                    : "Selecionar foto"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={criarProduto}
                style={{
                  backgroundColor: "#000",
                  padding: 15,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  CRIAR PRODUTO
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {aba === "clientes" && (
          <>
            <Text
              style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}
            >
              CLIENTES ({clientes.length}) - GRÁTIS
            </Text>
            {clientes.map((c) => (
              <View
                key={c.id}
                style={{
                  backgroundColor: "#fff",
                  padding: 15,
                  borderRadius: 12,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontWeight: "bold" }}>
                  {c.nome} - {c.telefone}
                </Text>
                <Text style={{ fontSize: 12 }}>{c.endereco}</Text>
                <Text style={{ fontSize: 10, color: "green", marginTop: 5 }}>
                  ✓ LGPD Aceito
                </Text>
              </View>
            ))}
          </>
        )}

        {aba === "config" && (
          <View
            style={{ backgroundColor: "#fff", padding: 20, borderRadius: 12 }}
          >
            <Text
              style={{ fontSize: 20, fontWeight: "bold", marginBottom: 15 }}
            >
              CONFIGURAÇÕES
            </Text>
            <Text style={{ fontWeight: "bold", marginBottom: 5 }}>
              Tempo de Entrega (minutos)
            </Text>
            <TextInput
              value={config.tempoEntrega}
              onChangeText={(v) => setConfig({ ...config, tempoEntrega: v })}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                padding: 12,
                borderRadius: 8,
                marginBottom: 15,
              }}
              placeholder="Ex: 40"
            />

            <Text style={{ fontWeight: "bold", marginBottom: 5 }}>
              Taxa de Entrega (R$)
            </Text>
            <TextInput
              value={config.taxaEntrega}
              onChangeText={(v) => setConfig({ ...config, taxaEntrega: v })}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                padding: 12,
                borderRadius: 8,
                marginBottom: 15,
              }}
            />

            <Text style={{ fontWeight: "bold", marginBottom: 5 }}>
              Mensagem Loja Fechada
            </Text>
            <TextInput
              value={config.msgFechado}
              onChangeText={(v) => setConfig({ ...config, msgFechado: v })}
              style={{
                borderWidth: 1,
                padding: 12,
                borderRadius: 8,
                marginBottom: 15,
              }}
            />

            <TouchableOpacity
              onPress={() => setConfig({ ...config, aberto: !config.aberto })}
              style={{
                backgroundColor: config.aberto ? "green" : "red",
                padding: 15,
                borderRadius: 8,
                alignItems: "center",
                marginBottom: 15,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {config.aberto ? "LOJA ABERTA ✓" : "LOJA FECHADA"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                await setDoc(doc(db, "config", "loja"), config);
                Alert.alert("Salvo!", "Configurações salvas");
              }}
              style={{
                backgroundColor: "#000",
                padding: 15,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                SALVAR CONFIG
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* MODAL EDITAR PRODUTO - AMARELO CONSERTADO */}
      <Modal visible={modalEditarAberto} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{ backgroundColor: "#fff", borderRadius: 15, padding: 20 }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "bold", marginBottom: 15 }}
            >
              EDITAR PRODUTO
            </Text>
            <TextInput
              placeholder="Nome"
              value={produtoEditForm.nome}
              onChangeText={(v) =>
                setProdutoEditForm({ ...produtoEditForm, nome: v })
              }
              style={{
                borderWidth: 1,
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
              }}
            />
            <TextInput
              placeholder="Preço"
              keyboardType="numeric"
              value={produtoEditForm.preco}
              onChangeText={(v) =>
                setProdutoEditForm({ ...produtoEditForm, preco: v })
              }
              style={{
                borderWidth: 1,
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
              }}
            />
            <TextInput
              placeholder="Estoque"
              keyboardType="numeric"
              value={produtoEditForm.estoque}
              onChangeText={(v) =>
                setProdutoEditForm({ ...produtoEditForm, estoque: v })
              }
              style={{
                borderWidth: 1,
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
              }}
            />
            <TextInput
              placeholder="Descrição"
              value={produtoEditForm.descricao}
              onChangeText={(v) =>
                setProdutoEditForm({ ...produtoEditForm, descricao: v })
              }
              style={{
                borderWidth: 1,
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
              }}
            />
            <TouchableOpacity
              onPress={pickImageEdit}
              style={{
                backgroundColor: "#eee",
                padding: 12,
                borderRadius: 8,
                marginBottom: 10,
                alignItems: "center",
              }}
            >
              <Text>
                {produtoEditForm.imagem
                  ? "Foto nova selecionada ✓ - Trocar foto"
                  : "Trocar foto"}
              </Text>
            </TouchableOpacity>
            {produtoEditForm.imagem ? (
              <Image
                source={{ uri: produtoEditForm.imagem }}
                style={{
                  width: "100%",
                  height: 100,
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              />
            ) : null}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setModalEditarAberto(false)}
                style={{
                  flex: 1,
                  backgroundColor: "#ddd",
                  padding: 15,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "bold" }}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={salvarEdicaoProduto}
                style={{
                  flex: 1,
                  backgroundColor: "#ffcc00",
                  padding: 15,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "bold" }}>SALVAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
