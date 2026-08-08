BEGIN TRY

BEGIN TRAN;

-- CreateTable: registro pendiente (sin User hasta confirmar email)
CREATE TABLE [dbo].[PendingRegistration] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [firstName] NVARCHAR(1000) NOT NULL,
    [lastName] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000),
    [tokenHash] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PendingRegistration_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PendingRegistration_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PendingRegistration_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [PendingRegistration_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

CREATE NONCLUSTERED INDEX [PendingRegistration_expiresAt_idx] ON [dbo].[PendingRegistration]([expiresAt]);

-- Borrar cuentas User que nunca confirmaron el email (y sus tokens por CASCADE)
DELETE FROM [dbo].[User] WHERE [emailVerifiedAt] IS NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
    THROW;
END CATCH;
