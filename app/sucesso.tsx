// @ts-nocheck
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function Sucesso() {
  const router = useRouter();
  const { tipo, total, troco } = useLocalSearchParams();

  const tipoStr = String(tipo || "").toLowerCase();
  const ehDinheiro = tipoStr.includes("dinheir");

  const trocoNum = parseFloat(String(troco || "0").replace(",", "."));
  const totalNum = parseFloat(String(total || "0").replace(",", "."));
  const volta = trocoNum > totalNum ? (trocoNum - totalNum).toFixed(2) : null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
        padding: 30,
      }}
    >
      <Ionicons
        name={ehDinheiro ? "cash-outline" : "checkmark-circle"}
        size={100}
        color={ehDinheiro ? "#FFC107" : "#00b050"}
      />

      <Text
        style={{
          color: "#D4AF37",
          fontSize: 28,
          fontWeight: "900",
          marginTop: 20,
          textAlign: "center",
        }}
      >
        {ehDinheiro ? "PEDIDO RECEBIDO! 🛵" : "PAGO! ✅"}
      </Text>

      {ehDinheiro ? (
        <>
          <Text
            style={{
              color: "#fff",
              marginTop: 20,
              textAlign: "center",
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            Total: R$ {total}
          </Text>
          <Text
            style={{
              color: "#00ff88",
              marginTop: 15,
              textAlign: "center",
              fontSize: 22,
              fontWeight: "900",
            }}
          >
            Troco para R$ {troco} (volta R$ {volta})
          </Text>
          <Text
            style={{
              color: "#fff",
              marginTop: 15,
              textAlign: "center",
              fontSize: 14,
              lineHeight: 22,
            }}
          >
            Tenha R$ {troco} em mãos.{"\n"}O motoboy vai levar R$ {volta} de
            troco.
          </Text>
          <Text
            style={{
              color: "#888",
              marginTop: 10,
              textAlign: "center",
              fontSize: 13,
            }}
          >
            Aguardando confirmação da loja.{"\n"}Você vai acompanhar tudo no
            WhatsApp
          </Text>
        </>
      ) : (
        <Text style={{ color: "#888", marginTop: 20, textAlign: "center" }}>
          Aguardando confirmação da loja.{"\n"}Você vai acompanhar tudo no
          WhatsApp
        </Text>
      )}

      <TouchableOpacity
        onPress={() => router.replace("/(tabs)/catalogo")}
        style={{
          backgroundColor: "#D4AF37",
          padding: 18,
          borderRadius: 12,
          width: "100%",
          alignItems: "center",
          marginTop: 40,
        }}
      >
        <Text style={{ color: "#000", fontWeight: "900" }}>
          VOLTAR AO CARDÁPIO
        </Text>
      </TouchableOpacity>
    </View>
  );
}
