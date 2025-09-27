export type ChainType = "sepolia";

export const CHAIN_ID_SEPOLIA = 11155111 as const;
export const CHAIN_ID = 11155111 as const;

export const CHAIN_ID_BY_KEY: Record<ChainType, number> = {
  sepolia: CHAIN_ID_SEPOLIA,
};
