import { Construct } from "constructs";
import { S3Bucket } from "../../.gen/providers/aws/s3-bucket";
import { S3BucketWebsiteConfiguration } from "../../.gen/providers/aws/s3-bucket-website-configuration";
import { S3BucketPolicy } from "../../.gen/providers/aws/s3-bucket-policy";
import { CloudfrontDistribution } from "../../.gen/providers/aws/cloudfront-distribution";
import { CloudfrontOriginAccessIdentity } from "../../.gen/providers/aws/cloudfront-origin-access-identity";
import { AcmCertificate } from "../../.gen/providers/aws/acm-certificate";
import { AcmCertificateValidation } from "../../.gen/providers/aws/acm-certificate-validation";
import { Route53Record } from "../../.gen/providers/aws/route53-record";
import { TerraformOutput, IResolvable } from "cdktf";
import { EnvironmentConfig, sharedConfig } from "../../config";
import * as crypto from "crypto";

export interface ReactWebClientProps {
  hostedZoneId: string | IResolvable;
  config: EnvironmentConfig;
  // Add unique identifier to prevent resource conflicts
  appType: 'customer' | 'provider';
}

export class ReactWebClient extends Construct {
  private readonly config: EnvironmentConfig;
  private readonly appType: string;

  constructor(scope: Construct, id: string, props: ReactWebClientProps) {
    super(scope, id);

    this.config = props.config;
    this.appType = props.appType;

    const { baseDomain } = sharedConfig;
    const isProd = this.config.environment === "prod";
    
    // Create unique domains for each app type
    const actualDomain = this.getDomainName(isProd, baseDomain);
    const uniqueBaseName = `${this.appType}-${this.config.environment}`;
    const hash = crypto.createHash("sha1").update(uniqueBaseName).digest("hex").slice(0, 8);
    const bucketName = `${uniqueBaseName}-${hash}`;

    // --- S3 bucket (private) ---
    const siteBucket = new S3Bucket(this, "site_bucket", {
      bucket: bucketName,
    });

    new S3BucketWebsiteConfiguration(this, "website_config", {
      bucket: siteBucket.bucket,
      indexDocument: { suffix: "index.html" },
      errorDocument: { key: "index.html" },
    });

    // --- CloudFront OAI ---
    const oai = new CloudfrontOriginAccessIdentity(this, "oai", {
      comment: `OAI for ${bucketName}`,
    });

    // --- Bucket Policy ---
    new S3BucketPolicy(this, "bucket_policy", {
      bucket: siteBucket.bucket,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: oai.iamArn },
            Action: "s3:GetObject",
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      }),
    });

    // --- ACM Certificate ---
    const cert = new AcmCertificate(this, "cert", {
      domainName: actualDomain,
      validationMethod: "DNS",
    });

    const certValidationRecord = new Route53Record(this, "cert_validation_record", {
      zoneId: props.hostedZoneId as string,
      name: cert.domainValidationOptions.get(0).resourceRecordName,
      type: cert.domainValidationOptions.get(0).resourceRecordType,
      records: [cert.domainValidationOptions.get(0).resourceRecordValue],
      ttl: 60,
    });

    new AcmCertificateValidation(this, "cert_validation", {
      certificateArn: cert.arn,
      validationRecordFqdns: [certValidationRecord.fqdn],
    });

    // --- CloudFront ---
    const distribution = new CloudfrontDistribution(this, "cf_distribution", {
      enabled: true,
      aliases: [actualDomain],
      origin: [
        {
          domainName: siteBucket.bucketRegionalDomainName,
          originId: "s3-origin",
          s3OriginConfig: { originAccessIdentity: oai.cloudfrontAccessIdentityPath },
        },
      ],
      defaultCacheBehavior: {
        targetOriginId: "s3-origin",
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD"],
        cachedMethods: ["GET", "HEAD"],
        forwardedValues: {
          queryString: false,
          cookies: { forward: "none" },
        },
      },
      viewerCertificate: {
        acmCertificateArn: cert.arn,
        sslSupportMethod: "sni-only",
      },
      defaultRootObject: "index.html",
      restrictions: { geoRestriction: { restrictionType: "none" } },
    });

    // --- DNS record ---
    new Route53Record(this, "alias_record", {
      zoneId: props.hostedZoneId as string,
      name: actualDomain,
      type: "A",
      alias: {
        name: distribution.domainName,
        zoneId: distribution.hostedZoneId,
        evaluateTargetHealth: false,
      },
    });

    // --- Outputs (all useful for deployment) ---
    new TerraformOutput(this, "bucket_name", { value: siteBucket.bucket });
    new TerraformOutput(this, "cloudfront_domain", { value: distribution.domainName });
    new TerraformOutput(this, "site_url", { value: `https://${actualDomain}` });
    new TerraformOutput(this, "domain_name", { value: actualDomain });
    new TerraformOutput(this, "cert_arn", { value: cert.arn });
    new TerraformOutput(this, "cf_distribution_id", { value: distribution.id });
    new TerraformOutput(this, "bucket_regional_domain", { value: siteBucket.bucketRegionalDomainName });
    new TerraformOutput(this, "oai_id", { value: oai.id });
  }

  private getDomainName(isProd: boolean, baseDomain: string): string {
    if (isProd) {
      return this.appType === 'provider' ? `provider.${baseDomain}` : baseDomain;
    }
    return this.appType === 'provider' 
      ? `provider.${this.config.environment}.${baseDomain}` 
      : `${this.config.environment}.${baseDomain}`;
  }
}