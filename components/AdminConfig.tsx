// @ts-nocheck
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Alert,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { db } from "../firebase";

export default function AdminConfig() {
  const [taxa, setTaxa] = useState("8");
  const [tempo, setTempo] = useState("40 a 60 min");
  const [aberto, setAberto] = useState(true);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "config", "loja"));
      if (snap.exists()) {
        const d = snap.data();
        setTaxa(String(d.taxaEntrega ?? 8));
        setTempo(d.tempoMedio ?? "40 a 60 min");
        setAberto(d.aberto ?? true);
      }
    })();
  }, []);

  const salvar = async () => {
    await setDoc(
      doc(db, "config", "loja"),
      {
        taxaEntrega: Number(taxa),
        tempoMedio: tempo,
        aberto,
      },
      { merge: true },
    );
    Alert.alert("Salvo!", `Tempo: ${tempo} | Taxa: R$ ${taxa}`);
  };

  return (
    <View
      style={{
        padding: 20,
        backgroundColor: "#1a1a1a",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D4AF37",
      }}
    >
      <Text
        style={{
          color: "#D4AF37",
          fontWeight: "900",
          fontSize: 18,
          marginBottom: 15,
        }}
      >
        ⚙️ CONFIG LOJA
      </Text>
      <Text style={{ color: "#fff" }}>Taxa R$</Text>
      <TextInput
        value={taxa}
        onChangeText={setTaxa}
        keyboardType="numeric"
        style={{
          backgroundColor: "#000",
          color: "#fff",
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: "#333",
        }}
      />
      <Text style={{ color: "#fff" }}>Tempo</Text>
      <TextInput
        value={tempo}
        onChangeText={setTempo}
        style={{
          backgroundColor: "#000",
          color: "#fff",
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: "#333",
        }}
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Text style={{ color: "#fff" }}>Loja Aberta?</Text>
        <Switch value={aberto} onValueChange={setAberto} />
      </View>
      <TouchableOpacity
        onPress={salvar}
        style={{
          backgroundColor: "#D4AF37",
          padding: 14,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#000", fontWeight: "900" }}>SALVAR</Text>
      </TouchableOpacity>
    </View>
  );
}
