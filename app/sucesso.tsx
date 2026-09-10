// @ts-nocheck
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function Sucesso() {
  const router = useRouter();
  const { tipo, total } = useLocalSearchParams();
  const ehRetirada = tipo === "retirada";

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
        name={ehRetirada ? "storefront" : "checkmark-circle"}
        size={100}
        color={ehRetirada ? "#D4AF37" : "#00b050"}
      />
      <Text
        style={{
          color: "#D4AF37",
          fontSize: 30,
          fontWeight: "900",
          marginTop: 20,
          textAlign: "center",
        }}
      >
        {ehRetirada ? "PEDIDO CONFIRMADO!" : "PAGO! ✅"}
      </Text>

      {total ? (
        <Text
          style={{
            color: "#fff",
            marginTop: 20,
            textAlign: "center",
            fontSize: 16,
          }}
        >
          R$ {total} - {ehRetirada ? "Retirada Grátis" : "Entrega"}
        </Text>
      ) : (
        <Text
          style={{
            color: "#fff",
            marginTop: 20,
            textAlign: "center",
            fontSize: 16,
            lineHeight: 22,
          }}
        >
          Pagamento confirmado!{"\n"}Estamos preparando seu pedido 😋
        </Text>
      )}

      <Text
        style={{
          color: "#888",
          marginTop: 10,
          textAlign: "center",
          fontSize: 13,
        }}
      >
        Você vai acompanhar tudo no WhatsApp
      </Text>

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
        <Text style={{ color: "#000", fontWeight: "900", fontSize: 16 }}>
          VOLTAR AO CARDÁPIO
        </Text>
      </TouchableOpacity>
    </View>
  );
}
