use anchor_lang::prelude::*;

declare_id!("GXFZLamQc3tELeRYeoVX88uthLCC12j7NRFkyCSXcDwd");

#[program]
pub mod nft_minter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
