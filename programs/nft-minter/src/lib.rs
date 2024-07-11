use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, TokenAccount, MintTo, Token};

declare_id!("GXFZLamQc3tELeRYeoVX88uthLCC12j7NRFkyCSXcDwd");

#[program]
mod solana_nft_minting {
    use super::*;

    pub fn mint_nft(ctx: Context<MintNFT>, metadata: String, image_url: String) -> Result<()> {
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

        token::mint_to(cpi_context, 1)?;

        let nft = &mut ctx.accounts.nft;
        nft.owner = *ctx.accounts.mint_authority.key;
        nft.metadata = format!("{}|{}", metadata, image_url);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(init, payer = user, space = 8 + 32 + 256)]
    pub nft: Account<'info, NFT>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    pub mint_authority: Signer<'info>,
    #[account(mut)]
    pub user: Signer<'info>, // Make the payer mutable
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct NFT {
    pub owner: Pubkey,
    pub metadata: String,
}
