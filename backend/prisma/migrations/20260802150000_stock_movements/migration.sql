BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[StockMovement] (
    [id] NVARCHAR(1000) NOT NULL,
    [variantId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(1000) NOT NULL,
    [quantity] INT NOT NULL,
    [previousStock] INT NOT NULL,
    [newStock] INT NOT NULL,
    [note] NVARCHAR(500),
    [orderId] NVARCHAR(1000),
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [StockMovement_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [undoneAt] DATETIME2,
    [undoneById] NVARCHAR(1000),
    CONSTRAINT [StockMovement_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockMovement_variantId_idx] ON [dbo].[StockMovement]([variantId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockMovement_createdAt_idx] ON [dbo].[StockMovement]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockMovement_type_idx] ON [dbo].[StockMovement]([type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockMovement_reason_idx] ON [dbo].[StockMovement]([reason]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockMovement_orderId_idx] ON [dbo].[StockMovement]([orderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockMovement_undoneAt_idx] ON [dbo].[StockMovement]([undoneAt]);

-- AddForeignKey
ALTER TABLE [dbo].[StockMovement] ADD CONSTRAINT [StockMovement_variantId_fkey] FOREIGN KEY ([variantId]) REFERENCES [dbo].[ProductVariant]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockMovement] ADD CONSTRAINT [StockMovement_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockMovement] ADD CONSTRAINT [StockMovement_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockMovement] ADD CONSTRAINT [StockMovement_undoneById_fkey] FOREIGN KEY ([undoneById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH