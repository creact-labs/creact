/**
 * Security Layer Component
 * 
 * Manages secrets, certificates, and security infrastructure.
 * 
 * @jsx CReact.createElement
 * @jsxFrag CReact.Fragment
 */

import { CReact } from '../../../src/jsx';
import { useInstance } from '../../../src/hooks/useInstance';
import { useState } from '../../../src/hooks/useState';
import { useContext } from '../../../src/hooks/useContext';
import { VaultCluster, CertificateManager } from '../constructs';
import { InfraConfigContext, SecurityContext } from '../contexts';

interface SecurityLayerProps {
  children?: any;
}

export function SecurityLayer({ children }: SecurityLayerProps) {
  const config = useContext(InfraConfigContext);
  
  // State for security endpoints
  const [vaultUrl, setVaultUrl] = useState<string>();
  const [certificateArn, setCertificateArn] = useState<string>();
  const [encryptionKey, setEncryptionKey] = useState<string>();
  
  // Vault cluster for secrets management
  const vault = useInstance(VaultCluster, {
    key: 'secrets',
    name: `messaging-vault-${config.environment}`,
    nodes: config.environment === 'prod' ? 5 : 3,
    storage: config.environment === 'prod' ? '100GB' : '20GB',
  });
  
  // SSL/TLS certificate for the domain
  const certificate = useInstance(CertificateManager, {
    key: 'ssl-cert',
    domain: `*.${config.domain}`,
    validation: 'DNS',
    autoRenew: true,
  });
  
  // Extract security configuration
  if (vault.outputs?.vaultUrl && !vaultUrl) {
    setVaultUrl(vault.outputs.vaultUrl as string);
  }
  
  if (certificate.outputs?.certificateArn && !certificateArn) {
    setCertificateArn(certificate.outputs.certificateArn as string);
  }
  
  // Generate encryption key (in real scenario, this would come from KMS)
  if (!encryptionKey) {
    setEncryptionKey('arn:aws:kms:us-east-1:123456789012:key/mock-key-id');
  }
  
  // Provide security configuration to child components
  return (
    <SecurityContext.Provider
      value={{
        vaultUrl,
        certificateArn,
        encryptionKey,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}
