#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Tentar usar mkcert se disponível
try {
  console.log('📝 Verificando se mkcert está disponível...');
  execSync('mkcert -version', { stdio: 'ignore' });
  
  console.log('✅ mkcert encontrado! Gerando certificado...');
  
  const certDir = path.join(__dirname, 'certs');
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }
  
  const caPath = path.join(certDir, 'ca');
  if (!fs.existsSync(path.join(caPath, 'rootCA-key.pem'))) {
    console.log('Instalando CA raiz mkcert...');
    execSync('mkcert -install', { stdio: 'inherit' });
  }
  
  // Gerar certificado para IP e localhost
  console.log('Gerando certificado para 192.168.15.7 e localhost...');
  process.chdir(certDir);
  execSync('mkcert -cert-file=cert.pem -key-file=key.pem 192.168.15.7 localhost', { stdio: 'inherit' });
  process.chdir(__dirname);
  
  console.log('✅ Certificado gerado com sucesso!');
  console.log('Arquivos:', fs.readdirSync(certDir).filter(f => f.endsWith('.pem')));
} catch (err) {
  console.log('❌ mkcert não disponível. Usando Node.js puro...');
  
  // Fallback: usar node-forge
  try {
    const forge = require('node-forge');
    const pki = forge.pki;
    
    console.log('🔑 Gerando certificado com node-forge...');
    
    // Gerar par de chaves
    const keys = pki.rsa.generateKeyPair(2048);
    
    // Criar certificado
    const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);
    
    const attrs = [
      {
        name: 'commonName',
        value: '192.168.15.7'
      },
      {
        name: 'organizationName',
        value: 'Local Dev'
      }
    ];
    
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    // Adicionar extensões
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false
      },
      {
        name: 'keyUsage',
        keyCertSign: false,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          {
            type: 2, // DNS
            value: '192.168.15.7'
          },
          {
            type: 2, // DNS
            value: 'localhost'
          },
          {
            type: 7, // IP
            ip: '192.168.15.7'
          }
        ]
      }
    ]);
    
    // Auto-assinar
    cert.sign(keys.privateKey, forge.md.sha256.create());
    
    // Exportar PEM
    const certPem = pki.certificateToPem(cert);
    const keyPem = pki.privateKeyToPem(keys.privateKey);
    
    const certDir = path.join(__dirname, 'certs');
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(certDir, 'cert.pem'), certPem);
    fs.writeFileSync(path.join(certDir, 'key.pem'), keyPem);
    
    console.log('✅ Certificado gerado com sucesso!');
    console.log('Caminho:', certDir);
  } catch (forgeErr) {
    console.error('❌ Erro ao gerar certificado:', forgeErr.message);
    process.exit(1);
  }
}
