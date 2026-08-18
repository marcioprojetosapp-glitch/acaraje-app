import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";

import {
  Dimensions,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function Home() {
  const router = useRouter();

  // Imagem provisória de um acarajé/culinária baiana de alta qualidade
  const imagemFundo = require("../../assets/images/fundo.png");

  return (
    <View style={styles.containerPrincipal}>
      <ImageBackground
        source={imagemFundo}
        style={styles.background}
        resizeMode="cover"
      >
        {/* O overlay escurece a imagem de fundo para manter as letras legíveis */}
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <TouchableOpacity
                delayLongPress={2000}
                onLongPress={() => router.push("/admin")}
                activeOpacity={1}
              >
                <Text style={styles.titulo}>ACARAJÉ DA BENÇÃO</Text>
              </TouchableOpacity>

              <Text style={styles.subtitulo}>
                O verdadeiro sabor da tradição na sua mesa
              </Text>
            </View>

            <View style={styles.banner}>
              <Ionicons name="restaurant" size={60} color="#D4AF37" />
              <Text style={styles.bannerTxt}>Tradição e Sabor Baiano</Text>
            </View>

            <Link href="/(tabs)/catalogo" asChild>
              <TouchableOpacity style={styles.btnCatalogo}>
                <Ionicons name="grid" size={32} color="#D4AF37" />
                <Text style={styles.btnTitulo}>Ver Cardápio Completo</Text>
                <Text style={styles.btnSubtitulo}>
                  Acarajés, abarás, porções e bebidas
                </Text>
              </TouchableOpacity>
            </Link>

            <View style={styles.cards}>
              <View style={styles.card}>
                <Ionicons name="rocket" size={28} color="#D4AF37" />
                <Text style={styles.cardTxt}>Entrega Rápida</Text>
                <Text style={styles.cardSub}>Santo Amaro e região</Text>
              </View>

              <View style={styles.card}>
                <Ionicons name="flame" size={28} color="#D4AF37" />
                <Text style={styles.cardTxt}>Feito na Hora</Text>
                <Text style={styles.cardSub}>Quentinho e Crocante</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  containerPrincipal: {
    flex: 1,
    backgroundColor: "#111",
  },
  background: {
    width: width,
    height: height,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)", // Deixa a imagem sutilmente ao fundo sem atrapalhar a leitura
  },
  scrollContent: {
    paddingBottom: 100, // Dá espaço extra para rolar e não sumir sob o menu de baixo
  },
  header: {
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 20,
  },
  titulo: {
    color: "#D4AF37",
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 2,
    textAlign: "center",
  },
  subtitulo: {
    color: "#fff",
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 15,
    fontWeight: "500",
  },
  banner: {
    alignItems: "center",
    marginVertical: 25,
  },
  bannerTxt: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
  },
  btnCatalogo: {
    backgroundColor: "rgba(0,0,0,0.85)",
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#D4AF37",
    alignItems: "center",
  },
  btnTitulo: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
  },
  btnSubtitulo: {
    color: "#ccc",
    fontSize: 14,
    marginTop: 4,
  },
  cards: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  cardTxt: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
  },
  cardSub: {
    color: "#ccc",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
