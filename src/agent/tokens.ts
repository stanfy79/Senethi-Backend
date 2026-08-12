export type TokenDefinition = {
  symbol: string;
  address: string;
  decimals: number;
};

const TOKENS: Record<number, Record<string, TokenDefinition>> = {
  // Ethereum Sepolia
  11155111: {
    USDC: {
      symbol: "USDC",
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      decimals: 6,
    },

    // Add more tokens here as needed
    // USDT: {
    //   symbol: "USDT",
    //   address: "...",
    //   decimals: 6,
    // },
  },
};

export function resolveToken(
  chainId: number,
  symbol: string,
): TokenDefinition | null {
  const chainTokens = TOKENS[chainId];

  if (!chainTokens) {
    return null;
  }

  return chainTokens[symbol.toUpperCase()] ?? null;
}

export function listSupportedTokens(chainId: number) {
  return Object.values(TOKENS[chainId] ?? {});
}