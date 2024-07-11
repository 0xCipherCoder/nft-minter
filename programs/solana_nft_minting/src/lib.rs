use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, TokenAccount, MintTo, Token};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("6KhV2RDrv9UGfdEKeKE5N7Jp2MXLY8pXuWqXPnSMRFJo");

#[program]
pub mod solana_nft_minting {
    use super::*;

    pub fn mint_nft_collection(
        ctx: Context<MintNFTCollection>,
        metadata: Vec<String>,
        image_urls: Vec<String>,
        collection_size: u8,
    ) -> Result<()> {
        require!(
            metadata.len() == image_urls.len() && metadata.len() == collection_size as usize,
            ErrorCode::InvalidCollectionSize
        );

        let nft_collection = &mut ctx.accounts.nft_collection;
        nft_collection.owner = *ctx.accounts.user.key;
        nft_collection.size = collection_size;

        for i in 0..collection_size {
            let nft_info = NFTInfo {
                metadata: metadata[i as usize].clone(),
                image_url: image_urls[i as usize].clone(),
            };

            // Create a unique seed for each NFT to avoid duplicate accounts
            let seeds = &[
                b"nft_collection",
                ctx.accounts.user.key.as_ref(),
                &i.to_le_bytes(),
                &[ctx.bumps.nft_collection],
            ];
            let _signer = &[&seeds[..]];

            let cpi_accounts = MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

            token::mint_to(cpi_ctx, 1)?;

            nft_collection.nfts.push(nft_info);
        }

        Ok(())
    }
}


#[derive(Accounts)]
#[instruction(collection_size: u8)]
pub struct MintNFTCollection<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 1 + 4 + (64 * collection_size as usize),
        seeds = [b"nft_collection", user.key().as_ref()],
        bump
    )]
    pub nft_collection: Account<'info, NFTCollection>,

    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = user,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct NFTCollection {
    pub owner: Pubkey,
    pub size: u8,
    pub nfts: Vec<NFTInfo>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct NFTInfo {
    pub metadata: String,
    pub image_url: String,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid collection size")]
    InvalidCollectionSize,
}
