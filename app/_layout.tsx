import "react-native-gesture-handler";
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";

import { CarrinhoProvider } from "../src/context/CarrinhoContext";

import { ProdutosProvider } from "../src/context/ProdutosContext";

import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const router = useRouter();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ProdutosProvider>
        <CarrinhoProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Tudo que é Tabs vai ficar sem header aqui */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="detalhe"
              options={{ headerShown: false, presentation: "modal" }}
            />

            {/* A tela Admin vai ter header próprio */}
            <Stack.Screen name="admin" options={{ headerShown: false }} />
          </Stack>
        </CarrinhoProvider>
      </ProdutosProvider>
    </GestureHandlerRootView>
  );
}
