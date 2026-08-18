import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Sucesso() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle" size={100} color="#2E7D32" />
      <Text style={styles.titulo}>Pedido Enviado!</Text>
      <Text style={styles.subtitulo}>
        Seu pedido foi enviado para o WhatsApp da MMPAIXÃO.{'\n'}
        Em breve entraremos em contato!
      </Text>
      
      <TouchableOpacity 
        style={styles.btn} 
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.txtBtn}>Voltar para o Catálogo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', padding: 20 },
  titulo: { color: '#D4AF37', fontSize: 28, fontWeight: 'bold', marginTop: 24 },
  subtitulo: { color: '#999', fontSize: 16, textAlign: 'center', marginTop: 16, lineHeight: 24 },
  btn: { backgroundColor: '#D4AF37', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, marginTop: 40 },
  txtBtn: { color: '#000', fontSize: 16, fontWeight: 'bold' }
});