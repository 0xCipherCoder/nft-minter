use anchor_lang::prelude::*;
use solana_program_test::*;
use solana_sdk::signer::Signer;
use nft_minter::*;

#[tokio::test]
async fn test_mint_nft() {
    let program_id = Pubkey::from_str("YourNFTMintingProgramID").unwrap();
    let mut context = ProgramTest::new("nft_minter", program_id, processor!(nft_minter::entry))
        .start_with_context()
        .await;

    let user = Keypair::new();
    let mint_authority = Keypair::new();

    // Initialize necessary accounts and mint an NFT
    let mint_key = Keypair::new();
    let token_account_key = Keypair::new();

    // Perform the mint NFT transaction
    let metadata = "Test Metadata".to_string();
    let image_url = "http://example.com/image.png".to_string();

    let transaction = mint_nft(
        &context,
        &user,
        &mint_authority,
        &mint_key,
        &token_account_key,
        metadata,
        image_url,
    );

    // Check transaction result and account states
    assert!(transaction.is_ok());

    let nft_account = context.banks_client.get_account(nft_key.pubkey()).await.unwrap().unwrap();
    assert_eq!(nft_account.owner, program_id);
    let nft_data: NFT = NFT::try_from_slice(&nft_account.data).unwrap();
    assert_eq!(nft_data.owner, mint_authority.pubkey());
    assert!(nft_data.metadata.contains("Test Metadata"));
    assert!(nft_data.metadata.contains("http://example.com/image.png"));
}
