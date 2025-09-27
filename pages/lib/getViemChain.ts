import { sepolia } from "viem/chains";
import type { ChainType } from "./chain";

export const getViemChain = (_: ChainType) => sepolia;
