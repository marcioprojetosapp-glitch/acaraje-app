import { db } from "@/src/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Produto = {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  categoria: string;
  descricao: string;
  imagemURL: string;
};

export default function Admin() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [estoque, setEstoque] = useState("");
  const [categoria, setCategoria] = useState("PRATO");
  const [descricao, setDescricao] = useState("");
  const [imagem, setImagem] = useState<string | null>(null);

  const [modoEdicao, setModoEdicao] = useState(false);
  const [produtoEditandoId, setProdutoEditandoId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    carregarProdutos();
    pedirPermissaoGaleria();
  }, []);

  async function pedirPermissaoGaleria() {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted")
        Alert.alert("Permissão", "Precisamos de acesso à galeria!");
    }
  }

  async function carregarProdutos() {
    const snap = await getDocs(collection(db, "produtos"));
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Produto);
    setProdutos(lista);
  }

  async function selecionarImagem() {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      base64: false,
      allowsEditing: true,
    });
    if (!result.canceled) setImagem(result.assets[0].uri);
  }

  async function trocarFotoDireto(id: string) {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      base64: false,
      allowsEditing: true,
    });
    if (!result.canceled) {
      await updateDoc(doc(db, "produtos", id), {
        imagemURL: result.assets[0].uri,
      });
      Alert.alert("Sucesso", "Foto atualizada!");
      carregarProdutos();
    }
  }

  function limparFormulario() {
    setNome("");
    setPreco("");
    setEstoque("");
    setDescricao("");
    setImagem(null);
    setCategoria("PRATO");
    setModoEdicao(false);
    setProdutoEditandoId(null);
  }

  function entrarEmEdicao(produto: Produto) {
    setModoEdicao(true);
    setProdutoEditandoId(produto.id);
    setNome(produto.nome);
    setPreco(String(produto.preco));
    setEstoque(String(produto.estoque));
    setCategoria(produto.categoria.toUpperCase());
    setDescricao(produto.descricao);
    setImagem(produto.imagemURL);
  }

  async function salvarProduto() {
    if (!nome || !preco || !estoque || !imagem)
      return Alert.alert("Erro", "Preencha todos os campos *");
    const dados = {
      nome,
      preco: Number(preco),
      estoque: Number(estoque),
      categoria: categoria.toLowerCase(),
      descricao,
      imagemURL: imagem,
    };

    if (modoEdicao && produtoEditandoId) {
      await updateDoc(doc(db, "produtos", produtoEditandoId), dados);
      Alert.alert("Sucesso", "Produto atualizado!");
    } else {
      await addDoc(collection(db, "produtos"), dados);
      Alert.alert("Sucesso", "Produto cadastrado!");
    }

    limparFormulario();
    carregarProdutos();
  }

  async function deletarProduto(id: string) {
    await deleteDoc(doc(db, "produtos", id));
    carregarProdutos();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView>
        <Text style={styles.titulo}>Painel do Administrador</Text>

        <View style={styles.card}>
          <Text style={styles.subtitulo}>
            {modoEdicao ? "Editando Produto" : "Cadastro de Novo Produto"}
          </Text>

          {imagem ? (
            <Image
              source={{ uri: imagem }}
              style={{
                width: "100%",
                height: 120,
                borderRadius: 8,
                marginBottom: 10,
              }}
            />
          ) : null}

          <TextInput
            placeholder="Nome do Produto *"
            placeholderTextColor="#888"
            style={styles.input}
            value={nome}
            onChangeText={setNome}
          />

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TextInput
              placeholder="Preço R$ *"
              placeholderTextColor="#888"
              style={[styles.input, { width: "48%" }]}
              value={preco}
              onChangeText={setPreco}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Estoque *"
              placeholderTextColor="#888"
              style={[styles.input, { width: "48%" }]}
              value={estoque}
              onChangeText={setEstoque}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.label}>Categoria</Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            {["PRATO", "BEBIDA", "OUTRO"].map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.btnCat, categoria === c && styles.btnCatAtivo]}
                onPress={() => setCategoria(c)}
              >
                <Text style={styles.btnCatTxt}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.btnImagem} onPress={selecionarImagem}>
            <Ionicons name="image" size={20} color="#000" />
            <Text style={styles.btnImagemTxt}>
              {imagem ? "Trocar Imagem *" : "Selecionar da Galeria *"}
            </Text>
          </TouchableOpacity>

          <TextInput
            placeholder="Descrição / Ingredientes"
            placeholderTextColor="#888"
            style={[styles.input, { height: 80 }]}
            value={descricao}
            onChangeText={setDescricao}
            multiline
          />

          <TouchableOpacity style={styles.btnCadastrar} onPress={salvarProduto}>
            <Text style={styles.btnCadastrarTxt}>
              {modoEdicao ? "Salvar Alterações" : "Cadastrar no Cardápio"}
            </Text>
          </TouchableOpacity>

          {modoEdicao ? (
            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={limparFormulario}
            >
              <Text style={styles.btnCancelarTxt}>Cancelar Edição</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text
          style={styles.tituloLista}
        >{`Produtos Ativos: ${produtos.length}`}</Text>

        <FlatList
          data={produtos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Image source={{ uri: item.imagemURL }} style={styles.itemImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemNome}>{item.nome.toUpperCase()}</Text>
                <Text
                  style={styles.itemInfo}
                >{`R$ ${item.preco.toFixed(2)} | Estoque: ${item.estoque} | ${item.categoria}`}</Text>
                <View style={{ flexDirection: "row", marginTop: 6 }}>
                  <TouchableOpacity
                    style={styles.btnEditar}
                    onPress={() => entrarEmEdicao(item)}
                  >
                    <Text style={styles.btnEditarTxt}>Editar</Text>
                  </TouchableOpacity>
                  <View style={{ width: 8 }} />
                  <TouchableOpacity
                    style={styles.btnFoto}
                    onPress={() => trocarFotoDireto(item.id)}
                  >
                    <Text style={styles.btnFotoTxt}>Trocar Foto</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity onPress={() => deletarProduto(item.id)}>
                <Ionicons name="trash" size={24} color="red" />
              </TouchableOpacity>
            </View>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000", padding: 16 },
  titulo: {
    color: "#D4AF37",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#1a1a1a",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  subtitulo: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#2a2a2a",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  label: { color: "#fff", fontWeight: "bold", marginBottom: 6 },
  btnCat: {
    width: "32%",
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnCatAtivo: { backgroundColor: "#D4AF37" },
  btnCatTxt: { color: "#fff", fontWeight: "bold" },
  btnImagem: {
    backgroundColor: "#D4AF37",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  btnImagemTxt: { color: "#000", fontWeight: "bold", marginLeft: 8 },
  btnCadastrar: {
    backgroundColor: "#D4AF37",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
  },
  btnCadastrarTxt: { color: "#000", fontWeight: "bold", fontSize: 16 },
  btnCancelar: {
    backgroundColor: "#444",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  btnCancelarTxt: { color: "#fff", fontWeight: "bold" },
  tituloLista: {
    color: "#D4AF37",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  item: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  itemImg: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  itemNome: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  itemInfo: { color: "#aaa", fontSize: 12 },
  btnEditar: {
    backgroundColor: "#D4AF37",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnEditarTxt: { color: "#000", fontWeight: "bold", fontSize: 12 },
  btnFoto: {
    backgroundColor: "#D4AF37",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnFotoTxt: { color: "#000", fontWeight: "bold", fontSize: 12 },
});
