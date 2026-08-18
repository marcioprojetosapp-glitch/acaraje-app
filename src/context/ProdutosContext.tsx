import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type Joia = {
  id: number;
  nome: string;
  preco: number;
  estoque: number;
  imagem: string | null;
};

type ProdutosContextType = {
  produtos: Joia[];
  adicionarProduto: (produto: Omit<Joia, 'id'>) => void;
};

const ProdutosContext = createContext<ProdutosContextType | undefined>(undefined);

export function ProdutosProvider({ children }: { children: ReactNode }) {
  const [produtos, setProdutos] = useState<Joia[]>([]);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    const dados = await AsyncStorage.getItem('@mmpaixao:produtos');
    if (dados) setProdutos(JSON.parse(dados));
  };

  const salvarProdutos = async (novos: Joia[]) => {
    setProdutos(novos);
    await AsyncStorage.setItem('@mmpaixao:produtos', JSON.stringify(novos));
  };

  const adicionarProduto = (produto: Omit<Joia, 'id'>) => {
    const novoId = produtos.length > 0? Math.max(...produtos.map(p => p.id)) + 1 : 1;
    const novoProduto = {...produto, id: novoId };
    salvarProdutos([...produtos, novoProduto]);
  };

  return (
    <ProdutosContext.Provider value={{ produtos, adicionarProduto }}>
      {children}
    </ProdutosContext.Provider>
  );
}

export function useProdutos() {
  const context = useContext(ProdutosContext);
  if (!context) throw new Error('useProdutos deve ser usado dentro de ProdutosProvider');
  return context;
}