/**
 * Script para gerar certificados HTTPS auto-assinados
 * Uso: node generate-certs.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const certDir = path.join(__dirname, 'certs');

// Criar diretório se não existir
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
  console.log(`✅ Diretório criado: ${certDir}`);
}

const certPath = path.join(certDir, 'cert.pem');
const keyPath = path.join(certDir, 'key.pem');

try {
  // Tentar usar mkcert se disponível
  try {
    execSync('mkcert --version', { stdio: 'ignore' });
    console.log('🔐 Usando mkcert para gerar certificado...');
    
    // mkcert encontrado, usar para gerar certificado confiável
    execSync(`mkcert -cert-file "${certPath}" -key-file "${keyPath}" localhost 127.0.0.1 ::1`, {
      stdio: 'inherit'
    });
    
    console.log('✅ Certificado gerado com sucesso!');
    console.log(`📝 Certificado: ${certPath}`);
    console.log(`🔑 Chave: ${keyPath}`);
    console.log('\n✨ O certificado é automaticamente confiável no seu navegador!');
    process.exit(0);
  } catch (e) {
    // mkcert não disponível, criar auto-assinado
    console.log('⚠️  mkcert não encontrado, gerando certificado auto-assinado...');
    console.log('📝 Instale mkcert para certificado confiável: choco install mkcert');
    
    const forge = require('node-forge');
    const pki = forge.pki;
    
    // Gerar par de chaves
    console.log('🔑 Gerando par de chaves RSA...');
    const keys = pki.rsa.generateKeyPair(2048);
    
    // Gerar certificado auto-assinado
    console.log('📄 Gerando certificado auto-assinado...');
    const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);
    
    const attrs = [
      { name: 'commonName', value: 'localhost' },
      { name: 'organizationName', value: 'Digital Rey Local' },
      { name: 'organizationalUnitName', value: 'Development' },
      { name: 'countryName', value: 'BR' },
      { name: 'stateOrProvinceName', value: 'PR' },
      { name: 'localityName', value: 'Local' }
    ];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 2, value: '*.local' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '::1' }
        ]
      }
    ]);
    
    // Auto-assinado
    cert.sign(keys.privateKey, forge.md.sha256.create());
    
    // Salvar certificado e chave
    const certPem = pki.certificateToPem(cert);
    const keyPem = pki.privateKeyToPem(keys.privateKey);
    
    fs.writeFileSync(certPath, certPem, 'utf8');
    fs.writeFileSync(keyPath, keyPem, 'utf8');
    
    console.log('✅ Certificado gerado com sucesso!');
    console.log(`📝 Certificado: ${certPath}`);
    console.log(`🔑 Chave: ${keyPath}`);
    console.log('\n⚠️  Este é um certificado auto-assinado.');
    console.log('📋 Você terá um aviso de segurança no navegador.');
    console.log('✨ Para evitar avisos, instale mkcert: choco install mkcert');
  }
} catch (err) {
  console.error('❌ Erro ao gerar certificado:', err.message);
  process.exit(1);
}
