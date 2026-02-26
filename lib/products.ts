export interface FlyGoldPackage {
  id: string
  name: string
  description: string
  flygoldAmount: number
  priceInCents: number
}

export const FLYGOLD_PACKAGES: FlyGoldPackage[] = [
  {
    id: "flygold-100",
    name: "100 FlyGold",
    description: "Pacote inicial com 100 moedas FlyGold",
    flygoldAmount: 100,
    priceInCents: 100,
  },
  {
    id: "flygold-500",
    name: "500 FlyGold",
    description: "Pacote médio com 500 moedas FlyGold + 10% bônus",
    flygoldAmount: 550,
    priceInCents: 500,
  },
  {
    id: "flygold-1000",
    name: "1.000 FlyGold",
    description: "Pacote grande com 1000 moedas FlyGold + 20% bônus",
    flygoldAmount: 1200,
    priceInCents: 1000,
  },
  {
    id: "flygold-5000",
    name: "5.000 FlyGold",
    description: "Pacote mega com 5000 moedas FlyGold + 30% bônus",
    flygoldAmount: 6500,
    priceInCents: 5000,
  },
]
