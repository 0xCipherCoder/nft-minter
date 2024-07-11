use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, TokenAccount, MintTo, Token};

declare_id!("6KhV2RDrv9UGfdEKeKE5N7Jp2MXLY8pXuWqXPnSMRFJo");

#[program]
pub mod solana_nft_minting {
    use super::*;

    pub fn mint_nft_collection(
        ctx: Context<MintNFTCollection>,
        metadata: Vec<String>,
        image_urls: Vec<String>,
    ) -> Result<()> {
        let nft_collection = &mut ctx.accounts.nft_collection;

        for (i, (meta, url)) in metadata.iter().zip(image_urls.iter()).enumerate() {
            let cpi_accounts = MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_accounts[i].to_account_info(),
                authority: ctx.accounts.mint_authority.to_account_info(),
            };

            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

            token::mint_to(cpi_context, 1)?;

            let nft = &mut ctx.accounts.nfts[i];
            nft.owner = *ctx.accounts.mint_authority.key;
            nft.metadata = format!("{}|{}", meta, url);

            nft_collection.nft_list.push(nft.key());
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintNFTCollection<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 4 + 4 + (32 * 10) // Adjust space as needed for collection size
    )]
    pub nft_collection: Account<'info, NFTCollection>,
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 4 + 256,
        seeds = [b"nft", &user.key().to_bytes()],
        bump
    )]
    pub nfts: Vec<Account<'info, NFT>>,
    #[account(
        mut,
        mint::authority = mint_authority,
        mint::decimals = 0
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = user,
        token::mint = mint,
        token::authority = mint_authority,
    )]
    pub token_accounts: Vec<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub mint_authority: Signer<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct NFTCollection {
    pub owner: Pubkey,
    pub nft_list: Vec<Pubkey>,
}

#[account]
pub struct NFT {
    pub owner: Pubkey,
    pub metadata: String,
}
