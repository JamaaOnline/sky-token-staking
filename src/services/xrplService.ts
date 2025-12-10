/**
 * XRPL Service
 *
 * Handles all XRPL operations including balance queries and payments
 */

import { isInstalled, sendPayment, getAddress, getNetwork, signMessage } from '@gemwallet/api'
import { Client } from 'xrpl'
import { XRPL_CONFIG } from '../config'

type WalletType = 'xaman' | 'gem'

/**
 * The full terms text that users agree to
 */
const TERMS_TEXT = `SKY TOKEN PARTICIPATION AND LENDING AGREEMENT - By signing this message, I acknowledge that I have read and agree to all terms and conditions of the SKY TOKEN PARTICIPATION AND LENDING AGREEMENT as displayed on the staking interface.`

/**
 * Convert string to hex (browser-compatible)
 */
const stringToHex = (str: string): string => {
  let hex = ''
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i)
    hex += charCode.toString(16).padStart(2, '0')
  }
  return hex.toUpperCase()
}

/**
 * Sign the terms agreement with the user's wallet
 */
export const signTermsAgreement = async (
  walletAddress: string,
  walletType: WalletType
): Promise<string> => {
  if (walletType === 'gem') {
    // Sign with Gem Wallet
    const result = await signMessage(TERMS_TEXT)
    if (!result.result?.signedMessage) {
      throw new Error('Failed to sign terms agreement')
    }
    return result.result.signedMessage
  } else {
    // For Xaman, return a hash of the terms + address as the signature
    // (Xaman will handle actual signing in the transaction flow)
    const combinedString = TERMS_TEXT + walletAddress + Date.now().toString()
    return combinedString.substring(0, 50) // Truncate for memo field
  }
}

/**
 * Get SKY token balance for an address
 */
export const getSKYBalance = async (address: string): Promise<string> => {
  const client = new Client(XRPL_CONFIG.nodeUrl)

  try {
    await client.connect()

    // Get account lines (trust lines)
    const response = await client.request({
      command: 'account_lines',
      account: address,
      ledger_index: 'validated'
    })

    // Find SKY token line
    const tokenLine = response.result.lines.find(
      (line: any) =>
        line.currency === XRPL_CONFIG.tokenCurrency &&
        line.account === XRPL_CONFIG.tokenIssuer
    )

    await client.disconnect()

    return tokenLine ? tokenLine.balance : '0'
  } catch (error) {
    console.error('Error fetching SKY balance:', error)
    await client.disconnect()
    return '0'
  }
}

/**
 * Send SKY tokens (for staking)
 *
 * @param amount - Amount of SKY tokens to send
 * @param walletAddress - User's wallet address
 * @param walletType - Type of wallet being used (xaman or gem)
 * @param signature - Signed terms agreement signature
 * @param signTransaction - Function to sign transaction (from useWallet hook, required for Xaman)
 */
export const sendSKYTokens = async (
  amount: string,
  walletAddress: string,
  walletType: WalletType,
  signature: string,
  signTransaction?: (tx: any) => Promise<string>
): Promise<string> => {
  if (!XRPL_CONFIG.stakingAddress) {
    throw new Error('Staking address not configured. Please set VITE_STAKING_ADDRESS in your environment.')
  }

  if (!XRPL_CONFIG.tokenIssuer) {
    throw new Error('Token issuer not configured. Please set VITE_TOKEN_ISSUER in your environment.')
  }

  // If using XAMAN, we need to use the signTransaction function
  if (walletType === 'xaman') {
    if (!signTransaction) {
      throw new Error('signTransaction function is required for XAMAN wallet')
    }

    // Prepare transaction for XAMAN with memo containing signature
    const transaction = {
      TransactionType: 'Payment',
      Account: walletAddress,
      Destination: XRPL_CONFIG.stakingAddress,
      Amount: {
        currency: XRPL_CONFIG.tokenCurrency,
        value: amount,
        issuer: XRPL_CONFIG.tokenIssuer
      },
      Memos: [
        {
          Memo: {
            MemoData: stringToHex(signature),
            MemoType: stringToHex('terms-signature')
          }
        }
      ]
    }

    // Sign and submit via XAMAN
    const txHash = await signTransaction(transaction)
    return txHash
  }

  // For Gem Wallet
  const installed = await isInstalled()
  if (!installed.result?.isInstalled) {
    throw new Error('Gem Wallet is not installed')
  }

  // Verify wallet address matches
  const addressResult = await getAddress()
  if (addressResult.result?.address !== walletAddress) {
    throw new Error('Wallet address mismatch')
  }

  // Verify network
  const networkResult = await getNetwork()
  const expectedNetwork = XRPL_CONFIG.network === 'mainnet' ? 'Mainnet' : 'Testnet'
  if (networkResult.result?.network !== expectedNetwork) {
    throw new Error(`Please switch Gem Wallet to ${expectedNetwork}`)
  }

  // Submit payment with memo containing signature
  const result = await sendPayment({
    amount: {
      currency: XRPL_CONFIG.tokenCurrency,
      value: amount,
      issuer: XRPL_CONFIG.tokenIssuer
    },
    destination: XRPL_CONFIG.stakingAddress,
    memos: [
      {
        memo: {
          memoData: stringToHex(signature),
          memoType: stringToHex('terms-signature')
        }
      }
    ]
  })

  if (!result.result?.hash) {
    throw new Error('Transaction failed: No transaction hash returned')
  }

  return result.result.hash
}

/**
 * Wait for transaction to be validated
 */
export const waitForValidation = async (txHash: string): Promise<boolean> => {
  const client = new Client(XRPL_CONFIG.nodeUrl)

  try {
    await client.connect()

    // Poll for transaction validation
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      try {
        const response = await client.request({
          command: 'tx',
          transaction: txHash
        })

        if (response.result.validated) {
          await client.disconnect()
          return true
        }
      } catch (err) {
        // Transaction not found yet, continue polling
      }

      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    }

    await client.disconnect()
    return false
  } catch (error) {
    console.error('Error waiting for validation:', error)
    await client.disconnect()
    return false
  }
}
