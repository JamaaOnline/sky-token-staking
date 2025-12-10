/**
 * Configuration for SKY Token Staking
 */

// XRPL Configuration
export const XRPL_CONFIG = {
  // XRPL Node WebSocket URL
  nodeUrl: import.meta.env.VITE_XRPL_NODE_URL || 'wss://xrplcluster.com/',

  // SKY Token Configuration
  tokenCurrency: import.meta.env.VITE_TOKEN_CURRENCY || 'SKY',
  tokenIssuer: import.meta.env.VITE_TOKEN_ISSUER || '', // IMPORTANT: Set this to the actual SKY token issuer address

  // Staking/Recipient Address (Pure Sky Registry)
  stakingAddress: import.meta.env.VITE_STAKING_ADDRESS || '', // IMPORTANT: Set this to the Pure Sky Registry address

  // Network
  network: import.meta.env.VITE_XRPL_NETWORK || 'mainnet', // 'testnet' | 'mainnet'
}

// Wallet Configuration
export const WALLET_CONFIG = {
  // Supported wallets
  supportedWallets: ['xaman', 'gem'] as const,

  // Wallet URLs
  walletUrls: {
    xaman: 'https://xaman.app',
    gem: 'https://gemwallet.app',
  },

  // Xumm API Key (get from https://apps.xumm.dev/)
  // Required for Xaman wallet connection
  xummApiKey: import.meta.env.VITE_XUMM_API_KEY || '',
}

// Staking Configuration
export const STAKING_CONFIG = {
  // Staking period in months
  stakingPeriodMonths: 6,

  // Reward description
  rewardDescription: 'PureSky ISO certified carbon credits',
}

// App Configuration
export const APP_CONFIG = {
  name: 'SKY Token Staking - Pure Sky Registry',
  version: '1.0.0',
}

// Export all config as a single object
export const config = {
  xrpl: XRPL_CONFIG,
  wallet: WALLET_CONFIG,
  staking: STAKING_CONFIG,
  app: APP_CONFIG,
}

export default config
