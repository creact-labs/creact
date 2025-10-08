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
import { useEffect } from '../../../src/hooks/useEffect';
import { VaultCluster, CertificateManager } from '../constructs';
import { InfraConfigContext, SecurityContext } from '../contexts';

interface SecurityLayerProps {
  children?: any;
}

export function SecurityLayer({ children }: SecurityLayerProps) {
  const config = useContext(InfraConfigContext);
  
  // State for security endpoints (populated after deployment)
  const [vaultUrl, setVaultUrl] = useState('');
  const [certificateArn, setCertificateArn] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  
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
  
  // useEffect runs after deployment to populate state with security configuration
  useEffect(() => {
    console.log('[SecurityLayer] useEffect triggered for vaultUrl:', vault.outputs?.vaultUrl);
    if (vault.outputs?.vaultUrl) {
      console.log('[SecurityLayer] Setting vaultUrl to:', vault.outputs.vaultUrl);
      setVaultUrl(vault.outputs.vaultUrl as string);
    }
  }, [vault.outputs?.vaultUrl]);
  
  useEffect(() => {
    console.log('[SecurityLayer] useEffect triggered for certificateArn:', certificate.outputs?.certificateArn);
    if (certificate.outputs?.certificateArn) {
      console.log('[SecurityLayer] Setting certificateArn to:', certificate.outputs.certificateArn);
      setCertificateArn(certificate.outputs.certificateArn as string);
    }
  }, [certificate.outputs?.certificateArn]);
  
  // Generate encryption key after first deployment
  useEffect(() => {
    // In real scenario, this would come from KMS after deployment
    setEncryptionKey('arn:aws:kms:us-east-1:123456789012:key/mock-key-id');
  }, []); // Empty deps = run once after first deployment
  
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
