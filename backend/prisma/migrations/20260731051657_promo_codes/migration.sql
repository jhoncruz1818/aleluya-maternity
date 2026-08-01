BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Order] ADD [discountAmount] DECIMAL(10,2) NOT NULL CONSTRAINT [Order_discountAmount_df] DEFAULT 0,
[promoCode] NVARCHAR(1000),
[promoCodeId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[PromoCode] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [value] DECIMAL(10,2) NOT NULL,
    [startsAt] DATETIME2 NOT NULL,
    [endsAt] DATETIME2 NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [PromoCode_isActive_df] DEFAULT 1,
    [maxUses] INT,
    [usedCount] INT NOT NULL CONSTRAINT [PromoCode_usedCount_df] DEFAULT 0,
    [minOrderAmount] DECIMAL(10,2),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PromoCode_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PromoCode_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PromoCode_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PromoCode_isActive_idx] ON [dbo].[PromoCode]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PromoCode_startsAt_endsAt_idx] ON [dbo].[PromoCode]([startsAt], [endsAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Order_promoCodeId_idx] ON [dbo].[Order]([promoCodeId]);

-- AddForeignKey
ALTER TABLE [dbo].[Order] ADD CONSTRAINT [Order_promoCodeId_fkey] FOREIGN KEY ([promoCodeId]) REFERENCES [dbo].[PromoCode]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
