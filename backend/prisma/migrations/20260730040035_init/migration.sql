BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [firstName] NVARCHAR(1000) NOT NULL,
    [lastName] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000),
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'CLIENT',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Address] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(1000),
    [street] NVARCHAR(1000) NOT NULL,
    [city] NVARCHAR(1000) NOT NULL,
    [state] NVARCHAR(1000) NOT NULL,
    [postalCode] NVARCHAR(1000) NOT NULL,
    [country] NVARCHAR(1000) NOT NULL CONSTRAINT [Address_country_df] DEFAULT 'PE',
    [phone] NVARCHAR(1000),
    [isDefault] BIT NOT NULL CONSTRAINT [Address_isDefault_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Address_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Address_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Category] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [description] TEXT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Category_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Category_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Category_name_key] UNIQUE NONCLUSTERED ([name]),
    CONSTRAINT [Category_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[Product] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [description] TEXT NOT NULL,
    [price] DECIMAL(10,2) NOT NULL,
    [discountPrice] DECIMAL(10,2),
    [categoryId] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Product_isActive_df] DEFAULT 1,
    [isFeatured] BIT NOT NULL CONSTRAINT [Product_isFeatured_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Product_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Product_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Product_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[ProductImage] (
    [id] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [url] NVARCHAR(1000) NOT NULL,
    [alt] NVARCHAR(1000),
    [sortOrder] INT NOT NULL CONSTRAINT [ProductImage_sortOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ProductImage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ProductImage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ProductVariant] (
    [id] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [sku] NVARCHAR(1000) NOT NULL,
    [size] NVARCHAR(1000) NOT NULL,
    [color] NVARCHAR(1000) NOT NULL,
    [stock] INT NOT NULL CONSTRAINT [ProductVariant_stock_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ProductVariant_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ProductVariant_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ProductVariant_sku_key] UNIQUE NONCLUSTERED ([sku]),
    CONSTRAINT [ProductVariant_productId_size_color_key] UNIQUE NONCLUSTERED ([productId],[size],[color])
);

-- CreateTable
CREATE TABLE [dbo].[Order] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [addressId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Order_status_df] DEFAULT 'PENDING',
    [subtotal] DECIMAL(10,2) NOT NULL,
    [shippingCost] DECIMAL(10,2) NOT NULL CONSTRAINT [Order_shippingCost_df] DEFAULT 0,
    [total] DECIMAL(10,2) NOT NULL,
    [notes] TEXT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Order_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Order_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OrderItem] (
    [id] NVARCHAR(1000) NOT NULL,
    [orderId] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [variantId] NVARCHAR(1000) NOT NULL,
    [quantity] INT NOT NULL,
    [unitPrice] DECIMAL(10,2) NOT NULL,
    CONSTRAINT [OrderItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Payment] (
    [id] NVARCHAR(1000) NOT NULL,
    [orderId] NVARCHAR(1000) NOT NULL,
    [culqiChargeId] NVARCHAR(1000),
    [amount] DECIMAL(10,2) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [Payment_currency_df] DEFAULT 'PEN',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Payment_status_df] DEFAULT 'PENDING',
    [rawResponse] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Payment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Payment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Payment_orderId_key] UNIQUE NONCLUSTERED ([orderId]),
    CONSTRAINT [Payment_culqiChargeId_key] UNIQUE NONCLUSTERED ([culqiChargeId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Address_userId_idx] ON [dbo].[Address]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_categoryId_idx] ON [dbo].[Product]([categoryId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_isActive_idx] ON [dbo].[Product]([isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_isFeatured_idx] ON [dbo].[Product]([isFeatured]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProductImage_productId_idx] ON [dbo].[ProductImage]([productId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProductVariant_productId_idx] ON [dbo].[ProductVariant]([productId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Order_userId_idx] ON [dbo].[Order]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Order_status_idx] ON [dbo].[Order]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OrderItem_orderId_idx] ON [dbo].[OrderItem]([orderId]);

-- AddForeignKey
ALTER TABLE [dbo].[Address] ADD CONSTRAINT [Address_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProductImage] ADD CONSTRAINT [ProductImage_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ProductVariant] ADD CONSTRAINT [ProductVariant_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Order] ADD CONSTRAINT [Order_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Order] ADD CONSTRAINT [Order_addressId_fkey] FOREIGN KEY ([addressId]) REFERENCES [dbo].[Address]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrderItem] ADD CONSTRAINT [OrderItem_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrderItem] ADD CONSTRAINT [OrderItem_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrderItem] ADD CONSTRAINT [OrderItem_variantId_fkey] FOREIGN KEY ([variantId]) REFERENCES [dbo].[ProductVariant]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Payment] ADD CONSTRAINT [Payment_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
