BEGIN TRY

BEGIN TRAN;

-- Canal de venta: ONLINE (default) | STORE
IF COL_LENGTH('dbo.Order', 'channel') IS NULL
BEGIN
  ALTER TABLE [dbo].[Order] ADD [channel] NVARCHAR(1000) NOT NULL CONSTRAINT [Order_channel_df] DEFAULT 'ONLINE';
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH;

BEGIN TRY

BEGIN TRAN;

-- addressId opcional (ventas presenciales sin envío)
IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[Order]')
    AND name = N'addressId'
    AND is_nullable = 0
)
BEGIN
  ALTER TABLE [dbo].[Order] ALTER COLUMN [addressId] NVARCHAR(1000) NULL;
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'Order_channel_idx' AND object_id = OBJECT_ID(N'[dbo].[Order]')
)
BEGIN
  CREATE NONCLUSTERED INDEX [Order_channel_idx] ON [dbo].[Order]([channel]);
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'Order_createdAt_idx' AND object_id = OBJECT_ID(N'[dbo].[Order]')
)
BEGIN
  CREATE NONCLUSTERED INDEX [Order_createdAt_idx] ON [dbo].[Order]([createdAt]);
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH;
