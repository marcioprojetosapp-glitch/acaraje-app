import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
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
  const imagemFundo = require("../../assets/images/fundo.png");

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.11,
          duration: 900,
          useNativeDriver: true, // SÓ ESCALA USA NATIVA
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false, // COR NÃO PODE SER NATIVA
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.containerPrincipal}>
      <ImageBackground
        source={imagemFundo}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <TouchableOpacity
                delayLongPress={2000}
                onLongPress={() => router.push("/admin")}
                activeOpacity={1}
              >
                <Text style={styles.titulo}>{`ACARAJÉ\nDA BENÇÃO`}</Text>
              </TouchableOpacity>
              <Text style={styles.subtitulo}>
                O verdadeiro sabor da tradição na sua mesa
              </Text>
            </View>

            <View style={styles.banner}>
              <Ionicons name="restaurant" size={60} color="#D4AF37" />
              <Text style={styles.bannerTxt}>Tradição e Sabor Baiano</Text>
            </View>

            {/* CORREÇÃO: SEPAREI EM 2 VIEWS PRA NÃO DAR CONFLITO */}
            <Animated.View
              style={[styles.btnWrapper, { transform: [{ scale: pulseAnim }] }]}
            >
              <Animated.View
                style={[
                  styles.btnWrapperGlow,
                  {
                    borderColor: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        "rgba(212,175,55,0.4)",
                        "rgba(255,215,0,1)",
                      ],
                    }),
                    backgroundColor: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["#D4AF37", "#FFD700"],
                    }),
                  },
                ]}
              >
                <Link href="/(tabs)/catalogo" asChild>
                  <TouchableOpacity
                    style={styles.btnCatalogo}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="grid" size={42} color="#000" />
                    <Text style={styles.btnTitulo}>Ver Cardápio Completo</Text>
                    <Text style={styles.btnSubtitulo}>
                      Acarajés, abarás, porções e bebidas
                    </Text>
                  </TouchableOpacity>
                </Link>
              </Animated.View>
            </Animated.View>

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
  containerPrincipal: { flex: 1, backgroundColor: "#111" },
  background: { width: width, height: height },
  overlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.60)" },
  scrollContent: { paddingBottom: 100 },
  header: {
    alignItems: "center",
    paddingTop: 70,
    paddingBottom: 10,
    paddingHorizontal: 15,
  },
  titulo: {
    color: "#D4AF37",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
    lineHeight: 52,
    textTransform: "uppercase",
    includeFontPadding: false,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  subtitulo: {
    color: "#fff",
    fontSize: 16,
    marginTop: 14,
    textAlign: "center",
    paddingHorizontal: 15,
    fontWeight: "500",
  },
  banner: { alignItems: "center", marginVertical: 20 },
  bannerTxt: {
    color: "#D4AF37",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
  },
  btnWrapper: {
    marginHorizontal: 20,
    borderRadius: 22,
  },
  btnWrapperGlow: {
    borderRadius: 20,
    borderWidth: 3,
    elevation: 15,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  btnCatalogo: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  btnTitulo: {
    color: "#000",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  btnSubtitulo: {
    color: "#222",
    fontSize: 15,
    marginTop: 6,
    fontWeight: "600",
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
