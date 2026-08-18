import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type Produto = {
  id: string; // firebase é string
  nome: string;
  preco: number;
  imagem: any;
  imagemURL?: string;
  estoque?: number;
  descricao?: string;
  categoria?: string;
};

export type ItemCarrinho = Produto & {
  itemId: string; // CHAVE UNICA: id + adicionais + pimenta + copos
  quantidade: number;
  preco: number; // preco de 1 unidade ja com adicional
  adicionais: string[];
  observacao?: string;
};

type CarrinhoContextType = {
  carrinho: ItemCarrinho[];
  adicionar: (item: ItemCarrinho) => void;
  remover: (itemId: string) => void;
  aumentar: (itemId: string) => void;
  diminuir: (itemId: string) => void;
  limpar: () => void;
  total: number;
  totalItens: number;
};

const CarrinhoContext = createContext<CarrinhoContextType | undefined>(
  undefined,
);
const STORAGE_KEY = "@mmpaixao_carrinho";

export const CarrinhoProvider = ({ children }: { children: ReactNode }) => {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) setCarrinho(JSON.parse(data));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
  }, [carrinho]);

  const adicionar = (novoItem: ItemCarrinho) => {
    setCarrinho((prev) => {
      const existe = prev.find((p) => p.itemId === novoItem.itemId);
      if (existe) {
        return prev.map((p) =>
          p.itemId === novoItem.itemId
            ? { ...p, quantidade: p.quantidade + novoItem.quantidade }
            : p,
        );
      }
      return [...prev, novoItem];
    });
  };

  const remover = (itemId: string) =>
    setCarrinho((prev) => prev.filter((p) => p.itemId !== itemId));

  const aumentar = (itemId: string) => {
    setCarrinho((prev) =>
      prev.map((p) =>
        p.itemId === itemId ? { ...p, quantidade: p.quantidade + 1 } : p,
      ),
    );
  };

  const diminuir = (itemId: string) => {
    setCarrinho((prev) =>
      prev
        .map((p) =>
          p.itemId === itemId ? { ...p, quantidade: p.quantidade - 1 } : p,
        )
        .filter((p) => p.quantidade > 0),
    );
  };

  const limpar = () => setCarrinho([]);
  const total = carrinho.reduce(
    (acc, item) => acc + item.preco * item.quantidade,
    0,
  );
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <CarrinhoContext.Provider
      value={{
        carrinho,
        adicionar,
        remover,
        aumentar,
        diminuir,
        limpar,
        total,
        totalItens,
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
};

export const useCarrinho = () => {
  const context = useContext(CarrinhoContext);
  if (!context)
    throw new Error("useCarrinho deve ser usado dentro do CarrinhoProvider");
  return context;
};
