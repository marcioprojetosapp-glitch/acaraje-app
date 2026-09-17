// @ts-nocheck
import { createContext, ReactNode, useContext, useState } from "react";

type ItemCarrinho = {
  id?: string;
  itemId?: string;
  idOriginal?: string;
  nome: string;
  preco: any;
  qtd?: number;
  quantidade?: number;
  obs?: string;
  imagem?: string;
  imagemURL?: string;
  adicionais?: any[];
};

type CarrinhoContextType = {
  carrinho: ItemCarrinho[];
  adicionarAoCarrinho: (item: ItemCarrinho) => void;
  removerDoCarrinho: (idOrIndex: any) => void;
  remover: (idOrIndex: any) => void;
  limparCarrinho: () => void;
  aumentarQtd: (id: string) => void;
  diminuirQtd: (id: string) => void;
  aumentar: (id: string) => void;
  diminuir: (id: string) => void;
  total: number;
};

const CarrinhoContext = createContext<CarrinhoContextType>(
  {} as CarrinhoContextType,
);

const parsePreco = (v: any): number => {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace("R$", "").replace(",", ".").trim());
  return isNaN(n) ? 0 : n;
};

const getId = (item: any) => String(item?.itemId || item?.id || "");
const getQtd = (item: any) => Number(item?.quantidade ?? item?.qtd ?? 1) || 1;

const getIdPersonalizado = (item: any) => {
  if (
    item?.id &&
    String(item.id).includes("-") &&
    String(item.id).length > 20
  ) {
    return String(item.id); // já é ID único do detalhe.tsx
  }
  const base = item.itemId || item.id || item.nome || "item";
  const obs = (item.obs || "").trim().toLowerCase();
  const adic = (item.adicionais || []).join("|").toLowerCase();
  return `${base}__${obs}__${adic}`;
};

export const CarrinhoProvider = ({ children }: { children: ReactNode }) => {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);

  const adicionarAoCarrinho = (item: any) => {
    const idPerso = getIdPersonalizado(item);
    const novo = {
      ...item,
      itemId: idPerso,
      id: idPerso,
      idOriginal: item.id,
      preco: parsePreco(item.preco),
      quantidade: item.quantidade || item.qtd || 1,
      qtd: item.quantidade || item.qtd || 1,
      obs: item.obs || "",
      adicionais: item.adicionais || [],
    };
    setCarrinho((prev) => {
      const existe = prev.find((p) => getId(p) === idPerso);
      if (existe) {
        return prev.map((p) =>
          getId(p) === idPerso
            ? {
                ...p,
                quantidade: getQtd(p) + novo.quantidade,
                qtd: getQtd(p) + novo.quantidade,
              }
            : p,
        );
      }
      return [...prev, novo];
    });
  };

  // BLINDADO: aceita tanto ID quanto índice (number)
  const removerDoCarrinho = (idOrIndex: any) => {
    setCarrinho((prev) => {
      if (typeof idOrIndex === "number") {
        return prev.filter((_, i) => i !== idOrIndex);
      }
      const idStr = String(idOrIndex);
      return prev.filter(
        (item) =>
          getId(item) !== idStr && String((item as any).idOriginal) !== idStr,
      );
    });
  };

  const aumentarQtd = (id: string) => {
    setCarrinho((prev) =>
      prev.map((p) =>
        getId(p) === String(id)
          ? { ...p, quantidade: getQtd(p) + 1, qtd: getQtd(p) + 1 }
          : p,
      ),
    );
  };

  const diminuirQtd = (id: string) => {
    setCarrinho((prev) =>
      prev.map((p) => {
        if (getId(p) === String(id)) {
          const nova = getQtd(p) - 1;
          return {
            ...p,
            quantidade: nova < 1 ? 1 : nova,
            qtd: nova < 1 ? 1 : nova,
          };
        }
        return p;
      }),
    );
  };

  const total = carrinho.reduce(
    (acc, item) => acc + parsePreco(item.preco) * getQtd(item),
    0,
  );

  return (
    <CarrinhoContext.Provider
      value={{
        carrinho,
        adicionarAoCarrinho,
        removerDoCarrinho,
        remover: removerDoCarrinho,
        limparCarrinho: () => setCarrinho([]),
        aumentarQtd,
        diminuirQtd,
        aumentar: aumentarQtd,
        diminuir: diminuirQtd,
        total,
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
};

export const useCarrinho = () => useContext(CarrinhoContext);
