# Configuration Guide

This document outlines what needs to be configured before deploying the SKY Token Staking application.

## Quick Start

1. Copy [.env.example](.env.example) to `.env`
2. Fill in the required values (see below)
3. Run `npm install`
4. Run `npm run dev`

## Required Environment Variables

### 1. SKY Token Issuer Address

**Variable**: `VITE_TOKEN_ISSUER`

**What it is**: The XRPL address that issues the SKY token.

**How to find it**:
- Check with the SKY token creator/issuer
- Look up the token on an XRPL explorer (e.g., xrpscan.com)
- It should be a valid XRPL address starting with 'r'

**Example**:
```bash
VITE_TOKEN_ISSUER=rN7n7otQDd6FczFgLdlqtyMVrn3HMbjqsU
```

---

### 2. Pure Sky Registry Staking Address

**Variable**: `VITE_STAKING_ADDRESS`

**What it is**: The Pure Sky Registry address where users will send their SKY tokens for staking.

**Important**: This should be a trusted address controlled by Pure Sky Registry.

**Example**:
```bash
VITE_STAKING_ADDRESS=rPureSkyRegistryAddress123...
```

---

### 3. Xaman (Xumm) API Key

**Variable**: `VITE_XUMM_API_KEY`

**What it is**: API key for Xaman wallet integration (required for Xaman wallet users).

**How to get it**:
1. Go to [https://apps.xumm.dev/](https://apps.xumm.dev/)
2. Create an account or log in
3. Create a new application
4. Copy the API key

**Example**:
```bash
VITE_XUMM_API_KEY=your-xumm-api-key-here
```

---

## Optional Configuration

### Network Selection

**Variable**: `VITE_XRPL_NETWORK`

**Default**: `mainnet`

**Options**:
- `mainnet` - Production network
- `testnet` - Test network

For testing, use testnet:
```bash
VITE_XRPL_NETWORK=testnet
VITE_XRPL_NODE_URL=wss://s.altnet.rippletest.net:51233
```

---

### XRPL Node URL

**Variable**: `VITE_XRPL_NODE_URL`

**Default**: `wss://xrplcluster.com/`

**Mainnet options**:
- `wss://xrplcluster.com/`
- `wss://s1.ripple.com/`
- `wss://s2.ripple.com/`

**Testnet**:
- `wss://s.altnet.rippletest.net:51233`

---

### Token Currency Code

**Variable**: `VITE_TOKEN_CURRENCY`

**Default**: `SKY`

If your token uses a different currency code, update this value.

---

## Terms and Conditions

The terms and conditions currently contain placeholder text. Update the content in [src/App.tsx](src/App.tsx) starting at line ~377.

**What to include**:
- Staking period details (currently 6 months)
- Rights and obligations
- Carbon credit distribution terms
- Liability disclaimers
- Contact information
- Dispute resolution process

---

## Complete .env Example

```bash
# Network Configuration
VITE_XRPL_NETWORK=mainnet
VITE_XRPL_NODE_URL=wss://xrplcluster.com/

# Token Configuration
VITE_TOKEN_CURRENCY=SKY
VITE_TOKEN_ISSUER=rYourSKYTokenIssuerAddress

# Staking Configuration
VITE_STAKING_ADDRESS=rPureSkyRegistryAddress

# Xaman Wallet
VITE_XUMM_API_KEY=your-xumm-api-key
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Set `VITE_TOKEN_ISSUER` to the correct SKY token issuer address
- [ ] Set `VITE_STAKING_ADDRESS` to the Pure Sky Registry address
- [ ] Obtain and set `VITE_XUMM_API_KEY` from apps.xumm.dev
- [ ] Update terms and conditions with actual legal text
- [ ] Test with small amounts on testnet first
- [ ] Verify both Gem Wallet and Xaman work correctly
- [ ] Test the entire flow end-to-end
- [ ] Confirm token balance fetching works
- [ ] Verify transactions appear on XRPL explorer

---

## Testing on Testnet

1. Switch to testnet in your `.env`:
```bash
VITE_XRPL_NETWORK=testnet
VITE_XRPL_NODE_URL=wss://s.altnet.rippletest.net:51233
```

2. Get testnet XRP from faucet: https://xrpl.org/xrp-testnet-faucet.html

3. Create test SKY tokens or use existing testnet tokens

4. Update `VITE_TOKEN_ISSUER` to testnet issuer address

5. Test complete flow with small amounts

---

## Troubleshooting

### Gem Wallet Not Connecting

- Ensure Gem Wallet browser extension is installed
- Check that extension is unlocked
- Verify network matches (Mainnet vs Testnet)
- Check browser console for errors

### Xaman Not Connecting

- Verify `VITE_XUMM_API_KEY` is set correctly
- Check that you've created an app at apps.xumm.dev
- Ensure Xaman app is installed on mobile device
- Try scanning QR code from console logs

### Balance Shows 0

- Verify `VITE_TOKEN_ISSUER` is correct
- Check that wallet has a trust line to the token issuer
- Confirm tokens are in the wallet using XRPL explorer
- Check `VITE_TOKEN_CURRENCY` matches the token

### Transaction Fails

- Ensure wallet has enough XRP for fees (~0.00001 XRP)
- Verify `VITE_STAKING_ADDRESS` is a valid XRPL address
- Check that token issuer address is correct
- Review browser console for detailed error messages

---

## Support Resources

- XRPL Documentation: https://xrpl.org/
- Gem Wallet Docs: https://gemwallet.app/docs
- Gem Wallet API: https://gemwallet.app/docs/api/
- Xaman Docs: https://xaman.app/
- Xaman Dev Portal: https://apps.xumm.dev/
- Pure Sky Registry: https://registry.puresky.earth/
- XRPL Explorer: https://livenet.xrpl.org/ (Mainnet) or https://testnet.xrpl.org/ (Testnet)

---

Last updated: 2025-12-07
