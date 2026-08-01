/*
  Warnings:

  - You are about to drop the column `culqiChargeId` on the `Payment` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Payment] DROP COLUMN [culqiChargeId];
ALTER TABLE [dbo].[Payment] ADD [method] NVARCHAR(1000),
[openpayChargeId] NVARCHAR(1000),
[paymentReference] NVARCHAR(1000);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
