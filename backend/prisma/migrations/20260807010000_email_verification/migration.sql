BEGIN TRY

BEGIN TRAN;

IF COL_LENGTH('dbo.User', 'emailVerifiedAt') IS NULL
BEGIN
  ALTER TABLE [dbo].[User] ADD [emailVerifiedAt] DATETIME2 NULL;
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

-- UPDATE en batch separado vía EXEC (SQL Server no ve la columna nueva en el mismo batch del ALTER)
EXEC(N'UPDATE [dbo].[User] SET [emailVerifiedAt] = [createdAt] WHERE [emailVerifiedAt] IS NULL');

BEGIN TRY

BEGIN TRAN;

IF OBJECT_ID(N'[dbo].[EmailVerificationToken]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[EmailVerificationToken] (
      [id] NVARCHAR(1000) NOT NULL,
      [userId] NVARCHAR(1000) NOT NULL,
      [tokenHash] NVARCHAR(1000) NOT NULL,
      [expiresAt] DATETIME2 NOT NULL,
      [usedAt] DATETIME2,
      [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmailVerificationToken_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT [EmailVerificationToken_pkey] PRIMARY KEY CLUSTERED ([id]),
      CONSTRAINT [EmailVerificationToken_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
  );

  ALTER TABLE [dbo].[EmailVerificationToken] ADD CONSTRAINT [EmailVerificationToken_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

  CREATE NONCLUSTERED INDEX [EmailVerificationToken_userId_idx] ON [dbo].[EmailVerificationToken]([userId]);

  CREATE NONCLUSTERED INDEX [EmailVerificationToken_expiresAt_idx] ON [dbo].[EmailVerificationToken]([expiresAt]);
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
