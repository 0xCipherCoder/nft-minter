# Solana NFT Minting, Vault, and Swap Program

This project consists of a series of programs using Anchor that allow for the minting of a collection of NFTs, locking these NFTs in a vault, and swapping them for $SOL. The project ensures that rental fees for locking NFTs are returned to the protocol. Additionally, it includes storage and retrieval of images with appropriate metadata.

## Features

1. **Mint a Collection of NFTs**: Using Anchor, the program mints a collection of NFTs with associated metadata and images.
2. **Vault System**: Develop a vault system to lock NFTs, where rental fees are returned to the protocol rather than the user.
3. **Image Storage and Retrieval**: Ensure functional storage and retrieval of images, with appropriate metadata assigned to each NFT.
4. **Swap Program**: Create a swap program using Native Rust or Anchor that allows users to exchange $SOL for NFTs, performing all necessary checks and enabling swapping between $SOL and NFTs.

## Prerequisites

- Rust
- Solana CLI
- Node.js
- Anchor

## Installation

1. **Install Solana CLI**:
    ```sh
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
    ```

2. **Install Rust**:
    ```sh
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    ```

3. **Install Node.js and Yarn**:
    ```sh
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
    nvm install --lts
    npm install --global yarn
    ```

4. **Install Anchor**:
    ```sh
    cargo install --git https://github.com/project-serum/anchor --tag v0.19.0 anchor-cli --locked
    ```

## Installation

1. Clone the repository:
    ```sh
    git clone git@github.com:0xCipherCoder/nft-minter.git
    cd nft-minter
    ```

2. Install dependencies:
    ```sh
    anchor build
    ```

3. Deploy the programs to Solana Local Tesnet:
    ```sh
    anchor deploy
    ```

## Usage 

### Test the overall functionality with test cases:
    ```sh
    anchor test
    ```

### Minting NFTs

1. **Navigate to the NFT minting program directory**:
    ```sh
    cd nft_minting
    ```

2. **Build the program**:
    ```sh
    anchor build
    ```

3. **Deploy the program**:
    ```sh
    anchor deploy
    ```

4. **Run the client script to mint NFTs**:
    ```sh
    anchor test
    ```

### Locking NFTs in Vault

1. **Navigate to the vault program directory**:
    ```sh
    cd vault
    ```

2. **Build the program**:
    ```sh
    anchor build
    ```

3. **Deploy the program**:
    ```sh
    anchor deploy
    ```

4. **Run the client script to lock NFTs**:
    ```sh
    anchor test
    ```

### Swapping $SOL for NFTs

1. **Navigate to the swap program directory**:
    ```sh
    cd swap
    ```

2. **Build the program**:
    ```sh
    anchor build
    ```

3. **Deploy the program**:
    ```sh
    anchor deploy
    ```

4. **Run the client script to swap $SOL for NFTs**:
    ```sh
    anchor test
    ```

## Testing

    ```sh
    anchor test
    ```

## Test Report 

    ```sh
    anchor test
   Compiling solana_vault v0.1.0 (/home/pradip/Cipher/OpenSource/nft-minter/programs/solana_vault)
    Finished release [optimized] target(s) in 2.17s
   Compiling solana_vault v0.1.0 (/home/pradip/Cipher/OpenSource/nft-minter/programs/solana_vault)
   Compiling solana_swap v0.1.0 (/home/pradip/Cipher/OpenSource/nft-minter/programs/solana_swap)
    Finished release [optimized] target(s) in 3.93s
    Finished release [optimized] target(s) in 0.16s

Found a 'test' script in the Anchor.toml. Running it as a test suite!

Running test suite: "/home/pradip/Cipher/OpenSource/nft-minter/Anchor.toml"

Error: websocket error
Error: websocket error
Error: websocket error
yarn run v1.22.19
warning package.json: No license field
warning package.json: "dependencies" has dependency "chai" with range "^4.3.7" that collides with a dependency in "devDependencies" of the same name with version "^4.3.4"
warning ../../../package.json: No license field
$ /home/pradip/Cipher/OpenSource/nft-minter/node_modules/.bin/ts-mocha -p ./tsconfig.json -t 1000000 'tests/**/*.ts'
(node:536324) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)


  solana_swap
    ✔ Initializes the test state (2420ms)
    ✔ Swaps SOL for NFT (447ms)

  solana_vault
    ✔ Initializes the test state (1718ms)
    ✔ Locks an NFT (442ms)
    ✔ Unlocks an NFT (436ms)

  solana_nft_minting
    ✔ Initializes the test state (425ms)
    ✔ Mints an NFT collection (425ms)


  7 passing (6s)
    ```

### Test Descriptions

 **Minting NFTs:**

Tests the minting process of a collection of NFTs.
Verifies the correct assignment of metadata and image storage.

**Locking NFTs:**

Tests the vault functionality by locking an NFT.
Ensures rental fees are transferred to the protocol wallet.

**Swapping $SOL for NFTs:**

Tests the swap functionality between $SOL and NFTs.
Verifies all necessary checks and ensures the correct transfer of assets.

### Prerequisites


Ensure you have a local Solana cluster running:
```sh
solana-test-validator
