import "react-native-gesture-handler";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import { CarrinhoProvider } from "../src/context/CarrinhoContext";
import { ProdutosProvider } from "../src/context/ProdutosContext";

import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ProdutosProvider>
        <CarrinhoProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="detalhe"
              options={{ headerShown: false, presentation: "modal" }}
            />
            <Stack.Screen name="checkout" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="sucesso" options={{ headerShown: false }} />
            <Stack.Screen name="pagamento" options={{ headerShown: false }} />
          </Stack>
        </CarrinhoProvider>
      </ProdutosProvider>
    </GestureHandlerRootView>
  );
}
