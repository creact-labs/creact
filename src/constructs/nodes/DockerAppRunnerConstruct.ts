import { Construct } from "constructs";
import { TerraformOutput, DataTerraformRemoteStateS3 } from "cdktf";
import { sharedConfig } from "@config";
import * as crypto from "crypto";

import { ApprunnerService } from "@gen/providers/aws/apprunner-service";
import { AcmCertificate } from "@gen/providers/aws/acm-certificate";
import { AcmCertificateValidation } from "@gen/providers/aws/acm-certificate-validation";
import { CloudfrontDistribution } from "@gen/providers/aws/cloudfront-distribution";
import { Route53Record } from "@gen/providers/aws/route53-record";
import { IamRole } from "@gen/providers/aws/iam-role";
import { IamRolePolicyAttachment } from "@gen/providers/aws/iam-role-policy-attachment";

export interface DockerAppRunnerConstructProps {
  hostedZoneId: string;
  serviceName: string;
  environment: string;
  containerPort?: string;
  imageTag?: string;
  repositoryUrl: string;
}

export interface DockerAppRunnerOutputs {
  serviceArn: string;
  serviceId: string;
  serviceUrl: string;
  domainName: string;
  region: string;
  roleArn: string;
}

export class DockerAppRunnerConstruct extends Construct {
  constructor(scope: Construct, id: string, props: DockerAppRunnerConstructProps) {
    super(scope, id);

    const { baseDomain, aws } = sharedConfig;
    const { hostedZoneId, serviceName, environment } = props;

    const imageTag = props.imageTag ?? "latest";
    const containerPort = props.containerPort ?? "8080";

    const uniqueBase = `${serviceName}-${environment}`;
    const hash = crypto.createHash("sha1").update(uniqueBase).digest("hex").slice(0, 8);

    const appRunnerServiceName = `${serviceName}-${environment}-${hash}`;
    const domainName =
      environment === "prod"
        ? `${serviceName}.${baseDomain}`
        : `${serviceName}.${environment}.${baseDomain}`;

    const appRunnerRole = new IamRole(this, "apprunner_ecr_role", {
      name: `${serviceName}-${environment}-apprunner-role`,
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "build.apprunner.amazonaws.com" },
            Action: "sts:AssumeRole",
          },
        ],
      }),
    });

    new IamRolePolicyAttachment(this, "apprunner_ecr_policy", {
      role: appRunnerRole.name,
      policyArn: "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess",
    });

    const service = new ApprunnerService(this, "docker_app_runner_service", {
      serviceName: appRunnerServiceName,
      sourceConfiguration: {
        autoDeploymentsEnabled: true,
        authenticationConfiguration: { accessRoleArn: appRunnerRole.arn },
        imageRepository: {
          imageIdentifier: `${props.repositoryUrl}:${imageTag}`,
          imageRepositoryType: "ECR",
          imageConfiguration: {
            port: containerPort,
            runtimeEnvironmentVariables: { ENV: environment },
          },
        },
      },
      instanceConfiguration: { cpu: "1024", memory: "2048" },
    });

    const cert = new AcmCertificate(this, "cert", {
      domainName,
      validationMethod: "DNS",
    });

    const certValidationRecord = new Route53Record(this, "cert_validation_record", {
      zoneId: hostedZoneId,
      name: cert.domainValidationOptions.get(0).resourceRecordName,
      type: cert.domainValidationOptions.get(0).resourceRecordType,
      records: [cert.domainValidationOptions.get(0).resourceRecordValue],
      ttl: 60,
    });

    new AcmCertificateValidation(this, "cert_validation", {
      certificateArn: cert.arn,
      validationRecordFqdns: [certValidationRecord.fqdn],
    });

    const cfDistribution = new CloudfrontDistribution(this, "cf_distribution", {
      enabled: true,
      aliases: [domainName],
      origin: [
        {
          domainName: service.serviceUrl.replace("https://", ""),
          originId: "apprunner-origin",
          customOriginConfig: {
            httpPort: 80,
            httpsPort: 443,
            originProtocolPolicy: "https-only",
            originSslProtocols: ["TLSv1.2"],
          },
        },
      ],
      defaultCacheBehavior: {
        targetOriginId: "apprunner-origin",
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
        cachedMethods: ["GET", "HEAD"],
        forwardedValues: {
          queryString: true,
          cookies: { forward: "all" },
        },
      },
      viewerCertificate: {
        acmCertificateArn: cert.arn,
        sslSupportMethod: "sni-only",
      },
      restrictions: { geoRestriction: { restrictionType: "none" } },
    });

    new Route53Record(this, "alias_record", {
      zoneId: hostedZoneId,
      name: domainName,
      type: "A",
      alias: {
        name: cfDistribution.domainName,
        zoneId: cfDistribution.hostedZoneId,
        evaluateTargetHealth: false,
      },
    });

    new TerraformOutput(this, "aws_region", { value: aws.region }).overrideLogicalId("aws_region");
    new TerraformOutput(this, "app_runner_service_id", { value: service.serviceId }).overrideLogicalId("app_runner_service_id");
    new TerraformOutput(this, "app_runner_service_url", { value: service.serviceUrl }).overrideLogicalId("app_runner_service_url");
    new TerraformOutput(this, "app_runner_access_role_arn", { value: appRunnerRole.arn }).overrideLogicalId("app_runner_access_role_arn");
    new TerraformOutput(this, "domain_name", { value: domainName }).overrideLogicalId("domain_name");
    new TerraformOutput(this, "cf_distribution_id", { value: cfDistribution.id }).overrideLogicalId("cf_distribution_id");
    new TerraformOutput(this, "certificate_arn", { value: cert.arn }).overrideLogicalId("certificate_arn");
  }

  static fromRemoteState(state: DataTerraformRemoteStateS3): DockerAppRunnerOutputs {
    return {
      serviceArn: state.get("app_runner_service_id") as unknown as string,
      serviceId: state.get("app_runner_service_id") as unknown as string,
      serviceUrl: state.get("app_runner_service_url") as unknown as string,
      domainName: state.get("domain_name") as unknown as string,
      region: state.get("aws_region") as unknown as string,
      roleArn: state.get("app_runner_access_role_arn") as unknown as string,
    };
  }
}
