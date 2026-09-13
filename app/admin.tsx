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
const SENHA = "7788";

export default function Admin() {
  const [senha, setSenha] = useState("");
  const [ok, setOk] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [aba, setAba] = useState("pedidos");
  const [config, setConfig] = useState({ taxaEntrega: 8, aberto: true });

  // CADASTRO
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [desc, setDesc] = useState("");
  const [estoque, setEstoque] = useState("");
  const [img, setImg] = useState(null);
  const [up, setUp] = useState(false);

  // EDITAR - BLINDADO
  const [showEdit, setShowEdit] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const entrar = () => {
    if (senha === SENHA) setOk(true);
    else Alert.alert("Senha errada");
  };

  function resumo(pedido) {
    if (pedido.itens && pedido.itens.length) {
      return pedido.itens
        .map((i) => {
          const q = i.qtd || i.quantidade || 1;
          const n = (i.nome || "ITEM").toUpperCase();
          return q + "x " + n;
        })
        .join("\n");
    }
    return pedido.resumoDetalhado || pedido.resumo || "Sem detalhes";
  }

  useEffect(() => {
    if (!ok) return;
    return onSnapshot(
      query(collection(db, "pedidos"), orderBy("criadoEm", "desc")),
      (s) => setPedidos(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, [ok]);
  useEffect(() => {
    if (!ok) return;
    return onSnapshot(collection(db, "produtos"), (s) =>
      setProdutos(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, [ok]);
  useEffect(() => {
    if (!ok) return;
    return onSnapshot(collection(db, "clientes"), (s) =>
      setClientes(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, [ok]);
  useEffect(() => {
    if (!ok) return;
    return onSnapshot(doc(db, "config", "loja"), (s) => {
      if (s.exists()) setConfig((p) => ({ ...p, ...s.data() }));
    });
  }, [ok]);

  const pickImage = async (isEdit = false) => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!r.canceled) {
      setUp(true);
      const fd = new FormData();
      fd.append("file", {
        uri: r.assets[0].uri,
        type: "image/jpeg",
        name: "p.jpg",
      } as any);
      fd.append("upload_preset", UPLOAD_PRESET);
      try {
        const res = await fetch(
          "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/image/upload",
          { method: "POST", body: fd },
        );
        const data = await res.json();
        if (data.secure_url) {
          if (isEdit)
            setEditItem((prev) => ({ ...prev, imagemURL: data.secure_url }));
          else setImg(data.secure_url);
        }
      } finally {
        setUp(false);
      }
    }
  };

  const salvarProduto = async () => {
    if (!nome || !preco) return Alert.alert("Falta nome/preco");
    const q = Number(estoque) || 0;
    await addDoc(collection(db, "produtos"), {
      nome,
      preco: parseFloat(preco.replace(",", ".")),
      descricao: desc,
      estoque: q,
      imagemURL: img,
      disponivel: q > 0,
      criadoEm: serverTimestamp(),
    });
    setNome("");
    setPreco("");
    setDesc("");
    setEstoque("");
    setImg(null);
    Alert.alert("Produto cadastrado!");
  };

  const abrirEditar = (produto) => {
    setEditItem({ ...produto });
    setShowEdit(true);
  };
  const salvarEdicao = async () => {
    if (!editItem) return;
    const q = Number(editItem.estoque) || 0;
    await updateDoc(doc(db, "produtos", editItem.id), {
      nome: editItem.nome,
      preco: Number(String(editItem.preco).replace(",", ".")),
      descricao: editItem.descricao,
      estoque: q,
      imagemURL: editItem.imagemURL,
      disponivel: q > 0 ? editItem.disponivel : false,
    });
    setShowEdit(false);
    setEditItem(null);
    Alert.alert("Salvo com sucesso!");
  };

  if (!ok) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            width: "90%",
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
            placeholder="Senha"
            placeholderTextColor="#666"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />
          <TouchableOpacity
            onPress={entrar}
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
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Modal
        visible={showEdit}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEdit(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.95)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#1a1a1a",
              padding: 18,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: "#D4AF37",
            }}
          >
            <Text
              style={{
                color: "#D4AF37",
                fontWeight: "900",
                textAlign: "center",
                marginBottom: 12,
                fontSize: 16,
              }}
            >
              EDITAR PRODUTO
            </Text>
            {editItem && (
              <View>
                <Text style={{ color: "#888", fontSize: 10 }}>NOME</Text>
                <TextInput
                  value={editItem.nome}
                  onChangeText={(t) => setEditItem({ ...editItem, nome: t })}
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
                <Text style={{ color: "#888", fontSize: 10 }}>PREÇO</Text>
                <TextInput
                  value={String(editItem.preco)}
                  onChangeText={(t) => setEditItem({ ...editItem, preco: t })}
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
                <Text style={{ color: "#888", fontSize: 10 }}>ESTOQUE</Text>
                <TextInput
                  value={String(editItem.estoque ?? "")}
                  onChangeText={(t) => setEditItem({ ...editItem, estoque: t })}
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
                <Text style={{ color: "#888", fontSize: 10 }}>DESCRIÇÃO</Text>
                <TextInput
                  value={editItem.descricao}
                  onChangeText={(t) =>
                    setEditItem({ ...editItem, descricao: t })
                  }
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
                  onPress={() => pickImage(true)}
                  style={{
                    backgroundColor: "#222",
                    height: 90,
                    borderRadius: 8,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "#333",
                  }}
                >
                  {editItem.imagemURL ? (
                    <Image
                      source={{ uri: editItem.imagemURL }}
                      style={{ width: "100%", height: "100%", borderRadius: 8 }}
                    />
                  ) : (
                    <Text style={{ color: "#888" }}>
                      {up ? "ENVIANDO..." : "TROCAR FOTO"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={salvarEdicao}
                  style={{
                    backgroundColor: "#D4AF37",
                    padding: 14,
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>SALVAR AGORA</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowEdit(false)}
                  style={{
                    backgroundColor: "#333",
                    padding: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: "#fff" }}>CANCELAR</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

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
            fontSize: 18,
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
            flexWrap: "wrap",
          }}
        >
          <TouchableOpacity
            onPress={() => setAba("pedidos")}
            style={{
              flex: 1,
              minWidth: 80,
              padding: 11,
              borderRadius: 10,
              backgroundColor: aba === "pedidos" ? "#D4AF37" : "#222",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "900",
                fontSize: 10,
                color: aba === "pedidos" ? "#000" : "#fff",
              }}
            >
              PEDIDOS ({pedidos.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAba("produtos")}
            style={{
              flex: 1,
              minWidth: 80,
              padding: 11,
              borderRadius: 10,
              backgroundColor: aba === "produtos" ? "#D4AF37" : "#222",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "900",
                fontSize: 10,
                color: aba === "produtos" ? "#000" : "#fff",
              }}
            >
              PRODUTOS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAba("clientes")}
            style={{
              flex: 1,
              minWidth: 80,
              padding: 11,
              borderRadius: 10,
              backgroundColor: aba === "clientes" ? "#D4AF37" : "#222",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "900",
                fontSize: 10,
                color: aba === "clientes" ? "#000" : "#fff",
              }}
            >
              CLIENTES
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAba("config")}
            style={{
              flex: 1,
              minWidth: 80,
              padding: 11,
              borderRadius: 10,
              backgroundColor: aba === "config" ? "#D4AF37" : "#222",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "900",
                fontSize: 10,
                color: aba === "config" ? "#000" : "#fff",
              }}
            >
              CONFIG
            </Text>
          </TouchableOpacity>
        </View>

        {aba === "pedidos" && (
          <View style={{ gap: 12 }}>
            {pedidos.map((p) => (
              <View
                key={p.id}
                style={{
                  backgroundColor: "#1a1a1a",
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#333",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>
                  {p.nome} - R$ {p.total}
                </Text>
                <Text style={{ color: "#888", fontSize: 10 }}>
                  {p.telefone} - {p.endereco}
                </Text>
                <Text
                  style={{
                    color: "#ddd",
                    marginTop: 6,
                    backgroundColor: "#000",
                    padding: 8,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                >
                  {resumo(p)}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const tel = String(
                        p.telefone || p.whatsapp || "",
                      ).replace(/\D/g, "");
                      if (tel) Linking.openURL("https://wa.me/55" + tel);
                    }}
                    style={{
                      backgroundColor: "#25D366",
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontWeight: "900", fontSize: 10 }}
                    >
                      WHATSAPP
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
                CADASTRAR NOVO PRODUTO
              </Text>
              <TouchableOpacity
                onPress={() => pickImage(false)}
                style={{
                  backgroundColor: "#222",
                  height: 100,
                  borderRadius: 10,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: "#333",
                }}
              >
                {img ? (
                  <Image
                    source={{ uri: img }}
                    style={{ width: "100%", height: "100%", borderRadius: 10 }}
                  />
                ) : (
                  <Text style={{ color: "#888" }}>
                    {up ? "ENVIANDO..." : "FOTO DO PRODUTO"}
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
                placeholder="Preco 15.00"
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
                placeholder="Descricao"
                placeholderTextColor="#666"
                value={desc}
                onChangeText={setDesc}
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
                placeholder="Estoque (ex: 20)"
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
                    <Text
                      style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}
                    >
                      {pr.nome}
                    </Text>
                    <Text style={{ color: "#D4AF37" }}>
                      R$ {pr.preco} - EST: {pr.estoque}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => abrirEditar(pr)}
                    style={{
                      backgroundColor: "#D4AF37",
                      padding: 12,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{ color: "#000", fontSize: 11, fontWeight: "900" }}
                    >
                      EDITAR
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (Platform.OS === "web" ? confirm("Apagar?") : true)
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

        {aba === "clientes" && (
          <View style={{ gap: 10 }}>
            {clientes.map((c) => (
              <View
                key={c.id}
                style={{
                  backgroundColor: "#1a1a1a",
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#333",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>
                  {c.nome}
                </Text>
                <Text style={{ color: "#888" }}>{c.telefone}</Text>
                <Text style={{ color: "#888", fontSize: 10 }}>
                  {c.endereco}
                </Text>
              </View>
            ))}
            {clientes.length === 0 && (
              <Text
                style={{ color: "#666", textAlign: "center", marginTop: 20 }}
              >
                Nenhum cliente ainda
              </Text>
            )}
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
              style={{ color: "#D4AF37", fontWeight: "900", marginBottom: 12 }}
            >
              CONFIGURAÇÕES
            </Text>
            <Text style={{ color: "#888", fontSize: 10 }}>TAXA DE ENTREGA</Text>
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
            <TouchableOpacity
              onPress={async () => {
                await setDoc(doc(db, "config", "loja"), config, {
                  merge: true,
                });
                Alert.alert("Salvo");
              }}
              style={{
                backgroundColor: "#D4AF37",
                padding: 14,
                borderRadius: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900" }}>SALVAR CONFIG</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
