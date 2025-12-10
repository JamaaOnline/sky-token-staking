import { useState, useEffect } from 'react'
import { isInstalled, getAddress, getNetwork } from '@gemwallet/api'
import { XummPkce } from 'xumm-oauth2-pkce'
import './App.css'
import { XRPL_CONFIG, WALLET_CONFIG, STAKING_CONFIG } from './config'
import { getSKYBalance, sendSKYTokens, signTermsAgreement } from './services/xrplService'

// Type for Xumm SDK
type XummSdk = any

interface WalletState {
  connected: boolean
  address: string
  balance: string
  walletType: 'gem' | 'xaman' | null
}

function App() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: '',
    balance: '0',
    walletType: null,
  })
  const [stakeAmount, setStakeAmount] = useState<string>('0')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [xummSdk, setXummSdk] = useState<XummSdk | null>(null)

  /**
   * Logout and reset wallet state
   */
  const handleLogout = () => {
    setWallet({
      connected: false,
      address: '',
      balance: '0',
      walletType: null,
    })
    setStakeAmount('0')
    setTermsAccepted(false)
    setError('')
    setSuccess('')
    setXummSdk(null)
  }

  /**
   * Connect to Gem Wallet
   */
  const connectGemWallet = async () => {
    setLoading(true)
    setError('')
    try {
      // Check if Gem Wallet is installed using the API
      const installedCheck = await isInstalled()
      console.log('Gem Wallet isInstalled check:', installedCheck)

      if (!installedCheck.result?.isInstalled) {
        // Extension not found - redirect to download
        window.open('https://gemwallet.app', '_blank')
        setError('Gem Wallet not found. Please install the browser extension.')
        setLoading(false)
        return
      }

      // Get wallet address
      const addressResult = await getAddress()
      if (!addressResult.result?.address) {
        setError('Failed to get wallet address. Please unlock Gem Wallet.')
        setLoading(false)
        return
      }
      const address = addressResult.result.address

      // Verify network matches configuration
      const networkResult = await getNetwork()
      const network = networkResult.result?.network
      const expectedNetwork = XRPL_CONFIG.network === 'mainnet' ? 'Mainnet' : 'Testnet'

      if (network !== expectedNetwork) {
        setError(`Please switch Gem Wallet to ${expectedNetwork}`)
        setLoading(false)
        return
      }

      // Fetch actual balance from XRPL
      let balance = '0'
      try {
        balance = await getSKYBalance(address)
      } catch (err) {
        console.error('Failed to fetch balance:', err)
        // Continue with 0 balance rather than blocking connection
      }

      setWallet({
        address,
        balance,
        connected: true,
        walletType: 'gem',
      })
      setStakeAmount(balance)
    } catch (err: any) {
      setError(`Failed to connect to Gem Wallet: ${err.message || 'Unknown error'}`)
      console.error('Gem Wallet connection error:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Connect to Xaman wallet via QR code or deep link
   */
  const connectXamanWallet = async () => {
    setLoading(true)
    setError('')

    try {
      if (!WALLET_CONFIG.xummApiKey) {
        setError('Xumm API key not configured. Please add VITE_XUMM_API_KEY to .env file.')
        setLoading(false)
        return
      }

      // Initialize Xumm PKCE client
      const xumm = new XummPkce(WALLET_CONFIG.xummApiKey, {
        redirectUrl: window.location.origin,
        rememberJwt: true
      })

      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      console.log('Is mobile:', isMobile, 'User agent:', navigator.userAgent)

      // Authorize (on mobile, opens Xaman app directly; on desktop, shows QR code)
      const resolvedFlow = await xumm.authorize()

      console.log('Xumm authorization:', resolvedFlow)

      if (!resolvedFlow || !resolvedFlow.me) {
        setError('Xumm authorization failed. Please try again.')
        setLoading(false)
        return
      }

      // Get user account from resolved flow
      const userAccount = resolvedFlow.me.account

      if (!userAccount) {
        setError('Failed to get account from Xumm.')
        setLoading(false)
        return
      }

      // The SDK is available from the resolvedFlow for transaction signing
      if (resolvedFlow.sdk) {
        setXummSdk(resolvedFlow.sdk)
      }

      // Fetch token balance
      let balance = '0'
      try {
        balance = await getSKYBalance(userAccount)
      } catch (err) {
        console.error('Failed to fetch balance:', err)
        // Continue with 0 balance rather than blocking connection
      }

      setWallet({
        address: userAccount,
        balance,
        connected: true,
        walletType: 'xaman',
      })
      setStakeAmount(balance)
    } catch (err: any) {
      console.error('Xaman connection error:', err)
      setError(`Failed to connect to Xaman: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign and submit transaction with Xaman
   */
  const signTransactionWithXaman = async (transaction: any): Promise<string> => {
    console.log('signTransactionWithXaman called')
    console.log('xummSdk:', xummSdk)
    console.log('xummSdk.payload:', xummSdk?.payload)

    if (!xummSdk) {
      throw new Error('Xaman SDK not initialized. Please reconnect your wallet.')
    }

    if (!xummSdk.payload || !xummSdk.payload.create) {
      throw new Error('Xaman SDK payload methods not available. Please reconnect your wallet.')
    }

    try {
      console.log('Creating Xaman payload for transaction:', transaction)

      // Create payload for XAMAN to sign
      const payload = await xummSdk.payload.create({
        txjson: transaction
      })

      console.log('Xaman payload created:', payload)

      if (!payload || !payload.uuid) {
        throw new Error('Failed to create Xaman signing request')
      }

      // Check if we're on mobile - redirect to Xaman app
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      if (isMobile && payload.next && payload.next.always) {
        console.log('Opening Xaman app with deep link:', payload.next.always)
        // On iOS, this will open Safari. Users should use Safari for mobile signing.
        window.location.href = payload.next.always
      } else {
        console.log('Desktop mode - QR Code:', payload.refs?.qr_png)
      }

      // Subscribe to payload to wait for user signature
      const subscription = await xummSdk.payload.subscribe(payload.uuid)

      return new Promise((resolve, reject) => {
        subscription.websocket.onmessage = (msg: any) => {
          try {
            const data = JSON.parse(msg.data.toString())
            console.log('Xaman websocket message:', data)

            // Check if transaction was signed
            if (typeof data.signed === 'boolean') {
              if (data.signed === true) {
                // Transaction signed successfully
                console.log('Transaction signed! TX ID:', data.txid)
                resolve(data.txid)
                subscription.resolve()
              } else {
                // User rejected the transaction
                console.log('Transaction rejected by user')
                reject(new Error('Transaction was rejected by user'))
                subscription.resolve()
              }
            }
          } catch (e) {
            console.error('Error parsing websocket message:', e)
          }
        }

        subscription.websocket.onerror = (error: any) => {
          console.error('Xaman websocket error:', error)
          reject(new Error('Failed to communicate with Xaman'))
          subscription.resolve()
        }

        // Add timeout in case websocket doesn't respond
        setTimeout(() => {
          reject(new Error('Transaction signing timed out. Please try again.'))
          subscription.resolve()
        }, 120000) // 2 minute timeout
      })
    } catch (err: any) {
      console.error('Xaman signing error:', err)
      throw new Error(err.message || 'Failed to sign transaction with Xaman')
    }
  }

  /**
   * Handle staking submission
   */
  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!termsAccepted) {
      setError('Please accept the terms and conditions to continue')
      return
    }

    if (!wallet.connected) {
      setError('Please connect your wallet first')
      return
    }

    if (parseFloat(wallet.balance) === 0) {
      setError('You have no SKY tokens to stake')
      return
    }

    if (!XRPL_CONFIG.stakingAddress) {
      setError('Staking address not configured. Please contact support.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // Validate stake amount
      const amount = parseFloat(stakeAmount)
      const maxAmount = parseFloat(wallet.balance)

      if (amount <= 0) {
        setError('Please enter a valid amount greater than 0')
        setLoading(false)
        return
      }

      if (amount > maxAmount) {
        setError(`Amount exceeds your balance of ${wallet.balance} SKY`)
        setLoading(false)
        return
      }

      // Sign the terms agreement
      let signature: string
      try {
        signature = await signTermsAgreement(wallet.address, wallet.walletType!)
      } catch (err: any) {
        setError(`Failed to sign terms agreement: ${err.message || 'Unknown error'}`)
        setLoading(false)
        return
      }

      // Send SKY tokens with signature in memo
      const txHash = await sendSKYTokens(
        stakeAmount,
        wallet.address,
        wallet.walletType!,
        signature,
        wallet.walletType === 'xaman' ? signTransactionWithXaman : undefined
      )

      setSuccess(
        `Successfully staked ${stakeAmount} SKY tokens! Transaction hash: ${txHash}`
      )

      // Refresh balance
      const newBalance = await getSKYBalance(wallet.address)
      setWallet(prev => ({
        ...prev,
        balance: newBalance,
      }))
      setStakeAmount(newBalance)
    } catch (err: any) {
      setError(`Transaction failed: ${err.message || 'Unknown error'}`)
      console.error('Staking error:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Check for existing wallet connection on mount
   */
  useEffect(() => {
    // For Gem Wallet, we can check if it's already connected
    const checkGemWallet = async () => {
      try {
        const installed = await isInstalled()
        if (installed.result?.isInstalled) {
          // Gem Wallet doesn't persist connection state automatically
          // User needs to click connect each time
        }
      } catch (err) {
        console.error('Error checking Gem Wallet:', err)
      }
    }

    // Check if returning from Xaman authorization
    const checkXamanReturn = async () => {
      try {
        if (!WALLET_CONFIG.xummApiKey) return

        const xumm = new XummPkce(WALLET_CONFIG.xummApiKey, {
          redirectUrl: window.location.origin,
          rememberJwt: true
        })

        // Check if we're in the middle of an OAuth callback
        // The URL will have OAuth parameters if returning from Xaman
        const urlParams = new URLSearchParams(window.location.search)
        const hasOAuthParams = urlParams.has('code') || urlParams.has('state') || urlParams.has('oauth_token')

        console.log('URL params:', window.location.search, 'Has OAuth params:', hasOAuthParams)

        if (hasOAuthParams) {
          // We're returning from OAuth, need to complete the authorization
          setLoading(true)
          console.log('Completing OAuth authorization...')

          try {
            const resolvedFlow = await xumm.authorize()
            console.log('OAuth resolved flow:', resolvedFlow)
            console.log('resolvedFlow.me:', resolvedFlow?.me)
            console.log('resolvedFlow.sdk:', resolvedFlow?.sdk)

            if (resolvedFlow && resolvedFlow.me && resolvedFlow.me.account) {
              const userAccount = resolvedFlow.me.account

              // Fetch token balance
              let balance = '0'
              try {
                balance = await getSKYBalance(userAccount)
              } catch (err) {
                console.error('Failed to fetch balance:', err)
              }

              setWallet({
                address: userAccount,
                balance,
                connected: true,
                walletType: 'xaman',
              })
              setStakeAmount(balance)
              setXummSdk(resolvedFlow.sdk)

              // Clean up URL
              window.history.replaceState({}, document.title, window.location.pathname)
            } else {
              const debugInfo = {
                hasResolvedFlow: !!resolvedFlow,
                hasMe: !!resolvedFlow?.me,
                hasAccount: !!resolvedFlow?.me?.account,
                resolvedFlowKeys: resolvedFlow ? Object.keys(resolvedFlow) : [],
                meKeys: resolvedFlow?.me ? Object.keys(resolvedFlow.me) : []
              }
              console.error('OAuth resolved but missing account data:', debugInfo)
              setError(`Failed to get account from Xaman. Debug: ${JSON.stringify(debugInfo, null, 2)}`)
            }
          } catch (err: any) {
            console.error('Error completing OAuth:', err)
            console.error('Error details:', err.message, err.stack)
            const errorDetails = {
              message: err.message,
              name: err.name,
              stack: err.stack?.split('\n').slice(0, 3).join(' | ')
            }
            setError(`OAuth Error: ${JSON.stringify(errorDetails, null, 2)}`)
          } finally {
            setLoading(false)
          }
          return
        }

        // Check if we have stored JWT from previous authorization
        const state = await xumm.state()
        console.log('Xaman state on mount:', state)

        if (state && state.me && state.me.account) {
          // User was previously authorized, reconnect
          setLoading(true)
          const userAccount = state.me.account

          // Fetch token balance
          let balance = '0'
          try {
            balance = await getSKYBalance(userAccount)
          } catch (err) {
            console.error('Failed to fetch balance:', err)
          }

          setWallet({
            address: userAccount,
            balance,
            connected: true,
            walletType: 'xaman',
          })
          setStakeAmount(balance)
          setXummSdk(state.sdk)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error checking Xaman state:', err)
      }
    }

    checkGemWallet()
    checkXamanReturn()
  }, [])

  return (
    <div className="app-container">
      <div className="logo-container">
        <img src="/logo.png" alt="Pure Sky Registry" className="logo" />
      </div>

      <div className="card">
        <h1 className="card-title">SKY Token Staking Program</h1>
        <p className="card-subtitle">
          Stake your SKY tokens and earn {STAKING_CONFIG.rewardDescription}
        </p>

        <div className="info-box">
          <h3>About This Program</h3>
          <p>
            With this form, you can stake your SKY tokens for a period of {STAKING_CONFIG.stakingPeriodMonths} months
            and earn {STAKING_CONFIG.rewardDescription} at the end of the staking period.
          </p>
          <strong>
            Important: This is not staked to a smart contract but a lending to the Pure Sky Registry.
          </strong>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="wallet-section">
          <h3 style={{ marginBottom: '1rem', color: '#1f2b43' }}>Connect Your Wallet</h3>
          <div className="wallet-buttons">
            <button
              className={`wallet-button ${wallet.walletType === 'gem' ? 'connected' : ''}`}
              onClick={connectGemWallet}
              disabled={loading || (wallet.connected && wallet.walletType !== 'gem')}
            >
              {wallet.walletType === 'gem' ? '✓ Gem Wallet' : 'Connect Gem Wallet'}
            </button>
            <button
              className={`wallet-button ${wallet.walletType === 'xaman' ? 'connected' : ''}`}
              onClick={connectXamanWallet}
              disabled={loading || (wallet.connected && wallet.walletType !== 'xaman')}
            >
              {wallet.walletType === 'xaman' ? '✓ Xaman' : 'Connect Xaman'}
            </button>
          </div>

          {wallet.connected && (
            <div className="wallet-info">
              <p><strong>Connected:</strong> {wallet.walletType === 'gem' ? 'Gem Wallet' : 'Xaman'}</p>
              <p><strong>Address:</strong> {wallet.address.substring(0, 8)}...{wallet.address.substring(wallet.address.length - 6)}</p>
              <button
                className="logout-button"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {wallet.connected && (
          <>
            <div className="balance-display">
              <div className="balance-label">Your SKY Token Balance</div>
              <div className="balance-amount">{wallet.balance} SKY</div>
            </div>

            <form onSubmit={handleStake}>
              <div className="form-group">
                <label htmlFor="stakeAmount">Amount to Stake (SKY)</label>
                <input
                  type="number"
                  id="stakeAmount"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  min="0"
                  max={wallet.balance}
                  step="0.000001"
                  placeholder="Enter amount"
                />
                <input
                  type="range"
                  className="stake-slider"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  min="0"
                  max={wallet.balance}
                  step="0.000001"
                />
                <div className="slider-labels">
                  <span>0 SKY</span>
                  <span>{wallet.balance} SKY</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="stakingAddress">Staking Address (Pure Sky Registry)</label>
                <input
                  type="text"
                  id="stakingAddress"
                  value={XRPL_CONFIG.stakingAddress || 'Not configured - please contact support'}
                  readOnly
                />
              </div>

              <div className="terms-section">
                <h3>Terms and Conditions</h3>
                <div className="terms-content">
                  <p><strong>SKY TOKEN PARTICIPATION AND LENDING AGREEMENT</strong></p>
                  <p><strong>IMPORTANT: BY TRANSFERRING SKY TOKENS TO THE DESIGNATED WALLET ADDRESS, YOU ("PARTICIPANT") IRREVOCABLY AGREE TO THESE BINDING TERMS AND CONDITIONS. IF YOU DO NOT AGREE, DO NOT TRANSFER TOKENS.</strong></p>

                  <p><strong>1. Nature of Transaction: Transfer of Title</strong></p>
                  <p>Participant acknowledges and agrees that this program is not a smart contract staking mechanism, a custodial wallet service, nor an escrow arrangement.</p>
                  <p><strong>Transfer of Ownership:</strong> Upon sending SKY tokens ("Principal") to the Company, Participant transfers full legal and beneficial title and ownership of said tokens to Pure Sky Registry LLC.</p>
                  <p><strong>Unsecured Lending:</strong> This transaction constitutes an unsecured loan from the Participant to the Company. Participant acknowledges they are an unsecured creditor of the Company and bear the credit risk associated with the Company.</p>
                  <p><strong>No Fiduciary Duty:</strong> The Company owes no fiduciary duties, custodial duties, or duty of care to the Participant regarding the Principal during the Lock-up Period.</p>

                  <p><strong>2. Lock-Up Period and Irrevocability</strong></p>
                  <p><strong>Duration:</strong> The Principal shall be locked for a mandatory minimum period of six (6) months ("Lock-up Period"), commencing on the timestamp of the blockchain transaction receipt.</p>
                  <p><strong>No Early Withdrawals:</strong> Participant explicitly waives any right to demand, request, or access the Principal or any associated rewards prior to the expiration of the Lock-up Period. The Company is under no obligation to process early returns under any circumstances.</p>

                  <p><strong>3. Rewards and Distributions</strong></p>
                  <p>At the conclusion of the Lock-up Period, the Company intends to return the Principal and distribute rewards ("Rewards") subject to the following absolute conditions:</p>
                  <p><strong>Form of Reward:</strong> Rewards shall consist exclusively of ISO-certified carbon credits selected by the Company.</p>
                  <p><strong>Sole Discretion on Allocation:</strong> The specific type, vintage, source, and quantity of carbon credits, as well as the exchange rate or ratio of SKY Tokens to Carbon Credits, shall be determined solely and exclusively by Pure Sky Registry LLC. The Company makes no guarantee regarding the market value, liquidity, or utility of the carbon credits provided.</p>
                  <p><strong>Right of Substitution:</strong> The Company reserves the right to substitute the specific Carbon Credits with other assets or credits of its choosing should availability or market conditions change, without prior consent from the Participant.</p>

                  <p><strong>4. Proof of Participation (NFT Receipt)</strong></p>
                  <p><strong>Issuance:</strong> The Company will endeavor to issue a non-fungible token ("NFT Receipt") to the Participant's wallet address within seven (7) days of the receipt of Principal.</p>
                  <p><strong>Nature of Receipt:</strong> This NFT Receipt serves strictly as a proof of administrative record and holds no inherent monetary value, voting rights, or ownership rights in the Company.</p>
                  <p><strong>Technical Failures:</strong> The Company is not liable for delays in issuance caused by blockchain congestion, gas fees, or technical failures.</p>

                  <p><strong>5. Limitation of Liability and Indemnification</strong></p>
                  <p><strong>Maximum Liability:</strong> To the fullest extent permitted by law, the Company's liability to Participant shall be limited strictly to the return of the specific nominal amount of SKY tokens lent. The Company is not liable for lost profits, loss of value of SKY tokens during the Lock-up Period, or the devaluation of Carbon Credits.</p>
                  <p><strong>Force Majeure:</strong> The Company shall not be liable for any delay or failure to perform resulting from causes outside its reasonable control, including but not limited to regulatory changes, acts of God, war, blockchain protocol failures, smart contract bugs, or hacks.</p>
                  <p><strong>Indemnification:</strong> Participant agrees to indemnify and hold Pure Sky Registry LLC harmless against any claims, damages, or legal fees arising from Participant's breach of these terms or violation of applicable laws.</p>

                  <p><strong>6. Regulatory Compliance and Modification</strong></p>
                  <p><strong>Modifications:</strong> The Company reserves the unilateral right to modify, amend, or terminate these Terms at any time. Notice may be provided via public announcement or website update. Continued participation constitutes acceptance of changes.</p>
                  <p><strong>Not a Security:</strong> Participant acknowledges that neither the SKY Token, the NFT Receipt, nor the Carbon Credits constitute a "security" under applicable laws. Participant represents they are not participating with the expectation of profit derived solely from the efforts of others.</p>
                </div>

                <div className="terms-checkbox">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <label htmlFor="terms">
                    I have read and agree to the SKY TOKEN PARTICIPATION AND LENDING AGREEMENT
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={loading || !termsAccepted || parseFloat(stakeAmount) === 0 || !XRPL_CONFIG.stakingAddress}
              >
                {loading ? (
                  <>
                    <span className="loading"></span> Processing...
                  </>
                ) : (
                  `Stake ${stakeAmount} SKY Tokens`
                )}
              </button>
            </form>
          </>
        )}

        {!wallet.connected && (
          <p style={{ textAlign: 'center', color: '#757575', marginTop: '2rem' }}>
            Please connect your wallet to continue
          </p>
        )}
      </div>
    </div>
  )
}

export default App
