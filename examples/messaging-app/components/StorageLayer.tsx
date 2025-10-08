/**
 * Storage Layer Component
 * 
 * Manages object storage and file systems for media and attachments.
 * 
 * @jsx CReact.createElement
 * @jsxFrag CReact.Fragment
 */

import { CReact } from '../../../src/jsx';
import { useInstance } from '../../../src/hooks/useInstance';
import { useState } from '../../../src/hooks/useState';
import { useContext } from '../../../src/hooks/useContext';
import { useEffect } from '../../../src/hooks/useEffect';
import { S3Bucket, EFSFileSystem } from '../constructs';
import { InfraConfigContext } from '../contexts';

export function StorageLayer() {
  const config = useContext(InfraConfigContext);
  
  // State for storage endpoints (populated after deployment)
  const [mediaBucketUrl, setMediaBucketUrl] = useState<string>('');
  const [staticBucketUrl, setStaticBucketUrl] = useState<string>('');
  const [backupBucketUrl, setBackupBucketUrl] = useState<string>('');
  const [efsEndpoint, setEfsEndpoint] = useState<string>('');
  
  // S3 bucket for user-uploaded media (images, videos, files)
  const mediaBucket = useInstance(S3Bucket, {
    key: 'media',
    name: `messaging-media-${config.environment}`,
    versioning: config.environment === 'prod',
    encryption: true,
    lifecycle: {
      transitionDays: config.environment === 'prod' ? 90 : 30,
      storageClass: 'GLACIER',
    },
  });
  
  // S3 bucket for static assets (app assets, icons, etc.)
  const staticBucket = useInstance(S3Bucket, {
    key: 'static',
    name: `messaging-static-${config.environment}`,
    versioning: false,
    encryption: true,
  });
  
  // S3 bucket for backups
  const backupBucket = useInstance(S3Bucket, {
    key: 'backups',
    name: `messaging-backups-${config.environment}`,
    versioning: true,
    encryption: true,
    lifecycle: {
      transitionDays: 30,
      storageClass: 'DEEP_ARCHIVE',
    },
  });
  
  // EFS for shared file storage across services
  const sharedFileSystem = useInstance(EFSFileSystem, {
    key: 'shared-fs',
    name: `messaging-efs-${config.environment}`,
    performanceMode: config.environment === 'prod' ? 'maxIO' : 'generalPurpose',
    throughputMode: config.environment === 'prod' ? 'provisioned' : 'bursting',
  });
  
  // useEffect runs after deployment to populate state with storage endpoints
  useEffect(() => {
    if (mediaBucket.outputs?.bucketUrl) {
      setMediaBucketUrl(mediaBucket.outputs.bucketUrl as string);
    }
  }, [mediaBucket.outputs?.bucketUrl]);
  
  useEffect(() => {
    if (staticBucket.outputs?.bucketUrl) {
      setStaticBucketUrl(staticBucket.outputs.bucketUrl as string);
    }
  }, [staticBucket.outputs?.bucketUrl]);
  
  useEffect(() => {
    if (backupBucket.outputs?.bucketUrl) {
      setBackupBucketUrl(backupBucket.outputs.bucketUrl as string);
    }
  }, [backupBucket.outputs?.bucketUrl]);
  
  useEffect(() => {
    if (sharedFileSystem.outputs?.dnsName) {
      setEfsEndpoint(sharedFileSystem.outputs.dnsName as string);
    }
  }, [sharedFileSystem.outputs?.dnsName]);
  
  return <></>;
}
