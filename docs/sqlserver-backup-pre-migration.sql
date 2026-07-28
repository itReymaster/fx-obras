-- SQL Server full backup pre-migration
-- 1) Ajuste o nome do banco e os caminhos abaixo.
-- 2) Execute com uma conta que tenha permissao de BACKUP DATABASE.

USE master;
GO

DECLARE @DatabaseName SYSNAME = N'fx_obras';
DECLARE @BackupDir NVARCHAR(260) = N'D:\SQLBackups';
DECLARE @Timestamp NVARCHAR(20) = REPLACE(CONVERT(VARCHAR(19), GETDATE(), 120), ':', '-');
SET @Timestamp = REPLACE(@Timestamp, ' ', '_');

DECLARE @BackupFile NVARCHAR(400) = @BackupDir + N'\\' + @DatabaseName + N'_pre_migration_' + @Timestamp + N'.bak';

DECLARE @Sql NVARCHAR(MAX) = N'
BACKUP DATABASE [' + @DatabaseName + N']
TO DISK = N''' + @BackupFile + N'''
WITH COPY_ONLY, INIT, COMPRESSION, CHECKSUM, STATS = 10;
';

PRINT N'Iniciando backup em: ' + @BackupFile;
EXEC sp_executesql @Sql;
GO

-- Verifica a integridade do arquivo de backup gerado
-- (troque pelo arquivo correto, se necessario)
-- RESTORE VERIFYONLY
-- FROM DISK = N'D:\SQLBackups\fx_obras_pre_migration_YYYY-MM-DD_HH-MM-SS.bak';
-- GO
