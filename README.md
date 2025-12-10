# SKY Token Staking - Pure Sky Registry

A web application for staking SKY tokens on the XRP Ledger to earn PureSky ISO certified carbon credits.

## Features

- **Wallet Integration**: Support for both Gem Wallet and Xaman (formerly Xumm)
- **Token Balance Display**: View your current SKY token balance
- **Staking Interface**: Send SKY tokens to the Pure Sky Registry staking address
- **Terms & Conditions**: Built-in acceptance flow (placeholder content to be filled)
- **Responsive Design**: Mobile-friendly interface styled to match registry.puresky.earth

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- One of the following wallets:
  - [Gem Wallet](https://gemwallet.app/) browser extension
  - [Xaman](https://xaman.app/) mobile app or browser extension

## Installation

1. Navigate to the project directory:
```bash
cd PureSkyDAO/nft_staking
```

2. Install dependencies:
```bash
npm install
```

## Development

Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Build for Production

Create a production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Configuration

### Important: Update SKY Token Details

Before deploying, you need to update the following in [src/App.tsx](src/App.tsx):

1. **SKY Token Issuer Address** (Lines ~167 and ~187):
   - Replace `'YOUR_SKY_TOKEN_ISSUER_ADDRESS'` with the actual XRP Ledger address that issues SKY tokens

2. **Balance Fetching** (Lines ~115-125):
   - Uncomment and configure the XRPL client code to fetch real balances
   - You'll need to specify the correct currency code and issuer for SKY tokens

3. **Staking Address**:
   - Provide users with the correct Pure Sky Registry staking address to enter in the form

### Terms and Conditions

The terms and conditions section currently contains placeholder text. Update the content in [src/App.tsx](src/App.tsx) at lines ~270-282 with your actual legal terms.

## How It Works

1. **Connect Wallet**: Users connect either Gem Wallet or Xaman
2. **View Balance**: The app displays their current SKY token balance
3. **Enter Staking Address**: Users enter the Pure Sky Registry staking address
4. **Accept Terms**: Users must read and accept the terms and conditions
5. **Stake Tokens**: Clicking the stake button sends all SKY tokens to the specified address
6. **Confirmation**: Users receive a transaction hash upon successful staking

## Technical Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Blockchain**: XRP Ledger (XRPL)
- **Wallet Integration**:
  - Gem Wallet API
  - Xaman SDK
- **Styling**: Custom CSS matching Pure Sky Registry design

## Project Structure

```
PureSkyDAO/nft_staking/
├── public/
│   ├── favicon-32x32.png      # Pure Sky favicon
│   └── logo.png                # Pure Sky logo
├── src/
│   ├── App.tsx                 # Main application component
│   ├── App.css                 # Styling (Pure Sky theme)
│   ├── main.tsx                # Application entry point
│   └── vite-env.d.ts          # TypeScript declarations
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
└── README.md                   # This file
```

## Important Notes

### Security Considerations

- This is a **token transfer**, not a smart contract staking mechanism
- Users are **lending** tokens to the Pure Sky Registry
- Ensure users understand they are sending tokens to a centralized address
- Always verify the recipient address is correct before transactions

### Wallet Requirements

Users must have:
- Either Gem Wallet or Xaman installed
- Sufficient XRP for transaction fees (typically ~0.00001 XRP)
- SKY tokens in their wallet

## Customization

### Styling

The application uses Pure Sky Registry's color scheme:
- Primary: #1269cf (blue)
- Success: #1bb240 (green)
- Dark background: #1f2b43
- Accent: #02baf2 (light blue)

Modify [src/App.css](src/App.css) to adjust colors and styling.

### Staking Period

The current configuration mentions a 6-month staking period. Update this in:
- App component description text
- Terms and conditions section

## Troubleshooting

**Wallet not detected:**
- Ensure the browser extension is installed and enabled
- Try refreshing the page
- Check browser console for errors

**Balance shows as 0:**
- Verify you have SKY tokens in your wallet
- Check that the token issuer address is correctly configured
- Ensure the wallet is connected to the correct network

**Transaction fails:**
- Ensure you have enough XRP for transaction fees
- Verify the recipient address is valid
- Check that the token issuer address is correct

## TODO

- [ ] Add actual SKY token issuer address
- [ ] Implement real balance fetching from XRPL
- [ ] Fill in complete terms and conditions
- [ ] Add transaction history/status tracking
- [ ] Implement error handling for network issues
- [ ] Add loading states for balance fetching
- [ ] Create staking period countdown timer
- [ ] Add email notifications (optional)

## License

[Your License Here]

## Support

For support, please contact the Pure Sky Registry team or visit [registry.puresky.earth](https://registry.puresky.earth/)
