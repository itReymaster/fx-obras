-- SQL Server full backup pre-migration
-- 1) Ajuste o nome do banco e os caminhos abaixo.
--    Use o database real de DB_DATABASE (onde vive o schema fx_obras), nao um nome inventado.
-- 2) Execute com uma conta que tenha permissao de BACKUP DATABASE.
-- 3) COMPRESSION: em SQL Server 2008 R2 muitas edicoes (Standard/Express) nao suportam.
--    Se o BACKUP falhar por compressao, remova COMPRESSION da lista WITH abaixo.

USE master;
GO

DECLARE @DatabaseName SYSNAME = N'SEU_BANCO'; -- ex.: Flex ou o database homolog/producao
DECLARE @BackupDir NVARCHAR(260) = N'D:\SQLBackups';
DECLARE @Timestamp NVARCHAR(20) = REPLACE(CONVERT(VARCHAR(19), GETDATE(), 120), ':', '-');
SET @Timestamp = REPLACE(@Timestamp, ' ', '_');

DECLARE @BackupFile NVARCHAR(400) = @BackupDir + N'\\' + @DatabaseName + N'_pre_migration_' + @Timestamp + N'.bak';

-- Preferir sem COMPRESSION em 2008 R2; adicione COMPRESSION somente se a edicao suportar.
DECLARE @Sql NVARCHAR(MAX) = N'
BACKUP DATABASE [' + @DatabaseName + N']
TO DISK = N''' + @BackupFile + N'''
WITH COPY_ONLY, INIT, CHECKSUM, STATS = 10;
';

PRINT N'Iniciando backup em: ' + @BackupFile;
EXEC sp_executesql @Sql;
GO  

-- Verifica a integridade do arquivo de backup gerado
-- (troque pelo arquivo correto, se necessario)
-- RESTORE VERIFYONLY
-- FROM DISK = N'D:\SQLBackups\SEU_BANCO_pre_migration_YYYY-MM-DD_HH-MM-SS.bak';
-- GO
